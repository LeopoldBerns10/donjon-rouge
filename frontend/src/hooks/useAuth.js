import { useState, useEffect, createContext, useContext } from 'react'
import api from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('dr_user')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('dr_token')
    if (token) {
      api.get('/api/auth/me')
        .then((res) => {
          setUser(res.data)
          localStorage.setItem('dr_user', JSON.stringify(res.data))
        })
        .catch(() => {
          localStorage.removeItem('dr_token')
          localStorage.removeItem('dr_user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  async function login(username, password) {
    const res = await api.post('/api/auth/login', { username, password })
    localStorage.setItem('dr_token', res.data.token)
    localStorage.setItem('dr_user', JSON.stringify(res.data.player))
    setUser(res.data.player)
    return res.data.player
  }

  async function register(username, password, coc_tag) {
    const res = await api.post('/api/auth/register', { username, password, coc_tag })
    localStorage.setItem('dr_token', res.data.token)
    localStorage.setItem('dr_user', JSON.stringify(res.data.player))
    setUser(res.data.player)
    return res.data.player
  }

  function logout() {
    localStorage.removeItem('dr_token')
    localStorage.removeItem('dr_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
