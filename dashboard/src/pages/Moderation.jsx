import { useEffect, useState } from 'react'
import Toggle from '../components/Toggle'
import { SaveBar } from '../components/SaveBar'
import {
  getAutomodConfig,
  updateAutomodConfig,
  getAutomodWarnings,
  deleteAutomodWarning,
  purgeAutomodWarnings,
  getAutomodChannels,
  getAutomodRoles,
} from '../api'

const DEFAULT_WORDS = [
  'merde','putain','connard','enculé','salope','con','conne','bâtard',
  'fils de pute','nique','niquer','fdp','tg','va te faire','pd','tapette',
  'attardé','mongol','trisomique','pédé','racist','nazi',
]

const TYPE_LABELS = {
  spam: 'Spam', banned_word: 'Mot interdit', caps: 'Majuscules',
  links: 'Lien', mentions: 'Mentions', manual: 'Manuel', mute: 'Mute',
}

const TYPE_COLORS = {
  spam:        'bg-yellow-900/30 text-yellow-400 border-yellow-800/50',
  banned_word: 'bg-red-900/30 text-red-400 border-red-800/50',
  caps:        'bg-blue-900/30 text-blue-400 border-blue-800/50',
  links:       'bg-purple-900/30 text-purple-400 border-purple-800/50',
  mentions:    'bg-orange-900/30 text-orange-400 border-orange-800/50',
  manual:      'bg-gray-900/30 text-gray-400 border-gray-800/50',
  mute:        'bg-red-900/50 text-red-300 border-red-700/50',
}

