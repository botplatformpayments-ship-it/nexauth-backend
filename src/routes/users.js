const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

// GET ALL USERS
router.get('/', async (req, res) => {
  try {
    const { appId } = req.query;
    let query = supabase.from('app_users').select('*').eq('owner_id', req.user.id).order('created_at', { ascending: false });
    if (appId) query = query.eq('app_id', appId);
    const { data: users, error } = await query;
    if (error) throw error;
    res.json({ success: true, users: users || [] });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch users' }); }
});

// CREATE USER
router.post('/', async (req, res) => {
  try {
    const { username, password, email, appId, expiry } = req.body;
    if (!username || !password) return res.status(400).json({ success: false, message: 'Username and password required' });
    const { data: existing } = await supabase.from('app_users').select('id').eq('owner_id', req.user.id).eq('username', username).single();
    if (existing) return res.status(409).json({ success: false, message: 'Username already exists' });
    const hashedPassword = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from('app_users').insert({
      id: uuidv4(), owner_id: req.user.id, app_id: appId || null,
      username, password: hashedPassword, email: email || '',
      hwid: null, variables: {}, subscription_expiry: expiry || null,
      status: 'active', created_at: new Date().toISOString()
    }).select('id, username, email, status, hwid, subscription_expiry, created_at').single();
    if (error) throw error;
    res.status(201).json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to create user' }); }
});

// GET SINGLE USER
router.get('/:id', async (req, res) => {
  try {
    const { data: user } = await supabase.from('app_users').select('*').eq('id', req.params.id).eq('owner_id', req.user.id).single();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to fetch user' }); }
});

// EDIT USER
router.patch('/:id', async (req, res) => {
  try {
    const { username, email, password, expiry, status } = req.body;
    const updates = {};
    if (username) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (password) updates.password = await bcrypt.hash(password, 12);
    if (expiry !== undefined) updates.subscription_expiry = expiry;
    if (status) updates.status = status;
    const { data: user, error } = await supabase.from('app_users').update(updates).eq('id', req.params.id).eq('owner_id', req.user.id).select('id, username, email, status, hwid, subscription_expiry').single();
    if (error) throw error;
    res.json({ success: true, user });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to update user' }); }
});

// DELETE USER
router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('app_users').delete().eq('id', req.params.id).eq('owner_id', req.user.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to delete user' }); }
});

// RESET HWID
router.post('/:id/reset-hwid', async (req, res) => {
  try {
    await supabase.from('app_users').update({ hwid: null }).eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true, message: 'HWID reset' });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to reset HWID' }); }
});

// BAN / UNBAN
router.post('/:id/ban', async (req, res) => {
  try {
    const { data: user } = await supabase.from('app_users').select('status').eq('id', req.params.id).eq('owner_id', req.user.id).single();
    const newStatus = user?.status === 'banned' ? 'active' : 'banned';
    await supabase.from('app_users').update({ status: newStatus }).eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true, status: newStatus });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// SET VARIABLE
router.post('/:id/variable', async (req, res) => {
  try {
    const { key, value } = req.body;
    if (!key) return res.status(400).json({ success: false, message: 'Key required' });
    const { data: user } = await supabase.from('app_users').select('variables').eq('id', req.params.id).eq('owner_id', req.user.id).single();
    const vars = user?.variables || {};
    vars[key] = value;
    await supabase.from('app_users').update({ variables: vars }).eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true, variables: vars });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

module.exports = router;