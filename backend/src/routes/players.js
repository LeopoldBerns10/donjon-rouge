import { Router } from 'express'
import supabase from '../lib/supabase.js'
import authMiddleware from '../middleware/auth.js'
import adminOnly from '../middleware/adminOnly.js'

const router = Router()

router.get('/', authMiddleware, adminOnly, async (req, res) => {
  const { data, error } = await supabase
    .from('players')
    .select('id, username, coc_tag, role, is_admin, avatar_url, created_at, last_seen')
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params
  const { role, is_admin } = req.body

  const { data, error } = await supabase
    .from('players')
    .update({ role, is_admin })
    .eq('id', id)
    .select('id, username, role, is_admin')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  const { id } = req.params
  const { error } = await supabase.from('players').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

export default router
