const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

// GET ALL
router.get('/', async (req, res) => {
  try {
    const { appId } = req.query;
    if (!appId) return res.status(400).json({ success: false, message: 'appId required' });
    const { data, error } = await supabase.from('announcements').select('*').eq('app_id', appId).eq('owner_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, announcements: data || [] });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// CREATE
router.post('/', async (req, res) => {
  try {
    const { appId, title, message, type } = req.body;
    if (!appId || !title || !message) return res.status(400).json({ success: false, message: 'appId, title, message required' });
    const { data, error } = await supabase.from('announcements').insert({
      app_id: appId, owner_id: req.user.id, title, message, type: type || 'info', active: true, created_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    res.json({ success: true, announcement: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// TOGGLE ACTIVE
router.patch('/:id', async (req, res) => {
  try {
    const { active } = req.body;
    await supabase.from('announcements').update({ active }).eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('announcements').delete().eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

module.exports = router;