function TypeBadge({ type }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded border ${TYPE_COLORS[type] || TYPE_COLORS.manual}`}>
      {TYPE_LABELS[type] || type}
    </span>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-dr-card border border-dr-border rounded-xl p-5">
      <h3 className="text-dr-muted text-xs font-semibold uppercase tracking-widest mb-4">{title}</h3>
      {children}
    </div>
  )
}

function NumInput({ label, value, onChange, min, max }) {
  return (
    <div>
      <label className="text-dr-muted text-xs block mb-1">{label}</label>
      <input
        type="number" value={value ?? ''} min={min} max={max}
        onChange={e => onChange(parseInt(e.target.value) || value)}
        className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-sm text-dr-text
                   focus:outline-none focus:border-dr-red transition-colors"
      />
    </div>
  )
}

function TagList({ items, onRemove, locked = [] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span key={item}
          className="flex items-center gap-1 bg-dr-dark border border-dr-border rounded px-2 py-1 text-xs text-dr-text font-mono">
          {item}
          {!locked.includes(item) && (
            <button onClick={() => onRemove(item)} className="text-dr-muted hover:text-red-400 transition-colors leading-none">×</button>
          )}
          {locked.includes(item) && <span className="text-dr-muted/60 text-[10px] ml-1">🔒</span>}
        </span>
      ))}
    </div>
  )
}

function AddInput({ placeholder, onAdd, mono = false }) {
  const [val, setVal] = useState('')
  function handleAdd() {
    if (!val.trim()) return
    onAdd(val.trim())
    setVal('')
  }
  return (
    <div className="flex gap-2 mt-2">
      <input
        type="text" value={val} onChange={e => setVal(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder={placeholder}
        className={`flex-1 bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-sm text-dr-text
                    placeholder-dr-muted focus:outline-none focus:border-dr-red transition-colors
                    ${mono ? 'font-mono' : ''}`}
      />
      <button onClick={handleAdd}
        className="px-3 py-2 rounded-lg bg-dr-red hover:bg-dr-red-light text-white text-sm font-semibold transition-colors">
        Ajouter
      </button>
    </div>
  )
}

export default function Moderation() {
  const [config,   setConfig]   = useState({})
  const [original, setOriginal] = useState({})
  const [warnings, setWarnings] = useState([])
  const [channels, setChannels] = useState([])
  const [roles,    setRoles]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [success,  setSuccess]  = useState(null)

  const dirty = JSON.stringify(config) !== JSON.stringify(original)

  useEffect(() => {
    Promise.all([getAutomodConfig(), getAutomodWarnings('?limit=50'), getAutomodChannels(), getAutomodRoles()])
      .then(([cRes, wRes, chanRes, roleRes]) => {
        const c = cRes.data || {}
        setConfig(c)
        setOriginal(c)
        setWarnings(wRes.data?.data || [])
        setChannels(chanRes.data || [])
        setRoles(roleRes.data || [])
      })
      .catch(() => setError('Impossible de charger la configuration'))
      .finally(() => setLoading(false))
  }, [])

  function get(key)      { return config[key] }
  function set(key, val) { setConfig(c => ({ ...c, [key]: val })) }

  function addToArray(key, val) {
    set(key, [...new Set([...(get(key) || []), val])])
  }
  function removeFromArray(key, val) {
    set(key, (get(key) || []).filter(x => x !== val))
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await updateAutomodConfig(config)
      setOriginal(config)
      setSuccess('Configuration sauvegardée !')
      setTimeout(() => setSuccess(null), 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur de sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  function reset() { setConfig(original) }

  async function handleDeleteWarning(id) {
    await deleteAutomodWarning(id).catch(() => {})
    setWarnings(w => w.filter(x => x.id !== id))
  }

  async function handlePurge(discordId, name) {
    if (!window.confirm(`Purger tous les warnings de ${name || discordId} ?`)) return
    await purgeAutomodWarnings(discordId).catch(() => {})
    setWarnings(w => w.filter(x => x.discord_id !== discordId))
  }

  if (loading) return <div className="text-dr-muted text-sm">Chargement...</div>

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h2 className="text-2xl font-bold text-dr-gold mb-1">Modération automatique</h2>
        <p className="text-dr-muted text-sm">Configuration du système d'automodération du serveur Discord</p>
      </div>

      {error   && <div className="bg-red-900/20 border border-red-800/40 text-red-400 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-900/20 border border-green-800/40 text-green-400 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* 1. Activation */}
      <Section title="Activation générale">
        <Toggle
          checked={!!get('automod_enabled')}
          onChange={v => set('automod_enabled', v)}
          label={get('automod_enabled') ? 'Modération active' : 'Modération désactivée'}
        />
      </Section>

      {/* 2. Mots interdits */}
      <Section title="Mots interdits">
        <div className="space-y-3">
          <Toggle checked={!!get('banned_words_enabled')} onChange={v => set('banned_words_enabled', v)} label="Activer la détection" />
          <TagList items={get('banned_words_list') || []} onRemove={w => removeFromArray('banned_words_list', w)} />
          <AddInput placeholder="Ajouter un mot..." onAdd={w => addToArray('banned_words_list', w.toLowerCase())} />
          <button
            onClick={() => set('banned_words_list', DEFAULT_WORDS)}
            className="text-xs text-dr-muted hover:text-dr-text underline transition-colors"
          >
            Réinitialiser la liste par défaut ({DEFAULT_WORDS.length} mots)
          </button>
        </div>
      </Section>

      {/* 3. Anti-spam */}
      <Section title="Anti-spam">
        <div className="space-y-3">
          <Toggle checked={!!get('spam_enabled')} onChange={v => set('spam_enabled', v)} label="Activer" />
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="Seuil (messages similaires)" value={get('spam_threshold')} onChange={v => set('spam_threshold', v)} min={2} max={20} />
            <NumInput label="Intervalle (secondes)" value={get('spam_interval_seconds')} onChange={v => set('spam_interval_seconds', v)} min={3} max={60} />
          </div>
        </div>
      </Section>

      {/* 4. Anti-majuscules */}
      <Section title="Abus de majuscules">
        <div className="space-y-3">
          <Toggle checked={!!get('caps_enabled')} onChange={v => set('caps_enabled', v)} label="Activer" />
          <div className="grid grid-cols-2 gap-4">
            <NumInput label="% majuscules minimum" value={get('caps_threshold_percent')} onChange={v => set('caps_threshold_percent', v)} min={50} max={100} />
            <NumInput label="Longueur minimale (caractères)" value={get('caps_min_length')} onChange={v => set('caps_min_length', v)} min={5} max={100} />
          </div>
        </div>
      </Section>

      {/* 5. Anti-liens */}
      <Section title="Liens non autorisés">
        <div className="space-y-3">
          <Toggle checked={!!get('links_enabled')} onChange={v => set('links_enabled', v)} label="Activer (tout lien hors whitelist supprimé)" />
          <div>
            <div className="text-dr-muted text-xs mb-1">Domaines autorisés (whitelist)</div>
            <TagList items={get('links_whitelist') || []} onRemove={d => removeFromArray('links_whitelist', d)} />
            <AddInput placeholder="domaine.com" onAdd={d => addToArray('links_whitelist', d.toLowerCase())} mono />
          </div>
        </div>
      </Section>

      {/* 6. Anti-mentions */}
      <Section title="Mentions excessives">
        <div className="space-y-3">
          <Toggle checked={!!get('mentions_enabled')} onChange={v => set('mentions_enabled', v)} label="Activer" />
          <NumInput label="Mentions max par message" value={get('mentions_max')} onChange={v => set('mentions_max', v)} min={1} max={20} />
        </div>
      </Section>

      {/* 7. Paramètres sanctions */}
      <Section title="Paramètres de sanction">
        <div className="space-y-4">
          <NumInput label="Avertissements avant mute" value={get('warn_threshold')} onChange={v => set('warn_threshold', v)} min={1} max={10} />
          <div>
            <div className="text-dr-muted text-xs mb-2">Durées de mute progressives (minutes)</div>
            <div className="grid grid-cols-3 gap-3">
              {['1er mute', '2ème mute', '3ème+ mute'].map((label, i) => (
                <div key={i}>
                  <div className="text-dr-muted text-xs mb-1">{label}</div>
                  <input
                    type="number" min={1}
                    value={(get('mute_durations') || [10, 60, 1440])[i] ?? ''}
                    onChange={e => {
                      const arr = [...(get('mute_durations') || [10, 60, 1440])]
                      arr[i] = parseInt(e.target.value) || arr[i]
                      set('mute_durations', arr)
                    }}
                    className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-sm text-dr-text
                               focus:outline-none focus:border-dr-red transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
          <NumInput label="Expiration des warnings (heures)" value={get('warn_expiry_hours')} onChange={v => set('warn_expiry_hours', v)} min={1} max={168} />
          <Toggle checked={!!get('warn_dm_enabled')} onChange={v => set('warn_dm_enabled', v)} label="Envoyer les avertissements en DM" />
        </div>
      </Section>

      {/* 8. Salons ignorés */}
      <Section title="Salons ignorés">
        <div className="space-y-3">
          <p className="text-dr-muted text-xs">Le salon Logs bot est toujours ignoré (🔒).</p>
          <TagList
            items={get('ignored_channels') || []}
            onRemove={id => removeFromArray('ignored_channels', id)}
            locked={['1522722935918559364']}
          />
          {channels.length > 0 ? (
            <select
              onChange={e => { if (e.target.value) { addToArray('ignored_channels', e.target.value); e.target.value = '' } }}
              className="w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-sm text-dr-text focus:outline-none focus:border-dr-red"
            >
              <option value="">Ajouter un salon à ignorer…</option>
              {channels.filter(c => !(get('ignored_channels') || []).includes(c.id)).map(c => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
          ) : (
            <AddInput placeholder="ID du salon à ignorer…" onAdd={id => addToArray('ignored_channels', id)} mono />
          )}
        </div>
      </Section>

      {/* 9. Exemptions */}
      <Section title="Exemptions">
        <div className="space-y-5">
          <div>
            <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">Rôles exempts</div>
            <TagList
              items={(get('exempt_roles') || []).map(id => {
                const role = roles.find(r => r.id === id)
                return role ? `@${role.name} (${id})` : (id === '611123759864348672' ? `Chef (${id})` : id === '1297318759396278425' ? `Adjoint (${id})` : id)
              })}
              onRemove={label => {
                const id = (label.match(/\((\d+)\)/) || [])[1] || label
                removeFromArray('exempt_roles', id)
              }}
            />
            {roles.length > 0 ? (
              <select
                onChange={e => { if (e.target.value) { addToArray('exempt_roles', e.target.value); e.target.value = '' } }}
                className="mt-2 w-full bg-dr-dark border border-dr-border rounded-lg px-3 py-2 text-sm text-dr-text focus:outline-none focus:border-dr-red"
              >
                <option value="">Ajouter un rôle exempt…</option>
                {roles.filter(r => !(get('exempt_roles') || []).includes(r.id)).map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            ) : (
              <AddInput placeholder="ID du rôle…" onAdd={id => addToArray('exempt_roles', id)} mono />
            )}
          </div>

          <div>
            <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2">Membres exempts (Discord IDs)</div>
            <TagList items={get('exempt_members') || []} onRemove={id => removeFromArray('exempt_members', id)} />
            <AddInput placeholder="Discord ID du membre…" onAdd={id => addToArray('exempt_members', id)} mono />
          </div>
        </div>
      </Section>

      {/* 10. Historique */}
      <Section title={`Historique des sanctions (${warnings.length} récentes)`}>
        {warnings.length === 0 ? (
          <div className="text-dr-muted text-sm text-center py-6">Aucun avertissement enregistré</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-dr-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dr-border text-dr-muted text-xs uppercase tracking-wider bg-dr-dark/60">
                  <th className="text-left px-4 py-3">Membre</th>
                  <th className="text-left px-4 py-3">Type</th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">Raison</th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {warnings.map((w, i) => (
                  <tr key={w.id} className={`border-b border-dr-border/40 transition-colors hover:bg-dr-dark/50 ${i % 2 === 0 ? '' : 'bg-dr-dark/20'}`}>
                    <td className="px-4 py-3">
                      <div className="text-dr-text font-medium">{w.discord_name || '—'}</div>
                      <div className="text-dr-muted text-xs font-mono">{w.discord_id}</div>
                    </td>
                    <td className="px-4 py-3"><TypeBadge type={w.type} /></td>
                    <td className="px-4 py-3 text-dr-muted text-xs hidden md:table-cell max-w-xs truncate" title={w.reason}>{w.reason}</td>
                    <td className="px-4 py-3 text-dr-muted text-xs hidden lg:table-cell whitespace-nowrap">
                      {new Date(w.warned_at).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => handleDeleteWarning(w.id)}
                          className="text-xs px-2 py-1 rounded border border-dr-border text-dr-muted hover:text-dr-text hover:border-dr-muted transition-colors">
                          Supprimer
                        </button>
                        <button onClick={() => handlePurge(w.discord_id, w.discord_name)}
                          className="text-xs px-2 py-1 rounded border border-red-800/50 text-red-400 hover:bg-red-900/20 transition-colors">
                          Purger tout
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <SaveBar dirty={dirty} onSave={save} onReset={reset} saving={saving} />
    </div>
  )
}
