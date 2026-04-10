import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'
import SectionHeader from '../components/SectionHeader.jsx'

function roleBadge(role) {
  if (role === 'superadmin')
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-red-900 text-red-400 border-red-600">superadmin</span>
  if (role === 'admin')
    return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-orange-900 text-orange-400 border-orange-600">admin</span>
  return <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-gray-900 text-gray-400 border-gray-600">membre</span>
}

function ConnectionDot({ lastSeen, isOnline }) {
  if (!lastSeen) return <span className="inline-block w-2 h-2 rounded-full bg-gray-600" title="Hors ligne" />
  const mins = (Date.now() - new Date(lastSeen).getTime()) / 60000
  if (isOnline || mins < 5)
    return <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Connecté" />
  if (mins < 30)
    return <span className="inline-block w-2 h-2 rounded-full bg-yellow-500" title="Récent" />
  return <span className="inline-block w-2 h-2 rounded-full bg-gray-600" title="Hors ligne" />
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="rounded-lg p-6 max-w-sm w-full mx-4" style={{ background: '#111', border: '1px solid #333' }}>
        <p className="text-bone font-cinzel text-sm mb-6 text-center">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onConfirm}
            className="px-5 py-2 font-cinzel uppercase text-xs text-bone rounded"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}>
            Confirmer
          </button>
          <button onClick={onCancel}
            className="px-5 py-2 font-cinzel uppercase text-xs text-ash border border-fog rounded hover:text-bone">
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}

