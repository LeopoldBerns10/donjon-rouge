import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
}

function formatMonth(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

function formatCocRole(role) {
  const map = { leader: 'Chef', coLeader: 'Co-Chef', admin: 'Ancien', member: 'Membre' }
  return map[role] || role || ''
}

function TypeBadge({ type }) {
  const config = {
    gdc:           { label: '⚔️ GDC Classique',  cls: 'bg-[#1a1a1a] border-[#333] text-gray-300' },
    gdc_selection: { label: '🏆 GDC Sélection',   cls: 'bg-[#7f1d1d]/30 border-[#dc2626]/50 text-[#ef4444]' },
    ldc:           { label: '👑 Ligue de Guerre',  cls: 'bg-[#78350f]/30 border-[#f59e0b]/50 text-[#f59e0b]' },
  }
  const { label, cls } = config[type] || config.gdc
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

function ClanBadge({ clanTag }) {
  if (!clanTag) return null
  const cfg = {
    DR1:    { label: 'DR1', cls: 'bg-[#dc2626]/20 text-[#dc2626] border-[#dc2626]/30' },
    DR2:    { label: 'DR2', cls: 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30' },
    COMMUN: { label: '🤝 Commun', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  }
  const { label, cls } = cfg[clanTag] || cfg.DR1
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${cls}`}>{label}</span>
  )
}

function SignupRow({ signup, index }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
      <span className="text-xs font-bold text-[#dc2626] w-5 text-center">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="w-6 h-6 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30 flex items-center justify-center text-[10px] font-bold text-[#dc2626]">
        {signup.coc_name?.charAt(0).toUpperCase()}
      </div>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
        signup.clan_tag === '#2RCGG9YR9'
          ? 'bg-[#f59e0b]/20 text-[#f59e0b] border-[#f59e0b]/30'
          : 'bg-[#dc2626]/20 text-[#dc2626] border-[#dc2626]/30'
      }`}>
        {signup.clan_tag === '#2RCGG9YR9' ? 'DR2' : 'DR1'}
      </span>
      <span className="text-sm font-medium text-gray-200 flex-1">{signup.coc_name}</span>
      <span className="text-xs text-gray-600">{formatCocRole(signup.coc_role)}</span>
    </div>
  )
}

function EventCard({ event }) {
  const [expanded, setExpanded] = useState(false)
  const [signups, setSignups] = useState(null)
  const [loading, setLoading] = useState(false)

  const toggle = async () => {
    if (!expanded && signups === null) {
      setLoading(true)
      try {
        const { data } = await api.get(`/api/war-events/${event.id}/signups`)
        setSignups(data || [])
      } catch {
        setSignups([])
      } finally {
        setLoading(false)
      }
    }
    setExpanded(v => !v)
  }

  return (
    <div className="rounded-2xl border border-[#1f1f1f] bg-gradient-to-br from-[#111111] to-[#0d0d0d] overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <TypeBadge type={event.type} />
            <ClanBadge clanTag={event.clan_tag} />
          </div>
          <span className="text-[10px] uppercase tracking-widest text-gray-600 bg-[#1a1a1a] border border-[#252525] px-2 py-1 rounded-full whitespace-nowrap">
            ✅ Terminée
          </span>
        </div>

        <h3 className="text-base font-bold text-white uppercase tracking-wide mb-1">{event.title}</h3>
        <p className="text-xs text-gray-600 mb-3">{formatMonth(event.proposed_date)}</p>

        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span>📅 {formatDate(event.post_date)} → {formatDate(event.proposed_date)}</span>
          <span>👥 <span className="text-gray-300 font-semibold">{event.signup_count}</span> participant{event.signup_count !== 1 ? 's' : ''}</span>
        </div>

        <button
          onClick={toggle}
          className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[#dc2626] hover:text-[#ef4444] transition-colors"
        >
          {expanded ? '▲ Masquer les participants' : '▼ Voir les participants'}
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-[#1a1a1a] pt-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !signups || signups.length === 0 ? (
            <p className="text-xs text-gray-700 py-2">Aucune inscription enregistrée</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {signups.map((s, i) => <SignupRow key={s.id} signup={s} index={i} />)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Historique() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/api/war-events/history')
      .then(({ data }) => setEvents(data || []))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false))
  }, [])

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500 uppercase tracking-widest text-sm">Tu dois être connecté pour accéder à cette page.</p>
        <Link to="/login" className="mt-4 inline-block px-6 py-2 border border-[#dc2626] text-[#dc2626] text-sm uppercase rounded-lg hover:bg-[#dc2626]/20 transition-all">
          Connexion
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0d0d0d' }}>
      {/* Header */}
      <div className="relative py-14 px-6 text-center overflow-hidden border-b border-[#1a1a1a]">
        <div className="absolute inset-0 bg-gradient-to-b from-[#dc2626]/5 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#dc2626] mb-3">Donjon Rouge</p>
          <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-3">HISTORIQUE</h1>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">LDC, GDC et événements terminés</p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[#dc2626] text-sm">{error}</p>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 border border-[#1a1a1a] rounded-2xl">
            <p className="text-gray-600 uppercase tracking-widest text-sm">Aucun événement terminé</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {events.map(ev => <EventCard key={ev.id} event={ev} />)}
          </div>
        )}
      </div>
    </div>
  )
}
