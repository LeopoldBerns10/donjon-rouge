import { NavLink } from 'react-router-dom'
import { Home, Users, DoorOpen, MessageSquare, Cake, BarChart2, Map, Settings, FileText, CalendarDays } from 'lucide-react'

const navItems = [
  {
    section: 'GÉNÉRAL',
    items: [
      { to: '/', icon: Home, label: 'Accueil', end: true },
      { to: '/members', icon: Users, label: 'Membres' },
    ],
  },
  {
    section: 'CONFIGURATION',
    items: [
      { to: '/welcome', icon: DoorOpen, label: 'Arrivées & Départs' },
      { to: '/messages', icon: MessageSquare, label: 'Messages modifiables' },
      { to: '/birthdays', icon: Cake, label: 'Anniversaires' },
      { to: '/polls', icon: BarChart2, label: 'Sondages' },
      { to: '/route-infinie', icon: Map, label: "Route de l'Infinie" },
      { to: '/events', icon: CalendarDays, label: 'Événements Discord' },
    ],
  },
  {
    section: 'SYSTÈME',
    items: [
      { to: '/config', icon: Settings, label: 'Configuration bot' },
      { to: '/logs', icon: FileText, label: 'Logs' },
    ],
  },
]

function avatarUrl(user) {
  if (user?.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
  }
  return `https://cdn.discordapp.com/embed/avatars/${Number(user?.id ?? 0) % 5}.png`
}

export default function Sidebar({ user }) {
  return (
    <div className="w-64 min-h-screen bg-dr-dark border-r border-dr-border flex flex-col flex-shrink-0">
      {/* Logo + User */}
      <div className="p-5 border-b border-dr-border">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl leading-none">⚔️</span>
          <div>
            <div className="font-bold text-dr-gold text-sm leading-tight">Donjon Rouge</div>
            <div className="text-dr-muted text-xs">Dashboard</div>
          </div>
        </div>
        {user && (
          <div className="flex items-center gap-3 bg-dr-black/40 rounded-lg px-3 py-2">
            <img
              src={avatarUrl(user)}
              alt="Avatar"
              className="w-7 h-7 rounded-full border border-dr-border flex-shrink-0"
              onError={(e) => {
                e.target.src = 'https://cdn.discordapp.com/embed/avatars/0.png'
              }}
            />
            <div className="text-xs text-dr-text truncate font-medium">
              {user.global_name || user.username}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {navItems.map(({ section, items }) => (
          <div key={section} className="mb-5">
            <div className="text-dr-muted text-xs font-semibold tracking-widest uppercase mb-1.5 px-2">
              {section}
            </div>
            {items.map(({ to, icon: Icon, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 text-sm transition-colors ${
                    isActive
                      ? 'bg-dr-red/20 text-dr-red-light border-l-2 border-dr-red pl-[10px]'
                      : 'text-dr-muted hover:text-dr-text hover:bg-dr-card'
                  }`
                }
              >
                <Icon size={16} className="flex-shrink-0" />
                {label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>
    </div>
  )
}
