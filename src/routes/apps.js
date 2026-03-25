const express  = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../config/supabase');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('apps').select('*')
    .eq('owner_id', req.user.id).order('created_at', { ascending: false });
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.json({ success: true, apps: data });
});

router.post('/', async (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Name required' });
  const { data, error } = await supabase.from('apps').insert({
    id: uuidv4(), owner_id: req.user.id, name,
    description: description || '', status: 'active',
    created_at: new Date().toISOString()
  }).select().single();
  if (error) return res.status(500).json({ success: false, message: 'Failed' });
  res.status(201).json({ success: true, app: data });
});

router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;
  const { data, error } = await supabase.from('apps').update({ status })
    .eq('id', req.params.id).eq('owner_id', req.user.id).select().single();
  if (error || !data) return res.status(404).json({ success: false, message: 'Not found' });
  res.json({ success: true, app: data });
});

router.delete('/:id', async (req, res) => {
  await supabase.from('apps').delete().eq('id', req.params.id).eq('owner_id', req.user.id);
  res.json({ success: true, message: 'Deleted' });
});

module.exports = router;