import { useEffect, useState } from 'react'
import { getConfig, updateConfig } from '../api'
import { Save } from 'lucide-react'

export default function Config() {
  const [entries, setEntries] = useState([])
  const [dirty, setDirty] = useState({})
  const [saving, setSaving] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    getConfig()
      .then(({ data }) => {
        if (data && typeof data === 'object') {
          const sorted = Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
          setEntries(sorted.map(([key, value]) => ({ key, value: String(value ?? '') })))
        }
      })
      .catch(() => setError('Impossible de charger la configuration'))
      .finally(() => setLoading(false))
  }, [])

  function handleChange(key, value) {
    setEntries((prev) => prev.map((e) => e.key === key ? { ...e, value } : e))
    setDirty((prev) => ({ ...prev, [key]: true }))
  }

  async function handleSave(key, value) {
    setSaving((prev) => ({ ...prev, [key]: true }))
    setError(null)
    try {
      await updateConfig({ [key]: value })
      setDirty((prev) => ({ ...prev, [key]: false }))
    } catch {
      setError(`Erreur lors de la sauvegarde de "${key}"`)
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Configuration bot</h2>
        <p className="text-dr-muted text-sm">Valeurs de la table <code className="text-dr-gold/80">bot_config</code> — {entries.length} clés</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {entries.length === 0 ? (
        <div className="bg-dr-card border border-dr-border rounded-xl p-10 text-center text-dr-muted text-sm">
          Aucune configuration trouvée
        </div>
      ) : (
        <div className="bg-dr-card border border-dr-border rounded-xl divide-y divide-dr-border/50">
          {entries.map(({ key, value }) => (
            <div key={key} className="flex items-center gap-4 px-5 py-3">
              <code className="text-dr-gold/80 text-xs w-56 flex-shrink-0 truncate" title={key}>
                {key}
              </code>
              <input
                type="text"
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
                className="flex-1 bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-dr-text text-sm focus:outline-none focus:border-dr-red/60 transition-colors font-mono min-w-0"
              />
              {dirty[key] && (
                <button
                  onClick={() => handleSave(key, value)}
                  disabled={saving[key]}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg bg-dr-red hover:bg-dr-red-light text-white text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Save size={13} />
                  {saving[key] ? '...' : 'Sauver'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
