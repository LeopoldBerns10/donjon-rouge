import { useState, useRef, useEffect } from 'react'
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
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
              <div className="relative" ref={dropdownRef}>
                {/* Bouton avatar/nom */}
                <button
                  onClick={() => setDropdownOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded border border-fog/30 hover:border-crimson/50 transition-all"
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-cinzel font-bold text-bone border border-crimson/50"
                    style={{ background: 'linear-gradient(135deg, #1a0000, #3a0000)' }}
                  >
                    {user.cocName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="hidden md:inline text-sm font-cinzel text-bone">
                    {user.cocName || user.email}
                  </span>
                  <svg className={`w-3 h-3 text-ash transition-transform ${dropdownOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-lg border border-fog/30 shadow-2xl z-50 overflow-hidden"
                    style={{ background: '#0d0d0d' }}
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-fog/20">
                      <p className="font-cinzel text-bone text-sm font-bold">{user.cocName}</p>
                      <p className="text-ash text-xs">{user.cocTag}</p>
                      {user.isAdmin && (
                        <span className="text-xs font-cinzel uppercase text-crimson">Admin</span>
                      )}
                    </div>

                    {/* Items */}
                    <div className="py-1">
                      <Link
                        to="/mon-profil"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-cinzel text-ash hover:text-bone hover:bg-white/5 transition-colors"
                      >
                        <span>👤</span> Mon Profil
                      </Link>
                      <Link
                        to={`/tracker/${encodeURIComponent(user.cocTag)}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm font-cinzel text-ash hover:text-bone hover:bg-white/5 transition-colors"
                      >
                        <span>📊</span> Mes Stats
                      </Link>
                      {user.isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2 px-4 py-2.5 text-sm font-cinzel text-gold hover:text-gold-light hover:bg-white/5 transition-colors"
                        >
                          <span>⚙️</span> Administration
                        </Link>
                      )}
                    </div>

                    {/* Déconnexion */}
                    <div className="border-t border-fog/20 py-1">
                      <button
                        onClick={() => { logout(); setDropdownOpen(false) }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-cinzel text-ash hover:text-crimson hover:bg-white/5 transition-colors"
                      >
                        <span>🚪</span> Déconnexion
                      </button>
                    </div>
                  </div>
                )}
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
              <>
                <Link to="/mon-profil" onClick={() => setMenuOpen(false)} className="font-cinzel text-sm uppercase text-ash hover:text-bone">
                  👤 Mon Profil
                </Link>
                <Link to={`/tracker/${encodeURIComponent(user.cocTag)}`} onClick={() => setMenuOpen(false)} className="font-cinzel text-sm uppercase text-ash hover:text-bone">
                  📊 Mes Stats
                </Link>
                <button onClick={logout} className="text-left font-cinzel text-sm uppercase text-ash hover:text-crimson">
                  Déconnexion
                </button>
              </>
            )}
          </div>
        )}
      </nav>

    </>
  )
}
