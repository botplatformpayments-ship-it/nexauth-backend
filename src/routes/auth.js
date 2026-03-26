const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// ── DASHBOARD OWNER REGISTER ─────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, firstName, lastName } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password min 8 chars' });

    const { data: existing } = await supabase
      .from('users').select('id')
      .or(`username.eq.${username},email.eq.${email}`).single();
    if (existing)
      return res.status(409).json({ success: false, message: 'Username or email taken' });

    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from('users').insert({
      id: uuidv4(), username, email, password: hashedPassword,
      first_name: firstName || '', last_name: lastName || '',
      plan: 'free', created_at: new Date().toISOString()
    }).select('id, username, email, plan').single();

    if (error) throw error;

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// ── DASHBOARD OWNER LOGIN ────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    const { data: user } = await supabase.from('users').select('*')
      .or(`username.eq.${username},email.eq.${username}`).single();
    if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );
    res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email, plan: user.plan } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ── APP USER LOGIN (C# SDK / WinForms) ──────────────
// Yeh endpoint C# app ke liye hai — app_users table check karta hai
router.post('/app-login', async (req, res) => {
  try {
    const { username, password, hwid } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'All fields required' });

    // app_users table mein dhundho
    const { data: appUser } = await supabase
      .from('app_users')
      .select('*')
      .or(`username.eq.${username},email.eq.${username}`)
      .single();

    if (!appUser)
      return res.status(401).json({ success: false, message: 'Invalid username or password' });

    // Ban check
    if (appUser.status === 'banned')
      return res.status(403).json({ success: false, message: 'Your account has been banned' });

    // Expiry check
    if (appUser.subscription_expiry && new Date(appUser.subscription_expiry) < new Date())
      return res.status(403).json({ success: false, message: 'Subscription expired' });

    // Password check
    const valid = await bcrypt.compare(password, appUser.password);
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid username or password' });

    // HWID check — agar pehle se bound hai toh match karo
    if (appUser.hwid && hwid && appUser.hwid !== hwid)
      return res.status(403).json({ success: false, message: 'HWID mismatch — contact support' });

    // HWID bind karo agar pehli baar login hai
    if (!appUser.hwid && hwid) {
      await supabase.from('app_users').update({ hwid }).eq('id', appUser.id);
    }

    // Token generate karo
    const token = jwt.sign(
      { id: appUser.id, username: appUser.username, appId: appUser.app_id },
      process.env.JWT_SECRET, { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: appUser.id,
        username: appUser.username,
        email: appUser.email,
        status: appUser.status,
        subscription_expiry: appUser.subscription_expiry
      }
    });
  } catch (err) {
    console.error('[APP-LOGIN]', err.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ── ME ───────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  const { data: user } = await supabase.from('users')
    .select('id, username, email, first_name, last_name, plan, created_at')
    .eq('id', req.user.id).single();
  res.json({ success: true, user });
});

module.exports = router;