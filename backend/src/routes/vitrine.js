import { Router } from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

// ─── Blocks CRUD ──────────────────────────────────────────────────────────────

// GET /api/vitrine/blocks
router.get('/blocks', async (req, res) => {
  const { data, error } = await supabase
    .from('vitrine_blocks')
    .select('*')
    .order('section')
    .order('order_index')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// PUT /api/vitrine/blocks/:id
router.put('/blocks/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { value } = req.body
  const { error } = await supabase
    .from('vitrine_blocks')
    .update({
      value,
      updated_at: new Date().toISOString(),
      updated_by: req.user.coc_name || req.user.id,
    })
    .eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// POST /api/vitrine/blocks
router.post('/blocks', requireAuth, requireAdmin, async (req, res) => {
  const { section, key, type = 'text', value, order_index = 99 } = req.body
  const { data, error } = await supabase
    .from('vitrine_blocks')
    .insert({
      section,
      key,
      type,
      value,
      order_index,
      updated_by: req.user.coc_name || req.user.id,
    })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/vitrine/blocks/:id
router.delete('/blocks/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { error } = await supabase.from('vitrine_blocks').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// PATCH /api/vitrine/blocks/:id/toggle
router.patch('/blocks/:id/toggle', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  const { data: block, error: fetchErr } = await supabase
    .from('vitrine_blocks')
    .select('is_visible')
    .eq('id', id)
    .single()
  if (fetchErr) return res.status(500).json({ error: fetchErr.message })
  const { error } = await supabase
    .from('vitrine_blocks')
    .update({ is_visible: !block.is_visible })
    .eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true, is_visible: !block.is_visible })
})

// ─── Upload audio ─────────────────────────────────────────────────────────────

// POST /api/vitrine/upload/audio (nouveau chemin)
router.post('/upload/audio', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })
  const ext = req.file.originalname.split('.').pop().toLowerCase()
  const filePath = `hymne/hymne.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('forum-images')
    .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
  if (error) return res.status(500).json({ error: error.message })

  const { data: urlData } = supabaseAdmin.storage.from('forum-images').getPublicUrl(filePath)

  await supabase.from('vitrine_blocks').upsert({
    section: 'hymne',
    key: 'url',
    type: 'audio',
    value: urlData.publicUrl,
    order_index: 2,
    updated_at: new Date().toISOString(),
    updated_by: req.user.coc_name || req.user.id,
  }, { onConflict: 'section,key' })

  res.json({ url: urlData.publicUrl })
})

// ─── Sections CRUD ───────────────────────────────────────────────────────────

const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// GET /api/vitrine/sections
router.get('/sections', async (req, res) => {
  const { data, error } = await supabase
    .from('vitrine_sections')
    .select('*')
    .eq('is_visible', true)
    .order('order_index')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// POST /api/vitrine/sections
router.post('/sections', requireAuth, requireAdmin, async (req, res) => {
  const { key, label, icon = '📋', order_index = 99 } = req.body
  const { data, error } = await supabase
    .from('vitrine_sections')
    .insert({ key, label, icon, order_index })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/vitrine/sections/:key
router.delete('/sections/:key', requireAuth, requireAdmin, async (req, res) => {
  const { key } = req.params
  const FIXED = ['hymne', 'recrutement', 'reglement', 'cartons', 'identite']
  if (FIXED.includes(key)) return res.status(403).json({ error: 'Section fixe non supprimable' })
  await supabase.from('vitrine_blocks').delete().eq('section', key)
  const { error } = await supabase.from('vitrine_sections').delete().eq('key', key)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// POST /api/vitrine/upload/image
router.post('/upload/image', requireAuth, requireAdmin, uploadImage.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })
  const { key = 'image' } = req.body
  const ext = req.file.originalname.split('.').pop().toLowerCase()
  const fileName = `vitrine/${key}_${Date.now()}.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('coc-assets')
    .upload(fileName, req.file.buffer, { contentType: req.file.mimetype, upsert: true })
  if (error) return res.status(500).json({ error: error.message })

  const { data: { publicUrl } } = supabaseAdmin.storage.from('coc-assets').getPublicUrl(fileName)
  res.json({ url: publicUrl })
})

// ─── Ancien système (compatibilité) ──────────────────────────────────────────

// GET /api/vitrine/content
router.get('/content', async (req, res) => {
  const { data, error } = await supabase.from('vitrine_content').select('key, value')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// PUT /api/vitrine/content/:key
router.put('/content/:key', requireAuth, requireAdmin, async (req, res) => {
  const { key } = req.params
  const { value } = req.body
  const { error } = await supabase.from('vitrine_content').upsert({
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: req.user.coc_name || req.user.id,
  })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
