import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { LogOut, Bell } from 'lucide-react'
import { getNotifications } from '../api'
import NotificationPanel from './NotificationPanel'

export default function Header({ title }) {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const [notifs, setNotifs]     = useState([])
  const [unread, setUnread]     = useState(0)
  const [open, setOpen]         = useState(false)
  const [lastSeen, setLastSeen] = useState(() => Date.now())
  const panelRef                = useRef(null)

  // Polling toutes les 30s
  useEffect(() => {
    function fetchNotifs() {
      getNotifications()
        .then(({ data }) => {
          setNotifs(data || [])
          const newCount = (data || []).filter(n => new Date(n.timestamp).getTime() > lastSeen).length
          setUnread(newCount)
        })
        .catch(() => {})
    }

    fetchNotifs()
    const id = setInterval(fetchNotifs, 30_000)
    return () => clearInterval(id)
  }, [lastSeen])

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleBellClick() {
    setOpen(v => !v)
    if (!open) {
      setLastSeen(Date.now())
      setUnread(0)
    }
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="h-14 bg-dr-dark border-b border-dr-border flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="text-base font-semibold text-dr-text">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Cloche notifications */}
        <div className="relative" ref={panelRef}>
          <button
            onClick={handleBellClick}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg hover:bg-dr-card transition-colors text-dr-muted hover:text-dr-text"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <NotificationPanel
              notifications={notifs}
              onClose={() => setOpen(false)}
            />
          )}
        </div>

        {/* Déconnexion */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-dr-muted hover:text-dr-red-light transition-colors text-sm"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </header>
  )
}
