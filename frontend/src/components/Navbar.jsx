import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import { formatCocRole } from '../utils/roles.js'

const NAV_LINKS = [
  { to: '/', label: 'Accueil', icon: '🏠' },
  { to: '/guilde', label: 'Guilde', icon: '⚔️' },
  { to: '/tracker', label: 'Tracker', icon: '📊' },
  { to: '/forum', label: 'Forum', icon: '💬' },
  { to: '/vitrine', label: 'Vitrine', icon: '🏆' },
]

export default function Navbar() {
  const { user, login, logout } = useAuth()
  const location = useLocation()

  // ── Mobile menu ─────────────────────────────────────────────────────────────
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const closeMenu = () => setMobileMenuOpen(false)

  // ── Login dropdown desktop (non connecté) ────────────────────────────────────
  const [showLoginDropdown, setShowLoginDropdown] = useState(false)
  const [loginForm, setLoginForm] = useState({ coc_name: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const loginDropdownRef = useRef(null)

  // ── User menu desktop (connecté) ─────────────────────────────────────────────
  const [showUserMenu, setShowUserMenu] = useState(false)
  const userMenuRef = useRef(null)

  // ── Fermer dropdowns desktop au clic dehors ──────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e) {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(e.target)) {
        setShowLoginDropdown(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // ── Bloquer le scroll body quand menu mobile ouvert ──────────────────────────
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileMenuOpen])

  // ── Soumettre le login ───────────────────────────────────────────────────────
  async function handleLogin(e) {
    if (e?.preventDefault) e.preventDefault()
    setLoginLoading(true)
    setLoginError('')
    try {
      await login({ coc_name: loginForm.coc_name, password: loginForm.password })
      setShowLoginDropdown(false)
      closeMenu()
      setLoginForm({ coc_name: '', password: '' })
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Identifiant ou mot de passe incorrect')
    } finally {
      setLoginLoading(false)
    }
  }

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-crimson/30"
        style={{ background: 'rgba(14,14,14,0.92)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3" onClick={closeMenu}>
            <img src="/images/logo_2.png" alt="Donjon Rouge" className="h-10 w-auto object-contain" />
            <span className="font-cinzel-deco font-bold text-xl text-gold-gradient">DONJON ROUGE</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`font-cinzel text-sm uppercase tracking-widest transition-colors ${
                  location.pathname === link.to ? 'text-crimson' : 'text-ash hover:text-bone'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Zone droite */}
          <div className="flex items-center gap-2">

            {/* ── Desktop : user menu ou login dropdown ─────────────────────── */}
            {user ? (
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#dc2626]/50 transition-all duration-200"
                >
                  <div className="w-7 h-7 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/40 flex items-center justify-center text-xs font-bold text-[#dc2626]">
                    {user.coc_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-200 hidden sm:block">{user.coc_name}</span>
                  {['admin', 'superadmin'].includes(user.site_role) && (
                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 bg-[#dc2626]/20 text-[#dc2626] border border-[#dc2626]/30 rounded-full hidden sm:block">
                      {user.site_role === 'superadmin' ? 'Super Admin' : 'Admin'}
                    </span>
                  )}
                  <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-2xl shadow-black/50">
                    <div className="px-4 py-3 border-b border-[#1f1f1f]">
                      <p className="text-sm font-semibold text-white">{user.coc_name}</p>
                      <p className="text-xs text-gray-500">{user.coc_tag}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatCocRole(user.coc_role)}</p>
                    </div>
                    <div className="py-2">
                      <Link to="/mon-profil" onClick={() => setShowUserMenu(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-[#1a1a1a] hover:text-white transition-colors">
                        Mon profil
                      </Link>
                      {['admin', 'superadmin'].includes(user.site_role) && (
                        <Link to="/admin" onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-[#dc2626] hover:bg-[#1a1a1a] transition-colors">
                          Administration
                        </Link>
                      )}
                    </div>
                    <div className="border-t border-[#1f1f1f] py-2">
                      <button onClick={() => { logout(); setShowUserMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-500 hover:bg-[#1a1a1a] hover:text-red-400 transition-colors text-left">
                        Se déconnecter
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="relative hidden md:block" ref={loginDropdownRef}>
                <button
                  onClick={() => setShowLoginDropdown(v => !v)}
                  className="px-4 py-2 text-sm font-semibold uppercase tracking-wide border border-[#dc2626] text-[#dc2626] hover:bg-[#dc2626] hover:text-white rounded-lg transition-all duration-200"
                >
                  Connexion
                </button>

                {showLoginDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-80 z-50 bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-2xl shadow-black/50">
                    <div className="px-5 py-4 border-b border-[#1f1f1f]">
                      <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Connexion</p>
                      <p className="text-sm text-gray-400 mt-0.5">Connecte-toi avec ton pseudo CoC</p>
                    </div>
                    <form onSubmit={handleLogin} className="px-5 py-4 flex flex-col gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-wide text-gray-500 font-medium">Pseudo CoC</label>
                        <input type="text" value={loginForm.coc_name}
                          onChange={e => setLoginForm(f => ({ ...f, coc_name: e.target.value }))}
                          placeholder="Ton nom de joueur" autoComplete="username"
                          className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#0d0d0d] border border-[#2a2a2a] text-white placeholder-gray-600 focus:outline-none focus:border-[#dc2626] transition-colors duration-150" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs uppercase tracking-wide text-gray-500 font-medium">Mot de passe</label>
                        <input type="password" value={loginForm.password}
                          onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                          placeholder="Mot de passe" autoComplete="current-password"
                          className="w-full px-3 py-2.5 rounded-lg text-sm bg-[#0d0d0d] border border-[#2a2a2a] text-white placeholder-gray-600 focus:outline-none focus:border-[#dc2626] transition-colors duration-150" />
                      </div>
                      {loginError && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{loginError}</p>
                      )}
                      <button type="submit" disabled={loginLoading}
                        className="w-full py-2.5 mt-1 rounded-lg text-sm font-semibold uppercase tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200">
                        {loginLoading ? 'Connexion...' : 'Se connecter'}
                      </button>
                      <p className="text-xs text-gray-600 text-center">Mot de passe par défaut : ton tag CoC</p>
                    </form>
                  </div>
                )}
              </div>
            )}

            {/* ── Mobile : avatar compact (si connecté) ─────────────────────── */}
            {user && (
              <div className="md:hidden w-8 h-8 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                              flex items-center justify-center text-xs font-bold text-[#dc2626]">
                {user.coc_name?.charAt(0).toUpperCase()}
              </div>
            )}

            {/* ── Bouton hamburger animé ─────────────────────────────────────── */}
            <button
              onClick={() => setMobileMenuOpen(v => !v)}
              className="md:hidden flex flex-col justify-center gap-1.5 w-10 h-10 rounded-lg hover:bg-[#1a1a1a] transition-colors p-2"
              aria-label="Menu"
            >
              <span className={`block h-0.5 bg-white rounded transition-all duration-200 ${mobileMenuOpen ? 'rotate-45 translate-y-2 w-6' : 'w-6'}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-200 ${mobileMenuOpen ? 'opacity-0 w-0' : 'w-4'}`} />
              <span className={`block h-0.5 bg-white rounded transition-all duration-200 ${mobileMenuOpen ? '-rotate-45 -translate-y-2 w-6' : 'w-6'}`} />
            </button>

          </div>
        </div>
      </nav>

      {/* ── Menu mobile plein écran ───────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-[#0d0d0d]/95 backdrop-blur-sm
                        z-50 flex flex-col md:hidden">

          {/* Header du menu */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#1a1a1a]">
            <img src="/images/logo_2.png" alt="Donjon Rouge" className="h-9 w-auto" />
            <button onClick={closeMenu}
              className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center text-gray-400 hover:text-white transition-colors">
              ✕
            </button>
          </div>

          {/* Liens de navigation */}
          <nav className="flex flex-col px-4 py-4 gap-1 flex-1 overflow-y-auto">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                onClick={closeMenu}
                className={`flex items-center gap-4 px-4 py-4 rounded-2xl
                            transition-all active:bg-[#dc2626]/10 ${
                  location.pathname === link.to
                    ? 'bg-[#1a1a1a] text-white border border-[#dc2626]/20'
                    : 'text-gray-300 hover:bg-[#1a1a1a] hover:text-white'
                }`}
              >
                <span className="text-2xl">{link.icon}</span>
                <span className="font-semibold uppercase tracking-wide">{link.label}</span>
                <span className="ml-auto text-gray-600 text-lg">›</span>
              </Link>
            ))}
          </nav>

          {/* Section utilisateur en bas */}
          <div className="px-4 py-5 border-t border-[#1a1a1a]">
            {user ? (
              <div className="flex flex-col gap-2">
                {/* Card utilisateur */}
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#111111] border border-[#1f1f1f] mb-2">
                  <div className="w-11 h-11 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                                  flex items-center justify-center text-lg font-bold text-[#dc2626]">
                    {user.coc_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-white">{user.coc_name}</p>
                    <p className="text-xs text-gray-500">{formatCocRole(user.coc_role)}</p>
                  </div>
                  {['admin', 'superadmin'].includes(user.site_role) && (
                    <span className="text-[10px] bg-[#dc2626]/20 border border-[#dc2626]/30 text-[#dc2626] px-2 py-1 rounded-full uppercase">
                      Admin
                    </span>
                  )}
                </div>

                <Link to="/mon-profil" onClick={closeMenu}
                  className="px-4 py-3 rounded-xl text-sm text-gray-400 hover:bg-[#1a1a1a] hover:text-white transition-colors">
                  👤 Mon profil
                </Link>
                {['admin', 'superadmin'].includes(user.site_role) && (
                  <Link to="/admin" onClick={closeMenu}
                    className="px-4 py-3 rounded-xl text-sm text-[#dc2626] hover:bg-[#1a1a1a] transition-colors">
                    🛡️ Administration
                  </Link>
                )}
                <button onClick={() => { logout(); closeMenu() }}
                  className="px-4 py-3 rounded-xl text-sm text-gray-600 hover:bg-[#1a1a1a] hover:text-red-400 transition-colors text-left">
                  🚪 Se déconnecter
                </button>
              </div>
            ) : (
              /* Formulaire login inline dans le menu mobile */
              <div className="flex flex-col gap-3">
                <p className="text-xs uppercase tracking-widest text-gray-600 px-1 mb-1">Connexion</p>
                <input
                  type="text"
                  placeholder="Pseudo CoC"
                  value={loginForm.coc_name}
                  onChange={e => setLoginForm(f => ({ ...f, coc_name: e.target.value }))}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#111111] border border-[#2a2a2a]
                             text-white placeholder-gray-600 text-base
                             focus:outline-none focus:border-[#dc2626]/50"
                />
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={loginForm.password}
                  onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3.5 rounded-xl bg-[#111111] border border-[#2a2a2a]
                             text-white placeholder-gray-600 text-base
                             focus:outline-none focus:border-[#dc2626]/50"
                />
                {loginError && (
                  <p className="text-xs text-red-400 px-1">{loginError}</p>
                )}
                <button
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className="w-full py-4 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c]
                             text-white font-bold uppercase tracking-wide text-sm
                             disabled:opacity-50 transition-colors"
                >
                  {loginLoading ? 'Connexion...' : 'Se connecter'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
