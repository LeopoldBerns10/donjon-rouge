import { ROLE_COLORS } from '../lib/constants.js'

export default function RoleTag({ role }) {
  const color = ROLE_COLORS[role] || '#777777'
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-cinzel font-semibold uppercase tracking-wider"
      style={{ color, border: `1px solid ${color}`, background: `${color}22` }}
    >
      {role}
    </span>
  )
}
