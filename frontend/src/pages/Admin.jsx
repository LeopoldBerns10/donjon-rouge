import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'
import { AnimatedBackground } from '../components/AnimatedBackground.jsx'
import SectionHeader from '../components/SectionHeader.jsx'
import { formatCocRole } from '../utils/roles.js'

// ── Barre de score colorée ────────────────────────────────────────────────────

function ScoreBar({ value }) {
  const color = value >= 75 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#dc2626'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-[#1a1a1a] rounded-full h-1.5 overflow-hidden min-w-[40px]">
        <div style={{ width: `${value}%`, background: color }} className="h-full rounded-full" />
      </div>
      <span className="text-xs font-bold w-8 text-right" style={{ color }}>{value}%</span>
    </div>
  )
}

// ── Modal de détail d'un membre (performance) ─────────────────────────────────

function DetailModal({ coc_tag, onClose }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/api/admin/performance/${encodeURIComponent(coc_tag)}`)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [coc_tag])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const gdcHistory = data?.history?.filter(r => r.event_type === 'gdc') || []
  const jdcHistory = data?.history?.filter(r => r.event_type === 'jdc') || []
  const ldcHistory = data?.history?.filter(r => r.event_type === 'ldc') || []

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[#111] border border-[#1f1f1f] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
           onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-[#1f1f1f] flex items-center justify-between sticky top-0 bg-[#111] z-10">
          <h3 className="font-cinzel text-base font-bold uppercase tracking-wide"
              style={{ background: 'linear-gradient(90deg, #dc2626, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {loading ? '…' : data?.coc_name}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-2xl leading-none">×</button>
        </div>

        {loading && <p className="text-ash font-cinzel animate-pulse text-center py-10">Chargement…</p>}

        {!loading && data && (
          <div className="px-6 py-5 space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Score activité', value: `${data.activityScore}%` },
                { label: 'Double perfs GDC', value: data.gdc.doublePerfs },
                { label: `GDC — ${data.gdc.guerresJouees} guerres`, value: `${data.gdc.taux}%` },
                { label: `JDC — ${data.jdc.sessionsJouees} sessions`, value: `${data.jdc.taux}%` },
                ...(data.ldc?.roundsJoues > 0 ? [{ label: `LDC — ${data.ldc.roundsJoues} rounds`, value: `${data.ldc.taux}%` }] : []),
                ...(data.gdc.avgAttackPercent != null ? [{ label: 'Moy. attaques GDC', value: `${data.gdc.avgAttackPercent}%` }] : []),
                ...(data.ldc?.avgAttackPercent != null ? [{ label: 'Moy. attaques LDC', value: `${data.ldc.avgAttackPercent}%` }] : []),
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 border border-fog/30" style={{ background: '#0d0d0d' }}>
                  <div className="text-xs text-ash font-cinzel uppercase tracking-widest mb-1">{s.label}</div>
                  <div className="text-lg font-bold font-cinzel text-gold-light">{s.value}</div>
                </div>
              ))}
            </div>

            {gdcHistory.length > 0 && (
              <div>
                <h4 className="font-cinzel text-xs uppercase tracking-widest text-gold mb-2">Historique GDC</h4>
                <div className="overflow-x-auto rounded border border-fog/20">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="font-cinzel uppercase text-ash tracking-wider border-b border-fog/30" style={{ background: '#1a1a1a' }}>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-center">Participé</th>
                        <th className="py-2 px-3 text-center">Attaques</th>
                        <th className="py-2 px-3 text-center">Double perf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gdcHistory.map((r, i) => (
                        <tr key={i} className="border-b border-fog/10" style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                          <td className="py-2 px-3 text-ash">{new Date(r.event_date).toLocaleDateString('fr-FR')}</td>
                          <td className="py-2 px-3 text-center">{r.participated ? '✅' : '❌'}</td>
                          <td className="py-2 px-3 text-center text-ash">{r.attack_percentage != null ? `${r.attack_percentage}%` : '—'}</td>
                          <td className="py-2 px-3 text-center">{r.double_perf ? '⭐' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {jdcHistory.length > 0 && (
              <div>
                <h4 className="font-cinzel text-xs uppercase tracking-widest text-gold mb-2">Historique JDC</h4>
                <div className="overflow-x-auto rounded border border-fog/20">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="font-cinzel uppercase text-ash tracking-wider border-b border-fog/30" style={{ background: '#1a1a1a' }}>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-center">Participé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jdcHistory.map((r, i) => (
                        <tr key={i} className="border-b border-fog/10" style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                          <td className="py-2 px-3 text-ash">{new Date(r.event_date).toLocaleDateString('fr-FR')}</td>
                          <td className="py-2 px-3 text-center">{r.participated ? '✅' : '❌'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {ldcHistory.length > 0 && (
              <div>
                <h4 className="font-cinzel text-xs uppercase tracking-widest text-gold mb-2">Historique LDC</h4>
                <div className="overflow-x-auto rounded border border-fog/20">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="font-cinzel uppercase text-ash tracking-wider border-b border-fog/30" style={{ background: '#1a1a1a' }}>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-center">Participé</th>
                        <th className="py-2 px-3 text-center">Attaques</th>
                        <th className="py-2 px-3 text-center">Double perf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ldcHistory.map((r, i) => (
                        <tr key={i} className="border-b border-fog/10" style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                          <td className="py-2 px-3 text-ash">{new Date(r.event_date).toLocaleDateString('fr-FR')}</td>
                          <td className="py-2 px-3 text-center">{r.participated ? '✅' : '❌'}</td>
                          <td className="py-2 px-3 text-center text-ash">{r.attack_percentage != null ? `${r.attack_percentage}%` : '—'}</td>
                          <td className="py-2 px-3 text-center">{r.double_perf ? '⭐' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {gdcHistory.length === 0 && jdcHistory.length === 0 && ldcHistory.length === 0 && (
              <p className="text-ash font-cinzel text-sm text-center py-4">Aucune donnée de performance</p>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// ── Panel classement performance (superadmin) ─────────────────────────────────

function PerformancePanel() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortKey, setSortKey] = useState('activityScore')
  const [sortDir, setSortDir] = useState('desc')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    api.get('/api/admin/performance')
      .then(r => setMembers(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const sorted = [...members].sort((a, b) => {
    const dir = sortDir === 'desc' ? -1 : 1
    const getVal = m => {
      if (sortKey === 'coc_name') return m.coc_name
      if (sortKey === 'gdcTaux') return m.gdc.taux
      if (sortKey === 'jdcTaux') return m.jdc.taux
      if (sortKey === 'ldcTaux') return m.ldc?.taux ?? 0
      if (sortKey === 'doublePerfs') return m.gdc.doublePerfs
      return m.activityScore
    }
    const aVal = getVal(a), bVal = getVal(b)
    if (typeof aVal === 'string') return dir * aVal.localeCompare(bVal)
    return dir * (aVal - bVal)
  })

  function thCls(key) {
    return `py-3 px-4 text-center cursor-pointer select-none hover:text-white transition-colors ${sortKey === key ? 'text-[#dc2626]' : ''}`
  }
  function sortArrow(key) { return sortKey === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '' }

  if (loading) return <p className="text-ash font-cinzel animate-pulse text-center py-10">Chargement des performances…</p>

  return (
    <>
      {selected && <DetailModal coc_tag={selected} onClose={() => setSelected(null)} />}
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-cinzel text-gold-bright uppercase tracking-wider text-sm">
          Performance — {members.length} membres
        </h2>
        <span className="text-xs text-ash font-cinzel">Clic sur un membre pour le détail complet</span>
      </div>
      <div className="overflow-x-auto rounded-lg border border-fog/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-cinzel uppercase text-xs tracking-widest text-gold border-b border-fog/40" style={{ background: '#1a1a1a' }}>
              <th className={`py-3 px-4 text-left cursor-pointer select-none hover:text-white transition-colors ${sortKey === 'coc_name' ? 'text-[#dc2626]' : ''}`}
                  onClick={() => toggleSort('coc_name')}>
                Joueur{sortArrow('coc_name')}
              </th>
              <th className={thCls('gdcTaux')} onClick={() => toggleSort('gdcTaux')}>GDC{sortArrow('gdcTaux')}</th>
              <th className={thCls('jdcTaux')} onClick={() => toggleSort('jdcTaux')}>JDC{sortArrow('jdcTaux')}</th>
              <th className={thCls('ldcTaux')} onClick={() => toggleSort('ldcTaux')}>LDC{sortArrow('ldcTaux')}</th>
              <th className={thCls('activityScore')} onClick={() => toggleSort('activityScore')}>Score{sortArrow('activityScore')}</th>
              <th className={thCls('doublePerfs')} onClick={() => toggleSort('doublePerfs')}>2× Perf{sortArrow('doublePerfs')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => (
              <tr key={m.coc_tag}
                  onClick={() => setSelected(m.coc_tag)}
                  className="border-b border-fog/20 cursor-pointer hover:bg-[#1a1a1a] transition-colors"
                  style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                <td className="py-3 px-4">
                  <span className="font-semibold text-bone text-sm">{m.coc_name}</span>
                  <div className="text-xs text-ash/60">{m.coc_tag}</div>
                </td>
                <td className="py-3 px-4">
                  <ScoreBar value={m.gdc.taux} />
                  <div className="text-xs text-ash/60 text-center mt-0.5">{m.gdc.participated}/{m.gdc.guerresJouees}</div>
                </td>
                <td className="py-3 px-4">
                  <ScoreBar value={m.jdc.taux} />
                  <div className="text-xs text-ash/60 text-center mt-0.5">{m.jdc.participated}/{m.jdc.sessionsJouees}</div>
                </td>
                <td className="py-3 px-4">
                  {m.ldc?.roundsJoues > 0
                    ? <><ScoreBar value={m.ldc.taux} /><div className="text-xs text-ash/60 text-center mt-0.5">{m.ldc.participated}/{m.ldc.roundsJoues}</div></>
                    : <span className="text-ash/40 text-xs block text-center">—</span>
                  }
                </td>
                <td className="py-3 px-4">
                  <ScoreBar value={m.activityScore} />
                </td>
                <td className="py-3 px-4 text-center">
                  <span className="font-bold text-gold-light">{m.gdc.doublePerfs}</span>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-ash font-cinzel text-sm">
                  Aucune donnée de performance disponible
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Panel modération automatique (superadmin) ─────────────────────────────────

const DEFAULT_WORDS = [
  'merde','putain','connard','enculé','salope','con','conne','bâtard',
  'fils de pute','nique','niquer','fdp','tg','va te faire','pd','tapette',
  'attardé','mongol','trisomique','pédé','racist','nazi',
]

const MOD_TYPE_LABELS = {
  spam:'Spam', banned_word:'Mot interdit', caps:'Majuscules',
  links:'Lien', mentions:'Mentions', manual:'Manuel', mute:'Mute',
}
const MOD_TYPE_COLORS = {
  spam:'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
  banned_word:'bg-red-900/30 text-red-400 border-red-800/50',
  caps:'bg-blue-900/30 text-blue-400 border-blue-800/50',
  links:'bg-purple-900/30 text-purple-400 border-purple-800/50',
  mentions:'bg-orange-900/30 text-orange-400 border-orange-800/50',
  manual:'bg-gray-900/30 text-gray-400 border-gray-800/50',
  mute:'bg-red-900/50 text-red-300 border-red-700/50',
}

function ModToggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-[#dc2626]' : 'bg-[#333]'}`}>
      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
    </button>
  )
}

