export default function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card-stone p-5 flex flex-col items-center gap-2 transition-all duration-300 hover:border-crimson hover:scale-105">
      <div className="text-3xl">{icon}</div>
      <div className="text-2xl font-bold text-gold-light font-cinzel">{value}</div>
      <div className="text-sm text-ash font-cinzel uppercase tracking-widest">{label}</div>
      {sub && <div className="text-xs text-fog">{sub}</div>}
    </div>
  )
}
