const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { notFound, errorHandler } = require('./middleware/error');
const { router: uploadRouter, UPLOAD_DIR } = require('./routes/upload');

const app = express();
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Stripe webhook needs the raw body, so mount it before the JSON parser.
app.use('/api/payments/webhook', require('./routes/webhook'));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/users', require('./routes/users'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', uploadRouter);
app.use('/img/garment', require('./routes/garment'));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use('/product-photos', express.static(path.join(__dirname, '..', 'product-photos'), { maxAge: '7d' }));

// In production, serve the built React app.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/(api|img|uploads)\/).*/, (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

module.exports = app;
