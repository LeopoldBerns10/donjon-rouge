import supabase from '../lib/supabase.js'

function isAdmin(user) {
  return ['superadmin', 'admin'].includes(user?.site_role)
}

function isPrivileged(user) {
  return isAdmin(user) || ['leader', 'coLeader'].includes(user?.coc_role)
}

// ── Catégories ───────────────────────────────────────────────────────────────

export async function getCategories(req, res) {
  const { data, error } = await supabase
    .from('forum_categories')
    .select('*')
    .order('order_index')
  if (error) return res.status(500).json({ error: error.message })

  const cats = data || []
  const roots = cats.filter(c => !c.parent_id)
  const result = roots.map(root => ({
    ...root,
    subcategories: cats.filter(c => c.parent_id === root.id)
  }))
  res.json(result)
}

export async function createCategory(req, res) {
  const { name, description, icon, order_index, parent_id, color, allow_member_subcategories } = req.body
  if (!name) return res.status(400).json({ error: 'Nom requis' })

  const { data, error } = await supabase
    .from('forum_categories')
    .insert({
      name,
      description: description || '',
      icon: icon || '💬',
      order_index: order_index ?? 99,
      parent_id: parent_id || null,
      color: color || '#dc2626',
      allow_member_subcategories: allow_member_subcategories || false
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ ...data, subcategories: [] })
}

