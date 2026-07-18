import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('dr_dashboard_token')
    const savedUser = localStorage.getItem('dr_dashboard_user')
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('dr_dashboard_token')
        localStorage.removeItem('dr_dashboard_user')
      }
    }
    setLoading(false)
  }, [])

  function login(token, userData) {
    localStorage.setItem('dr_dashboard_token', token)
    localStorage.setItem('dr_dashboard_user', JSON.stringify(userData))
    setUser(userData)
  }

  function logout() {
    localStorage.removeItem('dr_dashboard_token')
    localStorage.removeItem('dr_dashboard_user')
    setUser(null)
  }

  function canWrite(page) {
    if (!user) return false
    if (user.dashboard_role === 'chef') return true
    return user.permissions?.[page] === 'write'
  }

  function canRead(page) {
    if (!user) return false
    if (user.dashboard_role === 'chef') return true
    return ['write', 'read'].includes(user.permissions?.[page])
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, canWrite, canRead }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
