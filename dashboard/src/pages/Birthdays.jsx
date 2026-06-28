import { useEffect, useState } from 'react'
import { getBirthdays, deleteBirthday } from '../api'
import { Trash2 } from 'lucide-react'

function nextUpcoming(list) {
  if (!list.length) return null
  const today = new Date()
  const todayVal = (today.getMonth() + 1) * 100 + today.getDate()
  const scored = list.map((b) => {
    const val = parseInt(b.birth_month) * 100 + parseInt(b.birth_day)
    return { ...b, _score: val >= todayVal ? val : val + 1300 }
  })
  scored.sort((a, b) => a._score - b._score)
  return scored[0]
}

function ageFromYear(year) {
  if (!year) return null
  return new Date().getFullYear() - parseInt(year)
}

export default function Birthdays() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    getBirthdays()
      .then(({ data }) => setList(Array.isArray(data) ? data : []))
      .catch(() => setError('Impossible de charger les anniversaires'))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(discord_id, name) {
    if (!confirm(`Supprimer l'anniversaire de ${name} ?`)) return
    setDeleting(discord_id)
    try {
      await deleteBirthday(discord_id)
      setList((prev) => prev.filter((b) => b.discord_id !== discord_id))
    } catch {
      setError('Erreur lors de la suppression')
    } finally {
      setDeleting(null)
    }
  }

  const today = new Date()
  const todayBirthdays = list.filter(
    (b) => parseInt(b.birth_day) === today.getDate() && parseInt(b.birth_month) === today.getMonth() + 1
  )
  const next = nextUpcoming(list.filter(
    (b) => !(parseInt(b.birth_day) === today.getDate() && parseInt(b.birth_month) === today.getMonth() + 1)
  ))

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Anniversaires</h2>
        <p className="text-dr-muted text-sm">Membres inscrits au rappel d'anniversaire</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dr-card border border-dr-border rounded-xl p-5">
          <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">Total inscrits</div>
          <div className="text-2xl font-bold text-dr-text">{list.length}</div>
        </div>
        <div className="bg-dr-card border border-dr-border rounded-xl p-5">
          <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">🎂 Aujourd'hui</div>
          <div className="text-2xl font-bold text-dr-text">{todayBirthdays.length}</div>
          {todayBirthdays.length > 0 && (
            <div className="text-dr-gold text-xs mt-1 truncate">
              {todayBirthdays.map((b) => String(b.discord_name)).join(', ')}
            </div>
          )}
        </div>
        <div className="bg-dr-card border border-dr-border rounded-xl p-5">
          <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">Prochain</div>
          {next ? (
            <>
              <div className="text-base font-bold text-dr-text">{String(next.discord_name)}</div>
              <div className="text-dr-muted text-xs mt-0.5">
                {String(next.birth_day).padStart(2, '0')}/{String(next.birth_month).padStart(2, '0')}
                {next.birth_year ? `/${String(next.birth_year)}` : ''}
              </div>
            </>
          ) : (
            <div className="text-dr-muted">—</div>
          )}
        </div>
      </div>

      <div className="bg-dr-card border border-dr-border rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <div className="p-10 text-center text-dr-muted text-sm">Aucun anniversaire enregistré</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dr-border text-dr-muted text-xs uppercase tracking-wider">
                <th className="text-left px-5 py-3 font-semibold">Membre</th>
                <th className="text-left px-5 py-3 font-semibold">Date</th>
                <th className="text-left px-5 py-3 font-semibold">Âge</th>
                <th className="w-10 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const age = ageFromYear(b.birth_year)
                return (
                  <tr
                    key={String(b.discord_id)}
                    className="border-b border-dr-border/40 hover:bg-dr-dark/50 transition-colors"
                  >
                    <td className="px-5 py-3 text-dr-text font-medium">{String(b.discord_name)}</td>
                    <td className="px-5 py-3 text-dr-muted">
                      {String(b.birth_day).padStart(2, '0')}/{String(b.birth_month).padStart(2, '0')}
                      {b.birth_year ? `/${String(b.birth_year)}` : ''}
                    </td>
                    <td className="px-5 py-3 text-dr-muted">
                      {age !== null ? `${age} ans` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => handleDelete(b.discord_id, b.discord_name)}
                        disabled={deleting === b.discord_id}
                        className="text-dr-muted hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Supprimer"
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
