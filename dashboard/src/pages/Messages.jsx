import { useEffect, useState } from 'react'
import { getConfig, updateConfig } from '../api'
import { SaveBar } from '../components/SaveBar'
import { Save } from 'lucide-react'

const GDC_KEYS = ['gdc_msg_dimanche', 'gdc_msg_mardi']
const GDC_DEFAULTS = { gdc_msg_dimanche: '', gdc_msg_mardi: '' }

const INDIVIDUAL_MESSAGES = [
  { key: 'kaptcha_message_id',         label: 'Vérification' },
  { key: 'reglement_message_id',        label: 'Règlement' },
  { key: 'reglement_public_message_id', label: 'Règlement Public' },
  { key: 'account_message_id',          label: 'Mon Compte' },
  { key: 'ticket_message_id',           label: 'Tickets' },
]

export default function Messages() {
  // ── GDC (save groupé) ─────────────────────────────────────────────────────
  const [gdcOriginal, setGdcOriginal] = useState(GDC_DEFAULTS)
  const [gdcForm, setGdcForm]         = useState(GDC_DEFAULTS)
  const [gdcSaving, setGdcSaving]     = useState(false)
  const [gdcError, setGdcError]       = useState(null)

  // ── Messages individuels ──────────────────────────────────────────────────
  const [indivValues,  setIndivValues]  = useState({})
  const [indivDirty,   setIndivDirty]   = useState({})
  const [indivSaving,  setIndivSaving]  = useState({})
  const [indivSaved,   setIndivSaved]   = useState({})

  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getConfig()
      .then(({ data }) => {
        const gdc = {
          gdc_msg_dimanche: data.gdc_msg_dimanche ?? '',
          gdc_msg_mardi:    data.gdc_msg_mardi    ?? '',
        }
        setGdcOriginal(gdc)
        setGdcForm(gdc)

        const indiv = {}
        for (const { key } of INDIVIDUAL_MESSAGES) indiv[key] = data[key] ?? ''
        setIndivValues(indiv)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── GDC handlers ──────────────────────────────────────────────────────────
  const gdcDirty = GDC_KEYS.some((k) => gdcForm[k] !== gdcOriginal[k])

  function handleGdcChange(key, value) {
    setGdcForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGdcSave() {
    setGdcSaving(true)
    setGdcError(null)
    try {
      await updateConfig({ gdc_msg_dimanche: gdcForm.gdc_msg_dimanche, gdc_msg_mardi: gdcForm.gdc_msg_mardi })
      setGdcOriginal(gdcForm)
    } catch {
      setGdcError('Erreur lors de la sauvegarde')
    } finally {
      setGdcSaving(false)
    }
  }

  // ── Individual handlers ───────────────────────────────────────────────────
  function handleIndivChange(key, value) {
    setIndivValues((prev) => ({ ...prev, [key]: value }))
    setIndivDirty((prev) => ({ ...prev, [key]: true }))
  }

  async function handleIndivSave(key) {
    setIndivSaving((prev) => ({ ...prev, [key]: true }))
    try {
      await updateConfig({ [key]: indivValues[key] })
      setIndivDirty((prev) => ({ ...prev, [key]: false }))
      setIndivSaved((prev) => ({ ...prev, [key]: true }))
      setTimeout(() => setIndivSaved((prev) => ({ ...prev, [key]: false })), 2000)
    } catch {
      // erreur silencieuse — le bouton redevient disponible
    } finally {
      setIndivSaving((prev) => ({ ...prev, [key]: false }))
    }
  }

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  return (
    <div className="space-y-10 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Messages modifiables</h2>
        <p className="text-dr-muted text-sm">Textes configurables envoyés ou affichés par le bot</p>
      </div>

      {/* ── Messages GDC ─────────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-dr-text font-semibold text-base">Messages GDC</h3>
          <p className="text-dr-muted text-xs mt-0.5">Envoyés automatiquement avant chaque Guerre de Clans</p>
        </div>

        {gdcError && (
          <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
            {gdcError}
          </div>
        )}

        <div className="space-y-4 max-w-2xl">
          {[
            { key: 'gdc_msg_dimanche', label: 'Message Dimanche 21h', placeholder: 'Message du dimanche soir...' },
            { key: 'gdc_msg_mardi',    label: 'Message Mardi 21h',    placeholder: 'Message du mardi soir...' },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="bg-dr-card border border-dr-border rounded-xl p-6">
              <h4 className="font-semibold text-dr-text mb-0.5">{label}</h4>
              <p className="text-dr-muted text-xs mb-3">
                Clé : <code className="text-dr-gold/80">{key}</code>
              </p>
              <textarea
                value={gdcForm[key]}
                onChange={(e) => handleGdcChange(key, e.target.value)}
                rows={6}
                placeholder={placeholder}
                className="w-full bg-dr-dark border border-dr-border rounded-lg p-3 text-dr-text text-sm resize-none focus:outline-none focus:border-dr-red/60 transition-colors font-mono"
              />
              <div className="text-dr-muted text-xs mt-1.5 text-right">{gdcForm[key].length} caractères</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Messages individuels ─────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h3 className="text-dr-text font-semibold text-base">Messages modifiables</h3>
          <p className="text-dr-muted text-xs mt-0.5">Identifiants ou contenus stockés dans bot_config</p>
        </div>

        <div className="space-y-4 max-w-2xl">
          {INDIVIDUAL_MESSAGES.map(({ key, label }) => (
            <div key={key} className="bg-dr-card border border-dr-border rounded-xl p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h4 className="font-semibold text-dr-text">{label}</h4>
                  <p className="text-dr-muted text-xs mt-0.5">
                    Clé : <code className="text-dr-gold/80">{key}</code>
                  </p>
                </div>
                <button
                  onClick={() => handleIndivSave(key)}
                  disabled={!indivDirty[key] || indivSaving[key]}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dr-red hover:bg-dr-red-light text-white text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  <Save size={13} />
                  {indivSaved[key] ? '✓ Sauvegardé' : indivSaving[key] ? '...' : 'Sauvegarder'}
                </button>
              </div>
              <textarea
                value={indivValues[key] ?? ''}
                onChange={(e) => handleIndivChange(key, e.target.value)}
                rows={3}
                className="w-full bg-dr-dark border border-dr-border rounded-lg p-3 text-dr-text text-sm resize-none focus:outline-none focus:border-dr-red/60 transition-colors font-mono"
              />
              <div className="text-dr-muted text-xs mt-1.5 text-right">
                {(indivValues[key] ?? '').length} caractères
              </div>
            </div>
          ))}
        </div>
      </section>

      <SaveBar dirty={gdcDirty} onSave={handleGdcSave} onReset={() => { setGdcForm(gdcOriginal); setGdcError(null) }} saving={gdcSaving} />
    </div>
  )
}
