import { Router } from 'express'
import multer from 'multer'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } })

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Non connecté' })
  const ok = req.user.coc_name === 'CyberAlf' || ['superadmin', 'admin'].includes(req.user.site_role)
  if (!ok) return res.status(403).json({ error: 'Non autorisé' })
  next()
}

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

// POST /api/vitrine/upload-audio
router.post('/upload-audio', requireAuth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Aucun fichier' })
  const ext = req.file.originalname.split('.').pop().toLowerCase()
  const filePath = `hymne/hymne.${ext}`

  const { error } = await supabaseAdmin.storage
    .from('forum-images')
    .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: true })

  if (error) return res.status(500).json({ error: error.message })

  const { data: urlData } = supabaseAdmin.storage.from('forum-images').getPublicUrl(filePath)

  await supabase.from('vitrine_content').upsert({
    key: 'hymne_url',
    value: urlData.publicUrl,
    updated_at: new Date().toISOString(),
    updated_by: req.user.coc_name || req.user.id,
  })

  res.json({ url: urlData.publicUrl })
})

export default router
