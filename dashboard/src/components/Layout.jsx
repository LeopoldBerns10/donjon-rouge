import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'
import ReadonlyBanner from './ReadonlyBanner'

const pageTitles = {
  '/': 'Accueil',
  '/members': 'Membres',
  '/welcome': 'Arrivées & Départs',
  '/messages': 'Messages GDC',
  '/birthdays': 'Anniversaires',
  '/polls': 'Sondages',
  '/route-infinie': "Route de l'Infinie",
  '/config': 'Configuration bot',
  '/logs': 'Logs',
  '/moderation': 'Modération',
}

const pageKeys = {
  '/': 'home',
  '/members': 'members',
  '/welcome': 'welcome',
  '/messages': 'messages',
  '/birthdays': 'birthdays',
  '/polls': 'polls',
  '/route-infinie': 'route_infinie',
  '/config': 'config',
  '/logs': 'logs',
  '/moderation': 'moderation',
}

export default function Layout() {
  const { user, canRead, canWrite } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'
  const pageKey = pageKeys[location.pathname]
  const isReadonly = pageKey ? (canRead(pageKey) && !canWrite(pageKey)) : false

  return (
    <div className="flex min-h-screen bg-dr-black">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-y-auto">
          {isReadonly && <ReadonlyBanner />}
          <Outlet />
        </main>
      </div>
    </div>
  )
}
