import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('member')
  const [form, setForm] = useState({ cocName: '', cocTag: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const credentials =
        tab === 'admin'
          ? { email: form.email, password: form.password }
          : { coc_name: form.cocName, coc_tag: form.cocTag }

      const result = await login(credentials)

      if (result?.requirePasswordChange) {
        navigate('/change-password')
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

        {/* Tabs */}
        <div className="flex mb-6 border border-fog/30 rounded overflow-hidden">
          <button
            onClick={() => { setTab('member'); setError('') }}
            className={`flex-1 py-2 font-cinzel text-sm uppercase tracking-widest transition-colors ${
              tab === 'member'
                ? 'text-bone'
                : 'text-ash hover:text-bone'
            }`}
            style={tab === 'member' ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : { background: 'transparent' }}
          >
            Membre
          </button>
          <button
            onClick={() => { setTab('admin'); setError('') }}
            className={`flex-1 py-2 font-cinzel text-sm uppercase tracking-widest transition-colors ${
              tab === 'admin'
                ? 'text-bone'
                : 'text-ash hover:text-bone'
            }`}
            style={tab === 'admin' ? { background: 'linear-gradient(135deg, #6B0000, #C41E3A)' } : { background: 'transparent' }}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {tab === 'member' ? (
            <>
              <div>
                <label className="block text-xs font-cinzel uppercase text-ash mb-1">Pseudo CoC</label>
                <input
                  type="text"
                  value={form.cocName}
                  onChange={(e) => setForm({ ...form, cocName: e.target.value })}
                  className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
                  placeholder="Ton pseudo en jeu"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-cinzel uppercase text-ash mb-1">Tag CoC (mot de passe)</label>
                <input
                  type="password"
                  value={form.cocTag}
                  onChange={(e) => setForm({ ...form, cocTag: e.target.value })}
                  className="w-full bg-stone border border-fog rounded px-3 py-2 text-bone focus:outline-none focus:border-crimson"
                  placeholder="#XXXXXXXX"
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-cinzel uppercase text-ash mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
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
            </>
          )}

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
