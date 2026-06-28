import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from './Sidebar'
import Header from './Header'

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
}

export default function Layout() {
  const { user } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'Dashboard'

  return (
    <div className="flex min-h-screen bg-dr-black">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} />
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
