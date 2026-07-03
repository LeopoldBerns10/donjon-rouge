import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'

const ROLE_LABELS = {
  leader: 'Capitaine',
  coLeader: 'Co-Capitaine',
  admin: 'Co-Capitaine',
  member: 'Joueur',
}

const AVATAR_COLORS = ['#dc2626', '#b91c1c', '#7f1d1d']

function MemberCard({ member, index }) {
  const initials = member.name?.slice(0, 2).toUpperCase() || '??'
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length]
  const role = ROLE_LABELS[member.role] || 'Joueur'

  return (
    <div className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-[#111111] border border-[#1f1f1f] hover:border-[#dc2626]/40 transition-all duration-200">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white shadow-lg"
        style={{ background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color})` }}
      >
        {initials}
      </div>
      <div className="text-center">
        <p className="font-bold text-white text-lg leading-tight">{member.name}</p>
        <p className="text-xs uppercase tracking-widest text-[#dc2626] mt-0.5">{role}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 w-full mt-1">
        <div className="text-center p-2 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
          <p className="text-base font-bold text-white">HDV {member.townHallLevel}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">Town Hall</p>
        </div>
        <div className="text-center p-2 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a]">
          <p className="text-base font-bold text-[#f59e0b]">{member.trophies?.toLocaleString()}</p>
          <p className="text-[10px] uppercase tracking-widest text-gray-600">Trophées</p>
        </div>
      </div>
    </div>
  )
}

function ResultModal({ onClose, onSave }) {
  const [form, setForm] = useState({ round: '', opponent: '', score_dr: '', score_opp: '', won: true, played_at: new Date().toISOString().slice(0, 10) })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.round || !form.opponent || form.score_dr === '' || form.score_opp === '' || !form.played_at) {
      setError('Tous les champs sont requis')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/esport/results', {
        ...form,
        score_dr: Number(form.score_dr),
        score_opp: Number(form.score_opp),
        won: form.won === true || form.won === 'true',
      })
      onSave()
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white font-cinzel uppercase tracking-wide">Ajouter un résultat</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-gray-500">Round</label>
              <input value={form.round} onChange={e => setForm(f => ({ ...f, round: e.target.value }))}
                placeholder="Phase de groupes" className="input-field" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-gray-500">Date</label>
              <input type="date" value={form.played_at} onChange={e => setForm(f => ({ ...f, played_at: e.target.value }))}
                className="input-field" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs uppercase tracking-wide text-gray-500">Adversaire</label>
            <input value={form.opponent} onChange={e => setForm(f => ({ ...f, opponent: e.target.value }))}
              placeholder="Nom du clan adversaire" className="input-field" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-gray-500">Score DR</label>
              <input type="number" min="0" value={form.score_dr} onChange={e => setForm(f => ({ ...f, score_dr: e.target.value }))}
                placeholder="0" className="input-field text-center" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-gray-500">Score Adv.</label>
              <input type="number" min="0" value={form.score_opp} onChange={e => setForm(f => ({ ...f, score_opp: e.target.value }))}
                placeholder="0" className="input-field text-center" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wide text-gray-500">Résultat</label>
              <select value={String(form.won)} onChange={e => setForm(f => ({ ...f, won: e.target.value === 'true' }))}
                className="input-field">
                <option value="true">Victoire</option>
                <option value="false">Défaite</option>
              </select>
            </div>
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={saving}
            className="mt-2 py-3 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold uppercase tracking-wide text-sm disabled:opacity-50 transition-all">
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function Esport() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = user?.site_role === 'superadmin' || user?.coc_name === 'CyberAlf'

  const [status, setStatus] = useState({ enabled: null, loading: true })
  const [clanData, setClanData] = useState({ clan: null, members: [], loading: true })
  const [results, setResults] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    api.get('/api/esport/status')
      .then(r => {
        const s = { enabled: r.data.enabled, loading: false }
        setStatus(s)
        console.log('[Esport] user:', user, '| isSuperAdmin:', isSuperAdmin, '| status:', s)
      })
      .catch(() => {
        const s = { enabled: false, loading: false }
        setStatus(s)
        console.log('[Esport] user:', user, '| isSuperAdmin:', isSuperAdmin, '| status:', s)
      })
  }, [])

  useEffect(() => {
    if (status.loading) return
    if (!status.enabled && !isSuperAdmin) {
      navigate('/', { replace: true })
      return
    }
    api.get('/api/esport/clan-info').then(r => setClanData({ clan: r.data.clan, members: r.data.members, loading: false })).catch(() => setClanData(d => ({ ...d, loading: false })))
    loadResults()
  }, [status.loading, status.enabled, isSuperAdmin])

  async function loadResults() {
    try {
      const r = await api.get('/api/esport/results')
      setResults(r.data || [])
    } catch {}
  }

  async function handleToggle() {
    setToggling(true)
    try {
      await api.put('/api/esport/enabled', { enabled: !status.enabled })
      setStatus(s => ({ ...s, enabled: !s.enabled }))
    } catch {}
    setToggling(false)
  }

  async function handleDeleteResult(id) {
    if (!confirm('Supprimer ce résultat ?')) return
    try {
      await api.delete(`/api/esport/results/${id}`)
      setResults(r => r.filter(x => x.id !== id))
    } catch {}
  }

  if (status.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ash font-cinzel animate-pulse">Chargement...</p>
      </div>
    )
  }

  const clan = clanData.clan
  const members = clanData.members
  const wins = results.filter(r => r.won).length
  const losses = results.filter(r => !r.won).length

  return (
    <div className="min-h-screen" style={{ background: '#0e0e0e' }}>

      {/* Hero header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #1a0000 0%, #0e0e0e 50%, #1a0a00 100%)' }} />
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #dc2626 0%, transparent 50%), radial-gradient(circle at 80% 50%, #f59e0b 0%, transparent 50%)' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="text-5xl">🏆</span>
          </div>
          <h1 className="font-cinzel-deco font-black text-5xl md:text-7xl mb-2"
            style={{ background: 'linear-gradient(135deg, #dc2626, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            DR E-SPORT
          </h1>
          <p className="font-cinzel text-xl text-white/80 mt-2 uppercase tracking-[0.2em]">Town Hall Cup TH15 2026</p>
          <div className="flex flex-wrap justify-center gap-6 mt-4 text-sm text-gray-400 font-cinzel uppercase tracking-widest">
            <span>Format 3v3</span>
            <span className="text-[#dc2626]/50">·</span>
            <span className="text-[#f59e0b]">Prize pool : $8,250</span>
            <span className="text-[#dc2626]/50">·</span>
            <span>Depuis le 26 juin 2026</span>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-20">

        {/* Feature désactivée — message pour superadmin */}
        {!status.enabled && isSuperAdmin && (
          <div className="my-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
            <p className="text-amber-400 text-sm font-semibold">⚠️ La page E-Sport est actuellement désactivée — visible uniquement par les super admins</p>
          </div>
        )}

        {/* L'équipe */}
        <section className="mt-10">
          <h2 className="font-cinzel text-sm uppercase tracking-[0.3em] text-[#dc2626] mb-4">L'équipe</h2>
          {clanData.loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[0, 1, 2].map(i => <div key={i} className="h-52 rounded-2xl bg-[#111111] animate-pulse" />)}
            </div>
          ) : members.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {members.map((m, i) => <MemberCard key={m.tag} member={m} index={i} />)}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">Impossible de récupérer les données des membres.</p>
          )}
        </section>

        {/* Stats du clan */}
        {clan && (
          <section className="mt-10">
            <h2 className="font-cinzel text-sm uppercase tracking-[0.3em] text-[#dc2626] mb-4">Stats du clan</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Membres', value: clan.members ?? '—', icon: '👥' },
                { label: 'Points', value: clan.clanPoints?.toLocaleString() ?? '—', icon: '⭐' },
                { label: 'Guerres gagnées', value: clan.warWins ?? '—', icon: '⚔️' },
                { label: 'Niveau', value: `Niv. ${clan.clanLevel ?? '—'}`, icon: '🏅' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="flex flex-col items-center gap-2 p-5 rounded-2xl bg-[#111111] border border-[#1f1f1f] hover:border-[#dc2626]/30 transition-all">
                  <span className="text-2xl">{icon}</span>
                  <p className="text-lg font-bold text-white">{value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-600 text-center">{label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Résultats */}
        <section className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-cinzel text-sm uppercase tracking-[0.3em] text-[#dc2626]">Résultats</h2>
            {isSuperAdmin && (
              <button onClick={() => setShowModal(true)}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-all duration-200">
                + Ajouter un résultat
              </button>
            )}
          </div>

          {results.length > 0 ? (
            <div className="rounded-2xl bg-[#111111] border border-[#1f1f1f] overflow-hidden">
              {/* Résumé victoires/défaites */}
              {(wins > 0 || losses > 0) && (
                <div className="flex gap-6 px-6 py-4 border-b border-[#1f1f1f]">
                  <span className="text-sm font-semibold text-green-400">{wins} Victoire{wins > 1 ? 's' : ''}</span>
                  <span className="text-sm font-semibold text-red-400">{losses} Défaite{losses > 1 ? 's' : ''}</span>
                  <span className="text-sm text-gray-500">{results.length} match{results.length > 1 ? 's' : ''} joué{results.length > 1 ? 's' : ''}</span>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-widest text-gray-600 border-b border-[#1f1f1f]">
                      <th className="text-left px-6 py-3">Round</th>
                      <th className="text-left px-4 py-3">Adversaire</th>
                      <th className="text-center px-4 py-3">Score</th>
                      <th className="text-center px-4 py-3">Résultat</th>
                      <th className="text-left px-4 py-3">Date</th>
                      {isSuperAdmin && <th className="px-4 py-3" />}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map(r => (
                      <tr key={r.id} className="border-b border-[#1a1a1a] hover:bg-[#0d0d0d] transition-colors">
                        <td className="px-6 py-4 text-gray-300 font-medium">{r.round}</td>
                        <td className="px-4 py-4 text-white font-semibold">{r.opponent}</td>
                        <td className="px-4 py-4 text-center font-mono font-bold text-white">{r.score_dr} – {r.score_opp}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-xs font-bold uppercase tracking-wide px-2.5 py-1 rounded-full ${r.won ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                            {r.won ? 'Victoire' : 'Défaite'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-gray-500 text-xs">{new Date(r.played_at).toLocaleDateString('fr-FR')}</td>
                        {isSuperAdmin && (
                          <td className="px-4 py-4 text-right">
                            <button onClick={() => handleDeleteResult(r.id)} className="text-gray-600 hover:text-red-400 transition-colors text-xs">
                              Supprimer
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-[#111111] border border-[#1f1f1f] text-center">
              <p className="text-gray-600 text-sm">Aucun résultat enregistré pour le moment.</p>
            </div>
          )}
        </section>

        {/* Toggle SuperAdmin */}
        {isSuperAdmin && (
          <section className="mt-10">
            <div className="p-6 rounded-2xl bg-[#111111] border border-[#1f1f1f]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white uppercase tracking-wide">Page E-Sport</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {status.enabled ? 'Visible par tous les membres connectés' : 'Page et bouton masqués pour les membres'}
                  </p>
                </div>
                <button
                  onClick={handleToggle}
                  disabled={toggling}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 disabled:opacity-50 ${status.enabled ? 'bg-[#dc2626]' : 'bg-[#333]'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300 ${status.enabled ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {showModal && (
        <ResultModal
          onClose={() => setShowModal(false)}
          onSave={() => { setShowModal(false); loadResults() }}
        />
      )}

      <style>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border-radius: 0.5rem;
          background: #0d0d0d;
          border: 1px solid #2a2a2a;
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus {
          border-color: #dc2626;
        }
        .input-field option {
          background: #111111;
        }
      `}</style>
    </div>
  )
}
