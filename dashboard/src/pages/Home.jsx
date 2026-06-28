import { useEffect, useState } from 'react'
import { getStats } from '../api'
import Card from '../components/Card'

const WAR_STATE_LABELS = {
  inWar: 'En cours ⚔️',
  preparation: 'Préparation',
  warEnded: 'Terminée',
  notInWar: 'Aucune guerre',
}

function warLabel(state) {
  return WAR_STATE_LABELS[state] ?? state ?? '—'
}

export default function Home() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getStats()
      .then(({ data }) => setStats(data))
      .catch(() => setError('Impossible de charger les statistiques'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Tableau de bord</h2>
        <p className="text-dr-muted text-sm">Vue d'ensemble du serveur Donjon Rouge</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-dr-card border border-dr-border rounded-xl p-5 animate-pulse">
              <div className="h-3 bg-dr-border rounded w-24 mb-3" />
              <div className="h-7 bg-dr-border rounded w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Membres */}
          <section>
            <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">Membres</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card icon="⚔️" title="DR1 — Membres" value={stats?.dr1_members ?? '—'} subtitle="#29292QPRC" />
              <Card icon="🏰" title="DR2 — Membres" value={stats?.dr2_members ?? '—'} subtitle="#2RCGG9YR9" />
              <Card icon="🔗" title="Membres liés CoC" value={stats?.linked_members ?? '—'} subtitle="discord_links" />
            </div>
          </section>

          {/* Guerres */}
          <section>
            <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">Guerres</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card icon="⚔️" title="Guerre DR1" value={warLabel(stats?.war_dr1_state)} subtitle={stats?.war_dr1_detail ?? ''} />
              <Card icon="⚔️" title="Guerre DR2" value={warLabel(stats?.war_dr2_state)} subtitle={stats?.war_dr2_detail ?? ''} />
            </div>
          </section>

          {/* Événements */}
          <section>
            <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">Événements</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card icon="🎂" title="Anniversaires aujourd'hui" value={stats?.birthdays_today ?? 0} />
              <Card icon="📊" title="Sondages actifs" value={stats?.active_polls ?? 0} />
              <Card icon="💥" title="Raid" value={stats?.raid_state ?? '—'} />
              <Card icon="🗺️" title="Route de l'Infinie" value={stats?.route_number ?? '—'} subtitle="Nombre actuel" />
            </div>
          </section>
        </>
      )}
    </div>
  )
}
