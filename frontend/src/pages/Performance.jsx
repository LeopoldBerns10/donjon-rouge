import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../lib/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

function StatRow({ label, value, highlight = false }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-sm font-bold ${highlight ? 'text-[#dc2626]' : 'text-white'}`}>{value}</span>
    </div>
  )
}

function Section({ icon, title, children }) {
  return (
    <div className="bg-gradient-to-br from-[#111111] to-[#0d0d0d] border border-[#1f1f1f] rounded-2xl p-5">
      <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-3">{icon} {title}</p>
      {children}
    </div>
  )
}

function ScoreRing({ score }) {
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#dc2626'
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-24 h-24 rounded-full flex items-center justify-center border-4 font-black text-2xl text-white"
        style={{ borderColor: color, boxShadow: `0 0 24px ${color}40` }}
      >
        {score}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-gray-600">Score d'activité</p>
    </div>
  )
}

export default function Performance() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    api.get('/api/members/me/performance')
      .then(({ data }) => setStats(data))
      .catch(err => setError(err.response?.data?.error || err.message))
      .finally(() => setLoading(false))
  }, [user])

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
          <h1 className="text-3xl font-black text-white uppercase tracking-widest mb-1">PERFORMANCE</h1>
          {user && <p className="text-sm text-gray-400 mt-2">{user.coc_name}</p>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-[#dc2626] text-sm">{error}</p>
          </div>
        ) : !stats || (stats.gdc.guerresJouees === 0 && stats.jdc.sessionsJouees === 0) ? (
          <div className="text-center py-16 border border-[#1a1a1a] rounded-2xl">
            <p className="text-gray-600 uppercase tracking-widest text-sm">Pas encore de données</p>
            <p className="text-xs text-gray-700 mt-2">Les statistiques apparaîtront après ta première participation.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Score global */}
            <div className="bg-gradient-to-br from-[#111111] to-[#0d0d0d] border border-[#dc2626]/20 rounded-2xl p-6 flex items-center gap-6">
              <ScoreRing score={stats.activityScore} />
              <div>
                <p className="text-white font-black text-xl uppercase tracking-wide">{stats.coc_name}</p>
                <p className="text-xs text-gray-500 mt-1">Score calculé sur l'ensemble des participations GDC + JDC</p>
              </div>
            </div>

            {/* GDC */}
            <Section icon="⚔️" title="Guerres (GDC)">
              <StatRow label="Guerres jouées"           value={stats.gdc.guerresJouees} />
              <StatRow label="Taux de participation"    value={`${stats.gdc.taux}%`} highlight={stats.gdc.taux < 60} />
              {stats.gdc.avgAttackPercent != null && (
                <StatRow label="% moyen des attaques"  value={`${stats.gdc.avgAttackPercent}%`} />
              )}
              <StatRow label="Double perfs"             value={stats.gdc.doublePerfs} />
            </Section>

            {/* JDC */}
            <Section icon="🎮" title="Jeux de Clan (JDC)">
              <StatRow label="Sessions jouées"          value={stats.jdc.sessionsJouees} />
              <StatRow label="Taux de participation"    value={`${stats.jdc.taux}%`} highlight={stats.jdc.taux < 60} />
            </Section>
          </div>
        )}
      </div>
    </div>
  )
}
