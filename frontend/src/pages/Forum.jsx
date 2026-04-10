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

// ── Composant réactions ─────────────────────────────────────────────────────

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

  const btns = [
    { type: 'up',    emoji: '👍', active: 'bg-green-700 text-white border-green-600',   idle: 'bg-green-900/30 border-green-700 text-green-400 hover:bg-green-900/60' },
    { type: 'down',  emoji: '👎', active: 'bg-red-700 text-white border-red-600',       idle: 'bg-red-900/30 border-red-700 text-red-400 hover:bg-red-900/60' },
    { type: 'heart', emoji: '❤️', active: 'bg-pink-700 text-white border-pink-600',     idle: 'bg-pink-900/30 border-pink-700 text-pink-400 hover:bg-pink-900/60' },
  ]

  return (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-4'}`}>
      {btns.map(({ type, emoji, active, idle }) => (
        <button
          key={type}
          onClick={() => toggle(type)}
          disabled={!user}
          className={`flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-cinzel transition-all ${mine[type] ? active : idle} ${!user ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
        >
          <span>{emoji}</span>
          <span>{counts[type] || 0}</span>
        </button>
      ))}
    </div>
  )
}

// ── Post detail modal ──────────────────────────────────────────────────────

function PostDetail({ post, user, isAdmin, onClose, onDelete }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="w-full max-w-2xl rounded-lg" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-fog/20">
          <button onClick={onClose} className="text-ash hover:text-bone text-xs font-cinzel uppercase">← Retour</button>
          {(user?.id === post.author_id || isAdmin) && (
            <button
              onClick={() => { if (window.confirm('Supprimer ce post ?')) onDelete(post.id) }}
              className="text-xs text-red-400 hover:text-red-300 font-cinzel uppercase border border-red-800/40 px-2 py-1 rounded">
              🗑️ Supprimer
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {post.is_pinned && (
              <span className="text-xs font-cinzel uppercase text-yellow-400 border border-yellow-700/40 px-1.5 py-0.5 rounded">📌 Épinglé</span>
            )}
          </div>
          <h2 className="text-xl font-bold font-cinzel text-bone mb-3">{post.title}</h2>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-ash text-sm">{post.author?.coc_name || post.author_name || 'Inconnu'}</span>
            {post.author?.coc_role && <RoleTag role={displayRole(post.author.coc_role)} />}
            <span className="text-ash text-xs ml-auto">{new Date(post.created_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          <div className="border-t border-fog/20 pt-4 mb-4">
            <p className="text-bone leading-relaxed whitespace-pre-wrap">{post.content}</p>
          </div>

          {post.image_url && (
            <img src={post.image_url} alt="Image du post" className="max-w-full rounded mb-4" style={{ maxHeight: 400, objectFit: 'contain' }} />
          )}

          <div className="border-t border-fog/20 pt-4">
            <p className="text-ash text-xs font-cinzel uppercase tracking-wider mb-2">Réactions</p>
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
    <div className="rounded-lg p-5 mb-6" style={{ background: '#111', border: '1px solid #1f1f1f' }}>
      <h3 className="font-cinzel text-bone uppercase tracking-wider text-sm mb-4">Nouveau post</h3>
      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}
      <form onSubmit={submit}>
        <input
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          placeholder="Titre du post"
          className="w-full rounded px-3 py-2 text-bone text-sm mb-3 focus:outline-none focus:border-red-600"
          style={{ background: '#0d0d0d', border: '1px solid #1f1f1f' }}
          required
        />
        <textarea
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          rows={4}
          placeholder="Contenu..."
          className="w-full rounded px-3 py-2 text-bone text-sm resize-none focus:outline-none focus:border-red-600 mb-3"
          style={{ background: '#0d0d0d', border: '1px solid #1f1f1f' }}
        />
        <div className="mb-4">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="text-xs font-cinzel uppercase text-ash border border-fog/40 px-3 py-1.5 rounded hover:text-bone transition-colors">
            📎 Ajouter une image
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          {imagePreview && (
            <div className="mt-2 relative inline-block">
              <img src={imagePreview} alt="Aperçu" className="max-h-32 rounded" />
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="absolute top-1 right-1 bg-red-900 text-white text-xs rounded px-1">✕</button>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={uploading}
            className="px-4 py-2 font-cinzel uppercase text-xs text-bone rounded disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
            {uploading ? 'Publication...' : 'Publier →'}
          </button>
          <button type="button" onClick={onClose}
            className="px-4 py-2 font-cinzel uppercase text-xs text-ash border border-fog/40 rounded hover:text-bone">
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Forum Discord-like ──────────────────────────────────────────────────────

function ForumDiscord({ user }) {
  const { isAdmin, isChief } = useAuth()
  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)
  const [selectedCat, setSelectedCat] = useState(null)
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [error, setError] = useState('')

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

  return (
    <div className="flex h-full" style={{ minHeight: '70vh' }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col" style={{ background: '#0a0a0a', borderRight: '1px solid #1a1a1a' }}>
        <div className="px-3 pt-4 pb-2">
          <p className="font-cinzel text-xs uppercase tracking-widest text-gray-500">Forums</p>
        </div>
        {catLoading ? (
          <p className="text-ash text-xs font-cinzel px-3 py-2 animate-pulse">Chargement...</p>
        ) : (
          <nav className="flex flex-col gap-0.5 px-1 pb-4">
            {categories.map((cat) => {
              const active = selectedCat?.id === cat.id
              return (
                <button key={cat.id} onClick={() => setSelectedCat(cat)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-all text-left w-full"
                  style={{
                    background: active ? '#1a1a1a' : 'transparent',
                    borderLeft: active ? '2px solid #dc2626' : '2px solid transparent',
                    color: active ? '#f0f0f0' : '#666',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#1a1a1a' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}>
                  <span className="text-base leading-none">{cat.icon}</span>
                  <span className="font-cinzel text-xs uppercase tracking-wide truncate">{cat.name.replace(/^[^\s]+\s/, '')}</span>
                </button>
              )
            })}
          </nav>
        )}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedCat ? (
          <>
            {/* Category header */}
            <div className="px-5 pt-4 pb-3" style={{ borderBottom: '1px solid #1a1a1a' }}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{selectedCat.icon}</span>
                  <h2 className="font-cinzel text-bone uppercase tracking-wider text-sm font-bold">{selectedCat.name}</h2>
                </div>
                {user && (
                  <button onClick={() => setShowNewPost((v) => !v)}
                    className="px-3 py-1.5 font-cinzel uppercase text-xs text-bone rounded flex items-center gap-1"
                    style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
                    + Nouveau post
                  </button>
                )}
              </div>
              {selectedCat.description && (
                <p className="text-ash text-xs mt-1">{selectedCat.description}</p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {error && <p className="text-red-400 text-xs font-cinzel mb-3">{error}</p>}

              {showNewPost && (
                <NewPostForm
                  categoryId={selectedCat.id}
                  user={user}
                  onClose={() => setShowNewPost(false)}
                  onCreated={(post) => setPosts((prev) => [post, ...prev])}
                />
              )}

              {postsLoading && (
                <p className="text-ash text-xs font-cinzel animate-pulse text-center py-10">Chargement...</p>
              )}

              {!postsLoading && posts.length === 0 && (
                <p className="text-ash text-xs font-cinzel text-center py-10 uppercase tracking-wider">
                  Aucun post dans cette catégorie
                </p>
              )}

              <div className="flex flex-col gap-3">
                {posts.map((post) => (
                  <button key={post.id} onClick={() => setSelectedPost(post)} className="text-left w-full"
                    style={{ background: '#111111', border: '1px solid #1f1f1f', borderRadius: 8, padding: '16px', transition: 'all 0.2s ease', cursor: 'pointer' }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.boxShadow = '0 0 20px rgba(220,38,38,0.1)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#1f1f1f'; e.currentTarget.style.boxShadow = 'none' }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {post.is_pinned && (
                          <span className="text-xs text-yellow-400">📌</span>
                        )}
                        <span className="font-cinzel text-bone font-bold text-sm">{post.title}</span>
                      </div>
                      <span className="text-ash text-xs flex-shrink-0">{timeAgo(post.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-ash text-xs">{post.author?.coc_name || post.author_name || 'Inconnu'}</span>
                      {post.author?.coc_role && <RoleTag role={displayRole(post.author.coc_role)} />}
                    </div>
                    {post.content && (
                      <p className="text-ash text-xs leading-relaxed line-clamp-2 mb-2">{post.content}</p>
                    )}
                    {post.image_url && (
                      <div className="mb-2">
                        <img src={post.image_url} alt="" className="h-16 rounded object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <ReactionBar postId={post.id} user={null} compact />
                      <span className="text-xs text-ash ml-auto font-cinzel">Voir le post →</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-ash font-cinzel text-xs uppercase tracking-widest">Sélectionne une catégorie</p>
          </div>
        )}
      </div>

      {selectedPost && (
        <PostDetail
          post={selectedPost}
          user={user}
          isAdmin={isAdmin || isChief}
          onClose={() => setSelectedPost(null)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// ── Chat tab (inchangé) ─────────────────────────────────────────────────────

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
        <span className="font-cinzel text-xs uppercase text-ash tracking-widest"># général</span>
        <span className="text-xs text-yellow-400 font-cinzel">{connected} connecté{connected > 1 ? 's' : ''}</span>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-2 rounded p-3 border border-fog/30" style={{ background: '#0a0a0a' }}>
        {messages.map((msg, i) => (
          <div key={msg.id || i} className="flex items-start gap-2 group">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#1a1a1a', color: ROLE_COLORS[msg.role] || '#777' }}>
              {msg.author?.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: ROLE_COLORS[msg.role] || '#777' }}>{msg.author}</span>
                <span className="text-xs text-ash">{new Date(msg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="ml-auto hidden group-hover:flex items-center gap-1">
                  {canEdit(msg) && (
                    <button onClick={() => { setEditingId(msg.id); setEditContent(msg.content) }}
                      className="text-ash hover:text-bone text-xs px-1.5 py-0.5 rounded hover:bg-fog/20">✎</button>
                  )}
                  {canDelete(msg) && (
                    <button onClick={() => handleDelete(msg.id)}
                      className="text-ash hover:text-red-400 text-xs px-1.5 py-0.5 rounded hover:bg-fog/20">✕</button>
                  )}
                </div>
              </div>
              {editingId === msg.id ? (
                <form onSubmit={(e) => handleEdit(e, msg.id)} className="flex gap-1 mt-1">
                  <input value={editContent} onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 rounded px-2 py-0.5 text-bone text-sm focus:outline-none"
                    style={{ background: '#111', border: '1px solid #dc2626' }} autoFocus />
                  <button type="submit" className="text-xs px-2 py-0.5 font-cinzel text-bone rounded"
                    style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>OK</button>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="text-xs px-2 py-0.5 text-ash border border-fog/40 rounded hover:text-bone">✕</button>
                </form>
              ) : (
                <p className="text-bone text-sm mt-0.5 break-words">{msg.content}</p>
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
            className="flex-1 rounded px-3 py-2 text-bone text-sm focus:outline-none"
            style={{ background: '#0a0a0a', border: '1px solid #1a1a1a' }}
            onFocus={(e) => e.target.style.borderColor = '#dc2626'}
            onBlur={(e) => e.target.style.borderColor = '#1a1a1a'}
          />
          <button type="submit" className="px-4 py-2 font-cinzel text-xs uppercase text-bone rounded"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
            Envoyer
          </button>
        </form>
      ) : (
        <p className="text-center text-ash text-xs font-cinzel mt-3 uppercase tracking-wider">
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
            className={`px-6 py-2 font-cinzel uppercase text-sm tracking-wider rounded transition-all ${
              tab === key ? 'text-bone' : 'text-ash border border-fog/40 hover:text-bone'
            }`}
            style={tab === key ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : {}}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'forum' && (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #1a1a1a' }}>
          <ForumDiscord user={user} />
        </div>
      )}
      {tab === 'tchat' && (
        <div className="rounded-lg p-4" style={{ background: '#111', border: '1px solid #1a1a1a' }}>
          <ChatTab user={user} />
        </div>
      )}
    </div>
  )
}
