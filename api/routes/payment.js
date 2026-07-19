'use strict';

const express = require('express');
const router = express.Router();
const { Client, Environment } = require('square');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');

// ─── Square Client ────────────────────────────────────────────────────────────
const squareClient = new Client({
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
  environment: process.env.SQUARE_ENVIRONMENT === 'production'
    ? Environment.Production
    : Environment.Sandbox
});

// ─── Product Catalog (Server-Side Source of Truth) ───────────────────────────
// Price is ALWAYS determined server-side — never trust client-sent amounts
const PRODUCTS = {
  'this-is-ai-sound': {
    name: 'This is AI Sound — コンピレーションアルバム CD',
    priceJpy: 2500,  // ¥2,500
    stock: 100,
    // In production, track actual stock in a database
  }
};

const SHIPPING_FEE_JPY = 300; // ¥300 flat rate

// ─── Input Validation Schema ──────────────────────────────────────────────────
const orderSchema = Joi.object({
  sourceId: Joi.string()
    .max(512)
    .pattern(/^[a-zA-Z0-9_\-\.\:]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid payment token format.',
      'any.required': 'Payment token is required.'
    }),
  productId: Joi.string()
    .valid(...Object.keys(PRODUCTS))
    .required(),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required(),
  customer: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9\-\+\(\)\s]{7,20}$/).required(),
    postalCode: Joi.string().pattern(/^\d{3}-?\d{4}$/).required(),
    prefecture: Joi.string().max(10).required(),
    address1: Joi.string().max(100).required(),
    address2: Joi.string().max(100).allow('').optional()
  }).required()
});

// ─── POST /api/payment ───────────────────────────────────────────────────────
router.post('/payment', async (req, res) => {
  const requestId = uuidv4();
  const timestamp = new Date().toISOString();

  try {
    // 1. Validate & sanitize input
    const { error, value } = orderSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const details = error.details.map(d => d.message);
      console.warn(`[${timestamp}][${requestId}] Validation error:`, details);
      return res.status(400).json({ error: 'Invalid order data.', details });
    }

    const { sourceId, productId, quantity, customer } = value;
    const product = PRODUCTS[productId];

    // 2. Server-side price calculation (NEVER trust client)
    const itemTotal = product.priceJpy * quantity;
    const totalAmountJpy = itemTotal + SHIPPING_FEE_JPY;

    // Square API uses amounts in the smallest currency unit (JPY = no decimals, just yen)
    const amountMoney = {
      amount: BigInt(totalAmountJpy),
      currency: 'JPY'
    };

    console.log(`[${timestamp}][${requestId}] Processing payment — ¥${totalAmountJpy} for ${quantity}x ${productId}`);

    // 3. Create payment via Square API
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: requestId, // Prevent duplicate charges
      amountMoney,
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `Coedo Music Shop — ${product.name} x${quantity}`,
      buyerEmailAddress: customer.email,
      shippingAddress: {
        addressLine1: customer.address1,
        addressLine2: customer.address2 || undefined,
        locality: customer.prefecture,
        postalCode: customer.postalCode.replace('-', ''),
        country: 'JP'
      },
      referenceId: requestId,
      // Statement descriptor visible on bank statement
      statementDescriptionIdentifier: 'COEDO MUSIC'
    });

    const payment = paymentResponse.result.payment;

    if (payment.status !== 'COMPLETED') {
      console.warn(`[${timestamp}][${requestId}] Payment not completed. Status: ${payment.status}`);
      return res.status(402).json({
        error: 'Payment was not completed.',
        status: payment.status
      });
    }

    // 4. Success — log and respond
    console.log(`[${timestamp}][${requestId}] ✅ Payment completed — ID: ${payment.id}`);

    return res.status(200).json({
      success: true,
      orderId: requestId,
      paymentId: payment.id,
      amount: totalAmountJpy,
      message: 'ご購入ありがとうございます！'
    });

  } catch (err) {
    console.error(`[${timestamp}][${requestId}] Payment error:`, err?.errors || err.message);

    // Square API errors
    if (err?.errors) {
      const squareError = err.errors[0];
      // Map Square error codes to user-friendly messages
      const userMessages = {
        'CARD_DECLINED': 'カードが拒否されました。別のカードをお試しください。',
        'VERIFY_CVV_FAILURE': 'セキュリティコードが正しくありません。',
        'VERIFY_AVS_FAILURE': '住所情報が正しくありません。',
        'CARD_EXPIRED': 'カードの有効期限が切れています。',
        'INSUFFICIENT_FUNDS': '残高が不足しています。',
        'INVALID_CARD': 'カード情報が無効です。',
        'PAYMENT_LIMIT_EXCEEDED': '決済限度額を超えています。'
      };

      const userMessage = userMessages[squareError.code] || '決済処理中にエラーが発生しました。';
      return res.status(402).json({ error: userMessage, code: squareError.code });
    }

    return res.status(500).json({ error: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' });
  }
});

// ─── GET /api/config ─────────────────────────────────────────────────────────
// Provides public Square credentials to frontend (safe to expose Application ID)
router.get('/config', (req, res) => {
  if (!process.env.SQUARE_APPLICATION_ID || !process.env.SQUARE_LOCATION_ID) {
    return res.status(503).json({ error: 'Payment system not configured.' });
  }
  res.json({
    applicationId: process.env.SQUARE_APPLICATION_ID,
    locationId: process.env.SQUARE_LOCATION_ID,
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
  });
});

module.exports = router;
