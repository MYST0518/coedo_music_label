'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRICE    = 2500;
const SHIPPING = 300;

// ─── State ───────────────────────────────────────────────────────────────────
let squarePayments = null;
let cardWidget     = null;
let isSubmitting   = false;

// Bind to window for HTML inline script integration
window.couponApplied = window.couponApplied || false;
window.appliedCouponCode = window.appliedCouponCode || '';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = String(str ?? '');
  return d.innerHTML;
}

function formatJPY(amount) {
  return `¥${Number(amount).toLocaleString('ja-JP')}`;
}

function showError(msg) {
  const el   = document.getElementById('payment-error');
  const text = document.getElementById('payment-error-text');
  if (el && text) {
    text.textContent = msg; // textContent is XSS-safe
    el.classList.add('visible');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function hideError() {
  const el = document.getElementById('payment-error');
  el?.classList.remove('visible');
}

function setLoading(loading) {
  isSubmitting = loading;
  const btn = document.getElementById('btn-pay');
  if (!btn) return;
  btn.disabled = loading;
  btn.classList.toggle('loading', loading);
}

// ─── Load Cart from sessionStorage ───────────────────────────────────────────
function loadCart() {
  window.loadCart = loadCart; // Expose globally early

  let qty = 1;
  let productId = 'this-is-ai-sound'; // デフォルト値を設定
  try {
    const raw = sessionStorage.getItem('coedo_cart');
    if (raw) {
      const cart = JSON.parse(raw);
      qty = Math.max(1, Math.min(20, parseInt(cart.quantity) || 1));
      if (cart.productId) {
        productId = cart.productId;
      }
    }
  } catch (e) { /* ignore */ }

  const isEligible = productId === 'this-is-ai-sound';
  const itemTotal = PRICE * qty;
  
  let discount = 0;
  let shipping = SHIPPING;

  // 5枚以上購入キャンペーン：送料無料
  if (qty >= 5) {
    shipping = 0;
  }

  if (window.couponApplied && isEligible) {
    if (window.appliedCouponCode === 'COEDO9824') {
      discount = 1000 * qty;
    } else if (window.appliedCouponCode === 'AILM0814') {
      discount = 500 * qty;
      shipping = 0;
    } else if (window.appliedCouponCode === '100YENTEST') {
      discount = (PRICE - 100) * qty;
      shipping = 0;
    }
  }

  const grandTotal = Math.max(0, itemTotal - discount) + shipping;

  // Update summary UI
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setEl('summary-qty',         qty);
  setEl('summary-item-price',  formatJPY(itemTotal));
  setEl('summary-subtotal',    formatJPY(itemTotal));
  setEl('summary-shipping',    shipping === 0 
    ? (window.appliedCouponCode === '100YENTEST' ? '無料' : 
       (window.appliedCouponCode === 'AILM0814' ? '無料 (吉祥寺受け取り)' : '無料 (5枚以上特典)')) 
    : formatJPY(shipping));

  // Toggle Discount UI
  const discountRow = document.getElementById('coupon-discount-row');
  if (discountRow) {
    discountRow.style.display = window.couponApplied ? 'flex' : 'none';
    setEl('summary-discount', `-${formatJPY(discount)}`);
  }

  setEl('summary-total',       formatJPY(grandTotal));
  setEl('pay-btn-label', `注文を確定する（${formatJPY(grandTotal)}）`);

  window.loadCart = loadCart; // Expose globally
  return qty;
}

// ─── Form Validation ─────────────────────────────────────────────────────────
function validateField(id, validator) {
  const el    = document.getElementById(id);
  const errEl = document.getElementById(`${id}-error`);
  if (!el) return true;
  const valid = validator(el.value.trim());
  el.classList.toggle('error', !valid);
  errEl?.classList.toggle('visible', !valid);
  return valid;
}

function validateForm() {
  const emailRegex  = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
  const phoneRegex  = /^[0-9\-\+\(\)\s]{7,20}$/;
  const postalRegex = /^\d{3}-?\d{4}$/;

  const checks = [
    validateField('name',        v => v.length >= 1 && v.length <= 100),
    validateField('email',       v => emailRegex.test(v)),
    validateField('phone',       v => phoneRegex.test(v)),
    validateField('postal-code', v => postalRegex.test(v)),
    validateField('prefecture',  v => v.length >= 1 && v.length <= 10),
    validateField('address1',    v => v.length >= 1 && v.length <= 100),
  ];

  return checks.every(Boolean);
}

function getFormData() {
  const g = id => document.getElementById(id)?.value.trim() ?? '';
  return {
    name:       g('name'),
    email:      g('email'),
    phone:      g('phone'),
    postalCode: g('postal-code'),
    prefecture: g('prefecture'),
    address1:   g('address1'),
    address2:   g('address2')
  };
}

function loadSquareSDK(environment) {
  return new Promise((resolve, reject) => {
    if (window.Square) {
      resolve();
      return;
    }
    const src = environment === 'production'
      ? 'https://web.squarecdn.com/v1/square.js'
      : 'https://sandbox.web.squarecdn.com/v1/square.js';

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log(`Square SDK loaded for ${environment}`);
      resolve();
    };
    script.onerror = () => {
      reject(new Error('Square SDK failed to load'));
    };
    document.head.appendChild(script);
  });
}

// ─── Square Init ─────────────────────────────────────────────────────────────
async function initSquare() {
  // Fetch public config from server (Application ID, Location ID)
  let config;
  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Config unavailable');
    config = await res.json();
  } catch (e) {
    showError('決済システムの初期化に失敗しました。ページを再読み込みしてください。');
    return;
  }

  // Load SDK dynamically based on environment
  try {
    await loadSquareSDK(config.environment);
  } catch (e) {
    showError('Square決済ライブラリの読み込みに失敗しました。時間をおいて再読み込みしてください。');
    return;
  }

  // Display sandbox test card guidance if in sandbox mode
  if (config.environment === 'sandbox') {
    const notice = document.getElementById('sandbox-notice');
    if (notice) notice.style.display = 'block';
  }

  try {
    squarePayments = window.Square.payments(config.applicationId, config.locationId);
  } catch (e) {
    showError('決済システムの初期化に失敗しました。');
    console.error('Square.payments init error:', e);
    return;
  }

  // ── Credit Card widget ────────────────────────────────
  try {
    cardWidget = await squarePayments.card({
      style: {
        '.input-container': {
          borderRadius: '0',
        },
        '.message-text': { color: '#ff6b6b' },
        '.message-icon': { color: '#ff6b6b' }
      }
    });
    await cardWidget.attach('#card-container');
  } catch (e) {
    showError('カード入力フォームの初期化に失敗しました。');
    console.error('Card widget error:', e);
    return;
  }

  // ── Apple Pay ─────────────────────────────────────────
  try {
    const qty = loadCart();
    const total = PRICE * qty + SHIPPING;
    const paymentRequest = squarePayments.paymentRequest({
      countryCode: 'JP',
      currencyCode: 'JPY',
      total: { label: 'Coedo Music Labo', amount: String(total) }
    });

    const applePay = await squarePayments.applePay(paymentRequest);
    const appleBtn = await applePay.attach('#apple-pay-button');
    appleBtn.addEventListener('ontokenization', handleWalletToken);
    document.getElementById('wallet-section').style.display = 'block';
  } catch (e) {
    // Apple Pay not available — silently skip
  }
}

