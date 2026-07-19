'use strict';

require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const paymentRouter = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Security Headers (Helmet) ───────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'self'",
        // Square Web Payments SDK (sandbox)
        'https://sandbox.web.squarecdn.com',
        // Square Web Payments SDK (production)
        'https://web.squarecdn.com',
        // Google Fonts
        'https://fonts.googleapis.com',
        // Allow inline scripts with nonce (added via middleware below)
        "'unsafe-inline'" // NOTE: Replace with nonce-based CSP in production
      ],
      styleSrc: [
        "'self'",
        "'unsafe-inline'", // Required for Square card element styles
        'https://fonts.googleapis.com',
        'https://sandbox.web.squarecdn.com',
        'https://web.squarecdn.com'
      ],
      fontSrc: [
        "'self'",
        'https://fonts.gstatic.com'
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https:'
      ],
      connectSrc: [
        "'self'",
        'https://pci-connect.squareupsandbox.com',
        'https://pci-connect.squareup.com',
        'https://web.squarecdn.com',
        'https://sandbox.web.squarecdn.com',
        'https://squareupsandbox.com',
        'https://squareup.com',
        // Square SDK uses Sentry for internal error reporting
        'https://o160250.ingest.sentry.io',
        'https://*.ingest.sentry.io'
      ],
      frameSrc: [
        'https://web.squarecdn.com',
        'https://sandbox.web.squarecdn.com',
        'https://pci-connect.squareupsandbox.com',
        'https://pci-connect.squareup.com',
        'https://squareupsandbox.com',
        'https://squareup.com'
      ],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Disable MIME sniffing
  noSniff: true,
  // XSS Protection
  xssFilter: true,
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// ─── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'https://coedo-shop.vercel.app'
];
if (process.env.ALLOWED_ORIGIN) {
  allowedOrigins.push(process.env.ALLOWED_ORIGIN);
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, server-to-server)
    if (!origin) return callback(null, true);
    // Allow exact matched domains or Vercel preview environments
    if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    console.warn(`[CORS] Rejected Origin: ${origin}`);
    callback(new Error('CORS policy violation'));
  },
  credentials: true,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token']
}));

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' })); // Limit payload size
app.use(express.urlencoded({ extended: false, limit: '10kb' }));
app.use(cookieParser());

// ─── Rate Limiting ────────────────────────────────────────────────────────────
// Global limiter
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Strict limiter for payment endpoint
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment attempts, please try again in 15 minutes.' },
  skipSuccessfulRequests: false
});

app.use(globalLimiter);
app.use('/api/payment', paymentLimiter);
app.use('/payment', paymentLimiter);

// ─── API Routes ──────────────────────────────────────────────────────────────
app.use('/api', paymentRouter);
app.use('/', paymentRouter);

// ─── Health Check ────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.SQUARE_ENVIRONMENT || 'sandbox' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', environment: process.env.SQUARE_ENVIRONMENT || 'sandbox' });
});

// ─── Error Handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} — ${err.message}`);
  
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid or missing CSRF token.' });
  }
  
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message;
    
  res.status(err.status || 500).json({ error: message });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🎵 Coedo Music Shop server running on http://localhost:${PORT}`);
    console.log(`   Environment: ${process.env.SQUARE_ENVIRONMENT || 'sandbox'}`);
  });
}

module.exports = app; // Export for Vercel serverless
