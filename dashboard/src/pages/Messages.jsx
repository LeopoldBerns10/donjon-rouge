import { useEffect, useState } from 'react'
import { getConfig, updateConfig } from '../api'
import { SaveBar } from '../components/SaveBar'

const GDC_FIELDS = [
  { key: 'gdc_msg_dimanche', label: 'Message Dimanche 21h', placeholder: 'Message du dimanche soir...' },
  { key: 'gdc_msg_mardi',    label: 'Message Mardi 21h',    placeholder: 'Message du mardi soir...' },
]

const DEFAULTS = { gdc_msg_dimanche: '', gdc_msg_mardi: '' }

export default function Messages() {
  const [original, setOriginal] = useState(DEFAULTS)
  const [form, setForm]         = useState(DEFAULTS)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    getConfig()
      .then(({ data }) => {
        console.log('[Messages] bot_config chargé:', data)
        const loaded = {
          gdc_msg_dimanche: data?.gdc_msg_dimanche ?? '',
          gdc_msg_mardi:    data?.gdc_msg_mardi    ?? '',
        }
        console.log('[Messages] valeurs GDC extraites:', loaded)
        setOriginal(loaded)
        setForm(loaded)
      })
      .catch((err) => {
        console.error('[Messages] erreur getConfig:', err)
        setLoadError('Impossible de charger la configuration')
      })
      .finally(() => setLoading(false))
  }, [])

  const dirty = GDC_FIELDS.some(({ key }) => form[key] !== original[key])

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateConfig({ gdc_msg_dimanche: form.gdc_msg_dimanche, gdc_msg_mardi: form.gdc_msg_mardi })
      setOriginal(form)
    } catch {
      setSaveError('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Messages GDC</h2>
        <p className="text-dr-muted text-sm">Messages envoyés automatiquement avant chaque Guerre de Clans</p>
      </div>

      {loadError && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {loadError}
        </div>
      )}

      {saveError && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {saveError}
        </div>
      )}

      <div className="space-y-6 max-w-2xl">
        {GDC_FIELDS.map(({ key, label, placeholder }) => (
          <div key={key} className="bg-dr-card border border-dr-border rounded-xl p-6">
            <h3 className="font-semibold text-dr-text mb-0.5">{label}</h3>
            <p className="text-dr-muted text-xs mb-3">
              Clé : <code className="text-dr-gold/80">{key}</code>
            </p>
            <textarea
              value={form[key]}
              onChange={(e) => handleChange(key, e.target.value)}
              rows={6}
              placeholder={placeholder}
              className="w-full bg-dr-dark border border-dr-border rounded-lg p-3 text-dr-text text-sm resize-none focus:outline-none focus:border-dr-red/60 transition-colors font-mono"
            />
            <div className="text-dr-muted text-xs mt-1.5 text-right">
              {form[key].length} caractères
            </div>
          </div>
        ))}
      </div>

      <SaveBar dirty={dirty} onSave={handleSave} onReset={() => { setForm(original); setSaveError(null) }} saving={saving} />
    </div>
  )
}
