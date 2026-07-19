'use strict';

const express = require('express');
const router = express.Router();
const { Client, Environment } = require('square');
const { v4: uuidv4 } = require('uuid');
const Joi = require('joi');
const nodemailer = require('nodemailer');

// ─── Mail Transporter ─────────────────────────────────────────────────────────
const mailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // SSL
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

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

    // メール送信（非同期）
    if (process.env.SMTP_USER && process.env.SMTP_PASS && customer.email) {
      const fromName = process.env.SMTP_FROM_NAME || 'Coedo Music Labo';
      const mailOptions = {
        from: `"${fromName}" <${process.env.SMTP_USER}>`,
        to: customer.email,
        subject: '【Coedo Music Labo】ご注文ありがとうございます！',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e6dfd3; border-radius: 12px; background: #faf6ec; color: #1e3f4c;">
            <h2 style="color: #3f9ab4; border-bottom: 2px solid #3f9ab4; padding-bottom: 8px;">Coedo Music Labo</h2>
            <p style="font-size: 1rem; font-weight: bold;">${customer.name} 様</p>
            <p>この度は <strong>Coedo Music Labo Online Shop</strong> にてご注文いただき、誠にありがとうございます。</p>
            
            <div style="background: #ffffff; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e6dfd3;">
              <h3 style="margin-top: 0; color: #244f5e; font-size: 0.95rem;">📦 ご注文内容</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                <tr>
                  <td style="padding: 6px 0;"><strong>商品名:</strong></td>
                  <td style="text-align: right;">This is AI Sound (CD)</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;"><strong>数量:</strong></td>
                  <td style="text-align: right;">${quantity} 枚</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0;"><strong>送料（全国一律）:</strong></td>
                  <td style="text-align: right;">¥300</td>
                </tr>
                ${isValidCoupon ? `
                <tr style="color: #ff6b6b;">
                  <td style="padding: 6px 0;"><strong>クーポン割引 (COEDO9824):</strong></td>
                  <td style="text-align: right;">-¥${Number(1000 * quantity).toLocaleString()}</td>
                </tr>` : ''}
                <tr style="border-top: 1px solid #e6dfd3; font-weight: bold; font-size: 1.05rem;">
                  <td style="padding: 10px 0 0;">合計金額:</td>
                  <td style="text-align: right; padding: 10px 0 0; color: #244f5e;">¥${Number(totalMoney.amount).toLocaleString()} (税込)</td>
                </tr>
              </table>
            </div>

            <div style="background: #ffffff; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #e6dfd3; font-size: 0.88rem; line-height: 1.6;">
              <h3 style="margin-top: 0; color: #244f5e; font-size: 0.95rem;">🚚 お届け先住所</h3>
              <p style="margin: 4px 0;">〒${customer.postalCode}</p>
              <p style="margin: 4px 0;">${customer.prefecture} ${customer.address1} ${customer.address2 || ''}</p>
              <p style="margin: 4px 0;">宛先: ${customer.name} 様</p>
              <p style="margin: 4px 0;">電話: ${customer.phone}</p>
            </div>

            <p style="font-size: 0.9rem; line-height: 1.6;">商品（CD）は、<strong>2026年8月10日</strong>の発売日以降に順次発送いたします。商品の発送が完了しましたら、改めてご連絡を差し上げます。</p>
            
            <p style="font-size: 0.9rem; line-height: 1.6;">CDには<strong>ネット試聴プレイヤーのリンク</strong>が同梱されます。CDプレーヤーがお手元にない場合でもお楽しみいただけますので、楽しみにお待ちください！</p>

            <hr style="border: 0; border-top: 1px solid #e6dfd3; margin: 20px 0;">
            <p style="font-size: 0.8rem; color: #87a2ad; text-align: center; margin: 0;">
              Coedo Music Labo<br>
              <a href="https://coedo-music.jp/" target="_blank" style="color: #3f9ab4;">https://coedo-music.jp/</a>
            </p>
          </div>
        `
      };

      mailTransporter.sendMail(mailOptions)
        .then(info => console.log(`[${timestamp}][${requestId}] Order confirmation email sent: ${info.messageId}`))
        .catch(err => console.error(`[${timestamp}][${requestId}] Failed to send email:`, err));
    }

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
