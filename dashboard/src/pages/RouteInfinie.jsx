import { useEffect, useState } from 'react'
import { getRoute, updateRoute } from '../api'
import { RotateCcw } from 'lucide-react'

export default function RouteInfinie() {
  const [state, setState] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [giftNumber, setGiftNumber] = useState('')
  const [giftDesc, setGiftDesc] = useState('')
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    getRoute()
      .then(({ data }) => {
        const safe = data && typeof data === 'object' ? data : {}
        setState(safe)
        setGiftNumber(safe.route_gift_number ?? '')
        setGiftDesc(safe.route_gift ?? '')
      })
      .catch(() => setError('Impossible de charger la route'))
      .finally(() => setLoading(false))
  }, [])

  async function handleSaveGift() {
    if (!giftNumber || !giftDesc) return
    setSaving(true)
    setError(null)
    try {
      await updateRoute({ gift_number: parseInt(giftNumber), gift_desc: giftDesc })
      setState((prev) => ({ ...prev, route_gift_number: String(giftNumber), route_gift: String(giftDesc) }))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  async function handleReset() {
    if (!confirm('Remettre le compteur à 0 ?')) return
    setResetting(true)
    setError(null)
    try {
      await updateRoute({ action: 'reset' })
      setState((prev) => ({ ...prev, route_current_number: '0', route_last_player: '' }))
    } catch {
      setError('Erreur lors du reset')
    } finally {
      setResetting(false)
    }
  }

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  const currentNumber = state.route_current_number ? parseInt(state.route_current_number) : 0
  const giftTarget = state.route_gift_number ? parseInt(state.route_gift_number) : 0
  const progress = giftTarget > 0 ? Math.min(100, Math.round((currentNumber / giftTarget) * 100)) : 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Route de l'Infinie</h2>
        <p className="text-dr-muted text-sm">Jeu de comptage avec cadeaux cachés</p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-dr-card border border-dr-border rounded-xl p-5">
          <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">🗺️ Nombre actuel</div>
          <div className="text-3xl font-bold text-dr-gold">{currentNumber}</div>
        </div>
        <div className="bg-dr-card border border-dr-border rounded-xl p-5">
          <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">👤 Dernier joueur</div>
          <div className="text-lg font-bold text-dr-text">
            {state.route_last_player ? String(state.route_last_player) : '—'}
          </div>
        </div>
        <div className="bg-dr-card border border-dr-border rounded-xl p-5">
          <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">🎁 Cadeau actuel</div>
          <div className="text-sm font-semibold text-dr-text">
            {state.route_gift ? String(state.route_gift) : '—'}
          </div>
          {giftTarget > 0 && (
            <div className="text-dr-muted text-xs mt-1">Objectif : {giftTarget}</div>
          )}
        </div>
      </div>

      {giftTarget > 0 && (
        <div className="bg-dr-card border border-dr-border rounded-xl p-5">
          <div className="flex justify-between text-xs text-dr-muted mb-2">
            <span>Progression vers le cadeau</span>
            <span>{currentNumber} / {giftTarget} ({progress}%)</span>
          </div>
          <div className="h-3 bg-dr-dark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-dr-red to-dr-gold rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-dr-card border border-dr-border rounded-xl p-6">
          <h3 className="font-semibold text-dr-text mb-4">Définir le prochain cadeau</h3>
          <div className="space-y-3">
            <div>
              <label className="text-dr-muted text-xs block mb-1">Nombre cible</label>
              <input
                type="number"
                min="1"
                value={giftNumber}
                onChange={(e) => setGiftNumber(e.target.value)}
                placeholder="Ex : 1000"
                className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2.5 text-dr-text text-sm focus:outline-none focus:border-dr-red/60 transition-colors"
              />
            </div>
            <div>
              <label className="text-dr-muted text-xs block mb-1">Description du cadeau</label>
              <input
                type="text"
                value={giftDesc}
                onChange={(e) => setGiftDesc(e.target.value)}
                placeholder="Ex : Nitro Discord 1 mois"
                className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2.5 text-dr-text text-sm focus:outline-none focus:border-dr-red/60 transition-colors"
              />
            </div>
            <button
              onClick={handleSaveGift}
              disabled={!giftNumber || !giftDesc || saving}
              className="w-full py-2.5 rounded-lg bg-dr-red hover:bg-dr-red-light text-white font-semibold text-sm transition-colors disabled:opacity-50"
            >
              {saved ? '✓ Sauvegardé !' : saving ? 'Sauvegarde...' : 'Définir le cadeau'}
            </button>
          </div>
        </div>

        <div className="bg-dr-card border border-dr-border rounded-xl p-6">
          <h3 className="font-semibold text-dr-text mb-1">Zone dangereuse</h3>
          <p className="text-dr-muted text-sm mb-4">
            Remet le compteur à 0 et efface le dernier joueur. Le cadeau défini est conservé.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-800/60 text-red-400 hover:bg-red-900/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RotateCcw size={15} />
            {resetting ? 'Reset en cours...' : 'Remettre à zéro'}
          </button>
        </div>
      </div>
    </div>
  )
}
