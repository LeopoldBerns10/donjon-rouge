import { useState, useEffect, useRef } from 'react'
import api from '../lib/api.js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSocket } from '../hooks/useSocket.js'
import SectionHeader from '../components/SectionHeader.jsx'
import RoleTag from '../components/RoleTag.jsx'
import { ROLE_COLORS } from '../lib/constants.js'

// ── Helpers ────────────────────────────────────────────────────────────────

function displayRole(coc_role) {
  const map = { leader: 'Chef', coLeader: 'Co-chef', admin: 'Aîné', member: 'Membre' }
  return map[coc_role] || coc_role || 'Membre'
}

function timeAgo(str) {
  if (!str) return ''
  const diff = Date.now() - new Date(str).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  return new Date(str).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

// ── ReactionButton ──────────────────────────────────────────────────────────

const REACTION_CONFIG = {
  up:    { emoji: '👍', activeClass: 'bg-green-500/20 border-green-500/50 text-green-400' },
  down:  { emoji: '👎', activeClass: 'bg-red-500/20 border-red-500/50 text-red-400' },
  heart: { emoji: '❤️', activeClass: 'bg-pink-500/20 border-pink-500/50 text-pink-400' },
}

function ReactionButton({ type, count, active, onClick, disabled }) {
  const { emoji, activeClass } = REACTION_CONFIG[type]
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs
        font-medium transition-all duration-150
        ${active
          ? activeClass
          : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500 hover:border-[#3a3a3a] hover:text-gray-300'
        }
        ${disabled ? 'cursor-default opacity-70' : 'cursor-pointer'}
      `}
    >
      {emoji} {count > 0 && <span>{count}</span>}
    </button>
  )
}

function ReactionBar({ postId, user, compact = false }) {
  const [counts, setCounts] = useState({ up: 0, down: 0, heart: 0 })
  const [mine, setMine] = useState({ up: false, down: false, heart: false })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api.get(`/api/forum/posts/${postId}/reactions`)
      .then((r) => { setCounts(r.data.counts); setMine(r.data.userReactions) })
      .catch(() => {})
  }, [postId])

  async function toggle(type) {
    if (!user || busy) return
    setBusy(true)
    try {
      const r = await api.post(`/api/forum/posts/${postId}/reactions`, { reaction_type: type })
      setMine((prev) => ({ ...prev, [type]: r.data.active }))
      setCounts((prev) => ({ ...prev, [type]: r.data.active ? prev[type] + 1 : Math.max(0, prev[type] - 1) }))
    } catch {}
    setBusy(false)
  }

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-4'}`}>
      {['up', 'down', 'heart'].map((type) => (
        <ReactionButton
          key={type}
          type={type}
          count={counts[type]}
          active={mine[type]}
          onClick={() => toggle(type)}
          disabled={!user}
        />
      ))}
    </div>
  )
}

// ── Post detail modal ──────────────────────────────────────────────────────

