const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

// GET ALL WEBHOOKS
router.get('/', async (req, res) => {
  try {
    const { appId } = req.query;
    if (!appId) return res.status(400).json({ success: false, message: 'appId required' });
    const { data, error } = await supabase.from('webhooks').select('*').eq('app_id', appId).eq('owner_id', req.user.id);
    if (error) throw error;
    res.json({ success: true, webhooks: data || [] });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// CREATE WEBHOOK
router.post('/', async (req, res) => {
  try {
    const { appId, url, events } = req.body;
    if (!appId || !url) return res.status(400).json({ success: false, message: 'appId and url required' });
    const secret = uuidv4().replace(/-/g, '');
    const { data, error } = await supabase.from('webhooks').insert({
      app_id: appId, owner_id: req.user.id, url,
      events: events || ['login', 'register', 'license_validate'],
      secret, active: true, created_at: new Date().toISOString()
    }).select().single();
    if (error) throw error;
    res.json({ success: true, webhook: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// TOGGLE ACTIVE
router.patch('/:id', async (req, res) => {
  try {
    const { active } = req.body;
    await supabase.from('webhooks').update({ active }).eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// DELETE WEBHOOK
router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('webhooks').delete().eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

module.exports = router;