function ModSection({ title, children }) {
  return (
    <div className="rounded-lg border border-fog/30 p-5" style={{ background: '#111' }}>
      <h3 className="font-cinzel text-gold text-xs uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  )
}

function ModInput({ placeholder, onAdd, mono = false }) {
  const [val, setVal] = useState('')
  return (
    <div className="flex gap-2 mt-2">
      <input type="text" value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && val.trim()) { onAdd(val.trim()); setVal('') } }}
        placeholder={placeholder}
        className={`flex-1 px-3 py-2 rounded-lg text-sm bg-[#0d0d0d] border border-[#2a2a2a] text-bone
                    placeholder-ash/40 focus:outline-none focus:border-[#dc2626] transition-colors
                    ${mono ? 'font-mono' : 'font-cinzel'}`}
      />
      <button onClick={() => { if (val.trim()) { onAdd(val.trim()); setVal('') } }}
        className="px-3 py-2 rounded-lg text-sm font-bold font-cinzel uppercase border
                   bg-[#dc2626]/10 border-[#dc2626]/60 text-[#dc2626]
                   hover:bg-[#dc2626]/20 hover:border-[#dc2626] transition-all">
        Ajouter
      </button>
    </div>
  )
}

function ModNumInput({ label, value, onChange, min, max }) {
  return (
    <div>
      <label className="text-ash font-cinzel text-xs block mb-1">{label}</label>
      <input type="number" value={value ?? ''} min={min} max={max}
        onChange={e => onChange(parseInt(e.target.value) || value)}
        className="w-full px-3 py-2 rounded-lg text-sm bg-[#0d0d0d] border border-[#2a2a2a] text-bone
                   focus:outline-none focus:border-[#dc2626] transition-colors" />
    </div>
  )
}

function ModerationPanel() {
  const [conf,     setConf]     = useState(null)
  const [original, setOriginal] = useState(null)
  const [warnings, setWarnings] = useState([])
  const [channels, setChannels] = useState([])
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState(null) // { ok, text }

  const dirty = conf && JSON.stringify(conf) !== JSON.stringify(original)

  function flash(ok, text) {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 3000)
  }

  useEffect(() => {
    Promise.all([
      api.get('/api/admin/automod/config'),
      api.get('/api/admin/automod/warnings?limit=50'),
      api.get('/api/admin/automod/channels').catch(() => ({ data: [] })),
      api.get('/api/admin/automod/roles').catch(() => ({ data: [] })),
    ]).then(([cR, wR, chanR, roleR]) => {
      const c = cR.data || {}
      setConf(c); setOriginal(c)
      setWarnings(wR.data?.data || [])
      setChannels(chanR.data || [])
      setRoles(roleR.data || [])
    }).catch(() => flash(false, 'Erreur de chargement'))
    .finally(() => setLoading(false))
  }, [])

  function get(key)      { return conf?.[key] }
  function set(key, val) { setConf(c => ({ ...c, [key]: val })) }
  function addArr(key, val) { set(key, [...new Set([...(get(key) || []), val])]) }
  function rmArr(key, val)  { set(key, (get(key) || []).filter(x => x !== val)) }

  async function save() {
    setSaving(true)
    try {
      await api.put('/api/admin/automod/config', conf)
      setOriginal(conf)
      flash(true, 'Configuration sauvegardée')
    } catch (e) {
      flash(false, e.response?.data?.error || 'Erreur')
    } finally { setSaving(false) }
  }

  async function deleteWarn(id) {
    await api.delete(`/api/admin/automod/warnings/${id}`).catch(() => {})
    setWarnings(w => w.filter(x => x.id !== id))
  }

  async function purgeWarn(discordId, name) {
    if (!window.confirm(`Purger tous les warnings de ${name || discordId} ?`)) return
    await api.delete(`/api/admin/automod/warnings/member/${encodeURIComponent(discordId)}`).catch(() => {})
    setWarnings(w => w.filter(x => x.discord_id !== discordId))
  }

  if (loading) return <p className="text-ash font-cinzel animate-pulse text-center py-10">Chargement…</p>
  if (!conf)   return <p className="text-red-400 font-cinzel text-sm text-center py-10">Erreur de chargement</p>

  const inputBase = 'w-full px-3 py-2 rounded-lg text-sm bg-[#0d0d0d] border border-[#2a2a2a] text-bone focus:outline-none focus:border-[#dc2626] transition-colors'

  return (
    <div className="space-y-6 pb-10">
      {/* Barre statut */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          {msg && (
            <p className={`font-cinzel text-sm ${msg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {msg.ok ? '✅' : '❌'} {msg.text}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {dirty && (
            <button onClick={() => setConf(original)}
              className="px-4 py-2 rounded-lg text-xs font-bold uppercase font-cinzel border border-[#2a2a2a] text-ash hover:text-bone transition-all">
              Annuler
            </button>
          )}
          <button onClick={save} disabled={!dirty || saving}
            className="px-4 py-2 rounded-lg text-xs font-bold uppercase font-cinzel border transition-all
                       bg-[#dc2626]/10 border-[#dc2626]/60 text-[#dc2626]
                       hover:bg-[#dc2626]/20 hover:border-[#dc2626]
                       disabled:opacity-30 disabled:cursor-not-allowed">
            {saving ? 'Sauvegarde…' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* 1. Activation */}
      <ModSection title="Activation générale">
        <div className="flex items-center gap-3">
          <ModToggle checked={!!get('automod_enabled')} onChange={v => set('automod_enabled', v)} />
          <span className="text-bone text-sm">{get('automod_enabled') ? 'Modération automatique ACTIVE' : 'Modération automatique DÉSACTIVÉE'}</span>
        </div>
      </ModSection>

      {/* 2. Mots interdits */}
      <ModSection title="Mots interdits">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ModToggle checked={!!get('banned_words_enabled')} onChange={v => set('banned_words_enabled', v)} />
            <span className="text-ash text-xs font-cinzel">Activer la détection</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(get('banned_words_list') || []).map(w => (
              <span key={w} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-bone font-mono border border-fog/30" style={{ background: '#0d0d0d' }}>
                {w}
                <button onClick={() => rmArr('banned_words_list', w)} className="text-ash hover:text-red-400 transition-colors">×</button>
              </span>
            ))}
          </div>
          <ModInput placeholder="Ajouter un mot interdit…" onAdd={w => addArr('banned_words_list', w.toLowerCase())} />
          <button onClick={() => set('banned_words_list', DEFAULT_WORDS)}
            className="text-xs text-ash font-cinzel hover:text-bone underline transition-colors">
            Réinitialiser la liste par défaut ({DEFAULT_WORDS.length} mots)
          </button>
        </div>
      </ModSection>

      {/* 3. Anti-spam */}
      <ModSection title="Anti-spam">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ModToggle checked={!!get('spam_enabled')} onChange={v => set('spam_enabled', v)} />
            <span className="text-ash text-xs font-cinzel">Activer</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ModNumInput label="Seuil (messages similaires)" value={get('spam_threshold')} onChange={v => set('spam_threshold', v)} min={2} max={20} />
            <ModNumInput label="Intervalle (secondes)" value={get('spam_interval_seconds')} onChange={v => set('spam_interval_seconds', v)} min={3} max={60} />
          </div>
        </div>
      </ModSection>

      {/* 4. Anti-majuscules */}
      <ModSection title="Abus de majuscules">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ModToggle checked={!!get('caps_enabled')} onChange={v => set('caps_enabled', v)} />
            <span className="text-ash text-xs font-cinzel">Activer</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ModNumInput label="% majuscules minimum" value={get('caps_threshold_percent')} onChange={v => set('caps_threshold_percent', v)} min={50} max={100} />
            <ModNumInput label="Longueur minimale du message" value={get('caps_min_length')} onChange={v => set('caps_min_length', v)} min={5} max={100} />
          </div>
        </div>
      </ModSection>

      {/* 5. Anti-liens */}
      <ModSection title="Liens non autorisés">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ModToggle checked={!!get('links_enabled')} onChange={v => set('links_enabled', v)} />
            <span className="text-ash text-xs font-cinzel">Activer (tout lien hors whitelist supprimé)</span>
          </div>
          <div>
            <div className="text-ash font-cinzel text-xs mb-1">Domaines autorisés</div>
            <div className="flex flex-wrap gap-1.5">
              {(get('links_whitelist') || []).map(d => (
                <span key={d} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-bone font-mono border border-fog/30" style={{ background: '#0d0d0d' }}>
                  {d}<button onClick={() => rmArr('links_whitelist', d)} className="text-ash hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <ModInput placeholder="domaine.com" onAdd={d => addArr('links_whitelist', d.toLowerCase())} mono />
          </div>
        </div>
      </ModSection>

      {/* 6. Anti-mentions */}
      <ModSection title="Mentions excessives">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <ModToggle checked={!!get('mentions_enabled')} onChange={v => set('mentions_enabled', v)} />
            <span className="text-ash text-xs font-cinzel">Activer</span>
          </div>
          <ModNumInput label="Mentions max par message" value={get('mentions_max')} onChange={v => set('mentions_max', v)} min={1} max={20} />
        </div>
      </ModSection>

      {/* 7. Sanctions */}
      <ModSection title="Paramètres de sanction">
        <div className="space-y-4">
          <ModNumInput label="Avertissements avant mute" value={get('warn_threshold')} onChange={v => set('warn_threshold', v)} min={1} max={10} />
          <div>
            <div className="text-ash font-cinzel text-xs mb-2">Durées de mute progressives (minutes)</div>
            <div className="grid grid-cols-3 gap-3">
              {['1er mute', '2ème mute', '3ème+ mute'].map((label, i) => (
                <div key={i}>
                  <div className="text-ash font-cinzel text-xs mb-1">{label}</div>
                  <input type="number" min={1} value={(get('mute_durations') || [10, 60, 1440])[i] ?? ''}
                    onChange={e => { const arr = [...(get('mute_durations') || [10, 60, 1440])]; arr[i] = parseInt(e.target.value) || arr[i]; set('mute_durations', arr) }}
                    className={inputBase} />
                </div>
              ))}
            </div>
          </div>
          <ModNumInput label="Expiration des warnings (heures)" value={get('warn_expiry_hours')} onChange={v => set('warn_expiry_hours', v)} min={1} max={168} />
          <div className="flex items-center gap-3">
            <ModToggle checked={!!get('warn_dm_enabled')} onChange={v => set('warn_dm_enabled', v)} />
            <span className="text-ash text-xs font-cinzel">Envoyer les avertissements en DM</span>
          </div>
        </div>
      </ModSection>

      {/* 8. Salons ignorés */}
      <ModSection title="Salons ignorés">
        <div className="space-y-3">
          <p className="text-ash font-cinzel text-xs">Le salon Logs bot est toujours ignoré (🔒).</p>
          <div className="flex flex-wrap gap-1.5">
            {(get('ignored_channels') || []).map(id => {
              const ch = channels.find(c => c.id === id)
              const isLocked = id === '1522722935918559364'
              return (
                <span key={id} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-bone font-mono border border-fog/30" style={{ background: '#0d0d0d' }}>
                  {ch ? `#${ch.name}` : id}
                  {isLocked ? <span className="text-ash ml-1 text-[10px]">🔒</span>
                    : <button onClick={() => rmArr('ignored_channels', id)} className="text-ash hover:text-red-400">×</button>}
                </span>
              )
            })}
          </div>
          {channels.length > 0 ? (
            <select onChange={e => { if (e.target.value) { addArr('ignored_channels', e.target.value); e.target.value = '' } }} className={inputBase}>
              <option value="">Ajouter un salon à ignorer…</option>
              {channels.filter(c => !(get('ignored_channels') || []).includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          ) : (
            <ModInput placeholder="ID du salon à ignorer…" onAdd={id => addArr('ignored_channels', id)} mono />
          )}
        </div>
      </ModSection>

      {/* 9. Exemptions */}
      <ModSection title="Exemptions">
        <div className="space-y-5">
          <div>
            <div className="text-ash font-cinzel text-xs uppercase tracking-widest mb-2">Rôles exempts</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(get('exempt_roles') || []).map(id => {
                const role  = roles.find(r => r.id === id)
                const label = role ? `@${role.name}` : id === '611123759864348672' ? 'Chef' : id === '1297318759396278425' ? 'Adjoint' : id
                return (
                  <span key={id} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-bone font-mono border border-fog/30" style={{ background: '#0d0d0d' }}>
                    {label}
                    <button onClick={() => rmArr('exempt_roles', id)} className="text-ash hover:text-red-400">×</button>
                  </span>
                )
              })}
            </div>
            {roles.length > 0 ? (
              <select onChange={e => { if (e.target.value) { addArr('exempt_roles', e.target.value); e.target.value = '' } }} className={inputBase}>
                <option value="">Ajouter un rôle exempt…</option>
                {roles.filter(r => !(get('exempt_roles') || []).includes(r.id)).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ) : (
              <ModInput placeholder="ID du rôle…" onAdd={id => addArr('exempt_roles', id)} mono />
            )}
          </div>
          <div>
            <div className="text-ash font-cinzel text-xs uppercase tracking-widest mb-2">Membres exempts (Discord IDs)</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(get('exempt_members') || []).map(id => (
                <span key={id} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-bone font-mono border border-fog/30" style={{ background: '#0d0d0d' }}>
                  {id}<button onClick={() => rmArr('exempt_members', id)} className="text-ash hover:text-red-400">×</button>
                </span>
              ))}
            </div>
            <ModInput placeholder="Discord ID du membre…" onAdd={id => addArr('exempt_members', id)} mono />
          </div>
        </div>
      </ModSection>

      {/* 10. Historique */}
      <ModSection title={`Historique des sanctions (${warnings.length} récentes)`}>
        {warnings.length === 0 ? (
          <p className="text-ash font-cinzel text-sm text-center py-6">Aucun avertissement enregistré</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-fog/30">
            <table className="w-full text-sm">
              <thead>
                <tr className="font-cinzel uppercase text-xs tracking-widest text-gold border-b border-fog/40" style={{ background: '#1a1a1a' }}>
                  <th className="py-3 px-4 text-left">Membre</th>
                  <th className="py-3 px-4 text-left">Type</th>
                  <th className="py-3 px-4 text-left hidden md:table-cell">Raison</th>
                  <th className="py-3 px-4 text-left hidden lg:table-cell">Date</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warnings.map((w, i) => (
                  <tr key={w.id} className="border-b border-fog/20" style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111' }}>
                    <td className="py-3 px-4">
                      <div className="text-bone text-sm font-semibold">{w.discord_name || '—'}</div>
                      <div className="text-ash/60 text-xs font-mono">{w.discord_id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded border ${MOD_TYPE_COLORS[w.type] || MOD_TYPE_COLORS.manual}`}>
                        {MOD_TYPE_LABELS[w.type] || w.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ash text-xs hidden md:table-cell max-w-xs truncate" title={w.reason}>{w.reason}</td>
                    <td className="py-3 px-4 text-ash text-xs hidden lg:table-cell whitespace-nowrap">
                      {new Date(w.warned_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1.5 justify-center flex-wrap">
                        <button onClick={() => deleteWarn(w.id)}
                          className="px-2 py-1 text-xs font-cinzel uppercase rounded-lg border border-fog/30 text-ash hover:text-bone hover:border-fog/60 transition-all">
                          Supprimer
                        </button>
                        <button onClick={() => purgeWarn(w.discord_id, w.discord_name)}
                          className="px-2 py-1 text-xs font-cinzel uppercase rounded-lg border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-all">
                          Purger tout
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ModSection>
    </div>
  )
}

// ── Formatage de la dernière connexion ────────────────────────────────────────

function formatLastLogin(date) {
  if (!date) return 'Jamais connecté'
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Badges ────────────────────────────────────────────────────────────────────

function roleBadge(role) {
  if (role === 'superadmin')
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-red-900 text-red-400 border-red-600">superadmin</span>
  if (role === 'admin')
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-orange-900 text-orange-400 border-orange-600">admin</span>
  return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-gray-900 text-gray-400 border-gray-600">membre</span>
}

// ── Modal de confirmation ─────────────────────────────────────────────────────

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel, confirmClass }) {
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#1f1f1f]">
          <h3 className="text-base font-bold text-white uppercase tracking-wide font-cinzel">{title}</h3>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-gray-400 leading-relaxed">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-[#1f1f1f] flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-wide bg-transparent border border-[#333] text-gray-400 hover:border-[#555] hover:text-white rounded-lg transition-all duration-150"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-lg transition-all duration-150 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Tableau des membres ───────────────────────────────────────────────────────

function MembresTable({ users, currentUser, isSuperAdmin, onAction, loading, adminFilter, setAdminFilter }) {
  const [modal, setModal] = useState({
    isOpen: false, title: '', message: '',
    onConfirm: null, confirmLabel: '', confirmClass: '',
  })

  const closeModal = () => setModal(m => ({ ...m, isOpen: false }))

  function ask(title, message, onConfirm, confirmLabel, confirmClass) {
    setModal({ isOpen: true, title, message, onConfirm, confirmLabel, confirmClass })
  }

  function handleReset(userId, userName) {
    ask(
      'Réinitialiser le mot de passe',
      `Remettre le tag CoC comme mot de passe pour ${userName} ?`,
      () => { onAction('reset-password', userId); closeModal() },
      'Réinitialiser',
      'bg-[#1a1a1a] border border-[#dc2626] text-white hover:bg-[#2a1010]'
    )
  }

  function handlePromote(userId, userName) {
    ask(
      'Promouvoir administrateur',
      `Êtes-vous sûr de vouloir donner le rôle administrateur à ${userName} ?`,
      () => { onAction('promote', userId); closeModal() },
      'Promouvoir',
      'bg-green-700 hover:bg-green-600 text-white border border-green-600'
    )
  }

  function handleDemote(userId, userName) {
    ask(
      'Retirer le rôle admin',
      `Êtes-vous sûr de vouloir retirer le rôle admin à ${userName} ?`,
      () => { onAction('demote', userId); closeModal() },
      'Destituer',
      'bg-orange-800 hover:bg-orange-700 text-white border border-orange-600'
    )
  }

  function handleToggleDisable(userId, userName, isDisabled) {
    ask(
      isDisabled ? 'Réactiver le compte' : 'Désactiver le compte',
      isDisabled
        ? `Réactiver le compte de ${userName} ?`
        : `Désactiver le compte de ${userName} ? Il ne pourra plus se connecter.`,
      () => { onAction(isDisabled ? 'enable' : 'disable', userId); closeModal() },
      isDisabled ? 'Réactiver' : 'Désactiver',
      isDisabled
        ? 'bg-green-700 hover:bg-green-600 text-white border border-green-600'
        : 'bg-red-800 hover:bg-red-700 text-white border border-red-600'
    )
  }

  function handleDelete(userId, userName) {
    ask(
      'Supprimer le compte',
      `⚠️ Cette action est irréversible. Le compte de ${userName} sera définitivement supprimé.`,
      () => { onAction('delete', userId); closeModal() },
      'Supprimer définitivement',
      'bg-red-600 hover:bg-red-500 text-white border border-red-500'
    )
  }

  const dr1Count = users.filter(u => u.clan_tag !== '#2RCGG9YR9').length
  const dr2Count = users.filter(u => u.clan_tag === '#2RCGG9YR9').length
  const filteredUsers = users.filter(u => {
    if (adminFilter === 'dr1') return u.clan_tag !== '#2RCGG9YR9'
    if (adminFilter === 'dr2') return u.clan_tag === '#2RCGG9YR9'
    return true
  })

  if (loading) return <p className="text-ash font-cinzel animate-pulse text-center py-10">Chargement...</p>

  return (
    <>
      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
        confirmLabel={modal.confirmLabel}
        confirmClass={modal.confirmClass}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setAdminFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
            adminFilter === 'all'
              ? 'bg-[#1a1a1a] border-[#555] text-white'
              : 'bg-[#111111] border-[#2a2a2a] text-gray-500 hover:border-[#555] hover:text-gray-300'
          }`}>
          Tous ({users.length})
        </button>
        <button
          onClick={() => setAdminFilter('dr1')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
            adminFilter === 'dr1'
              ? 'bg-[#dc2626]/20 border-[#dc2626] text-[#dc2626]'
              : 'bg-[#111111] border-[#2a2a2a] text-gray-500 hover:border-[#dc2626]/40 hover:text-[#dc2626]/60'
          }`}>
          🔴 DR1 ({dr1Count})
        </button>
        <button
          onClick={() => setAdminFilter('dr2')}
          className={`px-4 py-2 rounded-xl text-xs font-bold uppercase border transition-all ${
            adminFilter === 'dr2'
              ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
              : 'bg-[#111111] border-[#2a2a2a] text-gray-500 hover:border-[#f59e0b]/40 hover:text-[#f59e0b]/60'
          }`}>
          🟡 DR2 ({dr2Count})
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-fog/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-cinzel uppercase text-xs tracking-widest text-gold border-b border-fog/40"
              style={{ background: '#1a1a1a' }}>
              <th className="py-3 px-4 text-left">Joueur</th>
              <th className="py-3 px-4 text-center hidden md:table-cell">Rôle CoC</th>
              <th className="py-3 px-4 text-center">Rôle Site</th>
              <th className="py-3 px-4 text-center hidden md:table-cell">Mot de passe</th>
              <th className="py-3 px-4 text-center hidden lg:table-cell">Dernière connexion</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, i) => (
              <tr key={u.id} className="border-b border-fog/20"
                style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111', opacity: u.is_disabled ? 0.5 : 1 }}>

                {/* Joueur */}
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${
                      u.clan_tag === '#2RCGG9YR9'
                        ? 'bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30'
                        : 'bg-[#dc2626]/20 text-[#dc2626] border border-[#dc2626]/30'
                    }`}>
                      {u.clan_tag === '#2RCGG9YR9' ? 'DR2' : 'DR1'}
                    </span>
                    <span className="font-semibold text-bone text-sm">{u.coc_name}</span>
                  </div>
                  <div className="text-xs text-ash/60">{u.coc_tag}</div>
                </td>

                {/* Rôle CoC */}
                <td className="py-3 px-4 text-center hidden md:table-cell">
                  <span className="text-xs text-ash">{formatCocRole(u.coc_role)}</span>
                </td>

                {/* Rôle Site */}
                <td className="py-3 px-4 text-center">{roleBadge(u.site_role || 'member')}</td>

                {/* Mot de passe */}
                <td className="py-3 px-4 text-center hidden md:table-cell">
                  {u.has_custom_password
                    ? <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-green-900/40 text-green-400 border-green-700">Personnalisé</span>
                    : <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-orange-900/40 text-orange-400 border-orange-700">Par défaut</span>
                  }
                </td>

                {/* Dernière connexion */}
                <td className="py-3 px-4 text-center text-xs text-ash hidden lg:table-cell">
                  {formatLastLogin(u.last_login)}
                </td>

                {/* Actions */}
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">

                    {/* Reset MDP — admin & superadmin, pas sur soi-même */}
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleReset(u.id, u.coc_name)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#1a1a1a] border border-[#333] text-gray-300 hover:border-[#dc2626] hover:text-white rounded-lg transition-all duration-150"
                      >
                        Reset MDP
                      </button>
                    )}

                    {/* Promouvoir — superadmin only, si member */}
                    {isSuperAdmin && (u.site_role === 'member' || !u.site_role) && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handlePromote(u.id, u.coc_name)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#1a3a1a] border border-[#2a5a2a] text-green-400 hover:bg-[#1f4a1f] hover:text-green-300 rounded-lg transition-all duration-150"
                      >
                        Promouvoir
                      </button>
                    )}

                    {/* Destituer — superadmin only, si admin */}
                    {isSuperAdmin && u.site_role === 'admin' && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDemote(u.id, u.coc_name)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#2a1a1a] border border-[#4a2a2a] text-orange-400 hover:bg-[#3a1f1f] hover:text-orange-300 rounded-lg transition-all duration-150"
                      >
                        Destituer
                      </button>
                    )}

                    {/* Désactiver/Réactiver — superadmin only, pas sur superadmin */}
                    {isSuperAdmin && u.id !== currentUser?.id && u.site_role !== 'superadmin' && (
                      <button
                        onClick={() => handleToggleDisable(u.id, u.coc_name, u.is_disabled)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#1a0a0a] border border-[#5a1a1a] text-red-500 hover:bg-[#2a1010] hover:text-red-400 rounded-lg transition-all duration-150"
                      >
                        {u.is_disabled ? 'Réactiver' : 'Désactiver'}
                      </button>
                    )}

                    {/* Supprimer — superadmin only, pas sur superadmin */}
                    {isSuperAdmin && u.id !== currentUser?.id && u.site_role !== 'superadmin' && (
                      <button
                        onClick={() => handleDelete(u.id, u.coc_name)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-red-950 border border-red-800 text-red-400 hover:bg-red-900 hover:text-red-300 rounded-lg transition-all duration-150"
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Page Admin ────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user, loading: authLoading, isAdmin, isSuperAdmin, userRole } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [adminFilter, setAdminFilter] = useState('all')
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null)
  const [activeTab, setActiveTab] = useState('membres')

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/')
  }, [user, authLoading])

  useEffect(() => {
    if (!isAdmin) return
    api.get('/api/admin/users')
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Erreur chargement'))
      .finally(() => setUsersLoading(false))
  }, [isAdmin])

  useEffect(() => {
    if (users.length > 0) {
      console.log('ADMIN clan_tag debug:', users.slice(0, 5).map(u => ({ name: u.coc_name, clan_tag: u.clan_tag })))
    }
  }, [users])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    try {
      const r = await api.post('/api/admin/sync-members')
      setSyncResult({ ok: true, ...r.data })
    } catch (e) {
      setSyncResult({ ok: false, error: e.response?.data?.error || 'Erreur lors du scan' })
    } finally {
      setSyncing(false)
    }
  }

  async function handleAction(action, userId) {
    setError('')
    setSuccess('')
    try {
      if (action === 'delete') {
        await api.delete(`/api/admin/users/${userId}`)
      } else {
        await api.post(`/api/admin/${action}`, { userId })
      }
      const r = await api.get('/api/admin/users')
      setUsers(r.data)
      const labels = {
        'reset-password': 'Mot de passe réinitialisé',
        promote: 'Membre promu admin',
        demote: 'Admin destitué',
        disable: 'Compte désactivé',
        enable: 'Compte réactivé',
        delete: 'Compte supprimé définitivement',
      }
      setSuccess(labels[action] || 'Action effectuée')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur')
    }
  }

  if (authLoading) return null
  if (!isAdmin) return null

  return (
    <>
      <AnimatedBackground variant="admin" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 animate-fade-up">
      {/* Header */}
      <div style={{ borderTop: '2px solid #dc2626' }} className="pt-6 mb-8">
        <SectionHeader title="Zone Administration" subtitle="Donjon Rouge · Panneau de contrôle" />
        <div className="flex items-center gap-3 mt-2">
          <span className="text-ash font-cinzel text-xs uppercase tracking-wider">Connecté en tant que :</span>
          <span className="text-bone font-cinzel text-sm font-bold">{user?.coc_name}</span>
          {roleBadge(userRole)}
        </div>
        {isSuperAdmin && (
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold
                         border border-[#dc2626]/40 text-[#dc2626]/80
                         hover:border-[#dc2626] hover:text-[#dc2626] hover:bg-[#dc2626]/10
                         disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <span className={syncing ? 'animate-spin inline-block' : ''}>🔄</span>
              {syncing ? 'Scan en cours…' : 'Forcer le scan CoC'}
            </button>
            {syncResult && (
              syncResult.ok
                ? <span className="text-green-400 font-cinzel text-xs">
                    ✅ Scan terminé — {syncResult.created} créés · {syncResult.updated} mis à jour · {syncResult.left} partants
                  </span>
                : <span className="text-red-400 font-cinzel text-xs">❌ {syncResult.error}</span>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-400 font-cinzel text-sm mb-4">{error}</p>}
      {success && <p className="text-green-400 font-cinzel text-sm mb-4">✅ {success}</p>}

      {/* Onglets (superadmin uniquement) */}
      {isSuperAdmin && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('membres')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase border transition-all font-cinzel ${
              activeTab === 'membres'
                ? 'bg-[#1a1a1a] border-[#555] text-white'
                : 'bg-[#111] border-[#2a2a2a] text-gray-500 hover:border-[#555] hover:text-gray-300'
            }`}>
            👥 Membres
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase border transition-all font-cinzel ${
              activeTab === 'performance'
                ? 'bg-[#dc2626]/15 border-[#dc2626] text-[#dc2626]'
                : 'bg-[#111] border-[#2a2a2a] text-gray-500 hover:border-[#dc2626]/40 hover:text-[#dc2626]/60'
            }`}>
            📊 Performance
          </button>
          <button
            onClick={() => setActiveTab('moderation')}
            className={`px-5 py-2 rounded-lg text-xs font-bold uppercase border transition-all font-cinzel ${
              activeTab === 'moderation'
                ? 'bg-[#f59e0b]/15 border-[#f59e0b] text-[#f59e0b]'
                : 'bg-[#111] border-[#2a2a2a] text-gray-500 hover:border-[#f59e0b]/40 hover:text-[#f59e0b]/60'
            }`}>
            🛡️ Modération
          </button>
        </div>
      )}

      {/* Contenu onglet Membres */}
      {activeTab === 'membres' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {[
              { label: 'Membres', value: users.length, icon: '👥' },
              { label: 'Admins', value: users.filter(u => u.site_role === 'admin' || u.site_role === 'superadmin').length, icon: '🛡️' },
              { label: 'MDP par défaut', value: users.filter(u => !u.has_custom_password).length, icon: '🔑' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg p-4 flex flex-col items-center gap-1 border border-fog/30"
                style={{ background: '#111' }}>
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xl font-bold font-cinzel text-gold-light">{s.value}</span>
                <span className="text-xs text-ash font-cinzel uppercase tracking-widest text-center">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-center gap-3">
            <h2 className="font-cinzel text-gold-bright uppercase tracking-wider text-sm">
              Membres — {users.length} comptes
            </h2>
            {!isSuperAdmin && (
              <span className="text-xs text-ash font-cinzel">(accès lecture + reset MDP)</span>
            )}
          </div>

          <MembresTable
            users={users}
            currentUser={user}
            isSuperAdmin={isSuperAdmin}
            onAction={handleAction}
            loading={usersLoading}
            adminFilter={adminFilter}
            setAdminFilter={setAdminFilter}
          />
        </>
      )}

      {/* Contenu onglet Performance */}
      {activeTab === 'performance' && isSuperAdmin && <PerformancePanel />}

      {/* Contenu onglet Modération */}
      {activeTab === 'moderation' && isSuperAdmin && <ModerationPanel />}

    </div>
    </>
  )
}
