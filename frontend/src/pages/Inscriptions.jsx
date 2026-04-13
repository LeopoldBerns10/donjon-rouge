import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatTime(d) {
  if (!d) return ''
  const dt = new Date(d)
  const day = String(dt.getDate()).padStart(2, '0')
  const month = String(dt.getMonth() + 1).padStart(2, '0')
  const time = dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${day}/${month} à ${time}`
}

function formatCocRole(role) {
  const map = { leader: 'Chef', coLeader: 'Co-Chef', admin: 'Ancien', member: 'Membre' }
  return map[role] || role || ''
}

function addDays(dateStr, days) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function calcDates(type, { proposed_date, close_date }) {
  if (type === 'gdc') return {
    close_date: addDays(proposed_date, -1),
    auto_delete_date: addDays(proposed_date, 2)
  }
  if (type === 'gdc_selection') return {
    close_date: addDays(proposed_date, -1),
    auto_delete_date: addDays(proposed_date, 3)
  }
  if (type === 'ldc') return {
    close_date,
    auto_delete_date: addDays(proposed_date, 9)
  }
  return {}
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const config = {
    gdc:           { label: '⚔️ GDC Classique',  className: 'bg-[#1a1a1a] border-[#333] text-gray-300' },
    gdc_selection: { label: '🏆 GDC Sélection',   className: 'bg-[#7f1d1d]/30 border-[#dc2626]/50 text-[#ef4444]' },
    ldc:           { label: '👑 Ligue de Guerre',  className: 'bg-[#78350f]/30 border-[#f59e0b]/50 text-[#f59e0b]' },
  }
  const { label, className } = config[type] || config.gdc
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase tracking-wide ${className}`}>
      {label}
    </span>
  )
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const config = {
    open:      { label: 'Ouvert',    className: 'bg-green-900/30 border-green-700/50 text-green-400' },
    validated: { label: 'Validé',    className: 'bg-blue-900/30 border-blue-700/50 text-blue-400' },
    closed:    { label: 'Clôturé',   className: 'bg-[#1a1a1a] border-[#333] text-gray-500' },
    cancelled: { label: 'Annulé',    className: 'bg-red-900/30 border-red-700/50 text-red-400' },
  }
  const { label, className } = config[status] || config.closed
  return (
    <span className={`text-xs font-semibold px-3 py-1 rounded-full border uppercase tracking-wide ${className}`}>
      {label}
    </span>
  )
}

// ─── WarningModal ─────────────────────────────────────────────────────────────

