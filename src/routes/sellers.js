const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

// GET ALL SELLERS
router.get('/', async (req, res) => {
  try {
    const { appId } = req.query;
    if (!appId) return res.status(400).json({ success: false, message: 'appId required' });
    const { data, error } = await supabase.from('sellers').select('*').eq('app_id', appId).eq('owner_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, sellers: data || [] });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// CREATE SELLER
router.post('/', async (req, res) => {
  try {
    const { appId, name, email } = req.body;
    if (!appId || !name || !email) return res.status(400).json({ success: false, message: 'appId, name, email required' });
    const key = 'SELLER-' + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
    const { data, error } = await supabase.from('sellers').insert({
      app_id: appId, owner_id: req.user.id, name, email, key,
      balance: 0, total_sold: 0, status: 'active', created_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    res.json({ success: true, seller: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// BAN / UNBAN SELLER
router.post('/:id/ban', async (req, res) => {
  try {
    const { data: seller } = await supabase.from('sellers').select('status').eq('id', req.params.id).eq('owner_id', req.user.id).single();
    const newStatus = seller?.status === 'banned' ? 'active' : 'banned';
    await supabase.from('sellers').update({ status: newStatus }).eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true, status: newStatus });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// DELETE SELLER
router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('sellers').delete().eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

module.exports = router;