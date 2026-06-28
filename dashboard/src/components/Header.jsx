import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'

export default function Header({ title }) {
  const { logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-dr-dark border-b border-dr-border flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-dr-text">{title}</h1>
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 text-dr-muted hover:text-dr-red-light transition-colors text-sm"
      >
        <LogOut size={15} />
        Déconnexion
      </button>
    </header>
  )
}
