import { Router } from 'express'
import supabase from '../lib/supabase.js'
import authMiddleware from '../middleware/auth.js'

const router = Router()

router.get('/messages/:channel', async (req, res) => {
  const { channel } = req.params
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*, author:players(id, username, role, avatar_url)')
    .eq('channel', channel)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return res.status(500).json({ error: error.message })
  res.json(data.reverse())
})

router.post('/messages', authMiddleware, async (req, res) => {
  const { channel, content } = req.body
  if (!channel || !content) return res.status(400).json({ error: 'channel et content requis' })

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ author_id: req.user.id, channel, content })
    .select('*, author:players(id, username, role, avatar_url)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
})

export default router
