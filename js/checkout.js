'use strict';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRICE    = 2500;
const SHIPPING = 300;

// ─── State ───────────────────────────────────────────────────────────────────
let squarePayments = null;
let cardWidget     = null;
let isSubmitting   = false;

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
  let qty = 1;
  try {
    const raw = sessionStorage.getItem('coedo_cart');
    if (raw) {
      const cart = JSON.parse(raw);
      qty = Math.max(1, Math.min(5, parseInt(cart.quantity) || 1));
    }
  } catch (e) { /* ignore */ }

  const itemTotal = PRICE * qty;
  const grandTotal = itemTotal + SHIPPING;

  // Update summary UI
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setEl('summary-qty',         qty);
  setEl('summary-item-price',  formatJPY(itemTotal));
  setEl('summary-subtotal',    formatJPY(itemTotal));
  setEl('summary-total',       formatJPY(grandTotal));
  setEl('pay-btn-label', `注文を確定する（${formatJPY(grandTotal)}）`);

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
      postalCode: false,
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
        customer
      }),
      // Abort if too slow
      signal: AbortSignal.timeout ? AbortSignal.timeout(30000) : undefined
    });

    const data = await res.json();

    if (res.ok && data.success) {
      // Success — clear cart and redirect
      try { sessionStorage.removeItem('coedo_cart'); } catch (e) {}
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
document.addEventListener('DOMContentLoaded', async () => {
  loadCart();
  addRealTimeValidation();
  await initSquare();

  document.getElementById('btn-pay')?.addEventListener('click', handleCardSubmit);
});
