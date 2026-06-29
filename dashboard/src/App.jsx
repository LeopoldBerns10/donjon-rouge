import { Component } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Welcome from './pages/Welcome'
import Messages from './pages/Messages'
import Birthdays from './pages/Birthdays'
import Polls from './pages/Polls'
import RouteInfinie from './pages/RouteInfinie'
import Members from './pages/Members'
import Config from './pages/Config'
import Logs from './pages/Logs'
import Events from './pages/Events'

// ── ErrorBoundary (debug) ─────────────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state
      return (
        <div style={{ padding: 24, fontFamily: 'monospace', background: '#111', color: '#e0e0e0', minHeight: '100vh' }}>
          <div style={{ color: '#C0392B', fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
            Erreur React capturée
          </div>
          <div style={{ color: '#FFD700', marginBottom: 16, fontSize: 14, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {error?.message}
          </div>
          <details open>
            <summary style={{ cursor: 'pointer', color: '#888', marginBottom: 8 }}>Stack trace</summary>
            <pre style={{ color: '#888', fontSize: 11, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
              {error?.stack}
            </pre>
          </details>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: 20, padding: '8px 16px', background: '#8B0000', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}
          >
            Réessayer
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

// ── Route protégée ────────────────────────────────────────────────────────────
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-dr-black flex items-center justify-center">
        <div className="text-dr-muted text-lg">Chargement...</div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="welcome" element={<Welcome />} />
              <Route path="messages" element={<Messages />} />
              <Route path="birthdays" element={<Birthdays />} />
              <Route path="polls" element={<Polls />} />
              <Route path="route-infinie" element={<RouteInfinie />} />
              <Route path="members" element={<Members />} />
              <Route path="events" element={<Events />} />
              <Route path="config" element={<Config />} />
              <Route path="logs" element={<Logs />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
