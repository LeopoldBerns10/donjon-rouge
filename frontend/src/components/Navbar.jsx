import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'

const NAV_LINKS = [
  { to: '/', label: 'Accueil' },
  { to: '/guilde', label: 'Guilde' },
  { to: '/tracker', label: 'Tracker' },
  { to: '/forum', label: 'Forum' },
  { to: '/vitrine', label: 'Vitrine' },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-crimson/30"
        style={{ background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/src/assets/logo.png"
              alt="Donjon Rouge"
              className="h-10 w-10 object-contain"
              onError={(e) => {
                e.target.style.display = 'none'
              }}
            />
            <span className="font-cinzel-deco font-bold text-xl text-gold-gradient">
              DONJON ROUGE
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-cinzel text-sm uppercase tracking-widest transition-colors ${
                  location.pathname === link.to
                    ? 'text-crimson'
                    : 'text-ash hover:text-bone'
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user?.isAdmin && (
              <Link
                to="/admin"
                className={`font-cinzel text-sm uppercase tracking-widest transition-colors ${
                  location.pathname === '/admin' ? 'text-crimson' : 'text-gold hover:text-gold-light'
                }`}
              >
                Admin
              </Link>
            )}
          </div>

          {/* User area */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.isAdmin && (
                  <span
                    className="hidden md:inline text-xs font-cinzel uppercase tracking-wider px-2 py-1 rounded font-bold text-bone"
                    style={{ background: '#C41E3A' }}
                  >
                    Admin
                  </span>
                )}
                <span className="hidden md:inline text-sm font-cinzel text-bone">
                  {user.cocName || user.email}
                </span>
                <button
                  onClick={logout}
                  className="hidden md:block text-xs text-ash hover:text-crimson font-cinzel uppercase tracking-wider transition-colors"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-cinzel uppercase tracking-wider border border-crimson text-crimson hover:bg-crimson hover:text-bone transition-all rounded"
              >
                Connexion
              </Link>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden text-ash"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d={menuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden px-4 pb-4 flex flex-col gap-3 border-t border-fog/30 pt-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMenuOpen(false)}
                className="font-cinzel text-sm uppercase tracking-widest text-ash hover:text-bone"
              >
                {link.label}
              </Link>
            ))}
            {user?.isAdmin && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className="font-cinzel text-sm uppercase text-gold">
                Admin
              </Link>
            )}
            {user && (
              <button onClick={logout} className="text-left font-cinzel text-sm uppercase text-ash hover:text-crimson">
                Déconnexion
              </button>
            )}
          </div>
        )}
      </nav>

    </>
  )
}
