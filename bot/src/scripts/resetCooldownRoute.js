require('dotenv').config()
const supabase = require('../supabase.js')

const DISCORD_ID = '1355479601308242071'

async function main() {
  const { error } = await supabase
    .from('route_infinie_cooldowns')
    .delete()
    .eq('discord_id', DISCORD_ID)

  if (error) {
    console.error('❌ Erreur :', error.message)
    process.exit(1)
  }

  console.log(`✅ Cooldown supprimé pour ${DISCORD_ID}.`)
  process.exit(0)
}

main()
