require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const authRoutes          = require('./routes/auth');
const licenseRoutes       = require('./routes/licenses');
const hwidRoutes          = require('./routes/hwid');
const apiKeyRoutes        = require('./routes/apikeys');
const appRoutes           = require('./routes/apps');
const userRoutes          = require('./routes/users');
const variableRoutes      = require('./routes/variables');
const announcementRoutes  = require('./routes/announcements');
const sellerRoutes        = require('./routes/sellers');
const webhookRoutes       = require('./routes/webhooks');

const app = express();

// ── MIDDLEWARE ─────────────────────────────────────
app.use(cors());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many requests, slow down.' }
});
app.use(limiter);

// ── ROUTES ─────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/licenses',      licenseRoutes);
app.use('/api/hwid',          hwidRoutes);
app.use('/api/apikeys',       apiKeyRoutes);
app.use('/api/apps',          appRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/variables',     variableRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/sellers',       sellerRoutes);
app.use('/api/webhooks',      webhookRoutes);

// ── HEALTH CHECK ───────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '⬡ NexAuth API is running',
    version: '2.0.0',
    uptime: process.uptime().toFixed(2) + 's'
  });
});

// ── 404 ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── ERROR HANDLER ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ── START ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n⬡  NexAuth API running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});