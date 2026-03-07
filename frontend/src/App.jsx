import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
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

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col" style={{ background: '#0e0e0e' }}>
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/tracker/:tag" element={<PlayerProfile />} />
              <Route path="/forum" element={<Forum />} />
              <Route path="/annonces" element={<Announcements />} />
              <Route path="/vitrine" element={<Vitrine />} />
              <Route path="/guilde" element={<Guilde />} />
              <Route path="/admin" element={<Admin />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}
