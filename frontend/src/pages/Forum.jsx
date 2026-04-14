import { useState, useEffect, useRef, useCallback } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSocket } from '../hooks/useSocket.js'
import { ROLE_COLORS } from '../lib/constants.js'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatFullDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  return dt.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function formatCocRole(role) {
  const map = { leader: 'Chef', coLeader: 'Co-Chef', admin: 'Ancien', member: 'Membre' }
  return map[role] || role || ''
}

const COMMON_EMOJIS = [
  '😀','😂','😍','🤔','😎','😭','🥳','😡',
  '👏','🙏','💪','✊','🤝','👀','🎉','🏆',
  '⚔️','🛡️','🔥','⭐','💎','🎯','💀','👑'
]

// ─── RoleBadge ────────────────────────────────────────────────────────────────

function RoleBadge({ role, siteRole }) {
  if (siteRole === 'superadmin') return (
    <span className="text-[10px] bg-purple-900/30 border border-purple-700/50 text-purple-400 px-1.5 py-0.5 rounded-full uppercase">Admin</span>
  )
  if (siteRole === 'admin') return (
    <span className="text-[10px] bg-blue-900/30 border border-blue-700/50 text-blue-400 px-1.5 py-0.5 rounded-full uppercase">Modo</span>
  )
  if (role === 'leader') return (
    <span className="text-[10px] bg-yellow-900/30 border border-yellow-700/50 text-yellow-400 px-1.5 py-0.5 rounded-full uppercase">Chef</span>
  )
  if (role === 'coLeader') return (
    <span className="text-[10px] bg-orange-900/30 border border-orange-700/50 text-orange-400 px-1.5 py-0.5 rounded-full uppercase">Co-Chef</span>
  )
  return null
}

// ─── ReactionBar ──────────────────────────────────────────────────────────────

