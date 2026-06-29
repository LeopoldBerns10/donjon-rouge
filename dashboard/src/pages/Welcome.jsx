import { useEffect, useRef, useState } from 'react'
import { getConfig, updateConfig } from '../api'
import { SaveBar } from '../components/SaveBar'

// ── Définition des variables disponibles ─────────────────────────────────────

const VAR_CATS = [
  {
    key: 'user', label: 'Utilisateur',
    vars: [
      { v: 'user',             d: 'Mention (@)' },
      { v: 'user.id',          d: 'ID Discord' },
      { v: 'user.username',    d: 'Username' },
      { v: 'user.nickname',    d: 'Surnom serveur' },
      { v: 'user.globalname',  d: 'Nom global' },
      { v: 'user.tag',         d: 'Tag (déprécié)' },
      { v: 'user.rolecount',   d: 'Nombre de rôles' },
      { v: 'user.created_at',  d: 'Création du compte' },
      { v: 'user.joined_at',   d: "Date d'arrivée" },
    ],
  },
  {
    key: 'server', label: 'Serveur',
    vars: [
      { v: 'server',               d: 'Nom du serveur' },
      { v: 'server.membercount',   d: 'Membres total' },
      { v: 'server.humancount',    d: 'Membres humains' },
      { v: 'server.botcount',      d: 'Bots' },
      { v: 'server.rolecount',     d: 'Nombre de rôles' },
      { v: 'server.channelcount',  d: 'Nombre de salons' },
      { v: 'server.boosts.level',  d: 'Niveau boost' },
      { v: 'server.boosts.count',  d: 'Nombre de boosts' },
      { v: 'server.created_at',    d: 'Création du serveur' },
    ],
  },
  {
    key: 'channel', label: 'Salon',
    vars: [
      { v: 'channel',                    d: 'Mention (#)' },
      { v: 'channel.name',               d: 'Nom du salon' },
      { v: 'channel.created_at',         d: 'Création du salon' },
      { v: 'channel.parent',             d: 'Catégorie (mention)' },
      { v: 'channel.parent.name',        d: 'Nom catégorie' },
      { v: 'channel.parent.created_at',  d: 'Création catégorie' },
    ],
  },
  {
    key: 'date', label: 'Date / Heure',
    vars: [
      { v: 'date', d: 'Date DD/MM/YYYY' },
      { v: 'time', d: 'Heure HH:MM' },
    ],
  },
]

const ALL_VAR_NAMES = VAR_CATS.flatMap(c => c.vars.map(v => v.v))

// ── Valeurs de prévisualisation ───────────────────────────────────────────────

const PREVIEW = {
  'user':                     '@NouveauMembre',
  'user.id':                  '123456789012345678',
  'user.username':            'nouveau_membre',
  'user.nickname':            'Nouveau Membre',
  'user.globalname':          'NouveauMembre',
  'user.tag':                 'nouveau_membre#0000',
  'user.rolecount':           '2',
  'user.created_at':          '15/01/2023',
  'user.joined_at':           '28/06/2026',
  'server':                   'Donjon Rouge',
  'server.id':                '610767309031866371',
  'server.name':              'Donjon Rouge',
  'server.membercount':       '256',
  'server.humancount':        '248',
  'server.botcount':          '8',
  'server.rolecount':         '42',
  'server.channelcount':      '35',
  'server.boosts.level':      '2',
  'server.boosts.count':      '14',
  'server.created_at':        '04/07/2019',
  'channel':                  '#bienvenue',
  'channel.id':               '1520034360559013939',
  'channel.name':             'bienvenue',
  'channel.created_at':       '04/07/2019',
  'channel.parent':           '#INFORMATIONS',
  'channel.parent.id':        '987654321',
  'channel.parent.name':      'INFORMATIONS',
  'channel.parent.created_at': '04/07/2019',
  'date':                     '28/06/2026',
  'time':                     '14:30',
}

function previewText(text) {
  let out = text
  for (const [k, v] of Object.entries(PREVIEW)) {
    out = out.replaceAll(`{${k}}`, v)
  }
  return out
}

// ── Helpers curseur ───────────────────────────────────────────────────────────

