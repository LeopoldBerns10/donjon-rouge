import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function ChangePasswordModal({ onClose, onSuccess }) {
  const { user, changePassword } = useAuth()
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
      onSuccess?.()
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-2xl w-full max-w-md">

        <div className="px-6 py-4 border-b border-[#1f1f1f]">
          <h3 className="text-base font-bold text-white uppercase tracking-wide font-cinzel">
            Bienvenue {user?.coc_name} !
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Vous devez personnaliser votre mot de passe pour continuer
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="px-6 py-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-cinzel uppercase text-gray-400 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#dc2626]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-cinzel uppercase text-gray-400 mb-1">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#dc2626]"
                required
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          <div className="px-6 py-4 border-t border-[#1f1f1f] flex gap-3 justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold uppercase tracking-wide rounded-lg transition-all duration-150 text-white border"
              style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)', borderColor: '#C41E3A' }}
            >
              {loading ? 'Enregistrement...' : 'Valider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
