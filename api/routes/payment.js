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

// ─── Catalog Constants (Server-Side Source of Truth) ──────────────────────────
// Square カタログ内の "This is AI Sound" 商品バリエーションID
const CATALOG_VARIATION_ID = 'BCP7WTTZZSOHWQWNDQNJO5YQ';
const TOTAL_STOCK = 100; // 限定枚数（フォールバック用）
const SHIPPING_FEE_JPY = 300; // 全国一律送料

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
    .valid('this-is-ai-sound')
    .required(),
  quantity: Joi.number()
    .integer()
    .min(1)
    .max(20)
    .required(),
  customer: Joi.object({
    name: Joi.string().min(1).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().pattern(/^[0-9\-\+\(\)\s]{7,20}$/).required(),
    postalCode: Joi.string().pattern(/^\d{3}-?\d{4}$/).required(),
    prefecture: Joi.string().max(10).required(),
    address1: Joi.string().max(100).required(),
    address2: Joi.string().max(100).allow('').optional()
  }).required(),
  couponCode: Joi.string().allow('').optional()
});

// ─── GET /api/inventory ───────────────────────────────────────────────────────
// Square Catalog からリアルタイム在庫数を取得する
router.get('/inventory', async (req, res) => {
  try {
    const response = await squareClient.inventoryApi.retrieveInventoryCount(
      CATALOG_VARIATION_ID,
      process.env.SQUARE_LOCATION_ID
    );
    const counts = response.result.counts || [];
    const inStock = counts.find(c => c.state === 'IN_STOCK');
    const count = inStock ? Math.floor(Number(inStock.quantity)) : 0;
    res.json({ count, total: TOTAL_STOCK });
  } catch (err) {
    console.error('Inventory fetch error:', err?.errors || err.message);
    // フォールバック: Square APIが取得できなくても表示を壊さない
    res.json({ count: TOTAL_STOCK, total: TOTAL_STOCK });
  }
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

    const { sourceId, productId, quantity, customer, couponCode } = value;

    console.log(`[${timestamp}][${requestId}] Creating order — ${quantity}x ${productId} (couponCode: ${couponCode || 'none'})`);

    // クーポン割引の検証（この商品のみに適用可能）
    const discounts = [];
    const isValidCoupon = couponCode && 
                          couponCode.trim().toUpperCase() === 'COEDO9824' && 
                          productId === 'this-is-ai-sound';

    if (isValidCoupon) {
      const discountAmount = 1000n * BigInt(quantity);
      discounts.push({
        name: 'クーポン割引 (COEDO9824)',
        amountMoney: { amount: discountAmount, currency: 'JPY' }
      });
    }

    // 2. Square Orders API でカタログ商品の注文を作成
    //    これにより Square 管理画面に正確な売上・在庫データが反映される
    const createOrderResponse = await squareClient.ordersApi.createOrder({
      idempotencyKey: uuidv4(),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID,
        lineItems: [
          {
            catalogObjectId: CATALOG_VARIATION_ID,
            quantity: String(quantity),
          }
        ],
        serviceCharges: [
          {
            name: '送料（全国一律）',
            amountMoney: { amount: BigInt(SHIPPING_FEE_JPY), currency: 'JPY' },
            calculationPhase: 'TOTAL_PHASE',
          }
        ],
        discounts: discounts.length > 0 ? discounts : undefined,
        fulfillments: [
          {
            type: 'SHIPMENT',
            state: 'PROPOSED',
            shipmentDetails: {
              recipient: {
                displayName: customer.name,
                emailAddress: customer.email,
                phoneNumber: customer.phone,
                address: {
                  addressLine1: customer.address1,
                  addressLine2: customer.address2 || undefined,
                  locality: customer.prefecture,
                  postalCode: customer.postalCode.replace('-', ''),
                  country: 'JP'
                }
              }
            }
          }
        ]
      }
    });

    const order = createOrderResponse.result.order;
    const totalMoney = order.totalMoney;

    console.log(`[${timestamp}][${requestId}] Order created — ID: ${order.id}, Total: ¥${totalMoney.amount}`);

    // 3. 注文に対して支払いを処理（カード決済）
    const paymentResponse = await squareClient.paymentsApi.createPayment({
      sourceId,
      idempotencyKey: requestId,
      orderId: order.id,
      amountMoney: totalMoney,
      locationId: process.env.SQUARE_LOCATION_ID,
      note: `Coedo Music Shop — This is AI Sound x${quantity}`,
      buyerEmailAddress: customer.email,
      receiptEmailAddress: customer.email, // ← Squareからの公式確認レシートメールを送信する
      shippingAddress: {
        addressLine1: customer.address1,
        addressLine2: customer.address2 || undefined,
        locality: customer.prefecture,
        postalCode: customer.postalCode.replace('-', ''),
        country: 'JP'
      },
      referenceId: requestId,
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
    console.log(`[${timestamp}][${requestId}] Payment completed — ID: ${payment.id}, Order: ${order.id}`);

    return res.status(200).json({
      success: true,
      orderId: requestId,
      squareOrderId: order.id,
      paymentId: payment.id,
      amount: Number(totalMoney.amount),
      receiptUrl: payment.receiptUrl,
      message: 'ご購入ありがとうございます！'
    });

  } catch (err) {
    console.error(`[${timestamp}][${requestId}] Payment error:`, err?.errors || err.message);

    if (err?.errors) {
      const squareError = err.errors[0];
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
