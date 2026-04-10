import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'
import SectionHeader from '../components/SectionHeader.jsx'

// ── Formatage de la dernière connexion ────────────────────────────────────────

function formatLastLogin(date) {
  if (!date) return 'Jamais connecté'
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "À l'instant"
  if (minutes < 60) return `Il y a ${minutes} min`
  if (hours < 24) return `Il y a ${hours}h`
  if (days < 7) return `Il y a ${days}j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Badges ────────────────────────────────────────────────────────────────────

function roleBadge(role) {
  if (role === 'superadmin')
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-red-900 text-red-400 border-red-600">superadmin</span>
  if (role === 'admin')
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-orange-900 text-orange-400 border-orange-600">admin</span>
  return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-gray-900 text-gray-400 border-gray-600">membre</span>
}

// ── Modal de confirmation ─────────────────────────────────────────────────────

function ConfirmModal({ isOpen, title, message, onConfirm, onCancel, confirmLabel, confirmClass }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-[#1f1f1f]">
          <h3 className="text-base font-bold text-white uppercase tracking-wide font-cinzel">{title}</h3>
        </div>
        <div className="px-6 py-4">
          <p className="text-sm text-gray-400">{message}</p>
        </div>
        <div className="px-6 py-4 border-t border-[#1f1f1f] flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-semibold uppercase tracking-wide bg-transparent border border-[#333] text-gray-400 hover:border-[#555] hover:text-white rounded-lg transition-all duration-150"
          >
            Annuler
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-lg transition-all duration-150 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tableau des membres ───────────────────────────────────────────────────────

function MembresTable({ users, currentUser, isSuperAdmin, onAction, loading }) {
  const [modal, setModal] = useState({
    isOpen: false, title: '', message: '',
    onConfirm: null, confirmLabel: '', confirmClass: '',
  })

  const closeModal = () => setModal(m => ({ ...m, isOpen: false }))

  function ask(title, message, onConfirm, confirmLabel, confirmClass) {
    setModal({ isOpen: true, title, message, onConfirm, confirmLabel, confirmClass })
  }

  function handleReset(userId, userName) {
    ask(
      'Réinitialiser le mot de passe',
      `Remettre le tag CoC comme mot de passe pour ${userName} ?`,
      () => { onAction('reset-password', userId); closeModal() },
      'Réinitialiser',
      'bg-[#1a1a1a] border border-[#dc2626] text-white hover:bg-[#2a1010]'
    )
  }

  function handlePromote(userId, userName) {
    ask(
      'Promouvoir administrateur',
      `Êtes-vous sûr de vouloir donner le rôle administrateur à ${userName} ?`,
      () => { onAction('promote', userId); closeModal() },
      'Promouvoir',
      'bg-green-700 hover:bg-green-600 text-white border border-green-600'
    )
  }

  function handleDemote(userId, userName) {
    ask(
      'Retirer le rôle admin',
      `Êtes-vous sûr de vouloir retirer le rôle admin à ${userName} ?`,
      () => { onAction('demote', userId); closeModal() },
      'Destituer',
      'bg-orange-800 hover:bg-orange-700 text-white border border-orange-600'
    )
  }

  function handleToggleDisable(userId, userName, isDisabled) {
    ask(
      isDisabled ? 'Réactiver le compte' : 'Désactiver le compte',
      isDisabled
        ? `Réactiver le compte de ${userName} ?`
        : `Désactiver le compte de ${userName} ? Il ne pourra plus se connecter.`,
      () => { onAction(isDisabled ? 'enable' : 'disable', userId); closeModal() },
      isDisabled ? 'Réactiver' : 'Désactiver',
      isDisabled
        ? 'bg-green-700 hover:bg-green-600 text-white border border-green-600'
        : 'bg-red-800 hover:bg-red-700 text-white border border-red-600'
    )
  }

  if (loading) return <p className="text-ash font-cinzel animate-pulse text-center py-10">Chargement...</p>

  return (
    <>
      <ConfirmModal
        isOpen={modal.isOpen}
        title={modal.title}
        message={modal.message}
        onConfirm={modal.onConfirm}
        onCancel={closeModal}
        confirmLabel={modal.confirmLabel}
        confirmClass={modal.confirmClass}
      />

      <div className="overflow-x-auto rounded-lg border border-fog/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-cinzel uppercase text-xs tracking-widest text-gold border-b border-fog/40"
              style={{ background: '#1a1a1a' }}>
              <th className="py-3 px-4 text-left">Joueur</th>
              <th className="py-3 px-4 text-center hidden md:table-cell">Rôle CoC</th>
              <th className="py-3 px-4 text-center">Rôle Site</th>
              <th className="py-3 px-4 text-center hidden md:table-cell">Mot de passe</th>
              <th className="py-3 px-4 text-center hidden lg:table-cell">Dernière connexion</th>
              <th className="py-3 px-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className="border-b border-fog/20"
                style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111', opacity: u.is_disabled ? 0.5 : 1 }}>

                {/* Joueur */}
                <td className="py-3 px-4">
                  <div className="font-semibold text-bone text-sm">{u.coc_name}</div>
                  <div className="text-xs text-ash/60">{u.coc_tag}</div>
                </td>

                {/* Rôle CoC */}
                <td className="py-3 px-4 text-center hidden md:table-cell">
                  <span className="text-xs text-ash">{u.coc_role || '—'}</span>
                </td>

                {/* Rôle Site */}
                <td className="py-3 px-4 text-center">{roleBadge(u.site_role || 'member')}</td>

                {/* Mot de passe */}
                <td className="py-3 px-4 text-center hidden md:table-cell">
                  {u.has_custom_password
                    ? <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-green-900/40 text-green-400 border-green-700">Personnalisé</span>
                    : <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-orange-900/40 text-orange-400 border-orange-700">Par défaut</span>
                  }
                </td>

                {/* Dernière connexion */}
                <td className="py-3 px-4 text-center text-xs text-ash hidden lg:table-cell">
                  {formatLastLogin(u.last_login)}
                </td>

                {/* Actions */}
                <td className="py-3 px-4">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap">

                    {/* Reset MDP — admin & superadmin, pas sur soi-même */}
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleReset(u.id, u.coc_name)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#1a1a1a] border border-[#333] text-gray-300 hover:border-[#dc2626] hover:text-white rounded-lg transition-all duration-150"
                      >
                        Reset MDP
                      </button>
                    )}

                    {/* Promouvoir — superadmin only, si member */}
                    {isSuperAdmin && (u.site_role === 'member' || !u.site_role) && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handlePromote(u.id, u.coc_name)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#1a3a1a] border border-[#2a5a2a] text-green-400 hover:bg-[#1f4a1f] hover:text-green-300 rounded-lg transition-all duration-150"
                      >
                        Promouvoir
                      </button>
                    )}

                    {/* Destituer — superadmin only, si admin */}
                    {isSuperAdmin && u.site_role === 'admin' && u.id !== currentUser?.id && (
                      <button
                        onClick={() => handleDemote(u.id, u.coc_name)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#2a1a1a] border border-[#4a2a2a] text-orange-400 hover:bg-[#3a1f1f] hover:text-orange-300 rounded-lg transition-all duration-150"
                      >
                        Destituer
                      </button>
                    )}

                    {/* Désactiver/Réactiver — superadmin only, pas sur superadmin */}
                    {isSuperAdmin && u.id !== currentUser?.id && u.site_role !== 'superadmin' && (
                      <button
                        onClick={() => handleToggleDisable(u.id, u.coc_name, u.is_disabled)}
                        className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide bg-[#1a0a0a] border border-[#5a1a1a] text-red-500 hover:bg-[#2a1010] hover:text-red-400 rounded-lg transition-all duration-150"
                      >
                        {u.is_disabled ? 'Réactiver' : 'Désactiver'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Page Admin ────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user, loading: authLoading, isAdmin, isSuperAdmin, userRole } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/')
  }, [user, authLoading])

  useEffect(() => {
    if (!isAdmin) return
    api.get('/api/admin/users')
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Erreur chargement'))
      .finally(() => setUsersLoading(false))
  }, [isAdmin])

  async function handleAction(action, userId) {
    setError('')
    setSuccess('')
    try {
      await api.post(`/api/admin/${action}`, { userId })
      const r = await api.get('/api/admin/users')
      setUsers(r.data)
      const labels = {
        'reset-password': 'Mot de passe réinitialisé',
        promote: 'Membre promu admin',
        demote: 'Admin destitué',
        disable: 'Compte désactivé',
        enable: 'Compte réactivé',
      }
      setSuccess(labels[action] || 'Action effectuée')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur')
    }
  }

  if (authLoading) return null
  if (!isAdmin) return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-up">
      {/* Header */}
      <div style={{ borderTop: '2px solid #dc2626' }} className="pt-6 mb-8">
        <SectionHeader title="Zone Administration" subtitle="Donjon Rouge · Panneau de contrôle" />
        <div className="flex items-center gap-3 mt-2">
          <span className="text-ash font-cinzel text-xs uppercase tracking-wider">Connecté en tant que :</span>
          <span className="text-bone font-cinzel text-sm font-bold">{user?.coc_name}</span>
          {roleBadge(userRole)}
        </div>
      </div>

      {error && <p className="text-red-400 font-cinzel text-sm mb-4">{error}</p>}
      {success && <p className="text-green-400 font-cinzel text-sm mb-4">✅ {success}</p>}

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Membres', value: users.length, icon: '👥' },
          { label: 'Admins', value: users.filter(u => u.site_role === 'admin' || u.site_role === 'superadmin').length, icon: '🛡️' },
          { label: 'MDP par défaut', value: users.filter(u => !u.has_custom_password).length, icon: '🔑' },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-4 flex flex-col items-center gap-1 border border-fog/30"
            style={{ background: '#111' }}>
            <span className="text-2xl">{s.icon}</span>
            <span className="text-xl font-bold font-cinzel text-gold-light">{s.value}</span>
            <span className="text-xs text-ash font-cinzel uppercase tracking-widest text-center">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tableau membres */}
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-cinzel text-gold-bright uppercase tracking-wider text-sm">
          Membres — {users.length} comptes
        </h2>
        {!isSuperAdmin && (
          <span className="text-xs text-ash font-cinzel">(accès lecture + reset MDP)</span>
        )}
      </div>

      <MembresTable
        users={users}
        currentUser={user}
        isSuperAdmin={isSuperAdmin}
        onAction={handleAction}
        loading={usersLoading}
      />
    </div>
  )
}