function getOpenBrace(text, cursor) {
  const before = text.slice(0, cursor)
  const match = before.match(/\{([a-z._]*)$/)
  return match ? match[1] : null
}

// ── Sous-composants ───────────────────────────────────────────────────────────

function SuggestList({ matches, onSelect, onDismiss }) {
  if (!matches.length) return null
  return (
    <div className="absolute left-0 right-0 top-full z-20 mt-0.5 bg-dr-dark border border-dr-border rounded-lg shadow-xl overflow-hidden">
      {matches.slice(0, 12).map(v => (
        <button
          key={v}
          onMouseDown={(e) => { e.preventDefault(); onSelect(v) }}
          className="w-full text-left px-3 py-1.5 text-xs font-mono text-dr-gold hover:bg-dr-card transition-colors"
        >
          {`{${v}}`}
        </button>
      ))}
      <button
        onMouseDown={(e) => { e.preventDefault(); onDismiss() }}
        className="w-full text-center text-dr-muted text-xs py-1 border-t border-dr-border hover:bg-dr-card/50 transition-colors"
      >
        Fermer
      </button>
    </div>
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

// ── Page principale ───────────────────────────────────────────────────────────

const DEFAULTS = {
  welcome_dm_msg:  '',
  departure_title: '',
  departure_desc:  '',
}

export default function Welcome() {
  const [original, setOriginal] = useState(DEFAULTS)
  const [form, setForm]         = useState(DEFAULTS)
  const [saving, setSaving]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [saveError, setSaveError] = useState(null)

  const [activeCat,   setActiveCat]   = useState('user')
  const [activeField, setActiveField] = useState('welcome_dm_msg')
  const [suggest, setSuggest]         = useState(null) // { field, matches } | null

  const refWelcome = useRef(null)
  const refTitle   = useRef(null)
  const refDesc    = useRef(null)
  const FIELD_REFS = {
    welcome_dm_msg:  refWelcome,
    departure_title: refTitle,
    departure_desc:  refDesc,
  }

  useEffect(() => {
    getConfig()
      .then(({ data }) => {
        const loaded = {
          welcome_dm_msg:  data.welcome_dm_msg  ?? '',
          departure_title: data.departure_title ?? '',
          departure_desc:  data.departure_desc  ?? '',
        }
        setOriginal(loaded)
        setForm(loaded)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const dirty =
    form.welcome_dm_msg  !== original.welcome_dm_msg  ||
    form.departure_title !== original.departure_title ||
    form.departure_desc  !== original.departure_desc

  // onChange avec détection d'autocomplétion
  function handleInput(key, e) {
    const value  = e.target.value
    const cursor = e.target.selectionStart
    setForm(prev => ({ ...prev, [key]: value }))

    const partial = getOpenBrace(value, cursor)
    if (partial !== null) {
      const matches = ALL_VAR_NAMES.filter(v => v.startsWith(partial))
      setSuggest(matches.length ? { field: key, matches } : null)
    } else {
      setSuggest(null)
    }
  }

  // Insère {varName} à la position du curseur dans le champ actif
  function insertVariable(varName) {
    const el = FIELD_REFS[activeField]?.current
    if (!el) return
    const start = el.selectionStart ?? 0
    const end   = el.selectionEnd   ?? start
    const toInsert = `{${varName}}`
    const newVal = form[activeField].slice(0, start) + toInsert + form[activeField].slice(end)
    setForm(prev => ({ ...prev, [activeField]: newVal }))
    setSuggest(null)
    const newPos = start + toInsert.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newPos, newPos)
    })
  }

  // Remplace {partial en cours par {varName}
  function applySuggest(varName) {
    const field = suggest.field
    const el    = FIELD_REFS[field]?.current
    if (!el) return
    const cursor  = el.selectionStart
    const text    = form[field]
    const before  = text.slice(0, cursor)
    const partial = before.match(/\{([a-z._]*)$/)?.[1] ?? ''
    const replaceStart = cursor - partial.length - 1
    const toInsert = `{${varName}}`
    const newVal = text.slice(0, replaceStart) + toInsert + text.slice(cursor)
    setForm(prev => ({ ...prev, [field]: newVal }))
    setSuggest(null)
    const newPos = replaceStart + toInsert.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(newPos, newPos)
    })
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    try {
      await updateConfig({
        welcome_dm_msg:  form.welcome_dm_msg,
        departure_title: form.departure_title,
        departure_desc:  form.departure_desc,
      })
      setOriginal(form)
    } catch {
      setSaveError('Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  const currentCatVars = VAR_CATS.find(c => c.key === activeCat)?.vars ?? []

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
        {/* ── Colonne gauche : formulaires ──────────────────────────────── */}
        <div className="space-y-5">

          {/* Variable picker */}
          <div className="bg-dr-card border border-dr-border rounded-xl p-4">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-dr-muted text-xs font-semibold uppercase tracking-wider mr-1">Variables</span>
              {VAR_CATS.map(cat => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCat(cat.key)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    activeCat === cat.key
                      ? 'bg-dr-red text-white'
                      : 'bg-dr-dark text-dr-muted hover:text-dr-text'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentCatVars.map(({ v, d }) => (
                <button
                  key={v}
                  onClick={() => insertVariable(v)}
                  title={d}
                  className="text-xs font-mono px-2 py-1 rounded bg-dr-dark border border-dr-border text-dr-gold/80 hover:border-dr-red/50 hover:text-dr-gold transition-colors"
                >
                  {`{${v}}`}
                </button>
              ))}
            </div>
            <p className="text-dr-muted text-xs">
              Cliquer insère dans le champ actif · Taper <code className="text-dr-gold/70">{'{'}</code> dans un champ pour l'autocomplétion
            </p>
          </div>

          {/* Message d'arrivée */}
          <div className="bg-dr-card border border-dr-border rounded-xl p-6">
            <h3 className="font-semibold text-dr-text mb-0.5">Message d'arrivée (DM)</h3>
            <p className="text-dr-muted text-xs mb-3">
              Clé : <code className="text-dr-gold/80">welcome_dm_msg</code>
            </p>
            <div className="relative">
              <textarea
                ref={refWelcome}
                value={form.welcome_dm_msg}
                onFocus={() => { setActiveField('welcome_dm_msg'); setSuggest(null) }}
                onChange={(e) => handleInput('welcome_dm_msg', e)}
                rows={5}
                placeholder="Message de bienvenue..."
                className="w-full bg-dr-dark border border-dr-border rounded-lg p-3 text-dr-text text-sm resize-none focus:outline-none focus:border-dr-red/60 transition-colors font-mono"
              />
              {suggest?.field === 'welcome_dm_msg' && (
                <SuggestList
                  matches={suggest.matches}
                  onSelect={applySuggest}
                  onDismiss={() => setSuggest(null)}
                />
              )}
            </div>
            <div className="text-dr-muted text-xs mt-1.5 text-right">
              {form.welcome_dm_msg.length} caractères
            </div>
          </div>

          {/* Message de départ */}
          <div className="bg-dr-card border border-dr-border rounded-xl p-6">
            <h3 className="font-semibold text-dr-text mb-0.5">Message de départ (embed)</h3>
            <p className="text-dr-muted text-xs mb-4">
              Affiché dans le salon quand un membre quitte
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-dr-muted text-xs block mb-1">
                  Titre · <code className="text-dr-gold/80">departure_title</code>
                </label>
                <div className="relative">
                  <input
                    ref={refTitle}
                    type="text"
                    value={form.departure_title}
                    onFocus={() => { setActiveField('departure_title'); setSuggest(null) }}
                    onChange={(e) => handleInput('departure_title', e)}
                    placeholder="Titre de l'embed..."
                    className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2.5 text-dr-text text-sm focus:outline-none focus:border-dr-red/60 transition-colors"
                  />
                  {suggest?.field === 'departure_title' && (
                    <SuggestList
                      matches={suggest.matches}
                      onSelect={applySuggest}
                      onDismiss={() => setSuggest(null)}
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="text-dr-muted text-xs block mb-1">
                  Description · <code className="text-dr-gold/80">departure_desc</code>
                </label>
                <div className="relative">
                  <textarea
                    ref={refDesc}
                    value={form.departure_desc}
                    onFocus={() => { setActiveField('departure_desc'); setSuggest(null) }}
                    onChange={(e) => handleInput('departure_desc', e)}
                    rows={3}
                    placeholder="Description de l'embed..."
                    className="w-full bg-dr-dark border border-dr-border rounded-lg p-3 text-dr-text text-sm resize-none focus:outline-none focus:border-dr-red/60 transition-colors font-mono"
                  />
                  {suggest?.field === 'departure_desc' && (
                    <SuggestList
                      matches={suggest.matches}
                      onSelect={applySuggest}
                      onDismiss={() => setSuggest(null)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Colonne droite : prévisualisation ─────────────────────────── */}
        <div className="bg-dr-card border border-dr-border rounded-xl p-6 h-fit sticky top-6">
          <h3 className="font-semibold text-dr-text mb-5">Prévisualisation</h3>

          <div className="mb-6">
            <p className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Message d'arrivée (DM)
            </p>
            <DiscordDM content={previewText(form.welcome_dm_msg)} />
          </div>

          <div>
            <p className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Message de départ (embed)
            </p>
            <div className="bg-[#36393f] rounded-lg p-3">
              <DiscordEmbed
                title={previewText(form.departure_title)}
                description={previewText(form.departure_desc)}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-dr-border">
            <p className="text-dr-muted text-xs leading-relaxed">
              La prévisualisation utilise des valeurs fictives. Les vraies valeurs sont injectées par le bot au moment de l'événement.
            </p>
          </div>
        </div>
      </div>

      <SaveBar dirty={dirty} onSave={handleSave} onReset={() => { setForm(original); setSaveError(null) }} saving={saving} />
    </div>
  )
}
