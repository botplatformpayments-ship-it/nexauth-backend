const express = require('express');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

// GET ALL VARIABLES FOR APP
router.get('/', async (req, res) => {
  try {
    const { appId } = req.query;
    if (!appId) return res.status(400).json({ success: false, message: 'appId required' });
    const { data: variables, error } = await supabase.from('app_variables').select('*').eq('app_id', appId).eq('owner_id', req.user.id).order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, variables: variables || [] });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// CREATE / UPDATE VARIABLE
router.post('/', async (req, res) => {
  try {
    const { appId, key, value } = req.body;
    if (!appId || !key || value === undefined) return res.status(400).json({ success: false, message: 'appId, key, value required' });
    const { data, error } = await supabase.from('app_variables').upsert({
      app_id: appId, owner_id: req.user.id, key, value, created_at: new Date().toISOString()
    }, { onConflict: 'app_id,key' }).select().single();
    if (error) throw error;
    res.json({ success: true, variable: data });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

// DELETE VARIABLE
router.delete('/:id', async (req, res) => {
  try {
    await supabase.from('app_variables').delete().eq('id', req.params.id).eq('owner_id', req.user.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: 'Failed' }); }
});

module.exports = router;