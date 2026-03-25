const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

router.post('/reset', async (req, res) => {
  const { licenseId } = req.body;
  const { data, error } = await supabase.from('licenses')
    .update({ hwid: null }).eq('id', licenseId).select().single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, message: 'HWID reset', license: data });
});

router.post('/blacklist', async (req, res) => {
  const { appId, type, value, reason } = req.body;
  if (!appId || !type || !value)
    return res.status(400).json({ success: false, message: 'appId, type, value required' });
  const { data, error } = await supabase.from('blacklist').insert({
    id: uuidv4(), app_id: appId, type, value,
    reason: reason || '', created_at: new Date().toISOString()
  }).select().single();
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.status(201).json({ success: true, entry: data });
});

router.get('/blacklist', async (req, res) => {
  const { appId } = req.query;
  const { data, error } = await supabase.from('blacklist').select('*')
    .eq('app_id', appId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.json({ success: true, blacklist: data });
});

router.delete('/blacklist/:id', async (req, res) => {
  await supabase.from('blacklist').delete().eq('id', req.params.id);
  res.json({ success: true, message: 'Removed' });
});

module.exports = router;