function ReactionBar({ post, initialCounts = {}, initialUserReactions = [] }) {
  const { user } = useAuth()
  const [counts, setCounts] = useState(initialCounts)
  const [userReactions, setUserReactions] = useState(initialUserReactions)
  const [showPicker, setShowPicker] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggle = async (emoji) => {
    if (!user) return
    try {
      const { data } = await api.post(`/api/forum/posts/${post.id}/reactions`, { emoji })
      setUserReactions(prev => data.active ? [...prev, emoji] : prev.filter(e => e !== emoji))
      setCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) + (data.active ? 1 : -1)) }))
    } catch {}
  }

  const presetEmojis = post.reaction_preset || ['👍', '👎', '❤️', '🔥', '⭐']

  return (
    <div className="flex items-center gap-2 flex-wrap mt-3">
      {(post.allow_reactions === 'preset' || post.allow_reactions === 'both') &&
        presetEmojis.map(emoji => (
          <button key={emoji} onClick={() => toggle(emoji)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all duration-150 ${
              userReactions.includes(emoji)
                ? 'bg-[#dc2626]/20 border-[#dc2626]/50 text-white'
                : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-gray-200'
            }`}>
            <span className="text-base leading-none">{emoji}</span>
            {counts[emoji] > 0 && <span className="text-xs font-medium">{counts[emoji]}</span>}
          </button>
        ))
      }
      {/* Boutons pour emojis custom déjà réactionnés */}
      {(post.allow_reactions === 'custom' || post.allow_reactions === 'both') &&
        Object.keys(counts)
          .filter(e => !presetEmojis.includes(e) && (counts[e] > 0 || userReactions.includes(e)))
          .map(emoji => (
            <button key={`custom-${emoji}`} onClick={() => toggle(emoji)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-all duration-150 ${
                userReactions.includes(emoji)
                  ? 'bg-[#dc2626]/20 border-[#dc2626]/50 text-white'
                  : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-400 hover:border-[#3a3a3a] hover:text-gray-200'
              }`}>
              <span className="text-base leading-none">{emoji}</span>
              {counts[emoji] > 0 && <span className="text-xs font-medium">{counts[emoji]}</span>}
            </button>
          ))
      }
      {(post.allow_reactions === 'custom' || post.allow_reactions === 'both') && (
        <div className="relative" ref={pickerRef}>
          <button onClick={() => setShowPicker(!showPicker)}
            className="px-3 py-1.5 rounded-full border border-dashed border-[#2a2a2a] text-gray-600 text-sm hover:border-[#3a3a3a] hover:text-gray-400 transition-colors">
            + 😀
          </button>
          {showPicker && (
            <div className="absolute bottom-full mb-2 left-0 bg-[#111111] border border-[#1f1f1f] rounded-xl p-4 shadow-2xl z-50 w-72 grid grid-cols-8 gap-2">
              {COMMON_EMOJIS.map(e => (
                <button key={e} onClick={() => { toggle(e); setShowPicker(false) }}
                  className={`w-8 h-8 rounded-lg text-xl flex items-center justify-center transition-all hover:scale-125 ${
                    userReactions.includes(e) ? 'bg-[#dc2626]/20' : 'hover:bg-[#1a1a1a]'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── PostOptionsMenu ──────────────────────────────────────────────────────────

function PostOptionsMenu({ post, isPostAuthor, isAdmin, onToggleComments, onOpenReactionSettings, onClearComments, onTogglePin, onDeletePost, onEditPost }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const MenuItem = ({ onClick, danger, children }) => (
    <button onClick={() => { onClick(); setShowMenu(false) }}
      className={`w-full text-left px-4 py-2 text-xs hover:bg-[#1a1a1a] transition-colors ${danger ? 'text-red-400 hover:text-red-300' : 'text-gray-300 hover:text-white'}`}>
      {children}
    </button>
  )

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setShowMenu(!showMenu)}
        className="text-gray-600 hover:text-gray-300 px-2 py-1 rounded text-lg leading-none transition-colors">
        ⋯
      </button>
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-xl z-20 py-1">
          {isPostAuthor && (
            <>
              <MenuItem onClick={onEditPost}>
                ✏️ Modifier le post
              </MenuItem>
              <MenuItem onClick={onToggleComments}>
                {post.allow_comments ? '🔇 Désactiver commentaires' : '💬 Activer commentaires'}
              </MenuItem>
              <MenuItem onClick={onOpenReactionSettings}>
                😀 Gérer les réactions
              </MenuItem>
              {post.allow_comments && (
                <MenuItem onClick={onClearComments} danger>
                  🗑️ Vider les commentaires
                </MenuItem>
              )}
            </>
          )}
          {isAdmin && (
            <>
              {isPostAuthor && <div className="border-t border-[#1a1a1a] my-1" />}
              <MenuItem onClick={onTogglePin}>
                {post.is_pinned ? '📌 Désépingler' : '📌 Épingler'}
              </MenuItem>
              <MenuItem onClick={onDeletePost} danger>
                🗑️ Supprimer le post
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── ReactionSettingsModal ────────────────────────────────────────────────────

function ReactionSettingsModal({ post, onClose, onSaved }) {
  const [reactionType, setReactionType] = useState(post.allow_reactions || 'preset')
  const [selectedPresets, setSelectedPresets] = useState(post.reaction_preset || ['👍', '👎', '❤️', '🔥', '⭐'])
  const [showPresetPicker, setShowPresetPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  const removePreset = (e) => setSelectedPresets(prev => prev.filter(x => x !== e))
  const addPreset = (e) => { if (!selectedPresets.includes(e)) setSelectedPresets(prev => [...prev, e]) }

  const save = async () => {
    setLoading(true)
    try {
      await api.put(`/api/forum/posts/${post.id}`, {
        allow_reactions: reactionType,
        reaction_preset: selectedPresets
      })
      onSaved({ allow_reactions: reactionType, reaction_preset: selectedPresets })
      onClose()
    } catch {} finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1a1a1a]">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">😀 Réglages des réactions</h3>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-1.5">Type de réactions</label>
            <select value={reactionType} onChange={e => setReactionType(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#dc2626]/50">
              <option value="preset">Emojis prédéfinis uniquement</option>
              <option value="custom">Emoji picker libre</option>
              <option value="both">Les deux</option>
              <option value="none">Aucune réaction</option>
            </select>
          </div>

          {(reactionType === 'preset' || reactionType === 'both') && (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-2">Emojis prédéfinis</label>
              <div className="flex gap-2 flex-wrap">
                {selectedPresets.map(e => (
                  <button key={e} onClick={() => removePreset(e)}
                    className="text-2xl hover:opacity-50 transition-opacity" title="Retirer">
                    {e}
                  </button>
                ))}
                <button onClick={() => setShowPresetPicker(!showPresetPicker)}
                  className="w-10 h-10 rounded-lg border border-dashed border-[#333] text-gray-500 hover:text-gray-300 transition-colors text-lg">
                  +
                </button>
              </div>
              {showPresetPicker && (
                <div className="mt-2 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 grid grid-cols-8 gap-1">
                  {COMMON_EMOJIS.map(e => (
                    <button key={e} onClick={() => addPreset(e)}
                      className={`w-8 h-8 rounded-lg text-lg transition-colors flex items-center justify-center ${selectedPresets.includes(e) ? 'opacity-30' : 'hover:bg-[#1a1a1a]'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:text-white transition-all">
              Annuler
            </button>
            <button onClick={save} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 transition-all">
              Sauvegarder
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CommentsSection ──────────────────────────────────────────────────────────

function CommentsSection({ postId, isPostAuthor, initialComments = [] }) {
  const { user } = useAuth()
  const isAdmin = ['superadmin', 'admin'].includes(user?.site_role)
  const [comments, setComments] = useState(initialComments)
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(false)

  const submitComment = async () => {
    if (!newComment.trim() || !user) return
    setLoading(true)
    try {
      const { data } = await api.post(`/api/forum/posts/${postId}/comments`, { content: newComment.trim() })
      setComments(prev => [...prev, data])
      setNewComment('')
    } catch {} finally { setLoading(false) }
  }

  const deleteComment = async (id) => {
    try {
      await api.delete(`/api/forum/comments/${id}`)
      setComments(prev => prev.filter(c => c.id !== id))
    } catch {}
  }

  const clearAllComments = async () => {
    if (!window.confirm('Vider tous les commentaires ?')) return
    try {
      await api.delete(`/api/forum/posts/${postId}/comments`)
      setComments([])
    } catch {}
  }

  return (
    <div className="mx-6 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-widest text-gray-600">
          💬 Commentaires ({comments.length})
        </span>
        {isPostAuthor && comments.length > 0 && (
          <button onClick={clearAllComments}
            className="text-xs text-gray-700 hover:text-red-400 transition-colors">
            Tout vider
          </button>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {comments.map(c => (
          <div key={c.id} className="flex gap-3 p-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
            <div className="w-7 h-7 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                            flex items-center justify-center text-[10px] font-bold text-[#dc2626] flex-shrink-0">
              {c.author_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold text-white">{c.author_name}</span>
                <RoleBadge role={c.author_coc_role} siteRole={c.author_site_role} />
                <span className="text-[10px] text-gray-700 ml-auto">{formatDateTime(c.created_at)}</span>
              </div>
              <p className="text-xs text-gray-400">{c.content}</p>
            </div>
            {(isPostAuthor || isAdmin || c.author_id === user?.id) && (
              <button onClick={() => deleteComment(c.id)}
                className="text-gray-700 hover:text-red-400 transition-colors text-xs flex-shrink-0">
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {user && (
        <div className="flex gap-3">
          <div className="w-7 h-7 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                          flex items-center justify-center text-[10px] font-bold text-[#dc2626] flex-shrink-0">
            {user?.coc_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && submitComment()}
              placeholder="Écrire un commentaire..."
              className="flex-1 px-3 py-2 rounded-xl bg-[#0d0d0d] border border-[#2a2a2a] text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#dc2626]/50 transition-colors"
            />
            <button onClick={submitComment} disabled={loading || !newComment.trim()}
              className="px-4 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white text-sm font-semibold transition-colors disabled:opacity-50">
              →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PostView (vue détaillée) ─────────────────────────────────────────────────

function PostView({ postId, onBack, onDeleted }) {
  const { user } = useAuth()
  const isAdmin = ['superadmin', 'admin'].includes(user?.site_role)
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showReactionSettings, setShowReactionSettings] = useState(false)
  const [showEditPost, setShowEditPost] = useState(false)

  const fetchPost = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/forum/posts/${postId}`)
      setPost(data)
    } catch {} finally { setLoading(false) }
  }, [postId])

  useEffect(() => { fetchPost() }, [fetchPost])

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!post) return (
    <div className="flex-1 flex items-center justify-center">
      <p className="text-gray-600 text-sm">Post introuvable</p>
    </div>
  )

  const isPostAuthor = post.author_id === user?.id
  const isCyberAlf = user?.coc_name === 'CyberAlf'
  const canManagePost = isPostAuthor || isAdmin || isCyberAlf

  const handleToggleComments = async () => {
    try {
      const { data } = await api.put(`/api/forum/posts/${post.id}`, { allow_comments: !post.allow_comments })
      setPost(p => ({ ...p, allow_comments: data.allow_comments }))
    } catch {}
  }

  const handleClearComments = async () => {
    if (!window.confirm('Vider tous les commentaires ?')) return
    try {
      await api.delete(`/api/forum/posts/${post.id}/comments`)
      setPost(p => ({ ...p, comments: [] }))
    } catch {}
  }

  const handleTogglePin = async () => {
    try {
      const { data } = await api.post(`/api/forum/posts/${post.id}/pin`)
      setPost(p => ({ ...p, is_pinned: data.is_pinned }))
    } catch {}
  }

  const handleDeletePost = async () => {
    if (!window.confirm('Supprimer ce post ?')) return
    try {
      await api.delete(`/api/forum/posts/${post.id}`)
      onDeleted(post.id)
      onBack()
    } catch {}
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <button onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-4 mx-6 mt-4">
        ← Retour
      </button>

      <div className="mx-6 mb-4 p-5 rounded-2xl bg-[#111111] border border-[#1f1f1f]">
        {/* Header auteur */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                            flex items-center justify-center font-bold text-[#dc2626]">
              {post.author_name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{post.author_name}</span>
                <RoleBadge role={post.author_coc_role} siteRole={post.author_site_role} />
              </div>
              <span className="text-xs text-gray-600">{formatFullDate(post.created_at)}</span>
            </div>
          </div>
          {canManagePost && (
            <PostOptionsMenu
              post={post}
              isPostAuthor={isPostAuthor || isCyberAlf}
              isAdmin={isAdmin || isCyberAlf}
              onEditPost={() => setShowEditPost(true)}
              onToggleComments={handleToggleComments}
              onOpenReactionSettings={() => setShowReactionSettings(true)}
              onClearComments={handleClearComments}
              onTogglePin={handleTogglePin}
              onDeletePost={handleDeletePost}
            />
          )}
        </div>

        {/* Badge épinglé */}
        {post.is_pinned && (
          <div className="flex items-center gap-1.5 mb-3">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: post.pin_color || '#f59e0b' }} />
            <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: post.pin_color || '#f59e0b' }}>
              Post épinglé
            </span>
          </div>
        )}

        <h2 className="text-lg font-bold text-white mb-3 uppercase tracking-wide">{post.title}</h2>

        {post.content && (
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap mb-4">{post.content}</p>
        )}

        {post.image_url && (
          <img src={post.image_url} alt="" className="w-full max-h-96 object-cover rounded-xl mb-4" />
        )}

        {post.allow_reactions !== 'none' && (
          <div className="pt-3 border-t border-[#1a1a1a]">
            <ReactionBar
              post={post}
              initialCounts={post.reaction_counts || {}}
              initialUserReactions={post.user_reactions || []}
            />
          </div>
        )}
      </div>

      {post.allow_comments && (
        <CommentsSection
          postId={post.id}
          isPostAuthor={isPostAuthor || isCyberAlf}
          initialComments={post.comments || []}
        />
      )}

      {showReactionSettings && (
        <ReactionSettingsModal
          post={post}
          onClose={() => setShowReactionSettings(false)}
          onSaved={(updates) => setPost(p => ({ ...p, ...updates }))}
        />
      )}
      {showEditPost && (
        <EditPostModal
          post={post}
          onClose={() => setShowEditPost(false)}
          onSaved={(updated) => setPost(p => ({ ...p, ...updated }))}
        />
      )}
    </div>
  )
}

// ─── EditPostModal ────────────────────────────────────────────────────────────

function EditPostModal({ post, onClose, onSaved }) {
  const [form, setForm] = useState({ title: post.title || '', content: post.content || '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(post.image_url || null)
  const [removeImage, setRemoveImage] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setRemoveImage(false)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Le titre est requis')
    setError('')
    setUploading(true)

    let image_url = post.image_url
    if (removeImage) {
      image_url = null
    } else if (imageFile) {
      try {
        const fd = new FormData()
        fd.append('file', imageFile)
        const { data: uploadData } = await api.post('/api/forum/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        image_url = uploadData.url
      } catch (err) {
        setError('Erreur upload image: ' + (err.response?.data?.error || err.message))
        setUploading(false)
        return
      }
    }

    try {
      const { data } = await api.put(`/api/forum/posts/${post.id}`, {
        title: form.title.trim(),
        content: form.content.trim(),
        image_url,
      })
      onSaved(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la modification')
    }
    setUploading(false)
  }

  const inputCls = 'w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#dc2626]/50'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">✏️ Modifier le post</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-3">
          {error && <p className="text-xs text-[#dc2626]">{error}</p>}
          <input required value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titre du post *"
            className={inputCls} />
          <textarea value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={5} placeholder="Contenu (optionnel)"
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#dc2626]/50 resize-none" />

          <div>
            {imagePreview && !removeImage && (
              <div className="relative inline-block mb-2">
                <img src={imagePreview} alt="" className="max-h-32 rounded-lg" />
                <button type="button" onClick={() => { setRemoveImage(true); setImagePreview(null); setImageFile(null) }}
                  className="absolute top-1 right-1 bg-red-900 text-white text-xs rounded px-1">✕</button>
              </div>
            )}
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs text-gray-400 border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:text-white hover:border-[#3a3a3a] transition-colors">
              📎 {imagePreview && !removeImage ? "Changer l'image" : 'Ajouter une image'}
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:text-white transition-all">
              Annuler
            </button>
            <button type="submit" disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 transition-all">
              {uploading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CreatePostModal ──────────────────────────────────────────────────────────

function CreatePostModal({ categoryId, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    content: '',
    allow_comments: true,
    allow_reactions: 'preset',
  })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const fileRef = useRef(null)

  const handleImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return setError('Le titre est requis')
    setError('')
    setUploading(true)

    let image_url = null
    if (imageFile) {
      try {
        const fd = new FormData()
        fd.append('file', imageFile)
        const { data: uploadData } = await api.post('/api/forum/upload', fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
        image_url = uploadData.url
      } catch (err) {
        setError('Erreur upload image: ' + (err.response?.data?.error || err.message))
        setUploading(false)
        return
      }
    }

    try {
      const { data } = await api.post('/api/forum/posts', {
        ...form,
        title: form.title.trim(),
        content: form.content.trim(),
        category_id: categoryId,
        image_url,
      })
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la publication')
    }
    setUploading(false)
  }

  const inputCls = 'w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#dc2626]/50'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">Nouveau post</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-3">
          {error && <p className="text-xs text-[#dc2626]">{error}</p>}
          <input required value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Titre du post *"
            className={inputCls} />
          <textarea value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            rows={5} placeholder="Contenu (optionnel)"
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#dc2626]/50 resize-none" />

          <div>
            <button type="button" onClick={() => fileRef.current?.click()}
              className="text-xs text-gray-400 border border-[#2a2a2a] px-3 py-1.5 rounded-lg hover:text-white hover:border-[#3a3a3a] transition-colors">
              📎 Ajouter une image
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
            {imagePreview && (
              <div className="mt-2 relative inline-block">
                <img src={imagePreview} alt="" className="max-h-32 rounded-lg" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null) }}
                  className="absolute top-1 right-1 bg-red-900 text-white text-xs rounded px-1">✕</button>
              </div>
            )}
          </div>

          <details open={showAdvanced} onToggle={e => setShowAdvanced(e.target.open)}>
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300 select-none">
              ⚙️ Options avancées
            </summary>
            <div className="mt-3 space-y-3 pl-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Autoriser les commentaires</label>
                <button type="button" onClick={() => setForm(f => ({ ...f, allow_comments: !f.allow_comments }))}
                  className={`w-10 h-5 rounded-full transition-colors relative ${form.allow_comments ? 'bg-[#dc2626]' : 'bg-[#2a2a2a]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.allow_comments ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-gray-500 block mb-1.5">Type de réactions</label>
                <select value={form.allow_reactions} onChange={e => setForm(f => ({ ...f, allow_reactions: e.target.value }))}
                  className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-[#dc2626]/50">
                  <option value="preset">Emojis prédéfinis</option>
                  <option value="custom">Emoji picker libre</option>
                  <option value="both">Les deux</option>
                  <option value="none">Aucune</option>
                </select>
              </div>
            </div>
          </details>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:text-white transition-all">
              Annuler
            </button>
            <button type="submit" disabled={uploading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 transition-all">
              {uploading ? 'Publication...' : 'Publier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── CreateCategoryModal ──────────────────────────────────────────────────────

function CreateCategoryModal({ parentId, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', icon: '💬', color: '#dc2626', allow_member_subcategories: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Le nom est requis')
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/api/forum/categories', {
        ...form,
        name: form.name.trim(),
        parent_id: parentId || null,
      })
      onCreated(data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur création')
    } finally { setLoading(false) }
  }

  const inputCls = 'w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#dc2626]/50'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1a1a1a] flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            {parentId ? '+ Sous-catégorie' : '+ Nouvelle catégorie'}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-3">
          {error && <p className="text-xs text-[#dc2626]">{error}</p>}
          <div className="flex gap-2">
            <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
              className="w-14 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-2 py-2.5 text-center text-xl focus:outline-none"
              placeholder="💬" />
            <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Nom *" className={`flex-1 ${inputCls}`} />
          </div>
          <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Description (optionnel)" className={inputCls} />
          {!parentId && (
            <div className="flex flex-col gap-2">
              <label className="text-xs uppercase tracking-wide text-gray-500 font-medium">
                Sous-catégories membres
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, allow_member_subcategories: false }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase border transition-all duration-150 ${
                    !form.allow_member_subcategories
                      ? 'bg-[#dc2626]/20 border-[#dc2626]/50 text-white'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500'
                  }`}
                >
                  ✕ Non
                </button>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, allow_member_subcategories: true }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold uppercase border transition-all duration-150 ${
                    form.allow_member_subcategories
                      ? 'bg-green-500/20 border-green-500/50 text-green-400'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-gray-500'
                  }`}
                >
                  ✓ Oui
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:text-white transition-all">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 transition-all">
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ForumDiscord ─────────────────────────────────────────────────────────────

function ForumDiscord({ user }) {
  const isAdmin = ['superadmin', 'admin'].includes(user?.site_role)
  const isPrivileged = isAdmin || ['leader', 'coLeader'].includes(user?.coc_role)
  const isCyberAlf = user?.coc_name === 'CyberAlf'

  const [categories, setCategories] = useState([])
  const [catLoading, setCatLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [expandedCategories, setExpandedCategories] = useState([])
  const [posts, setPosts] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [activePostId, setActivePostId] = useState(null)
  const [showCreatePost, setShowCreatePost] = useState(false)
  const [createCategoryModal, setCreateCategoryModal] = useState(null) // null | 'root' | parentId
  const [editingPost, setEditingPost] = useState(null)

  const fetchCategories = useCallback(async () => {
    setCatLoading(true)
    try {
      const { data } = await api.get('/api/forum/categories')
      setCategories(data || [])
      if (!activeCategory && data?.length > 0) {
        setActiveCategory(data[0].id)
        setExpandedCategories([data[0].id])
      }
    } catch {} finally { setCatLoading(false) }
  }, [activeCategory])

  useEffect(() => { fetchCategories() }, [])

  useEffect(() => {
    if (!activeCategory) return
    setPostsLoading(true)
    setPosts([])
    setActivePostId(null)
    api.get(`/api/forum/categories/${activeCategory}/posts`)
      .then(r => setPosts(r.data || []))
      .catch(() => {})
      .finally(() => setPostsLoading(false))
  }, [activeCategory])

  const toggleExpand = (catId) => {
    setExpandedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    )
  }

  const handleSelectCategory = (catId) => {
    setActiveCategory(catId)
    setActivePostId(null)
  }

  const handleDeleteCategory = async (catId) => {
    if (!window.confirm('Supprimer cette catégorie et tous ses posts ?')) return
    try {
      await api.delete(`/api/forum/categories/${catId}`)
      setCategories(prev => prev.filter(c => c.id !== catId && c.parent_id !== catId))
      if (activeCategory === catId) setActiveCategory(null)
    } catch {}
  }

  const handleTogglePinFromList = async (post, e) => {
    e.stopPropagation()
    try {
      const { data } = await api.post(`/api/forum/posts/${post.id}/pin`)
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, is_pinned: data.is_pinned } : p))
    } catch {}
  }

  const handleDeleteFromList = async (postId, e) => {
    e.stopPropagation()
    if (!window.confirm('Supprimer ce post ?')) return
    try {
      await api.delete(`/api/forum/posts/${postId}`)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch {}
  }

  const activeCat = categories.find(c => c.id === activeCategory) ||
    categories.flatMap(c => c.subcategories || []).find(c => c.id === activeCategory)

  return (
    <div className="flex" style={{ minHeight: '75vh', background: '#0d0d0d' }}>

      {/* ── Sidebar ── */}
      <aside className="flex-shrink-0 flex flex-col overflow-y-auto"
        style={{ width: 288, background: '#080808', borderRight: '1px solid #1a1a1a' }}>
        <div className="px-4 py-3 border-b border-[#1a1a1a]">
          <span className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Forums</span>
        </div>
        {isAdmin && (
          <div className="px-2 pt-2">
            <button onClick={() => setCreateCategoryModal('root')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wide bg-[#dc2626]/10 border border-[#dc2626]/30 text-[#dc2626] hover:bg-[#dc2626]/20 transition-all duration-200 w-full">
              + Nouvelle catégorie
            </button>
          </div>
        )}

        {catLoading ? (
          <p className="text-xs text-gray-600 px-4 py-3 animate-pulse">Chargement...</p>
        ) : (
          <nav className="flex flex-col py-2 flex-1">
            {categories.map(cat => {
              const active = activeCategory === cat.id
              const expanded = expandedCategories.includes(cat.id)
              return (
                <div key={cat.id} className="mx-2 my-0.5">
                  <div className="relative group">
                    <button
                      onClick={() => { toggleExpand(cat.id); handleSelectCategory(cat.id) }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left hover:scale-[1.02] hover:bg-[#151515] ${
                        active ? 'bg-[#151515] border border-[#dc2626]/20' : 'border border-transparent'
                      }`}
                    >
                      {active && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                          style={{ backgroundColor: cat.color || '#dc2626' }} />
                      )}
                      <span className="text-lg flex-shrink-0">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate transition-colors ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}>
                          {cat.name}
                        </p>
                        {cat.description && <p className="text-[10px] text-gray-600 truncate">{cat.description}</p>}
                      </div>
                      {cat.subcategories?.length > 0 && (
                        <svg className={`w-3 h-3 text-gray-600 transition-transform duration-200 flex-shrink-0 ${expanded ? 'rotate-90' : ''}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleDeleteCategory(cat.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex w-5 h-5 items-center justify-center text-gray-600 hover:text-red-400 transition-colors text-xs">
                        ✕
                      </button>
                    )}
                  </div>

                  {expanded && (
                    <div className="ml-4 mt-1 space-y-0.5 border-l border-[#1a1a1a] pl-3">
                      {(cat.subcategories || []).map(sub => (
                        <button key={sub.id}
                          onClick={() => handleSelectCategory(sub.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all duration-150 hover:bg-[#151515] hover:scale-[1.01] ${
                            activeCategory === sub.id ? 'bg-[#151515] text-white' : 'text-gray-500'
                          }`}>
                          <span className="text-sm">{sub.icon || '▸'}</span>
                          <span className="text-xs font-medium truncate">{sub.name}</span>
                        </button>
                      ))}
                      {(isAdmin || cat.allow_member_subcategories) && (
                        <button onClick={() => setCreateCategoryModal(cat.id)}
                          className="flex items-center gap-2 px-3 py-2 mx-0 mt-1 rounded-lg text-xs font-semibold uppercase tracking-wide bg-[#1a1a1a] border border-dashed border-[#333] text-gray-500 hover:border-[#dc2626]/50 hover:text-[#dc2626] transition-all duration-200 w-full">
                          + Sous-catégorie
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </nav>
        )}
      </aside>

      {/* ── Zone centrale ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {activePostId ? (
          <PostView
            postId={activePostId}
            onBack={() => setActivePostId(null)}
            onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))}
          />
        ) : activeCat ? (
          <>
            <div className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeCat.icon}</span>
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wide">{activeCat.name}</h2>
                  {activeCat.description && <p className="text-xs text-gray-500">{activeCat.description}</p>}
                </div>
              </div>
              {user && (
                <button onClick={() => setShowCreatePost(true)}
                  className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-colors">
                  + Nouveau post
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {postsLoading && (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {!postsLoading && posts.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-gray-600 text-xs uppercase tracking-widest">Aucun post dans cette catégorie</p>
                  {user && <p className="text-xs text-gray-700 mt-2">Sois le premier à publier ↑</p>}
                </div>
              )}
              <div className="flex flex-col gap-2 px-4 py-2">
                {posts.map(post => (
                  <div
                    key={post.id}
                    onClick={() => setActivePostId(post.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-200 hover:scale-[1.005] ${
                      post.is_pinned
                        ? 'border-[#f59e0b]/40 bg-gradient-to-r from-[#111111] to-[#0d0d0d]'
                        : 'border-[#1f1f1f] bg-[#111111] hover:border-[#dc2626]/30'
                    }`}
                  >
                    {post.is_pinned && (
                      <div className="flex items-center gap-1.5 mb-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: post.pin_color || '#f59e0b' }} />
                        <span className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: post.pin_color || '#f59e0b' }}>
                          Post épinglé
                        </span>
                      </div>
                    )}

                    <h3 className="text-sm font-bold text-white mb-2 line-clamp-1">{post.title}</h3>

                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                                      flex items-center justify-center text-[10px] font-bold text-[#dc2626]">
                        {post.author_name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-400">{post.author_name}</span>
                      <RoleBadge role={post.author_coc_role} siteRole={post.author_site_role} />
                      <span className="text-xs text-gray-700 ml-auto">{formatDate(post.created_at)}</span>
                    </div>

                    {post.content && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{post.content}</p>
                    )}

                    {post.image_url && (
                      <img src={post.image_url} alt="" className="w-full max-h-32 object-cover rounded-xl mb-3" />
                    )}

                    <div className="flex items-center gap-3 pt-2 border-t border-[#1a1a1a]">
                      {post.reaction_counts && Object.entries(post.reaction_counts).map(([emoji, count]) =>
                        count > 0 && (
                          <span key={emoji} className="text-xs text-gray-500">{emoji} {count}</span>
                        )
                      )}
                      {post.allow_comments && (
                        <span className="text-xs text-gray-600 ml-auto">💬 {post.comment_count || 0}</span>
                      )}
                    </div>

                    {/* Boutons d'action — visibles pour canManagePost */}
                    {(post.author_id === user?.id || isAdmin || isCyberAlf) && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-[#1a1a1a]" onClick={e => e.stopPropagation()}>
                        <button onClick={e => { e.stopPropagation(); setEditingPost(post) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-[#f59e0b]/50 hover:text-[#f59e0b] transition-all duration-150">
                          ✏️ Modifier
                        </button>
                        {(isAdmin || isCyberAlf) && (
                          <button onClick={e => handleTogglePinFromList(post, e)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 hover:border-[#f59e0b]/50 hover:text-[#f59e0b] transition-all duration-150">
                            📌 {post.is_pinned ? 'Désépingler' : 'Épingler'}
                          </button>
                        )}
                        <button onClick={e => handleDeleteFromList(post.id, e)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide bg-[#7f1d1d]/20 border border-[#dc2626]/30 text-[#dc2626] hover:bg-[#7f1d1d]/40 transition-all duration-150 ml-auto">
                          🗑️ Supprimer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-600 text-xs uppercase tracking-widest">
              {categories.length === 0 && !catLoading
                ? "Aucune catégorie — un admin peut en créer une"
                : 'Sélectionne une catégorie'}
            </p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreatePost && activeCategory && (
        <CreatePostModal
          categoryId={activeCategory}
          onClose={() => setShowCreatePost(false)}
          onCreated={(post) => { setPosts(prev => [post, ...prev]); setShowCreatePost(false) }}
        />
      )}

      {createCategoryModal && (
        <CreateCategoryModal
          parentId={createCategoryModal === 'root' ? null : createCategoryModal}
          onClose={() => setCreateCategoryModal(null)}
          onCreated={(cat) => {
            if (!cat.parent_id) {
              setCategories(prev => [...prev, { ...cat, subcategories: [] }])
              setActiveCategory(cat.id)
            } else {
              setCategories(prev => prev.map(c =>
                c.id === cat.parent_id
                  ? { ...c, subcategories: [...(c.subcategories || []), cat] }
                  : c
              ))
            }
            setCreateCategoryModal(null)
          }}
        />
      )}

      {editingPost && (
        <EditPostModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSaved={(updated) => {
            setPosts(prev => prev.map(p => p.id === editingPost.id ? { ...p, ...updated } : p))
            setEditingPost(null)
          }}
        />
      )}
    </div>
  )
}

// ─── ChatTab (inchangé) ───────────────────────────────────────────────────────

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

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Forum() {
  const { user } = useAuth()
  const [tab, setTab] = useState('forum')

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-up">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#dc2626] mb-2">Donjon Rouge</p>
        <h1 className="text-3xl font-black text-white uppercase tracking-widest">Forum & Tchat</h1>
      </div>

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
