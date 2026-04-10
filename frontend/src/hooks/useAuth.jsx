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
  const [welcomeData, setWelcomeData] = useState(null)

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

  async function login(credentials) {
    const res = await api.post('/api/auth/login', credentials)
    const { token, user: userData } = res.data

    localStorage.setItem('dr_token', token)
    localStorage.setItem('dr_user', JSON.stringify(userData))
    setUser(userData)
    setWelcomeData({
      name: userData.coc_name,
      requirePwdChange: !userData.has_custom_password,
    })
    return userData
  }

  async function changePassword(newPassword) {
    const res = await api.post('/api/auth/change-password', { newPassword })
    const { user: userData } = res.data
    localStorage.setItem('dr_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  function logout() {
    localStorage.removeItem('dr_token')
    localStorage.removeItem('dr_user')
    setUser(null)
  }

  function clearWelcomeData() {
    setWelcomeData(null)
  }

  const isAdmin = user?.site_role === 'admin' || user?.site_role === 'superadmin'
  const isSuperAdmin = user?.site_role === 'superadmin'
  const isChief = isAdmin || user?.coc_role === 'leader' || user?.coc_role === 'coLeader'
  const userRole = user?.site_role || 'member'

  return (
    <AuthContext.Provider value={{
      user, loading, login, changePassword, logout,
      isAdmin, isSuperAdmin, isChief, userRole,
      welcomeData, clearWelcomeData,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
