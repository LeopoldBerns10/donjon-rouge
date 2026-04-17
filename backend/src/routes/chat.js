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
      .select('id, author_id, content, created_at, reply_to_id, reply_to_name, reply_to_content, reactions')
      .eq('channel', channel)
      .order('created_at', { ascending: false })
      .limit(Math.min(parseInt(req.query.limit) || 100, 200))

    if (error) return res.status(500).json({ error: error.message })

    const authorIds = [...new Set(messages.map((m) => m.author_id).filter(Boolean))]
    const { data: users } = await supabase
      .from('users')
      .select('id, coc_name, coc_role, site_role')
      .in('id', authorIds)

    const userMap = Object.fromEntries((users || []).map((u) => [u.id, u]))

    const result = messages.reverse().map((m) => {
      const u = userMap[m.author_id] || {}
      const rawReactions = m.reactions || {}
      // Convert { emoji: [userIds] } → { emoji: count } for display
      const reactionCounts = Object.fromEntries(
        Object.entries(rawReactions)
          .map(([e, v]) => [e, Array.isArray(v) ? v.length : (Number(v) || 0)])
          .filter(([, count]) => count > 0)
      )
      return {
        id: m.id,
        author_id: m.author_id,
        content: m.content,
        created_at: m.created_at,
        reply_to: m.reply_to_id ? true : null,
        reply_to_name: m.reply_to_name || null,
        reply_to_content: m.reply_to_content || null,
        reactions: reactionCounts,
        author_name: u.coc_name || 'Inconnu',
        author_coc_role: u.coc_role || 'member',
        author_site_role: u.site_role || null,
        author_coc_name: u.coc_name || null,
        author_hdv: null,
      }
    })

    res.json(result)
  })

  router.post('/messages', authMiddleware, async (req, res) => {
    const { channel, content, reply_to_id, reply_to_name, reply_to_content } = req.body
    if (!channel || !content) return res.status(400).json({ error: 'channel et content requis' })

    const insertData = {
      author_id: req.user.id,
      channel,
      content,
      ...(reply_to_id && { reply_to_id, reply_to_name, reply_to_content }),
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select('id, content, created_at')
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json(data)
  })

  router.post('/messages/:id/reaction', authMiddleware, async (req, res) => {
    const { id } = req.params
    const { emoji } = req.body
    const userId = req.user.id

    if (!emoji) return res.status(400).json({ error: 'emoji requis' })

    const { data: msg, error: fetchErr } = await supabase
      .from('chat_messages')
      .select('id, reactions')
      .eq('id', id)
      .single()

    if (fetchErr || !msg) return res.status(404).json({ error: 'Message introuvable' })

    const reactions = msg.reactions || {}
    const users = Array.isArray(reactions[emoji]) ? reactions[emoji] : []

    const updated = { ...reactions }
    if (users.includes(userId)) {
      updated[emoji] = users.filter((u) => u !== userId)
    } else {
      updated[emoji] = [...users, userId]
    }

    // Clean up empty arrays
    Object.keys(updated).forEach((k) => { if (!updated[k].length) delete updated[k] })

    const { error: updateErr } = await supabase
      .from('chat_messages')
      .update({ reactions: updated })
      .eq('id', id)

    if (updateErr) return res.status(500).json({ error: updateErr.message })

    const counts = Object.fromEntries(
      Object.entries(updated).map(([e, arr]) => [e, arr.length])
    )

    io.emit('message_reaction', { id, reactions: counts })
    res.json({ reactions: counts })
  })

  router.post('/mark-read', authMiddleware, async (req, res) => {
    await supabase
      .from('users')
      .update({ last_seen_chat_at: new Date().toISOString() })
      .eq('id', req.user.id)
    res.json({ success: true })
  })

  router.delete('/messages/:id', authMiddleware, async (req, res) => {
    const { id } = req.params
    const { id: userId, coc_role, site_role } = req.user

    const { data: msg, error: fetchErr } = await supabase
      .from('chat_messages')
      .select('id, author_id')
      .eq('id', id)
      .single()

    if (fetchErr || !msg) return res.status(404).json({ error: 'Message introuvable' })

    const isOwner = msg.author_id === userId
    const isPrivileged =
      ['superadmin', 'admin'].includes(site_role) ||
      PRIVILEGED_ROLES.includes(coc_role)

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

    const { id: userId } = req.user

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
