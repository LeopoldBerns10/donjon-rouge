import supabase from '../lib/supabase.js'

export async function getAnnouncements(req, res) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*, author:players(id, username, role)')
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

export async function createAnnouncement(req, res) {
  const { type, title, content } = req.body
  if (!type || !title || !content) {
    return res.status(400).json({ error: 'type, titre et contenu requis' })
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({ author_id: req.user.id, type, title, content, is_active: true })
    .select('*, author:players(id, username, role)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

export async function updateAnnouncement(req, res) {
  const { id } = req.params
  const updates = req.body

  const { data, error } = await supabase
    .from('announcements')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}