export async function updateCategory(req, res) {
  const { id } = req.params
  const { name, description, icon, color, allow_member_subcategories, order_index } = req.body

  const updates = {}
  if (name !== undefined) updates.name = name
  if (description !== undefined) updates.description = description
  if (icon !== undefined) updates.icon = icon
  if (color !== undefined) updates.color = color
  if (allow_member_subcategories !== undefined) updates.allow_member_subcategories = allow_member_subcategories
  if (order_index !== undefined) updates.order_index = order_index

  const { data, error } = await supabase
    .from('forum_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

export async function deleteCategory(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('forum_categories').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

// ── Posts ────────────────────────────────────────────────────────────────────

export async function getCategoryPosts(req, res) {
  const { catId } = req.params

  const { data: posts, error } = await supabase
    .from('forum_posts')
    .select('id, category_id, author_id, author_name, author_coc_role, author_site_role, title, content, image_url, is_pinned, pin_color, allow_reactions, allow_comments, reaction_preset, created_at, updated_at')
    .eq('category_id', catId)
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })

  const postIds = (posts || []).map(p => p.id)

  // Comptage commentaires
  const commentCounts = {}
  if (postIds.length > 0) {
    const { data: cc } = await supabase
      .from('forum_comments')
      .select('post_id')
      .in('post_id', postIds)
    for (const row of cc || []) {
      commentCounts[row.post_id] = (commentCounts[row.post_id] || 0) + 1
    }
  }

  // Comptage réactions
  const reactionCounts = {}
  if (postIds.length > 0) {
    const { data: rc } = await supabase
      .from('forum_reactions')
      .select('post_id, emoji')
      .in('post_id', postIds)
    for (const row of rc || []) {
      if (!reactionCounts[row.post_id]) reactionCounts[row.post_id] = {}
      reactionCounts[row.post_id][row.emoji] = (reactionCounts[row.post_id][row.emoji] || 0) + 1
    }
  }

  res.json((posts || []).map(p => ({
    ...p,
    comment_count: commentCounts[p.id] || 0,
    reaction_counts: reactionCounts[p.id] || {}
  })))
}

export async function getPost(req, res) {
  const { id } = req.params

  const { data: post, error } = await supabase
    .from('forum_posts')
    .select('*')
    .eq('id', id)
    .single()
  if (error || !post) return res.status(404).json({ error: 'Post introuvable' })

  const { data: comments } = await supabase
    .from('forum_comments')
    .select('*')
    .eq('post_id', id)
    .order('created_at', { ascending: true })

  const { data: reactions } = await supabase
    .from('forum_reactions')
    .select('emoji, user_id')
    .eq('post_id', id)

  const reactionCounts = {}
  const userReactions = []
  const userId = req.user?.id
  for (const r of reactions || []) {
    reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1
    if (userId && r.user_id === userId) userReactions.push(r.emoji)
  }

  res.json({
    ...post,
    comments: comments || [],
    reaction_counts: reactionCounts,
    user_reactions: userReactions
  })
}

export async function createPost(req, res) {
  console.log('CREATE POST - user:', req.user?.id, req.user?.coc_name)
  console.log('CREATE POST - body:', req.body)
  const { title, content, category_id, image_url, allow_reactions, allow_comments, reaction_preset } = req.body
  if (!title || !category_id) return res.status(400).json({ error: 'Titre et catégorie requis' })

  const { data: userData } = await supabase
    .from('users')
    .select('coc_name, coc_role, site_role')
    .eq('id', req.user.id)
    .single()

  const { data, error } = await supabase
    .from('forum_posts')
    .insert({
      author_id: req.user.id,
      author_name: userData?.coc_name || req.user.coc_name || 'Inconnu',
      author_coc_role: userData?.coc_role || null,
      author_site_role: userData?.site_role || null,
      title,
      content: content || '',
      category_id,
      image_url: image_url || null,
      is_pinned: false,
      allow_reactions: allow_reactions || 'preset',
      allow_comments: allow_comments !== false,
      reaction_preset: reaction_preset || ['👍', '👎', '❤️', '🔥', '⭐']
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json({ ...data, comment_count: 0, reaction_counts: {}, user_reactions: [] })
}

export async function updatePost(req, res) {
  const { id } = req.params
  const { title, content, image_url, allow_reactions, allow_comments, reaction_preset } = req.body

  const { data: post } = await supabase.from('forum_posts').select('id, author_id').eq('id', id).single()
  if (!post) return res.status(404).json({ error: 'Post introuvable' })

  const isCyberAlf = req.user?.coc_name === 'CyberAlf'
  const canManage = post.author_id === req.user.id || isPrivileged(req.user) || isCyberAlf
  if (!canManage) return res.status(403).json({ error: 'Non autorisé' })

  const updates = { updated_at: new Date().toISOString() }
  if (title !== undefined) updates.title = title
  if (content !== undefined) updates.content = content
  if (image_url !== undefined) updates.image_url = image_url
  if (allow_reactions !== undefined) updates.allow_reactions = allow_reactions
  if (allow_comments !== undefined) updates.allow_comments = allow_comments
  if (reaction_preset !== undefined) updates.reaction_preset = reaction_preset

  const { data, error } = await supabase.from('forum_posts').update(updates).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

export async function deletePost(req, res) {
  const { id } = req.params
  const { data: post } = await supabase.from('forum_posts').select('id, author_id').eq('id', id).single()
  if (!post) return res.status(404).json({ error: 'Post introuvable' })

  const isCyberAlf = req.user?.coc_name === 'CyberAlf'
  const canManage = post.author_id === req.user.id || isPrivileged(req.user) || isCyberAlf
  if (!canManage) return res.status(403).json({ error: 'Non autorisé' })

  const { error } = await supabase.from('forum_posts').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

export async function pinPost(req, res) {
  const isCyberAlf = req.user?.coc_name === 'CyberAlf'
  if (!isPrivileged(req.user) && !isCyberAlf) return res.status(403).json({ error: 'Non autorisé' })

  const { id } = req.params
  const { pin_color } = req.body

  const { data: post } = await supabase.from('forum_posts').select('id, is_pinned').eq('id', id).single()
  if (!post) return res.status(404).json({ error: 'Post introuvable' })

  const updates = { is_pinned: !post.is_pinned }
  if (pin_color) updates.pin_color = pin_color

  const { data, error } = await supabase.from('forum_posts').update(updates).eq('id', id).select().single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
}

// ── Commentaires ─────────────────────────────────────────────────────────────

export async function addComment(req, res) {
  const { id: postId } = req.params
  const { content } = req.body
  if (!content) return res.status(400).json({ error: 'Contenu requis' })

  const { data: post } = await supabase.from('forum_posts').select('id, allow_comments').eq('id', postId).single()
  if (!post) return res.status(404).json({ error: 'Post introuvable' })
  if (!post.allow_comments) return res.status(403).json({ error: 'Commentaires désactivés sur ce post' })

  const { data: userData } = await supabase
    .from('users')
    .select('coc_name, coc_role, site_role')
    .eq('id', req.user.id)
    .single()

  const { data, error } = await supabase
    .from('forum_comments')
    .insert({
      post_id: postId,
      author_id: req.user.id,
      author_name: userData?.coc_name || 'Inconnu',
      author_coc_role: userData?.coc_role || null,
      author_site_role: userData?.site_role || null,
      content
    })
    .select()
    .single()

  if (error) return res.status(500).json({ error: error.message })
  res.status(201).json(data)
}

export async function deleteComment(req, res) {
  const { id } = req.params
  const { data: comment } = await supabase.from('forum_comments').select('id, post_id, author_id').eq('id', id).single()
  if (!comment) return res.status(404).json({ error: 'Commentaire introuvable' })

  const { data: post } = await supabase.from('forum_posts').select('author_id').eq('id', comment.post_id).single()
  const isPostAuthor = post?.author_id === req.user.id
  const isCommentAuthor = comment.author_id === req.user.id
  const isCyberAlf = req.user?.coc_name === 'CyberAlf'

  if (!isCommentAuthor && !isPostAuthor && !isPrivileged(req.user) && !isCyberAlf) return res.status(403).json({ error: 'Non autorisé' })

  const { error } = await supabase.from('forum_comments').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

export async function clearComments(req, res) {
  const { id: postId } = req.params
  const { data: post } = await supabase.from('forum_posts').select('author_id').eq('id', postId).single()
  if (!post) return res.status(404).json({ error: 'Post introuvable' })
  const isCyberAlf = req.user?.coc_name === 'CyberAlf'
  if (post.author_id !== req.user.id && !isPrivileged(req.user) && !isCyberAlf) return res.status(403).json({ error: 'Non autorisé' })

  const { error } = await supabase.from('forum_comments').delete().eq('post_id', postId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

// ── Réactions ────────────────────────────────────────────────────────────────

export async function toggleReaction(req, res) {
  const { id: postId } = req.params
  const { emoji } = req.body
  const userId = req.user.id

  if (!emoji) return res.status(400).json({ error: 'emoji requis' })

  const { data: existing } = await supabase
    .from('forum_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('emoji', emoji)
    .maybeSingle()

  if (existing) {
    await supabase.from('forum_reactions').delete().eq('id', existing.id)
    return res.json({ active: false, emoji })
  } else {
    await supabase.from('forum_reactions').insert({ post_id: postId, user_id: userId, emoji })
    return res.json({ active: true, emoji })
  }
}

export async function getReactions(req, res) {
  const { id: postId } = req.params
  const userId = req.user?.id

  const { data } = await supabase
    .from('forum_reactions')
    .select('emoji, user_id')
    .eq('post_id', postId)

  const counts = {}
  const userReactions = []
  for (const r of data || []) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1
    if (userId && r.user_id === userId) userReactions.push(r.emoji)
  }

  res.json({ counts, userReactions })
}
