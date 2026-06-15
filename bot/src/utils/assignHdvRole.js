const { readFileSync } = require('fs')
const path = require('path')

function loadHdvRoles() {
  try {
    const raw = readFileSync(path.join(__dirname, '../config/hdvRoles.json'), 'utf-8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function assignHdvRole(member, townHallLevel) {
  const hdvRoles = loadHdvRoles()
  if (!hdvRoles || Object.keys(hdvRoles).length === 0) {
    console.warn('hdvRoles.json vide ou absent — lance `npm run setup-hdv-roles` d\'abord')
    return
  }

  const allHdvRoleIds = new Set(Object.values(hdvRoles))

  const toRemove = member.roles.cache.filter(r => allHdvRoleIds.has(r.id))
  if (toRemove.size > 0) {
    await member.roles.remove([...toRemove.keys()])
  }

  const targetRoleId = hdvRoles[String(townHallLevel)]
  if (!targetRoleId) return

  await member.roles.add(targetRoleId)
}

module.exports = { assignHdvRole }
