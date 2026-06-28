export default function Card({ title, value, icon, subtitle, className = '' }) {
  return (
    <div className={`bg-dr-card border border-dr-border rounded-xl p-5 ${className}`}>
      {title && (
        <div className="text-dr-muted text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
          {icon && <span>{icon}</span>}
          {title}
        </div>
      )}
      {value !== undefined && (
        <div className="text-2xl font-bold text-dr-text">{value}</div>
      )}
      {subtitle && (
        <div className="text-dr-muted text-xs mt-1">{subtitle}</div>
      )}
    </div>
  )
}
