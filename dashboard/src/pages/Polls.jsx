import { useEffect, useState } from 'react'
import { getPolls, endPoll } from '../api'

function PollCard({ poll, onEnd }) {
  const rawVotes = poll.votes && typeof poll.votes === 'object' ? poll.votes : {}
  const options = Array.isArray(poll.options) ? poll.options : []
  const isActive = !poll.ended

  // votes is { user_id: option_index } — count occurrences per option index
  const counts = Array(options.length).fill(0)
  for (const idx of Object.values(rawVotes)) {
    const i = typeof idx === 'number' ? idx : parseInt(idx, 10)
    if (!isNaN(i) && i >= 0 && i < options.length) counts[i]++
  }
  const total = counts.reduce((s, v) => s + v, 0)

  return (
    <div className={`bg-dr-card border rounded-xl p-5 ${isActive ? 'border-dr-red/40' : 'border-dr-border'}`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${
            isActive ? 'bg-dr-red/20 text-dr-red-light' : 'bg-dr-border text-dr-muted'
          }`}>
            {isActive ? '● Actif' : '■ Terminé'}
          </span>
          <h3 className="text-dr-text font-semibold leading-snug">{String(poll.question)}</h3>
          <p className="text-dr-muted text-xs mt-0.5">
            {total} vote{total !== 1 ? 's' : ''} · créé le{' '}
            {new Date(poll.created_at).toLocaleDateString('fr-FR')}
            {poll.ends_at && !isActive ? ` · terminé le ${new Date(poll.ends_at).toLocaleDateString('fr-FR')}` : ''}
            {poll.ends_at && isActive ? ` · jusqu'au ${new Date(poll.ends_at).toLocaleDateString('fr-FR')}` : ''}
          </p>
        </div>
        {isActive && (
          <button
            onClick={() => onEnd(poll.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-dr-border text-dr-muted hover:border-red-700/60 hover:text-red-400 transition-colors text-xs whitespace-nowrap"
          >
            Terminer
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {options.map((opt, i) => {
          const count = counts[i]
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1 text-sm">
                <span className="text-dr-text">{String(opt)}</span>
                <span className="text-dr-muted text-xs ml-4 flex-shrink-0">
                  {count} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 bg-dr-dark rounded-full overflow-hidden">
                <div
                  className="h-full bg-dr-red rounded-full transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Polls() {
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getPolls()
      .then(({ data }) => setPolls(Array.isArray(data) ? data : []))
      .catch(() => setError('Impossible de charger les sondages'))
      .finally(() => setLoading(false))
  }, [])

  async function handleEnd(id) {
    if (!confirm('Terminer ce sondage ?')) return
    try {
      await endPoll(id)
      setPolls((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, ended: true } : p
        )
      )
    } catch {
      setError('Erreur lors de la fermeture du sondage')
    }
  }

  const active = polls.filter((p) => !p.ended)
  const ended = polls.filter((p) => p.ended)

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Sondages</h2>
        <p className="text-dr-muted text-sm">
          {active.length} actif{active.length !== 1 ? 's' : ''} · {ended.length} terminé{ended.length !== 1 ? 's' : ''}
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {polls.length === 0 ? (
        <div className="bg-dr-card border border-dr-border rounded-xl p-12 text-center text-dr-muted text-sm">
          Aucun sondage trouvé
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section>
              <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">Actifs</h3>
              <div className="grid gap-4">
                {active.map((p) => <PollCard key={String(p.id)} poll={p} onEnd={handleEnd} />)}
              </div>
            </section>
          )}
          {ended.length > 0 && (
            <section>
              <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-3">Terminés</h3>
              <div className="grid gap-4">
                {ended.map((p) => <PollCard key={String(p.id)} poll={p} onEnd={handleEnd} />)}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}
