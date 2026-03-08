import { Router } from 'express'
import supabase from '../lib/supabase.js'
import authMiddleware from '../middleware/auth.js'

const PRIVILEGED_ROLES = ['leader', 'coLeader', 'admin']

export default function chatRouter(io) {
  const router = Router()

  router.get('/messages/:channel', async (req, res) => {
    const { channel } = req.params

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('id, author_id, content, created_at')
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) return res.status(500).json({ error: error.message })

    const authorIds = [...new Set(messages.map((m) => m.author_id).filter(Boolean))]
    const { data: users } = await supabase
      .from('users')
      .select('id, coc_name, coc_role')
      .in('id', authorIds)

    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]))

    const result = messages.reverse().map((m) => ({
      ...m,
      author: userMap[m.author_id] || null
    }))

    res.json(result)
  })

  router.post('/messages', authMiddleware, async (req, res) => {
    const { channel, content } = req.body
    if (!channel || !content) return res.status(400).json({ error: 'channel et content requis' })

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({ author_id: req.user.userId, channel, content })
      .select('*, author:users(id, coc_name, coc_role)')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  })

  router.delete('/messages/:id', authMiddleware, async (req, res) => {
    const { id } = req.params
    const { userId, cocRole, isAdmin } = req.user

    const { data: msg, error: fetchErr } = await supabase
      .from('chat_messages')
      .select('id, author_id')
      .eq('id', id)
      .single()

    if (fetchErr || !msg) return res.status(404).json({ error: 'Message introuvable' })

    const isOwner = msg.author_id === userId
    const isPrivileged = isAdmin || PRIVILEGED_ROLES.includes(cocRole)

    if (!isOwner && !isPrivileged) return res.status(403).json({ error: 'Non autorisé' })

    const { error } = await supabase.from('chat_messages').delete().eq('id', id)
    if (error) return res.status(500).json({ error: error.message })

    io.emit('message_deleted', { id })
    res.json({ success: true })
  })

  router.patch('/messages/:id', authMiddleware, async (req, res) => {
    const { id } = req.params
    const { content } = req.body
    if (!content?.trim()) return res.status(400).json({ error: 'content requis' })

    const { userId } = req.user

    const { data: msg, error: fetchErr } = await supabase
      .from('chat_messages')
      .select('id, author_id')
      .eq('id', id)
      .single()

    if (fetchErr || !msg) return res.status(404).json({ error: 'Message introuvable' })
    if (msg.author_id !== userId) return res.status(403).json({ error: 'Non autorisé' })

    const { data: updated, error } = await supabase
      .from('chat_messages')
      .update({ content: content.trim() })
      .eq('id', id)
      .select('id, content')
      .single()

    if (error) return res.status(500).json({ error: error.message })

    io.emit('message_edited', { id, content: updated.content })
    res.json(updated)
  })

  return router
}
