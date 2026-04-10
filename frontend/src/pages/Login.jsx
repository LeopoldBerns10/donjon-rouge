import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ cocName: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const userData = await login({ coc_name: form.cocName, password: form.password })
      if (userData?.has_custom_password === false) {
        navigate('/changer-mot-de-passe')
      } else {
        navigate('/')
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="card-stone w-full max-w-md p-8">
        <h1 className="font-cinzel-deco text-3xl font-bold text-gold-gradient text-center mb-8">
          Connexion
        </h1>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-cinzel uppercase text-ash mb-1">Pseudo en jeu</label>
            <input
              type="text"
              value={form.cocName}
              onChange={(e) => setForm({ ...form, cocName: e.target.value })}
              className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
              placeholder="Ton pseudo CoC"
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
              placeholder="Par défaut : ton tag #XXXXXXXX"
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
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
