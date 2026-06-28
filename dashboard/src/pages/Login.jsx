import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authDiscord } from '../api'

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID
const REDIRECT_URI = import.meta.env.VITE_DISCORD_REDIRECT_URI

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
      return
    }

    const code = searchParams.get('code')
    if (code) {
      setLoading(true)
      authDiscord(code)
        .then(({ data }) => {
          login(data.token, data.user)
          navigate('/', { replace: true })
        })
        .catch((err) => {
          const apiError = err.response?.data?.error
          setError(typeof apiError === 'string' ? apiError : 'Erreur de connexion Discord')
          setLoading(false)
        })
    }
  }, [])

  function handleDiscordLogin() {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds',
    })
    window.location.href = `https://discord.com/api/oauth2/authorize?${params}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dr-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">⚔️</div>
          <div className="text-dr-muted">Connexion en cours...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dr-black flex items-center justify-center p-4">
      <div className="bg-dr-dark border border-dr-border rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        {/* Decorative top border */}
        <div className="h-1 bg-gradient-to-r from-transparent via-dr-red to-transparent rounded-full mb-8 -mt-1 mx-auto w-32" />

        <div className="text-6xl mb-5">⚔️</div>
        <h1 className="text-3xl font-bold text-dr-gold mb-1">Donjon Rouge</h1>
        <p className="text-lg text-dr-text font-medium mb-1">Dashboard</p>
        <p className="text-dr-muted text-sm mb-8">Réservé aux Chefs du clan</p>

        {error && (
          <div className="bg-red-900/30 border border-red-700/50 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handleDiscordLogin}
          className="w-full bg-[#5865F2] hover:bg-[#4752C4] active:bg-[#3c45a5] text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-3 shadow-lg"
        >
          <DiscordLogo />
          Se connecter avec Discord
        </button>

        <p className="text-dr-muted text-xs mt-6">
          Accès limité aux membres avec le rôle Chef
        </p>
      </div>
    </div>
  )
}

function DiscordLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
    </svg>
  )
}
