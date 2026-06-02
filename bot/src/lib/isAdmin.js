const supabase = require('../supabase.js')
const { BOT_ADMINS } = require('../config/admin.js')

const CHEF_ID = '611123759864348672'

async function isAdmin(member) {
  if (member.roles.cache.has(CHEF_ID)) return true
  if (BOT_ADMINS.includes(member.id)) return true

  const { data } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', 'bot_admins')
    .maybeSingle()

  if (data?.value) {
    try {
      const dynamic = JSON.parse(data.value)
      if (Array.isArray(dynamic) && dynamic.includes(member.id)) return true
    } catch {}
  }

  return false
}

module.exports = { isAdmin }
