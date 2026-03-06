import supabase from '../lib/supabase.js'

export async function getPosts(req, res) {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('*, author:players(id, username, role, avatar_url)')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

export async function getPost(req, res) {
  const { id } = req.params

  const { data: post, error } = await supabase
    .from('forum_posts')
    .select('*, author:players(id, username, role, avatar_url)')
    .eq('id', id)
    .single()

  if (error || !post) return res.status(404).json({ error: 'Post introuvable' })

  const { data: replies } = await supabase
    .from('forum_replies')
    .select('*, author:players(id, username, role, avatar_url)')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  res.json({ ...post, replies: replies || [] })
}

export async function createPost(req, res) {
  const { title, content, category } = req.body
  if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis' })

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      author_id: req.user.id,
      title,
      content,
      category: category || 'Général',
      likes: 0,
      is_pinned: false,
      is_announcement: false
    })
    .select('*, author:players(id, username, role, avatar_url)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

export async function replyPost(req, res) {
  const { id } = req.params
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'Contenu requis' })

  const { data, error } = await supabase
    .from('forum_replies')
    .insert({ post_id: id, author_id: req.user.id, content, likes: 0 })
    .select('*, author:players(id, username, role, avatar_url)')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

export async function likePost(req, res) {
  const { id } = req.params
  const playerId = req.user.id

  const { data: existing } = await supabase
    .from('post_likes')
    .select('*')
    .eq('player_id', playerId)
    .eq('post_id', id)
    .single()

  if (existing) {
    await supabase.from('post_likes').delete().eq('player_id', playerId).eq('post_id', id)
    await supabase.rpc('decrement_post_likes', { post_id: id })
    return res.json({ liked: false })
  }

  await supabase.from('post_likes').insert({ player_id: playerId, post_id: id })
  await supabase.rpc('increment_post_likes', { post_id: id })
  res.json({ liked: true })
}

export async function deletePost(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('forum_posts').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}
