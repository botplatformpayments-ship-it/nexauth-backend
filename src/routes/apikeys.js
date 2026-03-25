const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto   = require('crypto');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

function generateApiKey() {
  return 'nxa_' + crypto.randomBytes(32).toString('hex');
}

router.post('/', async (req, res) => {
  const { appId, label } = req.body;
  if (!appId) return res.status(400).json({ success: false, message: 'appId required' });
  const { data, error } = await supabase.from('api_keys').insert({
    id: uuidv4(), app_id: appId, owner_id: req.user.id,
    key: generateApiKey(), label: label || 'Default Key',
    created_at: new Date().toISOString()
  }).select().single();
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.status(201).json({ success: true, apiKey: data });
});

router.get('/', async (req, res) => {
  const { appId } = req.query;
  const { data, error } = await supabase.from('api_keys').select('*')
    .eq('owner_id', req.user.id).eq('app_id', appId);
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  const masked = data.map(k => ({ ...k, key: k.key.slice(0, 12) + '...' }));
  res.json({ success: true, apiKeys: masked });
});

router.delete('/:id', async (req, res) => {
  await supabase.from('api_keys').delete().eq('id', req.params.id).eq('owner_id', req.user.id);
  res.json({ success: true, message: 'Deleted' });
});

module.exports = router;