import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function ChangePassword() {
  const { user, changePassword } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (newPassword !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    setLoading(true)
    try {
      await changePassword(newPassword)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-stone w-full max-w-md p-8">
        <h1 className="font-cinzel-deco text-2xl font-bold text-gold-gradient text-center mb-2">
          Bienvenue {user?.coc_name} !
        </h1>
        <p className="text-ash text-center font-cinzel text-sm mb-8">
          Vous devez personnaliser votre mot de passe pour continuer
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-cinzel uppercase text-ash mb-1">Nouveau mot de passe</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-cinzel uppercase text-ash mb-1">Confirmer le mot de passe</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
              required
            />
          </div>

          {error && <p className="text-crimson text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-cinzel uppercase tracking-widest font-bold text-bone rounded transition-all mt-2"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)', boxShadow: '0 0 20px rgba(196,30,58,0.3)' }}
          >
            {loading ? 'Enregistrement...' : 'Valider'}
          </button>
        </form>
      </div>
    </div>
  )
}
