const BASE = 'https://raw.githubusercontent.com/Statscell/clash-assets/main'

export function translateRole(role) {
  const roles = {
    leader: 'Chef',
    coLeader: 'Co-Chef',
    admin: 'Aîné',
    member: 'Membre'
  }
  return roles[role] || role
}

export function getRoleColor(role) {
  const colors = {
    leader: 'text-red-500',
    coLeader: 'text-purple-400',
    admin: 'text-blue-400',
    member: 'text-green-400'
  }
  return colors[role] || 'text-gray-400'
}

export function getRoleBadgeClass(role) {
  const badges = {
    leader: 'bg-red-900/50 border border-red-500 text-red-400',
    coLeader: 'bg-purple-900/50 border border-purple-500 text-purple-400',
    admin: 'bg-blue-900/50 border border-blue-500 text-blue-400',
    member: 'bg-green-900/50 border border-green-500 text-green-400'
  }
  return badges[role] || 'bg-gray-800 border border-gray-600 text-gray-400'
}

export function getTroopImageUrl(name, category = 'troops') {
  const clean = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '')
  return `${BASE}/${category}/${clean}.png`
}

export function getTownHallImageUrl(level) {
  return `${BASE}/townhalls/TH${level}.png`
}
