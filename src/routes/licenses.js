const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto   = require('crypto');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

function generateLicenseKey() {
  const seg = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${seg()}-${seg()}-${seg()}-${seg()}`;
}

function calcExpiry(type) {
  const now = new Date();
  switch (type) {
    case 'lifetime': return null;
    case 'yearly':   now.setFullYear(now.getFullYear() + 1); break;
    case 'monthly':  now.setMonth(now.getMonth() + 1); break;
    case 'weekly':   now.setDate(now.getDate() + 7); break;
    case 'daily':    now.setDate(now.getDate() + 1); break;
    default: return null;
  }
  return now.toISOString();
}

router.post('/generate', authMiddleware, async (req, res) => {
  const { appId, type = 'lifetime', note = '' } = req.body;
  if (!appId) return res.status(400).json({ success: false, message: 'appId required' });
  const { data, error } = await supabase.from('licenses').insert({
    id: uuidv4(), app_id: appId, key: generateLicenseKey(),
    type, status: 'active', note, hwid: null,
    expires_at: calcExpiry(type), created_at: new Date().toISOString()
  }).select().single();
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.status(201).json({ success: true, license: data });
});

router.post('/bulk', authMiddleware, async (req, res) => {
  const { appId, type = 'lifetime', count = 10 } = req.body;
  if (count > 500) return res.status(400).json({ success: false, message: 'Max 500' });
  const licenses = Array.from({ length: count }, () => ({
    id: uuidv4(), app_id: appId, key: generateLicenseKey(),
    type, status: 'active', hwid: null,
    expires_at: calcExpiry(type), created_at: new Date().toISOString()
  }));
  const { data, error } = await supabase.from('licenses').insert(licenses).select();
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.status(201).json({ success: true, count: data.length, licenses: data });
});

router.get('/list', authMiddleware, async (req, res) => {
  const { appId } = req.query;
  const { data, error } = await supabase.from('licenses').select('*')
    .eq('app_id', appId).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.json({ success: true, licenses: data });
});

router.post('/revoke', authMiddleware, async (req, res) => {
  const { licenseId } = req.body;
  const { data, error } = await supabase.from('licenses')
    .update({ status: 'revoked', hwid: null }).eq('id', licenseId).select().single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, license: data });
});

router.post('/validate', async (req, res) => {
  try {
    const { appId, key, hwid } = req.body;
    if (!appId || !key) return res.status(400).json({ success: false, message: 'appId and key required' });

    const { data: app } = await supabase.from('apps').select('id, status').eq('id', appId).single();
    if (!app || app.status !== 'active')
      return res.status(403).json({ success: false, message: 'App inactive' });

    const { data: license } = await supabase.from('licenses').select('*')
      .eq('app_id', appId).eq('key', key).single();
    if (!license) return res.status(404).json({ success: false, message: 'License not found' });
    if (license.status === 'revoked') return res.status(403).json({ success: false, message: 'License revoked' });
    if (license.expires_at && new Date(license.expires_at) < new Date())
      return res.status(403).json({ success: false, message: 'License expired' });

    if (hwid) {
      if (!license.hwid) {
        await supabase.from('licenses').update({ hwid }).eq('id', license.id);
      } else if (license.hwid !== hwid) {
        return res.status(403).json({ success: false, message: 'HWID mismatch' });
      }
    }

    await supabase.from('activity_logs').insert({
      id: uuidv4(), app_id: appId, event: 'license_validated',
      license_id: license.id, hwid: hwid || null, ip: req.ip,
      created_at: new Date().toISOString()
    });

    res.json({ success: true, message: 'License valid', license: { key: license.key, type: license.type, expires_at: license.expires_at } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Validation failed' });
  }
});

module.exports = router;