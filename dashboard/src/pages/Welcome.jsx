import { useEffect, useState } from 'react'
import { getConfig, updateConfig } from '../api'
import { SaveBar } from '../components/SaveBar'

const DEFAULTS = {
  welcome_dm_msg: 'Bienvenue {username} sur {server} ! 🎉\nNous sommes ravis de te compter parmi nous.',
  departure_title: 'Un membre nous a quittés',
  departure_desc: '{user} a quitté le serveur Donjon Rouge.',
}

function Badge({ label }) {
  return (
    <span className="inline-block bg-dr-red/20 text-dr-red-light border border-dr-red/30 text-xs px-2 py-0.5 rounded font-mono mr-1 mb-1">
      {'{' + label + '}'}
    </span>
  )
}

function DiscordDM({ content }) {
  return (
    <div className="bg-[#36393f] rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          DR
        </div>
        <div>
          <div className="text-[#00b0f4] text-sm font-semibold mb-1">Donjon Rouge</div>
          <div className="text-[#dcddde] text-sm whitespace-pre-wrap leading-relaxed">
            {content || <span className="text-[#72767d] italic">Aucun message</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DiscordEmbed({ title, description }) {
  return (
    <div className="bg-[#2f3136] rounded-r-lg overflow-hidden border-l-4 border-dr-red">
      <div className="p-3">
        {title && <div className="font-semibold text-white text-sm mb-1">{title}</div>}
        {description ? (
          <div className="text-[#b9bbbe] text-sm whitespace-pre-wrap leading-relaxed">{description}</div>
        ) : (
          <div className="text-[#72767d] text-sm italic">Aucune description</div>
        )}
      </div>
    </div>
  )
}

export default function Welcome() {
  const [original, setOriginal] = useState(DEFAULTS)
  const [form, setForm] = useState(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    getConfig()
      .then(({ data }) => {
        const loaded = {
          welcome_dm_msg: data.welcome_dm_msg ?? DEFAULTS.welcome_dm_msg,
          departure_title: data.departure_title ?? DEFAULTS.departure_title,
          departure_desc: data.departure_desc ?? DEFAULTS.departure_desc,
        }
        setOriginal(loaded)
        setForm(loaded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dirty =
    form.welcome_dm_msg !== original.welcome_dm_msg ||
    form.departure_title !== original.departure_title ||
    form.departure_desc !== original.departure_desc

  function handleChange(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleReset() {
    setForm(original)
    setSaveError(null)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateConfig({
        welcome_dm_msg: form.welcome_dm_msg,
        departure_title: form.departure_title,
        departure_desc: form.departure_desc,
      })
      setOriginal(form)
    } catch {
      setSaveError('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-dr-muted text-sm">Chargement...</div>
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Arrivées & Départs</h2>
        <p className="text-dr-muted text-sm">Messages envoyés automatiquement lors des arrivées et départs</p>
      </div>

      {saveError && (
        <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">
          {saveError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Formulaires */}
        <div className="space-y-6">
          {/* Message d'arrivée */}
          <div className="bg-dr-card border border-dr-border rounded-xl p-6">
            <h3 className="font-semibold text-dr-text mb-0.5">Message d'arrivée</h3>
            <p className="text-dr-muted text-xs mb-3">
              Envoyé en DM aux nouveaux membres • Clé : <code className="text-dr-gold/80">welcome_dm_msg</code>
            </p>
            <div className="mb-3">
              <Badge label="username" />
              <Badge label="server" />
            </div>
            <textarea
              value={form.welcome_dm_msg}
              onChange={(e) => handleChange('welcome_dm_msg', e.target.value)}
              rows={5}
              placeholder="Message de bienvenue..."
              className="w-full bg-dr-dark border border-dr-border rounded-lg p-3 text-dr-text text-sm resize-none focus:outline-none focus:border-dr-red/60 transition-colors font-mono"
            />
            <div className="text-dr-muted text-xs mt-1.5 text-right">
              {form.welcome_dm_msg.length} caractères
            </div>
          </div>

          {/* Message de départ */}
          <div className="bg-dr-card border border-dr-border rounded-xl p-6">
            <h3 className="font-semibold text-dr-text mb-0.5">Message de départ</h3>
            <p className="text-dr-muted text-xs mb-3">
              Embed affiché dans le salon quand un membre quitte
            </p>
            <div className="mb-3">
              <Badge label="user" />
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-dr-muted text-xs block mb-1">
                  Titre • <code className="text-dr-gold/80">departure_title</code>
                </label>
                <input
                  type="text"
                  value={form.departure_title}
                  onChange={(e) => handleChange('departure_title', e.target.value)}
                  placeholder="Titre de l'embed..."
                  className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2.5 text-dr-text text-sm focus:outline-none focus:border-dr-red/60 transition-colors"
                />
              </div>
              <div>
                <label className="text-dr-muted text-xs block mb-1">
                  Description • <code className="text-dr-gold/80">departure_desc</code>
                </label>
                <textarea
                  value={form.departure_desc}
                  onChange={(e) => handleChange('departure_desc', e.target.value)}
                  rows={3}
                  placeholder="Description de l'embed..."
                  className="w-full bg-dr-dark border border-dr-border rounded-lg p-3 text-dr-text text-sm resize-none focus:outline-none focus:border-dr-red/60 transition-colors font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Prévisualisation */}
        <div className="bg-dr-card border border-dr-border rounded-xl p-6 h-fit sticky top-6">
          <h3 className="font-semibold text-dr-text mb-5">Prévisualisation</h3>

          <div className="mb-6">
            <p className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Message d'arrivée (DM)
            </p>
            <DiscordDM content={form.welcome_dm_msg} />
          </div>

          <div>
            <p className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Message de départ (embed)
            </p>
            <div className="bg-[#36393f] rounded-lg p-3">
              <DiscordEmbed title={form.departure_title} description={form.departure_desc} />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-dr-border">
            <p className="text-dr-muted text-xs">
              Les variables entre accolades ({'{username}'}, {'{user}'}...) sont remplacées automatiquement par le bot.
            </p>
          </div>
        </div>
      </div>

      <SaveBar dirty={dirty} onSave={handleSave} onReset={handleReset} saving={saving} />
    </div>
  )
}