function WarningModal({ type, onConfirm, onCancel }) {
  const isLdc = type === 'ldc'
  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className="bg-[#111111] border border-[#dc2626]/50 rounded-2xl shadow-2xl shadow-[#dc2626]/20 w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-8 pb-2">
          <div className="w-16 h-16 rounded-full bg-[#dc2626]/10 border-2 border-[#dc2626]/40 flex items-center justify-center text-3xl">
            ⚔️
          </div>
        </div>

        <div className="px-6 pb-2 text-center">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">
            Inscription Officielle
          </h3>
          <p className="text-xs text-[#dc2626] uppercase tracking-widest mt-1">
            {isLdc ? 'Ligue de Guerre de Clans' : 'GDC Sélection Guerriers'}
          </p>
        </div>

        <div className="px-6 py-4">
          <div className="bg-[#dc2626]/5 border border-[#dc2626]/20 rounded-xl p-4">
            <p className="text-sm text-gray-300 leading-relaxed text-center">
              ⚠️ <strong className="text-white">Cette inscription est officielle et définitive.</strong>
            </p>
            <ul className="mt-3 space-y-1.5 text-xs text-gray-400">
              <li>• Une fois inscrit, <strong className="text-white">tu ne pourras pas te désinscrire</strong></li>
              <li>• Ta participation sera <strong className="text-white">visible publiquement</strong></li>
              <li>• Les règles du clan s'appliquent entièrement</li>
              {isLdc && <li>• <strong className="text-[#f59e0b]">Les 2 attaques sont OBLIGATOIRES en LDC</strong></li>}
              {!isLdc && <li>• <strong className="text-[#ef4444]">Les 5 meilleurs seront sélectionnés pour la LDC</strong></li>}
            </ul>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:border-[#555] hover:text-white transition-all duration-150"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-all duration-200 shadow-lg shadow-[#dc2626]/20"
          >
            Je confirme
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── SignupButton ─────────────────────────────────────────────────────────────

function SignupButton({ event, isSignedUp, onSignup }) {
  const { user } = useAuth()
  const [showWarning, setShowWarning] = useState(false)
  const [loading, setLoading] = useState(false)

  const needsWarning = event.type === 'gdc_selection' || event.type === 'ldc'

  if (!user) return null

  if (isSignedUp) {
    return (
      <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500/10 border border-green-500/30 text-green-400">
        ✓ Inscrit
      </span>
    )
  }

  if (event.status !== 'open') return null

  const handleClick = () => {
    if (needsWarning) setShowWarning(true)
    else confirmSignup()
  }

  const confirmSignup = async () => {
    setLoading(true)
    await onSignup(event.id)
    setShowWarning(false)
    setLoading(false)
  }

  return (
    <>
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#dc2626]/20"
      >
        {loading ? 'Inscription...' : "S'inscrire"}
      </button>

      {showWarning && (
        <WarningModal type={event.type} onConfirm={confirmSignup} onCancel={() => setShowWarning(false)} />
      )}
    </>
  )
}

// ─── SignupsList ──────────────────────────────────────────────────────────────

function SignupsList({ signups }) {
  if (!signups || signups.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Joueurs inscrits</p>
        <p className="text-xs text-gray-700 py-2">Aucune inscription pour le moment</p>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Joueurs inscrits</p>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {signups.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-[#1a1a1a]">
            <span className="text-xs text-[#dc2626] font-bold w-5 text-center">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="w-6 h-6 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30 flex items-center justify-center text-[10px] font-bold text-[#dc2626]">
              {s.coc_name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-gray-200 font-medium flex-1">{s.coc_name}</span>
            <span className="text-[10px] text-gray-600">{formatCocRole(s.coc_role)}</span>
            <span className="text-[10px] text-gray-700">{formatTime(s.signed_up_at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── AdminActions ─────────────────────────────────────────────────────────────

function AdminActions({ event, onValidate, onClose }) {
  const { user } = useAuth()
  const canManage = ['superadmin', 'admin'].includes(user?.site_role) ||
    ['leader', 'coLeader'].includes(user?.coc_role)

  if (!canManage) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex gap-2 flex-wrap">
      {event.status === 'open' && event.signup_count >= (event.min_players || 0) && (
        <button
          onClick={() => onValidate(event.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-green-900/30 border border-green-700/50 text-green-400 hover:bg-green-900/50 transition-colors"
        >
          ✓ Valider la guerre
        </button>
      )}
      {event.status !== 'closed' && (
        <button
          onClick={() => onClose(event.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-[#1a1a1a] border border-[#333] text-gray-400 hover:border-[#dc2626] hover:text-white transition-colors"
        >
          Clôturer
        </button>
      )}
    </div>
  )
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, signups, userSignedUpEventIds, onSignup, onValidate, onClose }) {
  const isSignedUp = userSignedUpEventIds.has(event.id)
  const borderClass =
    event.type === 'ldc' ? 'border-[#f59e0b]/40' :
    event.type === 'gdc_selection' ? 'border-[#dc2626]/40' :
    'border-[#1f1f1f]'

  return (
    <div className={`relative rounded-2xl border overflow-hidden bg-gradient-to-br from-[#111111] to-[#0d0d0d] transition-all duration-300 hover:shadow-lg hover:shadow-[#dc2626]/10 ${borderClass}`}>
      <div className="absolute top-4 left-4">
        <TypeBadge type={event.type} />
      </div>
      <div className="absolute top-4 right-4">
        <StatusBadge status={event.status} />
      </div>

      <div className="px-6 pt-14 pb-6">
        <h3 className="text-lg font-bold text-white uppercase tracking-wide mb-1">{event.title}</h3>
        <p className="text-xs text-gray-500 mb-4">
          Proposé par <span className="text-gray-300">{event.created_by_name}</span>
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-[#0a0a0a] rounded-xl p-3 border border-[#1a1a1a]">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Début guerre</p>
            <p className="text-sm font-bold text-white">{formatDate(event.proposed_date)}</p>
          </div>
          <div className="bg-[#0a0a0a] rounded-xl p-3 border border-[#1a1a1a]">
            <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Clôture inscriptions</p>
            <p className="text-sm font-bold text-[#dc2626]">{formatDate(event.close_date)}</p>
          </div>
        </div>

        {event.description && (
          <p className="text-sm text-gray-400 mb-4 leading-relaxed">{event.description}</p>
        )}

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{event.signup_count}</span>
            <div>
              <p className="text-xs text-gray-400 leading-tight">joueurs inscrits</p>
              {event.type === 'gdc' && event.min_players > 0 && (
                <p className="text-xs text-gray-600">
                  {event.signup_count >= event.min_players
                    ? '✅ Minimum atteint'
                    : `⏳ ${event.min_players - event.signup_count} de plus requis`}
                </p>
              )}
            </div>
          </div>
          <SignupButton event={event} isSignedUp={isSignedUp} onSignup={onSignup} />
        </div>

        <SignupsList signups={signups[event.id] || []} />
        <AdminActions event={event} onValidate={onValidate} onClose={onClose} />

        <div className="mt-3 pt-3 border-t border-[#1a1a1a] grid grid-cols-2 gap-2 text-[10px] text-gray-700">
          <span>📅 Clôture inscriptions : <span className="text-gray-500 ml-1">{formatDate(event.close_date)}</span></span>
          <span>🗑️ Suppression auto : <span className="text-gray-500 ml-1">{formatDate(event.auto_delete_date)}</span></span>
        </div>
      </div>
    </div>
  )
}

// ─── CreateEventModal ─────────────────────────────────────────────────────────

function CreateEventModal({ type, onClose, onCreated }) {
  const typeLabels = { gdc: 'GDC Classique', gdc_selection: 'GDC Sélection', ldc: 'Ligue de Guerre' }
  const isLdc = type === 'ldc'

  const [form, setForm] = useState({
    title: '',
    description: '',
    proposed_date: '',
    close_date: '',      // LDC seulement
    signup_open_date: '', // LDC seulement
    min_players: type === 'gdc' ? 5 : 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Preview des dates calculées
  const preview = calcDates(type, { proposed_date: form.proposed_date, close_date: form.close_date })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title || !form.proposed_date) return
    if (isLdc && (!form.close_date || !form.signup_open_date)) return
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/war-events', { ...form, type })
      onCreated()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#dc2626]/50'
  const labelCls = 'text-[10px] uppercase tracking-widest text-gray-500 block mb-1.5'

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#111111] border border-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">
            Créer — {typeLabels[type]}
          </h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Titre */}
          <div>
            <label className={labelCls}>Titre *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputCls}
              placeholder={isLdc ? 'Ex: LDC Avril 2026' : 'Ex: GDC du 15 avril'}
            />
          </div>

          {/* Champs dates selon le type */}
          {!isLdc ? (
            /* GDC / GDC Sélection : un seul champ */
            <div>
              <label className={labelCls}>Date de lancement *</label>
              <input
                type="date"
                required
                value={form.proposed_date}
                onChange={e => setForm(f => ({ ...f, proposed_date: e.target.value }))}
                className={inputCls}
              />
            </div>
          ) : (
            /* LDC : trois champs */
            <>
              <div>
                <label className={labelCls}>Ouverture des inscriptions *</label>
                <input
                  type="date"
                  required
                  value={form.signup_open_date}
                  onChange={e => setForm(f => ({ ...f, signup_open_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Clôture des inscriptions *</label>
                <input
                  type="date"
                  required
                  value={form.close_date}
                  onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Lancement de la LDC *</label>
                <input
                  type="date"
                  required
                  value={form.proposed_date}
                  onChange={e => setForm(f => ({ ...f, proposed_date: e.target.value }))}
                  className={inputCls}
                />
              </div>
            </>
          )}

          {/* Preview dates calculées */}
          {(preview.close_date || preview.auto_delete_date) && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 space-y-1">
              {!isLdc && preview.close_date && (
                <p className="text-xs text-gray-600">
                  📅 Clôture inscriptions : <span className="text-gray-400">{formatDate(preview.close_date)}</span>
                </p>
              )}
              {preview.auto_delete_date && (
                <p className="text-xs text-gray-600">
                  🗑️ Suppression auto : <span className="text-gray-400">{formatDate(preview.auto_delete_date)}</span>
                </p>
              )}
            </div>
          )}

          {/* Joueurs minimum (GDC seulement) */}
          {type === 'gdc' && (
            <div>
              <label className={labelCls}>Joueurs minimum</label>
              <input
                type="number"
                min="1"
                value={form.min_players}
                onChange={e => setForm(f => ({ ...f, min_players: parseInt(e.target.value) || 5 }))}
                className={inputCls}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <label className={labelCls}>Description (optionnel)</label>
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#dc2626]/50 resize-none"
              placeholder="Informations complémentaires..."
            />
          </div>

          {error && <p className="text-xs text-[#dc2626]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:border-[#555] hover:text-white transition-all"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 transition-all shadow-lg shadow-[#dc2626]/20"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── LdcWarriorsTable ─────────────────────────────────────────────────────────

function LdcWarriorsTable({ warriors, onRemove, canManage, ldcEventId, onAdd }) {
  if (!warriors || (warriors.length === 0 && !canManage)) return null

  return (
    <div className="mt-8 bg-gradient-to-br from-[#111111] to-[#0d0d0d] border border-[#f59e0b]/30 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[#f59e0b]/20 bg-gradient-to-r from-[#78350f]/20 to-transparent">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#f59e0b] uppercase tracking-widest">
              👑 Guerriers Sélectionnés — LDC
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Top 5 sélectionnés pour la Ligue de Guerre
            </p>
          </div>
          <span className="text-xs bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] px-3 py-1 rounded-full uppercase tracking-wide">
            LDC en cours
          </span>
        </div>
      </div>

      <div className="p-4 space-y-2">
        {warriors.map((w, i) => (
          <div key={w.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl bg-[#0a0a0a] border transition-colors ${
            w.auto_selected ? 'border-[#f59e0b]/20 hover:border-[#f59e0b]/40' : 'border-[#dc2626]/20 hover:border-[#dc2626]/40'
          }`}>
            <span className="text-lg font-black text-[#f59e0b] w-8">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border"
                 style={{
                   background: w.auto_selected ? 'rgba(245,158,11,0.2)' : 'rgba(220,38,38,0.2)',
                   borderColor: w.auto_selected ? 'rgba(245,158,11,0.3)' : 'rgba(220,38,38,0.3)',
                   color: w.auto_selected ? '#f59e0b' : '#dc2626'
                 }}>
              {w.coc_name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{w.coc_name}</p>
              <p className="text-xs text-gray-600">{w.coc_tag}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wide ${
              w.auto_selected
                ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]'
                : 'bg-[#dc2626]/10 border-[#dc2626]/30 text-[#dc2626]'
            }`}>
              {w.auto_selected ? 'Auto' : 'Manuel'}
            </span>
            <span className="text-xs text-gray-500">{formatCocRole(w.coc_role)}</span>
            {canManage && (
              <button onClick={() => onRemove(w.id)} className="text-xs text-gray-700 hover:text-red-400 transition-colors ml-2">
                ✕
              </button>
            )}
          </div>
        ))}

        {canManage && warriors.length < 5 && ldcEventId && (
          <AddWarriorModal ldcEventId={ldcEventId} onAdded={onAdd} />
        )}

        {warriors.length === 0 && (
          <p className="text-xs text-gray-700 text-center py-3">Aucun guerrier sélectionné</p>
        )}
      </div>
    </div>
  )
}

function AddWarriorModal({ ldcEventId, onAdded }) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    api.get('/api/coc/clan/members').then(r => {
      const items = r.data?.items || r.data || []
      setMembers(items)
      if (items.length > 0) setSelectedTag(items[0].tag)
    }).catch(() => {})
  }, [open])

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-xl text-sm font-semibold uppercase border border-dashed border-[#dc2626]/30 text-[#dc2626]/50 hover:border-[#dc2626]/60 hover:text-[#dc2626] transition-all duration-200"
      >
        + Ajouter manuellement
      </button>
    )
  }

  const handleAdd = async () => {
    const member = members.find(m => m.tag === selectedTag)
    if (!member) return
    setLoading(true)
    try {
      await api.post('/api/war-events/ldc-warriors', {
        ldc_event_id: ldcEventId,
        coc_name: member.name,
        coc_tag: member.tag,
      })
      setOpen(false)
      onAdded()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2 items-center">
      <select
        value={selectedTag}
        onChange={e => setSelectedTag(e.target.value)}
        className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#dc2626]/50"
      >
        {members.map(m => (
          <option key={m.tag} value={m.tag}>
            {m.name} — {formatCocRole(m.role)}
          </option>
        ))}
      </select>
      <button
        onClick={handleAdd}
        disabled={loading || !selectedTag}
        className="px-3 py-2 rounded-lg text-xs font-bold bg-[#dc2626]/20 border border-[#dc2626]/40 text-[#dc2626] hover:bg-[#dc2626]/30 transition-colors disabled:opacity-50"
      >
        OK
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
        ✕
      </button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Inscriptions({ embedded = false }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [signups, setSignups] = useState({})          // eventId → [signups]
  const [warriors, setWarriors] = useState([])
  const [ldcEventId, setLdcEventId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(null) // type string ou null
  const [userSignedUpEventIds, setUserSignedUpEventIds] = useState(new Set())

  const canManage = user && (
    ['superadmin', 'admin'].includes(user.site_role) ||
    ['leader', 'coLeader'].includes(user.coc_role)
  )

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const { data: evData } = await api.get('/api/war-events')
      setEvents(evData || [])

      // Fetch signups pour chaque événement
      const signupMap = {}
      await Promise.all(
        (evData || []).map(async (ev) => {
          const { data: sData } = await api.get(`/api/war-events/${ev.id}/signups`)
          signupMap[ev.id] = sData || []
        })
      )
      setSignups(signupMap)

      // Identifier les événements où l'utilisateur est inscrit
      if (user) {
        const signedIds = new Set()
        for (const [evId, sups] of Object.entries(signupMap)) {
          if (sups.some(s => s.user_id === user.id)) signedIds.add(evId)
        }
        setUserSignedUpEventIds(signedIds)
      }

      // LDC warriors
      const ldcEv = (evData || []).find(e => e.type === 'ldc')
      if (ldcEv) {
        setLdcEventId(ldcEv.id)
        const { data: wData } = await api.get('/api/war-events/ldc-warriors/active')
        setWarriors(wData || [])
      } else {
        setLdcEventId(null)
        setWarriors([])
      }
    } catch (err) {
      console.error('Erreur chargement inscriptions:', err.message)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleSignup = async (eventId) => {
    try {
      await api.post(`/api/war-events/${eventId}/signup`)
      await fetchAll()
    } catch (err) {
      console.error(err.response?.data?.error || err.message)
    }
  }

  const handleValidate = async (eventId) => {
    if (!window.confirm('Valider cet événement ?')) return
    await api.post(`/api/war-events/${eventId}/validate`)
    await fetchAll()
  }

  const handleClose = async (eventId) => {
    if (!window.confirm('Clôturer cet événement ?')) return
    await api.post(`/api/war-events/${eventId}/close`)
    await fetchAll()
  }

  const handleRemoveWarrior = async (warriorId) => {
    if (!window.confirm('Retirer ce guerrier ?')) return
    await api.delete(`/api/war-events/ldc-warriors/${warriorId}`)
    await fetchAll()
  }

  return (
    <div className={embedded ? '' : 'min-h-screen'} style={embedded ? {} : { background: '#0d0d0d' }}>
      {/* Header — masqué en mode intégré */}
      {!embedded && (
        <div className="relative py-16 px-6 text-center overflow-hidden border-b border-[#1a1a1a]">
          <div className="absolute inset-0 bg-gradient-to-b from-[#dc2626]/5 to-transparent pointer-events-none" />
          <div className="relative z-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#dc2626] mb-3">Donjon Rouge</p>
            <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-widest mb-3">
              INSCRIPTIONS OFFICIELLES
            </h1>
            <p className="text-sm text-gray-500 max-w-sm mx-auto leading-relaxed">
              Chaque joueur est acteur de ses actes.<br />
              Une inscription est un engagement.
            </p>
          </div>
        </div>
      )}

      <div className={embedded ? 'py-4' : 'max-w-4xl mx-auto px-4 py-8'}>

        {/* Boutons créer un événement */}
        {user && (
          <div className="flex gap-3 flex-wrap mb-8">
            <button
              onClick={() => setCreateModal('gdc')}
              className="px-4 py-2 rounded-xl text-sm font-semibold uppercase bg-[#1a1a1a] border border-[#333] text-gray-300 hover:border-[#dc2626] hover:text-white transition-all"
            >
              + Proposer une GDC
            </button>
            {['superadmin', 'admin'].includes(user.site_role) && (
              <>
                <button
                  onClick={() => setCreateModal('gdc_selection')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold uppercase bg-[#7f1d1d]/20 border border-[#dc2626]/40 text-[#ef4444] hover:bg-[#7f1d1d]/40 transition-all"
                >
                  + GDC Sélection
                </button>
                <button
                  onClick={() => setCreateModal('ldc')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold uppercase bg-[#78350f]/20 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#78350f]/40 transition-all"
                >
                  + Lancer LDC
                </button>
              </>
            )}
          </div>
        )}

        {/* Événements ouverts */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 border border-[#1a1a1a] rounded-2xl">
            <p className="text-gray-600 uppercase tracking-widest text-sm">Aucun événement ouvert</p>
            {user && (
              <p className="text-xs text-gray-700 mt-2">Sois le premier à proposer une GDC ↑</p>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {events.map(ev => (
              <EventCard
                key={ev.id}
                event={ev}
                signups={signups}
                userSignedUpEventIds={userSignedUpEventIds}
                onSignup={handleSignup}
                onValidate={handleValidate}
                onClose={handleClose}
              />
            ))}
          </div>
        )}

        {/* Tableau guerriers LDC */}
        {(ldcEventId || warriors.length > 0) && (
          <LdcWarriorsTable
            warriors={warriors}
            canManage={canManage}
            ldcEventId={ldcEventId}
            onRemove={handleRemoveWarrior}
            onAdd={fetchAll}
          />
        )}
      </div>

      {/* Modal création événement */}
      {createModal && (
        <CreateEventModal
          type={createModal}
          onClose={() => setCreateModal(null)}
          onCreated={fetchAll}
        />
      )}
    </div>
  )
}
