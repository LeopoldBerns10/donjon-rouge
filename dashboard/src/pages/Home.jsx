import { useEffect, useState } from 'react'
import { getStats, getSnapshots } from '../api'
import Card from '../components/Card'

const RAID_STATE_LABELS = {
  ongoing:    'En cours',
  ended:      'Terminé',
  notStarted: 'Pas commencé',
}

const WAR_STATE_LABELS = {
  inWar:       'En cours ⚔️',
  preparation: 'Préparation',
  warEnded:    'Terminée',
  notInWar:    'Aucune guerre',
}

function warLabel(state) {
  return WAR_STATE_LABELS[state] ?? state ?? '—'
}

// ─── Helpers graphiques ───────────────────────────────────────────────────────

function processSnapshots(snapshots) {
  if (!snapshots?.length) return { labels: [], dr1: [], dr2: [] }
  const dates = [...new Set(snapshots.map(s => s.snapshot_date))].sort().slice(-6)
  const dr1   = dates.map(d => snapshots.find(s => s.snapshot_date === d && s.clan_tag === '#29292QPRC') ?? null)
  const dr2   = dates.map(d => snapshots.find(s => s.snapshot_date === d && s.clan_tag === '#2RCGG9YR9') ?? null)
  const labels = dates.map(d =>
    new Date(d).toLocaleDateString('fr-FR', { month: 'short', timeZone: 'UTC' })
  )
  return { labels, dr1, dr2 }
}

// ─── Composants SVG ───────────────────────────────────────────────────────────

function LineChart({ series, labels, height = 72 }) {
  const allValues = series.flatMap(s => s.data).filter(v => v != null)
  if (allValues.length < 2) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <span className="text-xs text-dr-muted">Pas encore de données</span>
      </div>
    )
  }

  const min = Math.min(...allValues)
  const max = Math.max(...allValues)
  const range = max - min || 1
  const W = 200, H = height - 8

  function toPoints(data) {
    return data
      .map((v, i) => {
        if (v == null) return null
        const x = (i / (data.length - 1)) * W
        const y = H - ((v - min) / range) * (H - 6) - 3
        return [x, y]
      })
      .filter(Boolean)
  }

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {series.map((s) => {
          const pts = toPoints(s.data)
          if (pts.length < 2) return null
          const lineStr = pts.map(([x, y]) => `${x},${y}`).join(' ')
          const areaStr = `0,${H} ${lineStr} ${W},${H}`
          return (
            <g key={s.color}>
              <polygon fill={s.color + '18'} points={areaStr} />
              <polyline fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={lineStr} />
              {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill={s.color} />)}
            </g>
          )
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {labels.map((l, i) => <span key={i} className="text-[10px] text-dr-muted">{l}</span>)}
      </div>
    </div>
  )
}

function BarChart({ data, labels, color = '#f59e0b', height = 72 }) {
  const values = data.filter(v => v != null)
  if (values.length === 0) {
    return (
      <div style={{ height }} className="flex items-center justify-center">
        <span className="text-xs text-dr-muted">Pas encore de données</span>
      </div>
    )
  }

  const max  = Math.max(...values) || 1
  const W    = 200
  const H    = height - 8
  const n    = data.length
  const barW = (W / n) * 0.6
  const gap  = (W / n) * 0.4

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }}>
        {data.map((v, i) => {
          if (v == null) return null
          const barH = Math.max(2, (v / max) * (H - 4))
          const x    = i * (barW + gap) + gap / 2
          return (
            <rect key={i} x={x} y={H - barH} width={barW} height={barH} rx="2" fill={color + 'cc'} />
          )
        })}
      </svg>
      <div className="flex justify-between mt-1">
        {labels.map((l, i) => <span key={i} className="text-[10px] text-dr-muted">{l}</span>)}
      </div>
    </div>
  )
}

function ChartCard({ title, children, legend }) {
  return (
    <div className="bg-dr-card border border-dr-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-dr-muted uppercase tracking-widest">{title}</p>
        {legend && (
          <div className="flex items-center gap-3">
            {legend.map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: l.color }} />
                <span className="text-[10px] text-dr-muted">{l.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Home() {
  const [stats, setStats]         = useState(null)
  const [snapshots, setSnapshots] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => {
    Promise.allSettled([getStats(), getSnapshots()])
      .then(([statsRes, snapsRes]) => {
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data)
        else setError('Impossible de charger les statistiques')
        if (snapsRes.status === 'fulfilled') setSnapshots(snapsRes.value.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const { labels, dr1, dr2 } = processSnapshots(snapshots)
  const membersDr1    = dr1.map(s => s?.member_count ?? null)
  const membersDr2    = dr2.map(s => s?.member_count ?? null)
  const avgTrophies   = labels.map((_, i) => {
    const vals = [dr1[i]?.avg_trophies, dr2[i]?.avg_trophies].filter(v => v != null)
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  })
  const totalDonations = labels.map((_, i) => (dr1[i]?.total_donations ?? 0) + (dr2[i]?.total_donations ?? 0))

  const hasSnapshots = labels.length > 0

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
              <Card icon="💥" title="Raid" value={RAID_STATE_LABELS[stats?.raid_state] ?? stats?.raid_state ?? '—'} />
              <Card icon="🗺️" title="Route de l'Infinie" value={stats?.route_number ?? '—'} subtitle="Nombre actuel" />
            </div>
          </section>

          {/* Progression */}
          <section>
            <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">
              Progression {hasSnapshots ? `(${labels.length} mois)` : '(6 mois)'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <ChartCard
                title="Évolution membres"
                legend={[{ label: 'DR1', color: '#dc2626' }, { label: 'DR2', color: '#f59e0b' }]}
              >
                <LineChart
                  series={[
                    { data: membersDr1, color: '#dc2626' },
                    { data: membersDr2, color: '#f59e0b' },
                  ]}
                  labels={labels}
                />
              </ChartCard>

              <ChartCard title="Trophées moyens">
                <LineChart
                  series={[{ data: avgTrophies, color: '#f59e0b' }]}
                  labels={labels}
                />
              </ChartCard>

              <ChartCard title="Donations totales">
                <BarChart
                  data={totalDonations}
                  labels={labels}
                  color="#dc2626"
                />
              </ChartCard>
            </div>
          </section>
        </>
      )}
    </div>
  )
}