// ─── Tokenize & Submit ───────────────────────────────────────────────────────
async function handleWalletToken(event) {
  if (event.detail.status !== 'OK') return;
  await submitPayment(event.detail.token);
}

async function handleCardSubmit() {
  if (isSubmitting) return;
  hideError();

  // 1. Validate form
  if (!validateForm()) {
    showError('入力内容に不備があります。赤く表示されている項目をご確認ください。');
    return;
  }

  setLoading(true);

  try {
    // 2. Tokenize card
    const result = await cardWidget.tokenize();

    if (result.status === 'OK') {
      await submitPayment(result.token);
    } else {
      const errMap = {
        'VALIDATION_ERROR':  'カード情報に入力ミスがあります。',
        'TIMEOUT':           'タイムアウトしました。再度お試しください。',
        'UNKNOWN_ERROR':     '不明なエラーが発生しました。'
      };
      const msg = errMap[result.status] || `決済処理に失敗しました（${result.status}）`;
      showError(msg);
      setLoading(false);
    }
  } catch (e) {
    showError('カード情報の処理中にエラーが発生しました。');
    console.error('Tokenize error:', e);
    setLoading(false);
  }
}

async function submitPayment(sourceId) {
  const qty      = loadCart();
  const customer = getFormData();

  try {
    const res = await fetch('/api/payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sourceId,
        productId: 'this-is-ai-sound',
        quantity:  qty,
        customer,
        couponCode: window.couponApplied ? window.appliedCouponCode : undefined
      }),
      // Abort if too slow
      signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Success — clear cart and redirect
      try { 
        sessionStorage.removeItem('coedo_cart'); 
        if (data.receiptUrl) {
          sessionStorage.setItem('coedo_receipt_url', data.receiptUrl);
        }
      } catch (e) {}
      window.location.href = `/success?order=${encodeURIComponent(data.orderId)}`;
    } else {
      showError(data.error || '決済処理に失敗しました。');
      setLoading(false);
    }
  } catch (e) {
    if (e.name === 'AbortError' || e.name === 'TimeoutError') {
      showError('通信タイムアウトです。インターネット接続を確認してください。');
    } else {
      showError('ネットワークエラーが発生しました。インターネット接続を確認してください。');
    }
    setLoading(false);
  }
}

// ─── Coupon Code Logic ────────────────────────────────────────────────────────
function initCoupon() {
  // HTML内のインラインスクリプトに移行したため、ここでは何もしません（重複登録防止）
}

// ─── Real-time Validation ────────────────────────────────────────────────────
function addRealTimeValidation() {
  const fields = ['name', 'email', 'phone', 'postal-code', 'prefecture', 'address1'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('blur', () => {
      // Re-validate on blur
      const validators = {
        'name':        v => v.length >= 1 && v.length <= 100,
        'email':       v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        'phone':       v => /^[0-9\-\+\(\)\s]{7,20}$/.test(v),
        'postal-code': v => /^\d{3}-?\d{4}$/.test(v),
        'prefecture':  v => v.length >= 1,
        'address1':    v => v.length >= 1
      };
      const fn = validators[id];
      if (fn) validateField(id, fn);
    });
    // Clear error on input
    el.addEventListener('input', () => {
      el.classList.remove('error');
      document.getElementById(`${id}-error`)?.classList.remove('visible');
    });
  });
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function startInit() {
  loadCart();
  addRealTimeValidation();
  initCoupon(); // Initialize coupon events
  await initSquare();

  document.getElementById('btn-pay')?.addEventListener('click', handleCardSubmit);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startInit);
} else {
  startInit();
}
