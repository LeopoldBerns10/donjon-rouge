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
import Moderation from './pages/Moderation'

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

// ── Route par page (gère les permissions none/read/write) ────────────────────
function PageRoute({ page, children }) {
  const { canRead } = useAuth()
  if (!canRead(page)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center">
        <span className="text-5xl">🔐</span>
        <h2 className="font-cinzel text-xl text-dr-muted uppercase tracking-wider">Accès refusé</h2>
        <p className="text-dr-muted text-sm font-cinzel">Tu n&apos;as pas accès à cette page.</p>
      </div>
    )
  }
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
              <Route index element={<PageRoute page="home"><Home /></PageRoute>} />
              <Route path="welcome"      element={<PageRoute page="welcome"><Welcome /></PageRoute>} />
              <Route path="messages"     element={<PageRoute page="messages"><Messages /></PageRoute>} />
              <Route path="birthdays"    element={<PageRoute page="birthdays"><Birthdays /></PageRoute>} />
              <Route path="polls"        element={<PageRoute page="polls"><Polls /></PageRoute>} />
              <Route path="route-infinie" element={<PageRoute page="route_infinie"><RouteInfinie /></PageRoute>} />
              <Route path="members"      element={<PageRoute page="members"><Members /></PageRoute>} />
              <Route path="events"       element={<PageRoute page="events"><Events /></PageRoute>} />
              <Route path="config"       element={<PageRoute page="config"><Config /></PageRoute>} />
              <Route path="logs"         element={<PageRoute page="logs"><Logs /></PageRoute>} />
              <Route path="moderation"   element={<PageRoute page="moderation"><Moderation /></PageRoute>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  )
}
