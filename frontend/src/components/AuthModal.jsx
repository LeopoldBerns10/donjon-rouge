import { useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function AuthModal({ onClose }) {
  const { login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', coc_tag: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(form.username, form.password)
      } else {
        await register(form.username, form.password, form.coc_tag)
      }
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
      <div className="card-stone w-full max-w-md p-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ash hover:text-bone"
        >
          ✕
        </button>

        <h2 className="font-cinzel-deco text-2xl font-bold text-gold-gradient mb-6 text-center">
          {mode === 'login' ? 'Connexion' : 'Inscription'}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-cinzel uppercase text-ash mb-1">Nom d'utilisateur</label>
            <input
              type="text"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-cinzel uppercase text-ash mb-1">Mot de passe</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
              required
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-cinzel uppercase text-ash mb-1">Tag CoC (optionnel)</label>
              <input
                type="text"
                value={form.coc_tag}
                onChange={(e) => setForm({ ...form, coc_tag: e.target.value })}
                placeholder="#XXXXXXXX"
                className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
              />
            </div>
          )}
          {error && <p className="text-crimson text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 font-cinzel uppercase tracking-widest font-bold text-bone rounded transition-all"
            style={{ background: 'linear-gradient(135deg, #6B0000, #C41E3A)' }}
          >
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter' : "S'inscrire"}
          </button>
        </form>

        <p className="text-center text-ash text-sm mt-4">
          {mode === 'login' ? "Pas encore de compte ?" : 'Déjà inscrit ?'}{' '}
          <button
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
            className="text-crimson hover:text-ember underline"
          >
            {mode === 'login' ? "S'inscrire" : 'Se connecter'}
          </button>
        </p>
      </div>
    </div>
  )
}
