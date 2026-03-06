import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import api from '../lib/api.js'
import SectionHeader from '../components/SectionHeader.jsx'
import RoleTag from '../components/RoleTag.jsx'

const TABS = ['Dashboard', 'Membres', 'Annonces', 'Modération']

export default function Admin() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState(0)

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      navigate('/')
    }
  }, [user, loading])

  if (loading) return null
  if (!user?.is_admin) return null

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 animate-fade-up">
      <SectionHeader title="Administration" subtitle="Donjon Rouge · Panneau de contrôle" />

      <div className="flex gap-2 mb-8 flex-wrap">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`px-5 py-2 font-cinzel uppercase text-sm tracking-wider rounded transition-all ${
              activeTab === i ? 'text-bone' : 'text-ash border border-fog hover:text-bone'
            }`}
            style={activeTab === i ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : {}}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 0 && <Dashboard />}
      {activeTab === 1 && <Members />}
      {activeTab === 2 && <AnnouncementsAdmin />}
      {activeTab === 3 && <Moderation />}
    </div>
  )
}

function Dashboard() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    Promise.all([
      api.get('/api/players').catch(() => ({ data: [] })),
      api.get('/api/forum/posts').catch(() => ({ data: [] })),
      api.get('/api/announcements').catch(() => ({ data: [] }))
    ]).then(([players, posts, annonces]) => {
      const now = new Date()
      const monthAgo = new Date(now - 30 * 24 * 3600000)
      setStats({
        members: players.data.length,
        postsThisMonth: posts.data.filter((p) => new Date(p.created_at) > monthAgo).length,
        activeAnnouncements: annonces.data.length
      })
    })
  }, [])

  return (
    <div>
      <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Vue d'ensemble</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Membres inscrits', value: stats?.members ?? '…', icon: '👥' },
          { label: 'Posts ce mois', value: stats?.postsThisMonth ?? '…', icon: '💬' },
          { label: 'Annonces actives', value: stats?.activeAnnouncements ?? '…', icon: '📢' },
        ].map((s) => (
          <div key={s.label} className="card-stone p-5 flex flex-col items-center gap-2">
            <span className="text-3xl">{s.icon}</span>
            <span className="text-2xl font-bold font-cinzel text-gold-light">{s.value}</span>
            <span className="text-xs text-ash font-cinzel uppercase tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Members() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/players').then((r) => setMembers(r.data)).finally(() => setLoading(false))
  }, [])

  async function promote(id) {
    await api.patch(`/api/players/${id}`, { role: 'Co-chef', is_admin: false })
    setMembers((prev) => prev.map((m) => m.id === id ? { ...m, role: 'Co-chef' } : m))
  }

  async function kick(id) {
    if (!window.confirm('Exclure ce membre ?')) return
    await api.delete(`/api/players/${id}`)
    setMembers((prev) => prev.filter((m) => m.id !== id))
  }

  if (loading) return <p className="text-ash font-cinzel animate-pulse">Chargement...</p>

  return (
    <div>
      <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Membres ({members.length})</h3>
      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div key={m.id} className="card-stone p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm"
              style={{ background: '#C41E3A', color: '#d4c5a9' }}>
              {m.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-bone text-sm">{m.username}</p>
              <p className="text-xs text-ash">{m.coc_tag || 'Pas de tag CoC'}</p>
            </div>
            <RoleTag role={m.role || 'Membre'} />
            {m.is_admin && <span className="text-xs text-gold font-cinzel uppercase">Admin</span>}
            <div className="flex gap-2">
              <button onClick={() => promote(m.id)}
                className="text-xs px-3 py-1 border border-gold text-gold rounded hover:bg-gold hover:text-stone transition-all font-cinzel uppercase">
                Promouvoir
              </button>
              <button onClick={() => kick(m.id)}
                className="text-xs px-3 py-1 border border-crimson text-crimson rounded hover:bg-crimson hover:text-bone transition-all font-cinzel uppercase">
                Exclure
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnnouncementsAdmin() {
  const [form, setForm] = useState({ type: 'INFO', title: '', content: '' })
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    try {
      await api.post('/api/announcements', form)
      setSent(true)
      setForm({ type: 'INFO', title: '', content: '' })
      setTimeout(() => setSent(false), 3000)
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur')
    }
  }

  return (
    <div>
      <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Créer une annonce</h3>
      {sent && <p className="text-green-400 font-cinzel text-sm mb-4">Annonce publiée avec succès !</p>}
      {error && <p className="text-crimson text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 max-w-2xl">
        <div>
          <label className="block text-xs font-cinzel uppercase text-ash mb-1">Type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson">
            {['URGENT', 'INFO', 'VICTOIRE', 'RECRUTEMENT'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-cinzel uppercase text-ash mb-1">Titre</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
            required />
        </div>
        <div>
          <label className="block text-xs font-cinzel uppercase text-ash mb-1">Contenu</label>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={5} className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone resize-none focus:outline-none focus:border-crimson"
            required />
        </div>
        <button type="submit" className="px-6 py-3 font-cinzel uppercase tracking-wider text-bone rounded self-start"
          style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
          Publier l'annonce
        </button>
      </form>
    </div>
  )
}

function Moderation() {
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/forum/posts').then((r) => setPosts(r.data)).finally(() => setLoading(false))
  }, [])

  async function deletePost(id) {
    if (!window.confirm('Supprimer ce post ?')) return
    await api.delete(`/api/forum/posts/${id}`)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  if (loading) return <p className="text-ash font-cinzel animate-pulse">Chargement...</p>

  return (
    <div>
      <h3 className="font-cinzel text-gold-bright uppercase tracking-wider mb-6">Modération des posts ({posts.length})</h3>
      <div className="flex flex-col gap-2">
        {posts.map((p) => (
          <div key={p.id} className="card-stone p-4 flex items-start gap-4">
            <div className="flex-1">
              <p className="font-semibold text-bone text-sm">{p.title}</p>
              <p className="text-xs text-ash mt-0.5">Par {p.author?.username} · {new Date(p.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <button onClick={() => deletePost(p.id)}
              className="text-xs px-3 py-1 border border-crimson text-crimson rounded hover:bg-crimson hover:text-bone transition-all font-cinzel uppercase flex-shrink-0">
              Supprimer
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
