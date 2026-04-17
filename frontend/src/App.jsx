import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { useToast } from './components/Toast.jsx'
import ChangePasswordModal from './components/ChangePasswordModal.jsx'
import { FloatingChat } from './components/FloatingChat.jsx'
import api from './lib/api.js'
import Navbar from './components/Navbar.jsx'
import Footer from './components/Footer.jsx'
import PrivateRoute from './components/PrivateRoute.jsx'
import Home from './pages/Home.jsx'
import Tracker from './pages/Tracker.jsx'
import PlayerProfile from './pages/PlayerProfile.jsx'
import Forum from './pages/Forum.jsx'
import Announcements from './pages/Announcements.jsx'
import Vitrine from './pages/Vitrine.jsx'
import Admin from './pages/Admin.jsx'
import Guilde from './pages/Guilde.jsx'
import Login from './pages/Login.jsx'
import ChangePassword from './pages/ChangePassword.jsx'
import MonProfil from './pages/MonProfil.jsx'

function AnnouncementToast() {
  const [toast, setToast] = useState(null)

  useEffect(() => {
    api.get('/api/forum/posts').then((r) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recent = (r.data || []).find(
        (p) => p.category === 'Annonces' && new Date(p.created_at) > since
      )
      if (recent) {
        setToast(recent.title)
        setTimeout(() => setToast(null), 5000)
      }
    }).catch(() => {})
  }, [])

  if (!toast) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm animate-fade-up"
      style={{ background: 'rgba(14,14,14,0.95)', border: '1px solid #f59e0b', borderRadius: '8px' }}>
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-lg">📢</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-cinzel uppercase text-amber-400 tracking-wider mb-0.5">Nouvelle annonce</p>
          <p className="text-bone text-sm font-semibold leading-snug">{toast}</p>
        </div>
        <button onClick={() => setToast(null)} className="text-ash hover:text-bone text-xs ml-1">✕</button>
      </div>
    </div>
  )
}

// Composant interne qui accède au contexte auth pour les toasts et modals
function AppContent() {
  const { welcomeData, clearWelcomeData } = useAuth()
  const { addToast, ToastContainer } = useToast()
  const [showPwdModal, setShowPwdModal] = useState(false)

  useEffect(() => {
    if (!welcomeData) return
    if (welcomeData.requirePwdChange) {
      addToast('Bienvenue ! Veuillez changer votre mot de passe', 'info')
      setShowPwdModal(true)
    } else {
      addToast(`Bienvenue ${welcomeData.name} !`, 'success')
    }
    clearWelcomeData()

    // Toast messages non lus au login
    const checkUnread = async () => {
      try {
        const res = await api.get('/api/chat/messages/général?limit=50')
        const msgs = res.data
        if (user?.last_seen_chat_at) {
          const lastSeen = new Date(user.last_seen_chat_at)
          const unread = msgs.filter(m => new Date(m.created_at) > lastSeen)
          if (unread.length > 0) {
            setTimeout(() => {
              addToast(`💬 ${unread.length} nouveau${unread.length > 1 ? 'x' : ''} message${unread.length > 1 ? 's' : ''} dans le tchat !`, 'info')
            }, 1500)
          }
        }
      } catch {}
    }
    checkUnread()
  }, [welcomeData])

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0e0e0e' }}>
      <ToastContainer />
      <AnnouncementToast />
      {showPwdModal && (
        <ChangePasswordModal
          onClose={() => setShowPwdModal(false)}
          onSuccess={() => addToast('Mot de passe changé avec succès !', 'success')}
        />
      )}
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/changer-mot-de-passe" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
          <Route path="/tracker" element={<Tracker />} />
          <Route path="/tracker/:tag" element={<PlayerProfile />} />
          <Route path="/forum" element={<Forum />} />
          <Route path="/annonces" element={<Announcements />} />
          <Route path="/vitrine" element={<Vitrine />} />
          <Route path="/guilde" element={<Guilde />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/mon-profil" element={<PrivateRoute><MonProfil /></PrivateRoute>} />
        </Routes>
      </main>
      <Footer />
      <FloatingChat />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  )
}
