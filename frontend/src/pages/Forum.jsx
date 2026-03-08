import { useState, useEffect, useRef } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSocket } from '../hooks/useSocket.js'
import SectionHeader from '../components/SectionHeader.jsx'
import RoleTag from '../components/RoleTag.jsx'
import { ROLE_COLORS } from '../lib/constants.js'

function ForumTab({ user }) {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)
  const [showNewPost, setShowNewPost] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', category: 'Général' })
  const [replyContent, setReplyContent] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/api/forum/posts').then((r) => setPosts(r.data)).finally(() => setLoading(false))
  }, [])

  async function openPost(post) {
    const res = await api.get(`/api/forum/posts/${post.id}`)
    setSelectedPost(res.data)
  }

  async function submitPost(e) {
    e.preventDefault()
    try {
      const res = await api.post('/api/forum/posts', form)
      setPosts((prev) => [res.data, ...prev])
      setShowNewPost(false)
      setForm({ title: '', content: '', category: 'Général' })
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
  }

  async function submitReply(e) {
    e.preventDefault()
    try {
      const res = await api.post(`/api/forum/posts/${selectedPost.id}/reply`, { content: replyContent })
      setSelectedPost((prev) => ({ ...prev, replies: [...(prev.replies || []), res.data] }))
      setReplyContent('')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
  }

  async function likePost(postId) {
    if (!user) return
    await api.post(`/api/forum/posts/${postId}/like`)
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes: (p.likes || 0) + 1 } : p))
  }

  if (selectedPost) {
    return (
      <div>
        <button onClick={() => setSelectedPost(null)} className="text-ash hover:text-bone font-cinzel text-xs uppercase mb-4">
          ← Retour
        </button>
        <div className="card-stone p-5 mb-4">
          {selectedPost.is_pinned && (
            <span className="text-xs font-cinzel uppercase text-gold border border-gold px-2 py-0.5 rounded mr-2">Épinglé</span>
          )}
          <h2 className="text-xl font-bold font-cinzel text-bone mt-2">{selectedPost.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-ash text-sm">{selectedPost.author?.username}</span>
            <RoleTag role={selectedPost.author?.role || 'Membre'} />
            <span className="text-ash text-xs ml-auto">{new Date(selectedPost.created_at).toLocaleDateString('fr-FR')}</span>
          </div>
          <p className="text-bone mt-4 leading-relaxed">{selectedPost.content}</p>
        </div>

        {(selectedPost.replies || []).map((reply) => (
          <div key={reply.id} className="card-stone p-4 mb-3 ml-6 border-l-2 border-crimson/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-ash text-sm">{reply.author?.username}</span>
              <RoleTag role={reply.author?.role || 'Membre'} />
              <span className="text-ash text-xs ml-auto">{new Date(reply.created_at).toLocaleDateString('fr-FR')}</span>
            </div>
            <p className="text-bone">{reply.content}</p>
          </div>
        ))}

        {user && (
          <form onSubmit={submitReply} className="mt-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={3}
              placeholder="Votre réponse..."
              className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone placeholder-ash focus:outline-none focus:border-crimson resize-none"
              required
            />
            <button type="submit" className="mt-2 px-4 py-2 font-cinzel uppercase text-xs text-bone rounded"
              style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
              Répondre
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-ash text-sm font-cinzel uppercase tracking-wider">{posts.length} posts</p>
        {user && (
          <button onClick={() => setShowNewPost(true)}
            className="px-4 py-2 font-cinzel uppercase text-xs text-bone rounded"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
            + Nouveau post
          </button>
        )}
      </div>

      {showNewPost && (
        <form onSubmit={submitPost} className="card-stone p-5 mb-6">
          <h3 className="font-cinzel text-gold-bright uppercase mb-4">Nouveau post</h3>
          {error && <p className="text-crimson text-sm mb-2">{error}</p>}
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Titre"
            className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone mb-3 focus:outline-none focus:border-crimson"
            required
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone mb-3 focus:outline-none focus:border-crimson"
          >
            {['Général', 'Guerre', 'Stratégie', 'Recrutement', 'Aide'].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={4}
            placeholder="Contenu..."
            className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone resize-none focus:outline-none focus:border-crimson"
            required
          />
          <div className="flex gap-3 mt-3">
            <button type="submit" className="px-4 py-2 font-cinzel uppercase text-xs text-bone rounded"
              style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
              Publier
            </button>
            <button type="button" onClick={() => setShowNewPost(false)} className="px-4 py-2 font-cinzel uppercase text-xs text-ash border border-fog rounded hover:text-bone">
              Annuler
            </button>
          </div>
        </form>
      )}

      {loading && <p className="text-ash font-cinzel animate-pulse text-center py-10">Chargement...</p>}

      <div className="flex flex-col gap-3">
        {posts.map((post) => (
          <div
            key={post.id}
            onClick={() => openPost(post)}
            className="card-stone p-4 cursor-pointer hover:border-crimson transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {post.is_pinned && (
                    <span className="text-xs font-cinzel uppercase text-gold border border-gold px-1.5 py-0.5 rounded">Épinglé</span>
                  )}
                  <span className="text-xs text-crimson font-cinzel uppercase">{post.category}</span>
                </div>
                <h3 className="font-semibold text-bone mt-1 hover:text-gold-light transition-colors">{post.title}</h3>
                <p className="text-ash text-sm mt-1 line-clamp-2">{post.content}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-ash">
                  <span>{post.author?.username}</span>
                  <RoleTag role={post.author?.role || 'Membre'} />
                  <span className="ml-auto">{new Date(post.created_at).toLocaleDateString('fr-FR')}</span>
                  <span>❤️ {post.likes || 0}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChatTab({ user }) {
  const { isChief, isAdmin } = useAuth()
  const { messages, connected, sendMessage, setMessages } = useSocket('général', user)
  const [input, setInput] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    api.get('/api/chat/messages/général').then((r) => {
      const hist = r.data.map((m) => ({
        id: m.id,
        authorId: m.author_id,
        author: m.author?.coc_name || 'Inconnu',
        role: m.author?.coc_role || 'Membre',
        content: m.content,
        time: m.created_at
      }))
      setMessages(hist)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend(e) {
    e.preventDefault()
    if (!input.trim() || !user) return
    sendMessage(input.trim())
    setInput('')
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/api/chat/messages/${id}`)
    } catch (err) {
      console.error('Suppression échouée', err)
    }
  }

  function startEdit(msg) {
    setEditingId(msg.id)
    setEditContent(msg.content)
  }

  async function handleEdit(e, id) {
    e.preventDefault()
    if (!editContent.trim()) return
    try {
      await api.patch(`/api/chat/messages/${id}`, { content: editContent.trim() })
      setEditingId(null)
    } catch (err) {
      console.error('Modification échouée', err)
    }
  }

  function canDelete(msg) {
    return user && (msg.authorId === user.id || isChief || isAdmin)
  }

  function canEdit(msg) {
    return user && msg.authorId === user.id
  }

  return (
    <div className="flex flex-col h-[60vh]">
      <div className="flex items-center justify-between mb-3">
        <span className="font-cinzel text-xs uppercase text-ash tracking-widest"># général</span>
        <span className="text-xs text-gold font-cinzel">{connected} connecté{connected > 1 ? 's' : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-2 bg-stone rounded p-3 border border-fog">
        {messages.map((msg, i) => (
          <div key={msg.id || i} className="flex items-start gap-2 group">
            <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#333', color: ROLE_COLORS[msg.role] || '#777' }}>
              {msg.author?.slice(0, 1).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold" style={{ color: ROLE_COLORS[msg.role] || '#777' }}>
                  {msg.author}
                </span>
                <span className="text-xs text-ash">{new Date(msg.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="ml-auto hidden group-hover:flex items-center gap-1">
                  {canEdit(msg) && (
                    <button onClick={() => startEdit(msg)}
                      className="text-ash hover:text-bone text-xs px-1.5 py-0.5 rounded hover:bg-fog/20 transition-colors"
                      title="Modifier">✎</button>
                  )}
                  {canDelete(msg) && (
                    <button onClick={() => handleDelete(msg.id)}
                      className="text-ash hover:text-crimson text-xs px-1.5 py-0.5 rounded hover:bg-fog/20 transition-colors"
                      title="Supprimer">✕</button>
                  )}
                </div>
              </div>

              {editingId === msg.id ? (
                <form onSubmit={(e) => handleEdit(e, msg.id)} className="flex gap-1 mt-1">
                  <input
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="flex-1 bg-stone border border-crimson rounded px-2 py-0.5 text-bone text-sm focus:outline-none"
                    autoFocus
                  />
                  <button type="submit" className="text-xs px-2 py-0.5 font-cinzel text-bone rounded"
                    style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>OK</button>
                  <button type="button" onClick={() => setEditingId(null)}
                    className="text-xs px-2 py-0.5 text-ash border border-fog rounded hover:text-bone">✕</button>
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
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Envoyer un message..."
            className="flex-1 bg-stone border border-fog rounded px-3 py-2 text-bone placeholder-ash focus:outline-none focus:border-crimson text-sm"
          />
          <button type="submit"
            className="px-4 py-2 font-cinzel text-xs uppercase text-bone rounded"
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

export default function Forum() {
  const { user } = useAuth()
  const [tab, setTab] = useState('forum')

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Forum & Tchat" subtitle="Communauté Donjon Rouge" />

      <div className="flex gap-2 mb-8">
        {['forum', 'tchat'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-6 py-2 font-cinzel uppercase text-sm tracking-wider rounded transition-all ${
              tab === t ? 'text-bone' : 'text-ash border border-fog hover:text-bone'
            }`}
            style={tab === t ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : {}}>
            {t === 'forum' ? 'Forum' : 'Tchat Live'}
          </button>
        ))}
      </div>

      {tab === 'forum' && <ForumTab user={user} />}
      {tab === 'tchat' && <ChatTab user={user} />}
    </div>
  )
}