function MembresTable({ users, currentUser, isSuperAdmin, onAction, loading }) {
  const [confirm, setConfirm] = useState(null)

  function ask(message, action) {
    setConfirm({ message, action })
  }

  function fmtDate(str) {
    if (!str) return '—'
    return new Date(str).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <p className="text-ash font-cinzel animate-pulse text-center py-10">Chargement...</p>

  return (
    <>
      {confirm && (
        <ConfirmModal
          message={confirm.message}
          onConfirm={() => { confirm.action(); setConfirm(null) }}
          onCancel={() => setConfirm(null)}
        />
      )}
      <div className="overflow-x-auto rounded-lg border border-fog/30">
        <table className="w-full text-sm">
          <thead>
            <tr className="font-cinzel uppercase text-xs tracking-widest text-gold border-b border-fog/40"
              style={{ background: '#1a1a1a' }}>
              <th className="py-3 px-3 text-left">Joueur</th>
              <th className="py-3 px-3 text-center">Rôle</th>
              <th className="py-3 px-3 text-center">Connexion</th>
              <th className="py-3 px-3 text-center hidden md:table-cell">Mot de passe</th>
              <th className="py-3 px-3 text-center hidden lg:table-cell">Dernière connexion</th>
              <th className="py-3 px-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className="border-b border-fog/20"
                style={{ background: i % 2 === 0 ? '#0d0d0d' : '#111', opacity: u.is_disabled ? 0.5 : 1 }}>
                <td className="py-2.5 px-3">
                  <div>
                    <div className="font-semibold text-bone text-sm">{u.coc_name}</div>
                    <div className="text-xs text-ash/60">{u.coc_tag}</div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center">{roleBadge(u.role || 'member')}</td>
                <td className="py-2.5 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <ConnectionDot lastSeen={u.last_seen} isOnline={u.is_online} />
                    <span className="text-xs text-ash hidden sm:inline">
                      {u.is_online || (u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) / 60000 < 5)
                        ? 'En ligne'
                        : u.last_seen && (Date.now() - new Date(u.last_seen).getTime()) / 60000 < 30
                          ? 'Récent'
                          : 'Hors ligne'}
                    </span>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-center hidden md:table-cell">
                  {u.has_custom_password
                    ? <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-green-900/40 text-green-400 border-green-700">Personnalisé</span>
                    : <span className="text-xs font-cinzel uppercase px-2 py-0.5 rounded border bg-orange-900/40 text-orange-400 border-orange-700">Par défaut</span>
                  }
                </td>
                <td className="py-2.5 px-3 text-center text-ash text-xs hidden lg:table-cell">
                  {fmtDate(u.last_seen)}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center justify-center gap-1 flex-wrap">
                    {/* Reset MDP — admin & superadmin */}
                    {u.id !== currentUser?.id && (
                      <button
                        onClick={() => ask(`Remettre le tag CoC comme mot de passe pour ${u.coc_name} ?`, () => onAction('reset', u.id))}
                        className="text-xs px-2 py-1 border border-fog/40 text-ash hover:text-bone rounded font-cinzel uppercase transition-colors"
                        title="Reset mot de passe">
                        🔄
                      </button>
                    )}

                    {/* Promouvoir — superadmin only, si member */}
                    {isSuperAdmin && (u.role === 'member' || !u.role) && u.id !== currentUser?.id && (
                      <button
                        onClick={() => ask(`Promouvoir ${u.coc_name} en admin ?`, () => onAction('promote', u.id))}
                        className="text-xs px-2 py-1 border border-orange-600/40 text-orange-400 hover:text-orange-300 rounded font-cinzel uppercase transition-colors"
                        title="Promouvoir admin">
                        ⬆️
                      </button>
                    )}

                    {/* Destituer — superadmin only, si admin */}
                    {isSuperAdmin && u.role === 'admin' && u.id !== currentUser?.id && (
                      <button
                        onClick={() => ask(`Destituer ${u.coc_name} de son rôle admin ?`, () => onAction('demote', u.id))}
                        className="text-xs px-2 py-1 border border-gray-600/40 text-gray-400 hover:text-gray-300 rounded font-cinzel uppercase transition-colors"
                        title="Destituer">
                        ⬇️
                      </button>
                    )}

                    {/* Désactiver/Réactiver — superadmin only */}
                    {isSuperAdmin && u.id !== currentUser?.id && u.role !== 'superadmin' && (
                      <button
                        onClick={() => ask(
                          u.is_disabled ? `Réactiver le compte de ${u.coc_name} ?` : `Désactiver le compte de ${u.coc_name} ?`,
                          () => onAction(u.is_disabled ? 'enable' : 'disable', u.id)
                        )}
                        className={`text-xs px-2 py-1 border rounded font-cinzel uppercase transition-colors ${
                          u.is_disabled
                            ? 'border-green-700/40 text-green-400 hover:text-green-300'
                            : 'border-red-700/40 text-red-400 hover:text-red-300'
                        }`}
                        title={u.is_disabled ? 'Réactiver' : 'Désactiver'}>
                        {u.is_disabled ? '✅' : '🚫'}
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

export default function Admin() {
  const { user, loading: authLoading, isAdmin, isSuperAdmin, userRole } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const canAccess = isAdmin

  useEffect(() => {
    if (!authLoading && !canAccess) navigate('/')
  }, [user, authLoading])

  useEffect(() => {
    if (!canAccess) return
    api.get('/api/admin/users')
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e.response?.data?.error || 'Erreur chargement'))
      .finally(() => setUsersLoading(false))
  }, [canAccess])

  async function handleAction(action, userId) {
    setError('')
    setSuccess('')
    try {
      await api.post(`/api/admin/${action}`, { userId })
      // Refresh user list
      const r = await api.get('/api/admin/users')
      setUsers(r.data)
      const labels = { reset: 'Mot de passe remis à zéro', promote: 'Membre promu admin', demote: 'Admin destitué', disable: 'Compte désactivé', enable: 'Compte réactivé' }
      setSuccess(labels[action] || 'Action effectuée')
      setTimeout(() => setSuccess(''), 3000)
    } catch (e) {
      setError(e.response?.data?.error || 'Erreur')
    }
  }

  if (authLoading) return null
  if (!canAccess) return null

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 animate-fade-up">
      {/* Header */}
      <div style={{ borderTop: '2px solid #dc2626' }} className="pt-6 mb-8">
        <SectionHeader title="Zone Administration" subtitle="Donjon Rouge · Panneau de contrôle" />
        <div className="flex items-center gap-3 mt-2">
          <span className="text-ash font-cinzel text-xs uppercase tracking-wider">Connecté en tant que :</span>
          <span className="text-bone font-cinzel text-sm font-bold">{user?.cocName || user?.email}</span>
          {roleBadge(userRole)}
        </div>
      </div>

      {error && <p className="text-red-400 font-cinzel text-sm mb-4">{error}</p>}
      {success && <p className="text-green-400 font-cinzel text-sm mb-4">✅ {success}</p>}

      {/* Stats rapides */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Membres', value: users.length, icon: '👥' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin' || u.role === 'superadmin').length, icon: '🛡️' },
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
