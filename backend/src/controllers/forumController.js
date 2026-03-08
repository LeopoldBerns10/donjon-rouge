import supabase from '../lib/supabase.js'

const PRIVILEGED_ROLES = ['leader', 'coLeader']

function isPrivileged(user) {
  return user.isAdmin || PRIVILEGED_ROLES.includes(user.cocRole)
}

async function fetchAuthors(ids) {
  if (!ids.length) return {}
  const { data } = await supabase
    .from('users')
    .select('id, coc_name, coc_role')
    .in('id', ids)
  return Object.fromEntries((data || []).map((u) => [u.id, u]))
}

export async function getPosts(req, res) {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id, author_id, title, content, category, likes, is_pinned, created_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return res.status(500).json({ error: error.message })

  const authorIds = [...new Set((data || []).map((p) => p.author_id).filter(Boolean))]
  const userMap = await fetchAuthors(authorIds)

  res.json((data || []).map((p) => ({ ...p, author: userMap[p.author_id] || null })))
}

export async function getPost(req, res) {
  const { id } = req.params

  const { data: post, error } = await supabase
    .from('forum_posts')
    .select('id, author_id, title, content, category, likes, is_pinned, created_at')
    .eq('id', id)
    .single()

  if (error || !post) return res.status(404).json({ error: 'Post introuvable' })

  const { data: replies } = await supabase
    .from('forum_replies')
    .select('id, author_id, content, created_at')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const allIds = [...new Set([post.author_id, ...(replies || []).map((r) => r.author_id)].filter(Boolean))]
  const userMap = await fetchAuthors(allIds)

  res.json({
    ...post,
    author: userMap[post.author_id] || null,
    replies: (replies || []).map((r) => ({ ...r, author: userMap[r.author_id] || null }))
  })
}

export async function createPost(req, res) {
  const { title, content, category } = req.body
  if (!title || !content) return res.status(400).json({ error: 'Titre et contenu requis' })

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      author_id: req.user.userId,
      title,
      content,
      category: category || 'Général',
      likes: 0,
      is_pinned: false
    })
    .select('id, author_id, title, content, category, likes, is_pinned, created_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const { data: author } = await supabase
    .from('users').select('id, coc_name, coc_role').eq('id', req.user.userId).single()

  res.status(201).json({ ...data, author: author || null })
}

export async function editPost(req, res) {
  const { id } = req.params
  const { title, content, category } = req.body

  const { data: post, error: fetchErr } = await supabase
    .from('forum_posts').select('id, author_id').eq('id', id).single()

  if (fetchErr || !post) return res.status(404).json({ error: 'Post introuvable' })
  if (post.author_id !== req.user.userId) return res.status(403).json({ error: 'Non autorisé' })

  const updates = { updated_at: new Date().toISOString() }
  if (title) updates.title = title
  if (content) updates.content = content
  if (category) updates.category = category

  const { data, error } = await supabase
    .from('forum_posts')
    .update(updates)
    .eq('id', id)
    .select('id, author_id, title, content, category, likes, is_pinned, created_at, updated_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

export async function pinPost(req, res) {
  if (!isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Réservé aux leaders et admins' })
  }

  const { id } = req.params
  const { data: post } = await supabase
    .from('forum_posts').select('id, is_pinned').eq('id', id).single()

  if (!post) return res.status(404).json({ error: 'Post introuvable' })

  const { data, error } = await supabase
    .from('forum_posts')
    .update({ is_pinned: !post.is_pinned })
    .eq('id', id)
    .select('id, is_pinned')
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

export async function replyPost(req, res) {
  const { id } = req.params
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'Contenu requis' })

  const { data, error } = await supabase
    .from('forum_replies')
    .insert({ post_id: id, author_id: req.user.userId, content })
    .select('id, author_id, content, created_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const { data: author } = await supabase
    .from('users').select('id, coc_name, coc_role').eq('id', req.user.userId).single()

  res.status(201).json({ ...data, author: author || null })
}

export async function likePost(req, res) {
  const { id } = req.params
  const userId = req.user.userId

  const { data: existing } = await supabase
    .from('post_likes').select('id').eq('user_id', userId).eq('post_id', id).single()

  if (existing) {
    await supabase.from('post_likes').delete().eq('user_id', userId).eq('post_id', id)
  } else {
    await supabase.from('post_likes').insert({ user_id: userId, post_id: id })
  }

  const { count } = await supabase
    .from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', id)

  await supabase.from('forum_posts').update({ likes: count ?? 0 }).eq('id', id)

  res.json({ liked: !existing })
}

export async function deletePost(req, res) {
  const { id } = req.params

  const { data: post } = await supabase
    .from('forum_posts').select('id, author_id').eq('id', id).single()

  if (!post) return res.status(404).json({ error: 'Post introuvable' })

  if (post.author_id !== req.user.userId && !isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Non autorisé' })
  }

  const { error } = await supabase.from('forum_posts').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}
