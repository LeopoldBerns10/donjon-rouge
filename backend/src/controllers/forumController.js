import supabase from '../lib/supabase.js'

const PRIVILEGED_COC_ROLES = ['leader', 'coLeader']

function isPrivileged(user) {
  return (
    ['superadmin', 'admin'].includes(user?.site_role) ||
    PRIVILEGED_COC_ROLES.includes(user?.coc_role)
  )
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
      author_id: req.user.id,
      author_name: req.user.coc_name,
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
    .from('users').select('id, coc_name, coc_role').eq('id', req.user.id).single()

  res.status(201).json({ ...data, author: author || null })
}

export async function editPost(req, res) {
  const { id } = req.params
  const { title, content, category } = req.body

  const { data: post, error: fetchErr } = await supabase
    .from('forum_posts').select('id, author_id').eq('id', id).single()

  if (fetchErr || !post) return res.status(404).json({ error: 'Post introuvable' })
  if (post.author_id !== req.user.id) return res.status(403).json({ error: 'Non autorisé' })

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
    .insert({ post_id: id, author_id: req.user.id, content })
    .select('id, author_id, content, created_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const { data: author } = await supabase
    .from('users').select('id, coc_name, coc_role').eq('id', req.user.id).single()

  res.status(201).json({ ...data, author: author || null })
}

export async function likePost(req, res) {
  const { id } = req.params
  const userId = req.user.id

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

  if (post.author_id !== req.user.id && !isPrivileged(req.user)) {
    return res.status(403).json({ error: 'Non autorisé' })
  }

  const { error } = await supabase.from('forum_posts').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

// ── Catégories ───────────────────────────────────────────────────────────────

export async function getCategories(req, res) {
  const { data, error } = await supabase
    .from('forum_categories')
    .select('*')
    .order('order_index')
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
}

export async function createCategory(req, res) {
  const { name, description, icon, order_index } = req.body
  if (!name) return res.status(400).json({ error: 'Nom de catégorie requis' })

  const { data, error } = await supabase
    .from('forum_categories')
    .insert({ name, description: description || '', icon: icon || '💬', order_index: order_index ?? 99 })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

export async function deleteCategory(req, res) {
  const { id } = req.params

  const { error } = await supabase
    .from('forum_categories')
    .delete()
    .eq('id', id)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

// ── Posts par catégorie ──────────────────────────────────────────────────────

export async function getCategoryPosts(req, res) {
  const { catId } = req.params
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id, category_id, author_id, author_name, title, content, image_url, is_pinned, created_at, updated_at')
    .eq('category_id', catId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  const authorIds = [...new Set((data || []).map((p) => p.author_id).filter(Boolean))]
  const userMap = await fetchAuthors(authorIds)

  res.json((data || []).map((p) => ({ ...p, author: userMap[p.author_id] || null })))
}

export async function createCategoryPost(req, res) {
  const { title, content, category_id, image_url } = req.body
  if (!title || !category_id) return res.status(400).json({ error: 'Titre et catégorie requis' })

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      author_id: req.user.id,
      author_name: req.user.coc_name || 'Inconnu',
      title,
      content: content || '',
      category_id,
      image_url: image_url || null,
      is_pinned: false,
    })
    .select('id, category_id, author_id, author_name, title, content, image_url, is_pinned, created_at')
    .single()

  if (error) return res.status(500).json({ error: error.message })

  const { data: author } = await supabase
    .from('users').select('id, coc_name, coc_role').eq('id', req.user.id).single()

  res.status(201).json({ ...data, author: author || null })
}

// ── Réactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(req, res) {
  const { id: postId } = req.params
  const { reaction_type } = req.body
  const userId = req.user.id

  if (!['up', 'down', 'heart'].includes(reaction_type)) {
    return res.status(400).json({ error: 'Type invalide (up, down, heart)' })
  }

  const { data: existing } = await supabase
    .from('forum_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', reaction_type)
    .maybeSingle()

  if (existing) {
    await supabase.from('forum_reactions').delete().eq('id', existing.id)
    return res.json({ active: false, reaction_type })
  } else {
    await supabase.from('forum_reactions').insert({ post_id: postId, user_id: userId, reaction_type })
    return res.json({ active: true, reaction_type })
  }
}

export async function getReactions(req, res) {
  const { id: postId } = req.params
  const userId = req.user?.id

  const { data } = await supabase
    .from('forum_reactions')
    .select('reaction_type, user_id')
    .eq('post_id', postId)

  const counts = { up: 0, down: 0, heart: 0 }
  const userReactions = { up: false, down: false, heart: false }

  for (const r of data || []) {
    if (counts[r.reaction_type] !== undefined) counts[r.reaction_type]++
    if (userId && r.user_id === userId) userReactions[r.reaction_type] = true
  }

  res.json({ counts, userReactions })
}

export async function getUserReactions(req, res) {
  const { id: postId } = req.params
  const userId = req.user.id

  const { data } = await supabase
    .from('forum_reactions')
    .select('reaction_type')
    .eq('post_id', postId)
    .eq('user_id', userId)

  const userReactions = { up: false, down: false, heart: false }
  for (const r of data || []) userReactions[r.reaction_type] = true
  res.json(userReactions)
}

export async function getAllPostsReactions(req, res) {
  const { postIds } = req.query
  if (!postIds) return res.json({})

  const ids = postIds.split(',').filter(Boolean)
  const { data } = await supabase
    .from('forum_reactions')
    .select('post_id, reaction_type, user_id')
    .in('post_id', ids)

  const userId = req.user?.id
  const result = {}

  for (const r of data || []) {
    if (!result[r.post_id]) result[r.post_id] = { counts: { up: 0, down: 0, heart: 0 }, userReactions: { up: false, down: false, heart: false } }
    if (result[r.post_id].counts[r.reaction_type] !== undefined) result[r.post_id].counts[r.reaction_type]++
    if (userId && r.user_id === userId) result[r.post_id].userReactions[r.reaction_type] = true
  }

  res.json(result)
}
