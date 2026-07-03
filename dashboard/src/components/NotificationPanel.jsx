import { X } from 'lucide-react'

function formatRelativeTime(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const min  = Math.floor(diff / 60000)
  if (min < 1)  return "À l'instant"
  if (min < 60) return `Il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)   return `Il y a ${h}h`
  return `Il y a ${Math.floor(h / 24)}j`
}

const TYPE_DOT = {
  join:  'bg-green-500',
  leave: 'bg-red-500',
  war:   'bg-orange-500',
  jdc:   'bg-blue-500',
  event: 'bg-dr-gold',
}

export default function NotificationPanel({ notifications, onClose }) {
  return (
    <div className="absolute right-0 top-full mt-2 w-80 z-50 bg-dr-dark border border-dr-border rounded-xl shadow-2xl shadow-black/50">
      <div className="px-4 py-3 border-b border-dr-border flex items-center justify-between">
        <span className="text-sm font-semibold text-dr-text">Notifications (24h)</span>
        <button onClick={onClose} className="text-dr-muted hover:text-dr-text transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {!notifications || notifications.length === 0 ? (
          <p className="text-center text-dr-muted text-xs py-8">Aucune notification récente</p>
        ) : (
          notifications.map((notif, i) => (
            <div key={i} className="px-4 py-3 border-b border-dr-border/40 hover:bg-dr-card/50 transition-colors">
              <div className="flex items-start gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${TYPE_DOT[notif.type] ?? 'bg-dr-muted'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-dr-text leading-snug">{notif.message}</p>
                  <p className="text-[11px] text-dr-muted mt-0.5">{formatRelativeTime(notif.timestamp)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
