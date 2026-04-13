import { useState, useEffect, useCallback } from 'react'
import api from '../lib/api.js'
import { useAuth } from '../hooks/useAuth.jsx'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function formatDateTime(d) {
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

function getCurrentTier(count) {
  const tiers = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
  const reached = tiers.filter(t => count >= t)
  return reached.length > 0 ? Math.max(...reached) : 0
}

function getNextTier(count) {
  const tiers = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
  return tiers.find(t => t > count) || 50
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-[#111111] border border-[#dc2626]/50 rounded-2xl shadow-2xl shadow-[#dc2626]/20 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center pt-8 pb-2">
          <div className="w-16 h-16 rounded-full bg-[#dc2626]/10 border-2 border-[#dc2626]/40 flex items-center justify-center text-3xl">⚔️</div>
        </div>
        <div className="px-6 pb-2 text-center">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Inscription Officielle</h3>
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
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:border-[#555] hover:text-white transition-all duration-150">Annuler</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-all duration-200 shadow-lg shadow-[#dc2626]/20">Je confirme</button>
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
  if (isSignedUp) return (
    <span className="px-4 py-2 rounded-xl text-sm font-semibold bg-green-500/10 border border-green-500/30 text-green-400">✓ Inscrit</span>
  )
  if (event.status !== 'open') return null

  const handleClick = () => needsWarning ? setShowWarning(true) : confirmSignup()
  const confirmSignup = async () => {
    setLoading(true)
    await onSignup(event.id)
    setShowWarning(false)
    setLoading(false)
  }

  return (
    <>
      <button onClick={handleClick} disabled={loading}
        className="px-5 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#dc2626]/20">
        {loading ? 'Inscription...' : "S'inscrire"}
      </button>
      {showWarning && <WarningModal type={event.type} onConfirm={confirmSignup} onCancel={() => setShowWarning(false)} />}
    </>
  )
}

// ─── SignupsList ──────────────────────────────────────────────────────────────

function SignupsList({ signups, canManage, eventId, onRemove }) {
  const [confirmRemove, setConfirmRemove] = useState(null) // { id, name, userId }

  if (!signups || signups.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Joueurs inscrits</p>
        <p className="text-xs text-gray-700 py-2">Aucune inscription pour le moment</p>
      </div>
    )
  }

  const currentTier = getCurrentTier(signups.length)

  return (
    <div className="mt-2">
      <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2">Joueurs inscrits</p>
      <div className="space-y-1 max-h-52 overflow-y-auto">
        {signups.map((s, i) => {
          const isInTier = i < currentTier
          return (
            <div key={s.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all duration-300 ${
              isInTier ? 'bg-green-500/5 border-green-500/20' : 'bg-[#0a0a0a] border-[#1a1a1a]'
            }`}>
              <span className={`text-xs font-bold w-5 text-center ${isInTier ? 'text-green-400' : 'text-[#dc2626]'}`}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                isInTier ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-[#dc2626]/20 border-[#dc2626]/30 text-[#dc2626]'
              }`}>
                {s.coc_name?.charAt(0).toUpperCase()}
              </div>
              <span className={`text-sm font-medium flex-1 ${isInTier ? 'text-green-300' : 'text-gray-200'}`}>
                {s.coc_name}
              </span>
              {isInTier ? (
                <span className="text-[10px] bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded-full uppercase">✓ Confirmé</span>
              ) : (
                <span className="text-[10px] bg-[#1a1a1a] border border-[#2a2a2a] text-gray-600 px-2 py-0.5 rounded-full uppercase">En attente</span>
              )}
              <span className="text-[10px] text-gray-600">{formatCocRole(s.coc_role)}</span>
              <span className="text-[10px] text-gray-700">{formatDateTime(s.signed_up_at)}</span>
              {canManage && (
                <button onClick={() => setConfirmRemove({ id: s.id, name: s.coc_name, userId: s.user_id })}
                  className="ml-1 text-[11px] text-gray-700 hover:text-red-400 transition-colors leading-none">
                  ✕
                </button>
              )}
            </div>
          )
        })}
        {signups.length > currentTier && currentTier > 0 && (
          <div className="flex items-center gap-2 py-1">
            <div className="flex-1 h-px bg-[#1a1a1a]" />
            <span className="text-[10px] text-gray-700 uppercase tracking-wide">En attente du prochain palier</span>
            <div className="flex-1 h-px bg-[#1a1a1a]" />
          </div>
        )}
      </div>

      {confirmRemove && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setConfirmRemove(null)}>
          <div className="bg-[#111111] border border-[#dc2626]/50 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold text-center mb-2">Retirer un joueur</p>
            <p className="text-sm text-gray-400 text-center mb-6">
              Retirer <span className="text-white font-semibold">{confirmRemove.name}</span> de cet événement ?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:text-white transition-all">
                Annuler
              </button>
              <button onClick={() => { onRemove(eventId, confirmRemove.userId); setConfirmRemove(null) }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-all">
                Retirer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AdminActions ─────────────────────────────────────────────────────────────

function AdminActions({ event, onValidate, onClose, onEdit, onAddSignup }) {
  const { user } = useAuth()
  const canManage = ['superadmin', 'admin'].includes(user?.site_role) ||
    ['leader', 'coLeader'].includes(user?.coc_role)
  const canEdit = event.created_by === user?.id ||
    ['superadmin', 'admin'].includes(user?.site_role) ||
    ['leader', 'coLeader'].includes(user?.coc_role)

  if (!canManage && !canEdit) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#1a1a1a] flex gap-2 flex-wrap">
      {canManage && event.status === 'open' && event.signup_count >= (event.min_players || 0) && event.min_players > 0 && (
        <button onClick={() => onValidate(event.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-green-900/30 border border-green-700/50 text-green-400 hover:bg-green-900/50 transition-colors">
          ✓ Valider la guerre
        </button>
      )}
      {canManage && event.status !== 'closed' && (
        <button onClick={() => onClose(event.id)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-[#1a1a1a] border border-[#333] text-gray-400 hover:border-[#dc2626] hover:text-white transition-colors">
          Clôturer
        </button>
      )}
      {canEdit && event.status !== 'closed' && (
        <button onClick={() => onEdit(event)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-[#1a1a1a] border border-[#333] text-gray-400 hover:border-[#f59e0b]/50 hover:text-[#f59e0b] transition-colors">
          ✏️ Modifier
        </button>
      )}
      {canManage && (
        <button onClick={() => onAddSignup(event)}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-[#1a1a1a] border border-[#333] text-gray-400 hover:border-[#6366f1]/50 hover:text-[#818cf8] transition-colors">
          ➕ Inscrire un joueur
        </button>
      )}
    </div>
  )
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ event, signups, userSignedUpEventIds, onSignup, onValidate, onClose, onEdit, onAddSignup, onRemoveSignup, canManage }) {
  const isSignedUp = userSignedUpEventIds.has(event.id)
  const borderClass =
    event.type === 'ldc' ? 'border-[#f59e0b]/40' :
    event.type === 'gdc_selection' ? 'border-[#dc2626]/40' :
    'border-[#1f1f1f]'

  const signupCount = event.signup_count || 0
  const currentTier = getCurrentTier(signupCount)
  const nextTier = getNextTier(signupCount)
  const progress = signupCount >= 50 ? 100 : ((signupCount % 5) / 5) * 100

  return (
    <div className={`relative rounded-2xl border overflow-hidden bg-gradient-to-br from-[#111111] to-[#0d0d0d] transition-all duration-300 hover:shadow-lg hover:shadow-[#dc2626]/10 ${borderClass}`}>
      <div className="absolute top-4 left-4"><TypeBadge type={event.type} /></div>
      <div className="absolute top-4 right-4"><StatusBadge status={event.status} /></div>

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

        {/* Compteur + paliers */}
        <div className="mb-4">
          <div className="flex items-end gap-2 mb-2">
            <span className="text-3xl font-black text-white">{signupCount}</span>
            <span className="text-sm text-gray-500 mb-1">inscrits</span>
            {currentTier > 0 && (
              <span className="ml-2 text-xs bg-green-500/10 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-full uppercase tracking-wide mb-1">
                ✓ Palier {currentTier} atteint
              </span>
            )}
            <div className="ml-auto">
              <SignupButton event={event} isSignedUp={isSignedUp} onSignup={onSignup} />
            </div>
          </div>

          <div className="relative">
            <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#dc2626] to-[#f59e0b] rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-gray-700">
                {currentTier > 0 ? `Palier ${currentTier}` : 'Début'}
              </span>
              <span className="text-[10px] text-gray-600">
                {signupCount < 50 ? `${nextTier - signupCount} avant palier ${nextTier}` : 'Palier max atteint'}
              </span>
            </div>
          </div>
        </div>

        <SignupsList signups={signups[event.id] || []} canManage={canManage} eventId={event.id} onRemove={onRemoveSignup} />
        <AdminActions event={event} onValidate={onValidate} onClose={onClose} onEdit={onEdit} onAddSignup={onAddSignup} />

        <div className="mt-3 pt-3 border-t border-[#1a1a1a] grid grid-cols-2 gap-2 text-[10px] text-gray-700">
          <span>📅 Clôture inscriptions : <span className="text-gray-500 ml-1">{formatDate(event.close_date)}</span></span>
          <span>🗑️ Suppression auto : <span className="text-gray-500 ml-1">{formatDate(event.auto_delete_date)}</span></span>
        </div>
      </div>
    </div>
  )
}

// ─── AddSignupModal ───────────────────────────────────────────────────────────

function AddSignupModal({ event, currentSignups, onClose, onAdded }) {
  const [members, setMembers] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    api.get('/api/coc/clan/members').then(r => {
      const items = r.data?.items || r.data || []
      const signedTags = new Set((currentSignups || []).map(s => s.coc_tag))
      const filtered = items.filter(m => !signedTags.has(m.tag))
      setMembers(filtered)
      if (filtered.length > 0) setSelectedTag(filtered[0].tag)
    }).catch(() => {})
  }, [currentSignups])

  const handleConfirm = async () => {
    if (!selectedTag) return
    setLoading(true)
    setError(null)
    try {
      await api.post(`/api/war-events/${event.id}/signup-admin`, { coc_tag: selectedTag })
      onAdded()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#6366f1]/40 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <p className="text-white font-bold text-center mb-1">Inscrire un joueur</p>
        <p className="text-xs text-gray-500 text-center mb-5 uppercase tracking-wide">{event.title}</p>

        {members.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">Tous les membres sont déjà inscrits</p>
        ) : (
          <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)}
            className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#6366f1]/50 mb-4">
            {members.map(m => (
              <option key={m.tag} value={m.tag}>{m.name} — {formatCocRole(m.role)}</option>
            ))}
          </select>
        )}

        {error && <p className="text-xs text-[#dc2626] mb-3 text-center">{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:text-white transition-all">
            Annuler
          </button>
          <button onClick={handleConfirm} disabled={loading || members.length === 0}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#6366f1] hover:bg-[#4f46e5] text-white disabled:opacity-50 transition-all">
            {loading ? 'Inscription...' : 'Inscrire'}
          </button>
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
    close_date: '',
    signup_open_date: '',
    min_players: type === 'gdc' ? 5 : 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">Créer — {typeLabels[type]}</h3>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Titre *</label>
            <input type="text" required value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputCls} placeholder={isLdc ? 'Ex: LDC Avril 2026' : 'Ex: GDC du 15 avril'} />
          </div>

          {!isLdc ? (
            <div>
              <label className={labelCls}>Date de lancement *</label>
              <input type="date" required value={form.proposed_date}
                onChange={e => setForm(f => ({ ...f, proposed_date: e.target.value }))}
                className={inputCls} />
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>Ouverture des inscriptions *</label>
                <input type="date" required value={form.signup_open_date}
                  onChange={e => setForm(f => ({ ...f, signup_open_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Clôture des inscriptions *</label>
                <input type="date" required value={form.close_date}
                  onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Lancement de la LDC *</label>
                <input type="date" required value={form.proposed_date}
                  onChange={e => setForm(f => ({ ...f, proposed_date: e.target.value }))}
                  className={inputCls} />
              </div>
            </>
          )}

          {(preview.close_date || preview.auto_delete_date) && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 space-y-1">
              {!isLdc && preview.close_date && (
                <p className="text-xs text-gray-600">📅 Clôture inscriptions : <span className="text-gray-400">{formatDate(preview.close_date)}</span></p>
              )}
              {preview.auto_delete_date && (
                <p className="text-xs text-gray-600">🗑️ Suppression auto : <span className="text-gray-400">{formatDate(preview.auto_delete_date)}</span></p>
              )}
            </div>
          )}

          {type === 'gdc' && (
            <div>
              <label className={labelCls}>Joueurs minimum</label>
              <input type="number" min="1" value={form.min_players}
                onChange={e => setForm(f => ({ ...f, min_players: parseInt(e.target.value) || 5 }))}
                className={inputCls} />
            </div>
          )}

          <div>
            <label className={labelCls}>Description (optionnel)</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#dc2626]/50 resize-none"
              placeholder="Informations complémentaires..." />
          </div>

          {error && <p className="text-xs text-[#dc2626]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:border-[#555] hover:text-white transition-all">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 transition-all shadow-lg shadow-[#dc2626]/20">
              {loading ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── EditEventModal ───────────────────────────────────────────────────────────

function EditEventModal({ event, onClose, onSaved }) {
  const isLdc = event.type === 'ldc'
  const [form, setForm] = useState({
    title: event.title || '',
    description: event.description || '',
    proposed_date: event.proposed_date || '',
    close_date: event.close_date || '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const preview = calcDates(event.type, { proposed_date: form.proposed_date, close_date: form.close_date })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.put(`/api/war-events/${event.id}`, form)
      onSaved()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message)
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#f59e0b]/50'
  const labelCls = 'text-[10px] uppercase tracking-widest text-gray-500 block mb-1.5'

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#111111] border border-[#f59e0b]/30 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-[#1a1a1a]">
          <h3 className="text-lg font-bold text-white uppercase tracking-wide">✏️ Modifier l'événement</h3>
          <p className="text-xs text-gray-600 mt-1">Les inscriptions existantes ne seront pas affectées.</p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Titre</label>
            <input type="text" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className={inputCls} />
          </div>

          {!isLdc ? (
            <div>
              <label className={labelCls}>Date de lancement</label>
              <input type="date" value={form.proposed_date}
                onChange={e => setForm(f => ({ ...f, proposed_date: e.target.value }))}
                className={inputCls} />
            </div>
          ) : (
            <>
              <div>
                <label className={labelCls}>Clôture des inscriptions</label>
                <input type="date" value={form.close_date}
                  onChange={e => setForm(f => ({ ...f, close_date: e.target.value }))}
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Lancement de la LDC</label>
                <input type="date" value={form.proposed_date}
                  onChange={e => setForm(f => ({ ...f, proposed_date: e.target.value }))}
                  className={inputCls} />
              </div>
            </>
          )}

          {(preview.close_date || preview.auto_delete_date) && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-3 space-y-1">
              {!isLdc && preview.close_date && (
                <p className="text-xs text-gray-600">📅 Nouvelle clôture : <span className="text-[#f59e0b]">{formatDate(preview.close_date)}</span></p>
              )}
              {preview.auto_delete_date && (
                <p className="text-xs text-gray-600">🗑️ Nouvelle suppression : <span className="text-[#f59e0b]">{formatDate(preview.auto_delete_date)}</span></p>
              )}
            </div>
          )}

          <div>
            <label className={labelCls}>Description (optionnel)</label>
            <textarea value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3} className="w-full bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-700 focus:outline-none focus:border-[#f59e0b]/50 resize-none" />
          </div>

          {error && <p className="text-xs text-[#dc2626]">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:border-[#555] hover:text-white transition-all">
              Annuler
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide bg-[#f59e0b] hover:bg-[#d97706] text-black disabled:opacity-50 transition-all">
              {loading ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── LdcBoard (tableau permanent) ────────────────────────────────────────────

function LdcBoard({ canManage }) {
  const [board, setBoard] = useState({ title: 'Guerriers Sélectionnés — LDC' })
  const [warriors, setWarriors] = useState([])
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [boardTitle, setBoardTitle] = useState('')
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showAdd, setShowAdd] = useState(false)

  const fetchBoard = useCallback(async () => {
    try {
      const { data } = await api.get('/api/ldc-board')
      setBoard(data.board)
      setBoardTitle(data.board.title)
      setWarriors(data.warriors || [])
    } catch (err) {
      console.error('LdcBoard fetch:', err.message)
    }
  }, [])

  useEffect(() => { fetchBoard() }, [fetchBoard])

  const saveTitle = async () => {
    setIsEditingTitle(false)
    if (boardTitle === board.title) return
    try {
      await api.put('/api/ldc-board/title', { title: boardTitle })
      setBoard(b => ({ ...b, title: boardTitle }))
    } catch (err) { console.error(err) }
  }

  const handleClear = async () => {
    await api.delete('/api/ldc-board/clear')
    setShowClearConfirm(false)
    fetchBoard()
  }

  const removeWarrior = async (id) => {
    await api.delete(`/api/ldc-board/warriors/${id}`)
    fetchBoard()
  }

  return (
    <div className="mt-10 bg-gradient-to-br from-[#111111] to-[#0d0d0d] border border-[#f59e0b]/30 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#f59e0b]/20 bg-gradient-to-r from-[#78350f]/20 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <span className="text-xl">👑</span>
          {isEditingTitle ? (
            <input
              value={boardTitle}
              onChange={e => setBoardTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => e.key === 'Enter' && saveTitle()}
              autoFocus
              className="bg-transparent border-b border-[#f59e0b]/50 text-[#f59e0b] font-bold text-sm uppercase tracking-widest outline-none flex-1 max-w-xs"
            />
          ) : (
            <h3 className="text-sm font-bold text-[#f59e0b] uppercase tracking-widest">{board.title}</h3>
          )}
          {canManage && !isEditingTitle && (
            <button onClick={() => setIsEditingTitle(true)} className="text-gray-700 hover:text-[#f59e0b] transition-colors text-xs">✏️</button>
          )}
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] hover:bg-[#f59e0b]/20 transition-colors">
              + Ajouter
            </button>
            <button onClick={() => setShowClearConfirm(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase bg-[#7f1d1d]/20 border border-[#dc2626]/30 text-[#dc2626] hover:bg-[#7f1d1d]/40 transition-colors">
              Vider
            </button>
          </div>
        )}
      </div>

      {/* Liste */}
      <div className="p-4 space-y-2">
        {warriors.length === 0 ? (
          <p className="text-center text-gray-700 text-sm py-6">Aucun guerrier sélectionné pour le moment</p>
        ) : (
          warriors.map((w, i) => (
            <div key={w.id} className={`flex items-center gap-4 px-4 py-3 rounded-xl bg-[#0a0a0a] border transition-colors ${
              w.auto_selected ? 'border-[#f59e0b]/20' : 'border-[#dc2626]/20'
            }`}>
              <span className="text-lg font-black text-[#f59e0b] w-8">{String(i + 1).padStart(2, '0')}</span>
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
                w.auto_selected ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#f59e0b]' : 'bg-[#dc2626]/10 border-[#dc2626]/30 text-[#dc2626]'
              }`}>
                {w.auto_selected ? 'Auto' : 'Manuel'}
              </span>
              <span className="text-xs text-gray-500">{formatCocRole(w.coc_role)}</span>
              {canManage && (
                <button onClick={() => removeWarrior(w.id)} className="text-xs text-gray-700 hover:text-red-400 transition-colors">✕</button>
              )}
            </div>
          ))
        )}

        {canManage && warriors.length < 5 && !showAdd && (
          <button onClick={() => setShowAdd(true)}
            className="w-full py-2.5 rounded-xl text-sm font-semibold uppercase border border-dashed border-[#f59e0b]/30 text-[#f59e0b]/50 hover:border-[#f59e0b]/60 hover:text-[#f59e0b] transition-all duration-200">
            + Ajouter un guerrier
          </button>
        )}

        {showAdd && <AddToBoardRow onAdded={fetchBoard} onClose={() => setShowAdd(false)} />}
      </div>

      {/* Modal confirmation CLEAR */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={() => setShowClearConfirm(false)}>
          <div className="bg-[#111111] border border-[#dc2626]/50 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <p className="text-white font-bold text-center mb-2">⚠️ Vider le tableau</p>
            <p className="text-sm text-gray-400 text-center mb-6">
              Vider le tableau supprimera tous les guerriers sélectionnés. Cette action est irréversible.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold uppercase border border-[#333] text-gray-400 hover:text-white transition-all">
                Annuler
              </button>
              <button onClick={handleClear}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold uppercase bg-[#dc2626] hover:bg-[#b91c1c] text-white transition-all">
                Vider le tableau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddToBoardRow({ onAdded, onClose }) {
  const [members, setMembers] = useState([])
  const [selectedTag, setSelectedTag] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    api.get('/api/coc/clan/members').then(r => {
      const items = r.data?.items || r.data || []
      setMembers(items)
      if (items.length > 0) setSelectedTag(items[0].tag)
    }).catch(() => {})
  }, [])

  const handleAdd = async () => {
    const member = members.find(m => m.tag === selectedTag)
    if (!member) return
    setLoading(true)
    try {
      await api.post('/api/ldc-board/warriors', {
        coc_name: member.name,
        coc_tag: member.tag,
        coc_role: member.role,
        auto_selected: false,
        score: 0,
      })
      onClose()
      onAdded()
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  return (
    <div className="flex gap-2 items-center">
      <select value={selectedTag} onChange={e => setSelectedTag(e.target.value)}
        className="flex-1 bg-[#0d0d0d] border border-[#2a2a2a] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#f59e0b]/50">
        {members.map(m => (
          <option key={m.tag} value={m.tag}>{m.name} — {formatCocRole(m.role)}</option>
        ))}
      </select>
      <button onClick={handleAdd} disabled={loading || !selectedTag}
        className="px-3 py-2 rounded-lg text-xs font-bold bg-[#f59e0b]/20 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/30 transition-colors disabled:opacity-50">
        OK
      </button>
      <button onClick={onClose} className="text-xs text-gray-600 hover:text-gray-400 transition-colors">✕</button>
    </div>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export default function Inscriptions({ embedded = false }) {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [signups, setSignups] = useState({})
  const [loading, setLoading] = useState(true)
  const [createModal, setCreateModal] = useState(null)
  const [editModal, setEditModal] = useState(null)
  const [addSignupModal, setAddSignupModal] = useState(null) // event object
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

      const signupMap = {}
      await Promise.all(
        (evData || []).map(async (ev) => {
          const { data: sData } = await api.get(`/api/war-events/${ev.id}/signups`)
          signupMap[ev.id] = sData || []
        })
      )
      setSignups(signupMap)

      if (user) {
        const signedIds = new Set()
        for (const [evId, sups] of Object.entries(signupMap)) {
          if (sups.some(s => s.user_id === user.id)) signedIds.add(evId)
        }
        setUserSignedUpEventIds(signedIds)
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

  const handleRemoveSignup = async (eventId, userId) => {
    try {
      await api.delete(`/api/war-events/${eventId}/signup/${userId}`)
      await fetchAll()
    } catch (err) {
      console.error(err.response?.data?.error || err.message)
    }
  }

  return (
    <div className={embedded ? '' : 'min-h-screen'} style={embedded ? {} : { background: '#0d0d0d' }}>
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

        {/* Boutons créer */}
        {user && (
          <div className="flex gap-3 flex-wrap mb-8">
            <button onClick={() => setCreateModal('gdc')}
              className="px-4 py-2 rounded-xl text-sm font-semibold uppercase bg-[#1a1a1a] border border-[#333] text-gray-300 hover:border-[#dc2626] hover:text-white transition-all">
              + Proposer une GDC
            </button>
            {['superadmin', 'admin'].includes(user.site_role) && (
              <>
                <button onClick={() => setCreateModal('gdc_selection')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold uppercase bg-[#7f1d1d]/20 border border-[#dc2626]/40 text-[#ef4444] hover:bg-[#7f1d1d]/40 transition-all">
                  + GDC Sélection
                </button>
                <button onClick={() => setCreateModal('ldc')}
                  className="px-4 py-2 rounded-xl text-sm font-semibold uppercase bg-[#78350f]/20 border border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#78350f]/40 transition-all">
                  + Lancer LDC
                </button>
              </>
            )}
          </div>
        )}

        {/* Événements */}
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-[#dc2626] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-16 border border-[#1a1a1a] rounded-2xl">
            <p className="text-gray-600 uppercase tracking-widest text-sm">Aucun événement ouvert</p>
            {user && <p className="text-xs text-gray-700 mt-2">Sois le premier à proposer une GDC ↑</p>}
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
                onEdit={setEditModal}
                onAddSignup={setAddSignupModal}
                onRemoveSignup={handleRemoveSignup}
                canManage={canManage}
              />
            ))}
          </div>
        )}

        {/* Tableau guerriers LDC permanent */}
        <LdcBoard canManage={canManage} />
      </div>

      {createModal && (
        <CreateEventModal type={createModal} onClose={() => setCreateModal(null)} onCreated={fetchAll} />
      )}
      {editModal && (
        <EditEventModal event={editModal} onClose={() => setEditModal(null)} onSaved={fetchAll} />
      )}
      {addSignupModal && (
        <AddSignupModal
          event={addSignupModal}
          currentSignups={signups[addSignupModal.id] || []}
          onClose={() => setAddSignupModal(null)}
          onAdded={fetchAll}
        />
      )}
    </div>
  )
}