function PostDetail({ post, user, isAdmin, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-2xl rounded-xl" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xs font-cinzel uppercase tracking-wider transition-colors">← Retour</button>
          {(user?.id === post.author_id || isAdmin) && (
            <button
              onClick={() => { if (window.confirm('Supprimer ce post ?')) onDelete(post.id) }}
              className="text-xs text-red-400 hover:text-red-300 font-cinzel uppercase border border-red-800/40 px-2 py-1 rounded transition-colors">
              🗑️ Supprimer
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {post.is_pinned && (
              <span className="text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full">
                📌 Épinglé
              </span>
            )}
          </div>
          <h2 className="text-xl font-bold font-cinzel text-white mb-4">{post.title}</h2>
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <div className="w-7 h-7 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                            flex items-center justify-center text-xs font-bold text-[#dc2626]">
              {(post.author?.coc_name || post.author_name || '?').charAt(0).toUpperCase()}
            </div>
            <span className="text-gray-300 text-sm font-medium">{post.author?.coc_name || post.author_name || 'Inconnu'}</span>
            {post.author?.coc_role && <RoleTag role={displayRole(post.author.coc_role)} />}
            <span className="text-gray-600 text-xs ml-auto">
              {new Date(post.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="border-t border-[#1f1f1f] pt-4 mb-4">
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-sm">{post.content}</p>
          </div>

          {post.image_url && (
            <img src={post.image_url} alt="Image du post" className="max-w-full rounded-lg mb-4" style={{ maxHeight: 400, objectFit: 'contain' }} />
          )}

          <div className="border-t border-[#1f1f1f] pt-4">
            <p className="text-gray-600 text-xs font-cinzel uppercase tracking-wider mb-3">Réactions</p>
            <ReactionBar postId={post.id} user={user} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Formulaire nouveau post ─────────────────────────────────────────────────

function NewPostForm({ categoryId, user, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', content: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  function handleImage(e) {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Le titre est requis')
    setError('')
    setUploading(true)

    let image_url = null
    if (imageFile && supabase) {
      try {
        const path = `forum/${Date.now()}-${imageFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
        const { error: upErr } = await supabase.storage.from('forum-images').upload(path, imageFile)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('forum-images').getPublicUrl(path)
        image_url = urlData.publicUrl
      } catch (err) {
        setError("Erreur upload image: " + err.message)
        setUploading(false)
        return
      }
    }

    try {
      const r = await api.post('/api/forum/category-posts', {
        title: form.title.trim(),
        content: form.content.trim(),
        category_id: categoryId,
        image_url,
      })
      onCreated(r.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la publication')
    }
    setUploading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-lg rounded-xl" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
        <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
          <h3 className="font-cinzel text-white uppercase tracking-wider text-sm">Nouveau post</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-5">
          {error && <p className="text-red-400 text-xs mb-3 font-cinzel">{error}</p>}
          <form onSubmit={submit} className="flex flex-col gap-3">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Titre du post"
              className="w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#dc2626] transition-colors"
              style={{ background: '#0d0d0d', border: '1px solid #1f1f1f' }}
              required
            />
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={6}
              placeholder="Contenu..."
              className="w-full rounded-lg px-3 py-2.5 text-white text-sm resize-none focus:outline-none focus:border-[#dc2626] transition-colors"
              style={{ background: '#0d0d0d', border: '1px solid #1f1f1f' }}
            />
            <div>
              <button type="button" onClick={() => fileRef.current?.click()}
                className="text-xs font-cinzel uppercase text-gray-400 border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:text-white hover:border-[#3a3a3a] transition-colors">
                📎 Ajouter une image
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              {imagePreview && (
                <div className="mt-2 relative inline-block">
                  <img src={imagePreview} alt="Aperçu" className="max-h-32 rounded-lg" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                    className="absolute top-1 right-1 bg-red-900 text-white text-xs rounded px-1">✕</button>
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={uploading}
                className="px-5 py-2 font-cinzel uppercase text-xs text-white rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: uploading ? '#6B0000' : 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
                {uploading ? 'Publication...' : 'Publier'}
              </button>
              <button type="button" onClick={onClose}
                className="px-5 py-2 font-cinzel uppercase text-xs text-gray-400 border border-[#dc2626]/40 rounded-lg hover:text-white transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Formulaire nouvelle catégorie ───────────────────────────────────────────

function NewCategoryForm({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', icon: '💬' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Le nom est requis')
    setError('')
    setLoading(true)
    try {
      const r = await api.post('/api/forum/categories', {
        name: form.name.trim(),
        description: form.description.trim(),
        icon: form.icon.trim() || '💬',
      })
      onCreated(r.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la création')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div className="w-full max-w-md rounded-xl" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
        <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
          <h3 className="font-cinzel text-white uppercase tracking-wider text-sm">Nouvelle catégorie</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <div className="p-5">
          {error && <p className="text-red-400 text-xs mb-3 font-cinzel">{error}</p>}
          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
                placeholder="Icône"
                className="w-16 rounded-lg px-2 py-2.5 text-white text-center text-lg focus:outline-none"
                style={{ background: '#0d0d0d', border: '1px solid #1f1f1f' }}
              />
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Nom de la catégorie"
                className="flex-1 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#dc2626] transition-colors"
                style={{ background: '#0d0d0d', border: '1px solid #1f1f1f' }}
                required
              />
            </div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Description (optionnelle)"
              className="w-full rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#dc2626] transition-colors"
              style={{ background: '#0d0d0d', border: '1px solid #1f1f1f' }}
            />
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading}
                className="px-5 py-2 font-cinzel uppercase text-xs text-white rounded-lg disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
                {loading ? 'Création...' : 'Créer'}
              </button>
              <button type="button" onClick={onClose}
                className="px-5 py-2 font-cinzel uppercase text-xs text-gray-400 border border-[#dc2626]/40 rounded-lg hover:text-white transition-colors">
                Annuler
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

// ── Forum Discord-like ──────────────────────────────────────────────────────

function ForumDiscord({ user }) {
  const { isAdmin } = useAuth()
  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState(null)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [showNewCategory, setShowNewCategory] = useState(false)
  const [error, setError] = useState('')

  // Vérification des permissions pour gérer les catégories
  const canManage =
    ['superadmin', 'admin'].includes(user?.site_role) ||
    ['chef', 'co-chef', 'leader', 'coleader', 'coLeader'].some((r) =>
      user?.coc_role?.toLowerCase().includes(r.toLowerCase())
    )

  useEffect(() => {
    api.get('/api/forum/categories')
      .then((r) => {
        setCategories(r.data)
        if (r.data.length > 0) setSelectedCat(r.data[0])
      })
      .catch(() => setError('Erreur chargement des catégories'))
      .finally(() => setCatLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCat) return
    setPostsLoading(true)
    setPosts([])
    setShowNewPost(false)
    api.get(`/api/forum/categories/${selectedCat.id}/posts`)
      .then((r) => setPosts(r.data))
      .catch(() => {})
      .finally(() => setPostsLoading(false))
  }, [selectedCat])

  async function handleDelete(postId) {
    try {
      await api.delete(`/api/forum/posts/${postId}`)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      setSelectedPost(null)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur suppression')
    }
  }

  async function handleDeleteCategory(catId) {
    if (!window.confirm('Supprimer cette catégorie et tous ses posts ?')) return
    try {
      await api.delete(`/api/forum/categories/${catId}`)
      setCategories((prev) => prev.filter((c) => c.id !== catId))
      if (selectedCat?.id === catId) setSelectedCat(null)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur suppression catégorie')
    }
  }

  return (
    <div className="flex" style={{ minHeight: '70vh', background: '#0d0d0d' }}>
      {/* Sidebar */}
      <aside className="flex-shrink-0 flex flex-col" style={{ width: 288, background: '#0a0a0a', borderRight: '1px solid #1a1a1a' }}>
        <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-cinzel font-semibold">
            Forums
          </span>
          {canManage && (
            <button
              onClick={() => setShowNewCategory(true)}
              className="text-gray-500 hover:text-[#dc2626] text-lg leading-none transition-colors"
              title="Nouvelle catégorie"
            >
              +
            </button>
          )}
        </div>

        {catLoading ? (
          <p className="text-gray-600 text-xs font-cinzel px-4 py-3 animate-pulse">Chargement...</p>
        ) : (
          <nav className="flex flex-col py-2 overflow-y-auto flex-1">
            {categories.map((cat) => {
              const active = selectedCat?.id === cat.id
              return (
                <div key={cat.id} className="group flex items-center mx-2 mb-1">
                  <button
                    onClick={() => setSelectedCat(cat)}
                    className={`
                      flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-150
                      ${active
                        ? 'bg-[#dc2626]/10 border border-[#dc2626]/30 text-white'
                        : 'text-gray-400 hover:bg-[#1a1a1a] hover:text-gray-200 border border-transparent'
                      }
                    `}
                  >
                    <span className="text-base leading-none flex-shrink-0">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-cinzel uppercase tracking-wide truncate font-medium ${active ? 'text-white' : ''}`}>
                        {cat.name}
                      </p>
                      {cat.description && (
                        <p className="text-xs text-gray-600 truncate">{cat.description}</p>
                      )}
                    </div>
                  </button>
                  {canManage && isAdmin && (
                    <button
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="hidden group-hover:flex items-center justify-center w-5 h-5 ml-1 text-gray-600 hover:text-red-400 transition-colors text-xs flex-shrink-0"
                      title="Supprimer la catégorie"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </nav>
        )}
      </aside>

      {/* Zone contenu */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedCat ? (
          <>
            {/* Header catégorie */}
            <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedCat.icon}</span>
                <div>
                  <h1 className="text-sm font-bold font-cinzel text-white uppercase tracking-wide">
                    {selectedCat.name}
                  </h1>
                  {selectedCat.description && (
                    <p className="text-xs text-gray-500">{selectedCat.description}</p>
                  )}
                </div>
              </div>
              {user && (
                <button
                  onClick={() => setShowNewPost(true)}
                  className="flex items-center gap-2 px-4 py-2 text-white text-xs font-cinzel uppercase tracking-wide rounded-lg transition-colors"
                  style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}
                >
                  + Nouveau post
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-3 px-2">
              {error && <p className="text-red-400 text-xs font-cinzel mb-3 px-2">{error}</p>}

              {postsLoading && (
                <p className="text-gray-600 text-xs font-cinzel animate-pulse text-center py-10">Chargement...</p>
              )}

              {!postsLoading && posts.length === 0 && (
                <p className="text-gray-600 text-xs font-cinzel text-center py-10 uppercase tracking-wider">
                  Aucun post dans cette catégorie
                </p>
              )}

              <div className="flex flex-col gap-2">
                {posts.map((post) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    className="group mx-2 p-4 rounded-xl text-left w-full transition-all duration-200"
                    style={{ background: '#111111', border: '1px solid #1f1f1f' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(220,38,38,0.4)'
                      e.currentTarget.style.background = '#151515'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#1f1f1f'
                      e.currentTarget.style.background = '#111111'
                    }}
                  >
                    {/* Header post */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        {post.is_pinned && (
                          <span className="text-xs bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded-full flex-shrink-0">
                            📌 Épinglé
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-white group-hover:text-[#ef4444] transition-colors line-clamp-1 font-cinzel">
                          {post.title}
                        </h3>
                      </div>
                      <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                        {timeAgo(post.created_at)}
                      </span>
                    </div>

                    {/* Auteur */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                                      flex items-center justify-center text-xs font-bold text-[#dc2626] flex-shrink-0">
                        {(post.author?.coc_name || post.author_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-400 font-medium">
                        {post.author?.coc_name || post.author_name || 'Inconnu'}
                      </span>
                      {post.author?.coc_role && (
                        <RoleTag role={displayRole(post.author.coc_role)} />
                      )}
                    </div>

                    {/* Aperçu contenu */}
                    {post.content && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3 leading-relaxed">{post.content}</p>
                    )}

                    {/* Image miniature */}
                    {post.image_url && (
                      <div className="mb-3 rounded-lg overflow-hidden">
                        <img src={post.image_url} alt="" className="max-h-32 object-cover rounded-lg" />
                      </div>
                    )}

                    {/* Réactions */}
                    <div onClick={(e) => e.stopPropagation()}>
                      <ReactionBar postId={post.id} user={null} compact />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600 font-cinzel text-xs uppercase tracking-widest">
              {categories.length === 0 && !catLoading
                ? 'Aucune catégorie — demande à un admin d\'en créer une'
                : 'Sélectionne une catégorie'}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedPost && (
        <PostDetail
          post={selectedPost}
          user={user}
          isAdmin={isAdmin}
          onClose={() => setSelectedPost(null)}
          onDelete={handleDelete}
        />
      )}

      {showNewPost && selectedCat && (
        <NewPostForm
          categoryId={selectedCat.id}
          user={user}
          onClose={() => setShowNewPost(false)}
          onCreated={(post) => setPosts((prev) => [post, ...prev])}
        />
      )}

      {showNewCategory && (
        <NewCategoryForm
          onClose={() => setShowNewCategory(false)}
          onCreated={(cat) => {
            setCategories((prev) => [...prev, cat])
            setSelectedCat(cat)
          }}
        />
      )}
    </div>
  )
}

// ── Chat tab ─────────────────────────────────────────────────────────────────

function ChatTab({ user }) {
  const { isChief, isAdmin } = useAuth()
  const { messages, connected, sendMessage, setMessages } = useSocket('général', user)
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    api.get('/api/chat/messages/général').then((r) => {
      setMessages(r.data.map((m) => ({
        id: m.id, authorId: m.author_id,
        author: m.author?.coc_name || 'Inconnu',
        role: m.author?.coc_role || 'member',
        content: m.content, time: m.created_at,
      })))
    }).catch(() => {})
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !user) return
    sendMessage(input.trim())
    setInput('')
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/chat/messages/${id}`)
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch {}
  }

  async function handleEdit(e, id) {
    e.preventDefault()
    if (!editContent.trim()) return
    try {
      await api.patch(`/api/chat/messages/${id}`, { content: editContent.trim() })
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: editContent.trim() } : m))
      setEditingId(null)
    } catch {}
  }

  const canDelete = (msg) => user && (msg.authorId === user.id || isChief || isAdmin)
  const canEdit = (msg) => user && msg.authorId === user.id

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex items-center justify-between mb-3">
        <span className="font-cinzel text-xs uppercase text-gray-500 tracking-widest"># général</span>
        <span className="text-xs text-yellow-400 font-cinzel">{connected} connecté{connected > 1 ? 's' : ''}</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 rounded-lg p-3 border border-[#1a1a1a]" style={{ background: '#0a0a0a' }}>
        {messages.map((msg, i) => (
          <div key={msg.id || i} className="flex items-start gap-2 group">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#1a1a1a', color: ROLE_COLORS[msg.role] || '#777' }}>
              {msg.author?.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: ROLE_COLORS[msg.role] || '#777' }}>{msg.author}</span>
                <span className="text-xs text-gray-600">{new Date(msg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="ml-auto hidden group-hover:flex items-center gap-1">
                  {canEdit(msg) && (
                    <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content) }}
                      className="text-gray-500 hover:text-white text-xs px-1.5 py-0.5 rounded hover:bg-[#1a1a1a]">✎</button>
                  )}
                  {canDelete(msg) && (
                    <button onClick={() => handleDelete(msg.id)}
                      className="text-gray-500 hover:text-red-400 text-xs px-1.5 py-0.5 rounded hover:bg-[#1a1a1a]">✕</button>
                  )}
                </div>
              </div>
              {editingId === msg.id ? (
                <form onSubmit={(e) => handleEdit(e, msg.id)} className="flex gap-1 mt-1">
                  <input value={editContent} onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 rounded px-2 py-0.5 text-white text-sm focus:outline-none"
                    style={{ background: '#111', border: '1px solid #dc2626' }} autoFocus />
                  <button type="submit" className="text-xs px-2 py-0.5 font-cinzel text-white rounded"
                    style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>OK</button>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="text-xs px-2 py-0.5 text-gray-400 border border-[#2a2a2a] rounded hover:text-white">✕</button>
                </form>
              ) : (
                <p className="text-white text-sm mt-0.5 break-words">{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {user ? (
        <form onSubmit={handleSend} className="flex gap-2 mt-3">
          <input value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Envoyer un message..."
            className="flex-1 rounded-lg px-3 py-2 text-white text-sm focus:outline-none transition-colors"
            style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}
            onFocus={(e) => e.target.style.borderColor = '#dc2626'}
            onBlur={(e) => e.target.style.borderColor = '#1a1a1a'}
          />
          <button type="submit" className="px-4 py-2 font-cinzel text-xs uppercase text-white rounded-lg"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
            Envoyer
          </button>
        </form>
      ) : (
        <p className="text-center text-gray-600 text-xs font-cinzel mt-3 uppercase tracking-wider">
          Connectez-vous pour envoyer des messages
        </p>
      )}
    </div>
  )
}

// ── Page principale ─────────────────────────────────────────────────────────

export default function Forum() {
  const { user } = useAuth()
  const [tab, setTab] = useState('forum')

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Forum & Tchat" subtitle="Communauté Donjon Rouge" />
      <div className="flex gap-2 mb-6">
        {[{ key: 'forum', label: 'Forum' }, { key: 'tchat', label: 'Tchat Live' }].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-6 py-2 font-cinzel uppercase text-sm tracking-wider rounded-lg transition-all ${
              tab === key ? 'text-white' : 'text-gray-500 border border-[#1a1a1a] hover:text-white hover:border-[#2a2a2a]'
            }`}
            style={tab === key ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : {}}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'forum' && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #1a1a1a' }}>
          <ForumDiscord user={user} />
        </div>
      )}
      {tab === 'tchat' && (
        <div className="rounded-xl p-4" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
          <ChatTab user={user} />
        </div>
      )}
    </div>
  )
}
