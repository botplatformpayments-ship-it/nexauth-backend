const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

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

router.get('/me', authMiddleware, async (req, res) => {
  const { data: user } = await supabase.from('users')
    .select('id, username, email, first_name, last_name, plan, created_at')
    .eq('id', req.user.id).single();
  res.json({ success: true, user });
});

module.exports = router;