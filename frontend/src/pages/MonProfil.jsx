import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { useWarSignups } from '../hooks/useWarSignups.js'
import api from '../lib/api.js'

export default function MonProfil() {
  const { user, changePassword, logout } = useAuth()
  const { signups } = useWarSignups()
  const navigate = useNavigate()

  const [tab, setTab] = useState('profil')

  // Changement de mot de passe
  const [oldPassword, setOldPassword]         = useState('')
  const [newPassword, setNewPassword]         = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdMsg, setPwdMsg]                   = useState(null)
  const [pwdError, setPwdError]               = useState(null)
  const [pwdLoading, setPwdLoading]           = useState(false)

  if (!user) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <p className="font-cinzel text-ash">Tu dois être connecté pour accéder à cette page.</p>
        <Link to="/login" className="mt-4 inline-block px-6 py-2 border border-crimson text-crimson font-cinzel text-sm uppercase rounded hover:bg-crimson/20 transition-all">
          Connexion
        </Link>
      </div>
    )
  }

  const mySignup = signups.find(s => s.coc_tag === user.coc_tag)

  async function handleChangePassword(e) {
    e.preventDefault()
    setPwdMsg(null)
    setPwdError(null)
    if (newPassword !== confirmPassword) {
      setPwdError('Les mots de passe ne correspondent pas.')
      return
    }
    if (newPassword.length < 6) {
      setPwdError('Le mot de passe doit faire au moins 6 caractères.')
      return
    }
    setPwdLoading(true)
    try {
      await api.post('/api/auth/change-password', { oldPassword, newPassword })
      setPwdMsg('Mot de passe changé avec succès !')
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwdError(err.response?.data?.error || 'Erreur lors du changement de mot de passe.')
    } finally {
      setPwdLoading(false)
    }
  }

  const TABS = [
    { key: 'profil',    label: '👤 Profil' },
    { key: 'securite',  label: '🔒 Sécurité' },
    { key: 'tickets',   label: '🎫 Tickets' },
  ]

  const WAR_TYPE_COLORS = {
    'GDC':      { border: '#C41E3A', color: '#ff8080', bg: '#6B0000' },
    'LDC':      { border: '#6366f1', color: '#a5b4fc', bg: '#1a1a4e' },
    'Les deux': { border: '#22c55e', color: '#86efac', bg: '#1a3a1a' },
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 animate-fade-up">

      {/* Header */}
      <div className="card-stone p-6 mb-6 flex items-center gap-5">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-cinzel font-bold text-bone border-2 border-crimson/60 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #1a0000, #3a0000)' }}
        >
          {user.coc_name?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="font-cinzel-deco text-xl text-gold-bright">{user.coc_name}</h1>
          <p className="text-ash text-sm font-cinzel">{user.coc_tag}</p>
          <p className="text-ash/60 text-xs font-cinzel mt-1 uppercase tracking-wider">
            {user.coc_role === 'leader' ? '👑 Chef' :
             user.coc_role === 'coLeader' ? '⚔️ Co-chef' :
             user.coc_role === 'admin' ? '⚔️ Co-chef' :
             user.coc_role === 'elder' ? '🛡️ Ancien' : '🗡️ Membre'}
          </p>
        </div>
        <div className="ml-auto hidden md:block">
          <Link
            to={`/tracker/${encodeURIComponent(user.coc_tag)}`}
            className="px-4 py-2 text-xs font-cinzel uppercase tracking-wider rounded border border-fog/40 text-ash hover:text-bone hover:border-bone/40 transition-all"
          >
            Voir mon Tracker →
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-fog/30 pb-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-cinzel uppercase tracking-wider transition-all border-b-2 -mb-px ${
              tab === t.key
                ? 'border-crimson text-bone'
                : 'border-transparent text-ash hover:text-bone'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Onglet Profil */}
      {tab === 'profil' && (
        <div className="space-y-4">

          {/* Inscription GDC/LDC active */}
          <div className="card-stone p-5">
            <h2 className="font-cinzel text-gold-light text-sm uppercase tracking-wider mb-3">
              ⚔️ Inscription Guerre
            </h2>
            {mySignup ? (
              <div className="flex items-center gap-3">
                <span
                  className="text-xs font-cinzel font-bold uppercase px-3 py-1 rounded border"
                  style={{
                    borderColor: WAR_TYPE_COLORS[mySignup.war_type]?.border,
                    color: WAR_TYPE_COLORS[mySignup.war_type]?.color,
                    background: WAR_TYPE_COLORS[mySignup.war_type]?.bg
                  }}
                >
                  {mySignup.war_type}
                </span>
                <span className="text-ash text-xs">
                  Inscrit le {new Date(mySignup.signed_at).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-ash text-sm">Tu n'es pas inscrit pour la prochaine guerre.</p>
                <Link
                  to="/guilde"
                  onClick={() => setTimeout(() => window.dispatchEvent(new CustomEvent('open-war-signups')), 300)}
                  className="text-xs font-cinzel uppercase tracking-wider text-crimson hover:text-crimson/80 transition-colors"
                >
                  S'inscrire →
                </Link>
              </div>
            )}
          </div>

          {/* Lien tracker */}
          <div className="card-stone p-5">
            <h2 className="font-cinzel text-gold-light text-sm uppercase tracking-wider mb-3">
              📊 Mes Stats CoC
            </h2>
            <p className="text-ash text-sm mb-3">Retrouve toutes tes statistiques Clash of Clans sur ton profil Tracker.</p>
            <Link
              to={`/tracker/${encodeURIComponent(user.coc_tag)}`}
              className="inline-block px-4 py-2 text-xs font-cinzel uppercase tracking-wider rounded border border-crimson text-crimson hover:bg-crimson/20 transition-all"
            >
              Voir mes stats →
            </Link>
          </div>

        </div>
      )}

      {/* Onglet Sécurité */}
      {tab === 'securite' && (
        <div className="card-stone p-6">
          <h2 className="font-cinzel text-gold-light text-sm uppercase tracking-wider mb-5">
            🔒 Changer mon mot de passe
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
            <div>
              <label className="block text-xs font-cinzel text-ash uppercase tracking-wider mb-1">
                Mot de passe actuel
              </label>
              <input
                type="password"
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                required
                className="w-full bg-stone-dark border border-fog/30 rounded px-3 py-2 text-bone text-sm focus:border-crimson/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-cinzel text-ash uppercase tracking-wider mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                className="w-full bg-stone-dark border border-fog/30 rounded px-3 py-2 text-bone text-sm focus:border-crimson/60 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-cinzel text-ash uppercase tracking-wider mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-stone-dark border border-fog/30 rounded px-3 py-2 text-bone text-sm focus:border-crimson/60 focus:outline-none"
              />
            </div>
            {pwdMsg   && <p className="text-green-400 text-xs font-cinzel">{pwdMsg}</p>}
            {pwdError && <p className="text-crimson text-xs font-cinzel">{pwdError}</p>}
            <button
              type="submit"
              disabled={pwdLoading}
              className="px-6 py-2 text-sm font-cinzel uppercase tracking-wider rounded text-bone transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}
            >
              {pwdLoading ? 'Chargement...' : 'Changer'}
            </button>
          </form>
        </div>
      )}

      {/* Onglet Tickets */}
      {tab === 'tickets' && (
        <div className="card-stone p-6 text-center">
          <div className="text-4xl mb-4">🎫</div>
          <h2 className="font-cinzel text-gold-light text-sm uppercase tracking-wider mb-2">
            Tickets de support
          </h2>
          <p className="text-ash text-sm">
            Le système de tickets arrive bientôt.<br />
            En attendant, contacte un chef sur Discord.
          </p>
          <p className="text-ash/40 text-xs mt-4 font-cinzel">— Fonctionnalité en cours de développement —</p>
        </div>
      )}

    </div>
  )
}
