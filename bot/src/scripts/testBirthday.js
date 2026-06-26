require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const supabase = require('../supabase.js')
const { checkBirthdays } = require('../lib/birthdayManager.js')

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
})

client.once('ready', async () => {
  console.log(`[testBirthday] Connecté en tant que ${client.user.tag}`)

  // Charger les membres pour que guild.members.cache soit peuplé
  const guild = client.guilds.cache.first()
  if (guild) await guild.members.fetch().catch(e => console.warn('[testBirthday] Erreur fetch membres:', e))

  // 1. Lire le premier anniversaire enregistré
  const { data: row } = await supabase
    .from('birthdays')
    .select('discord_id, discord_name, birth_day, birth_month, birth_year')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!row) {
    console.log('[testBirthday] ❌ Aucun anniversaire enregistré dans la table birthdays.')
    await client.destroy()
    process.exit(1)
  }

  const { discord_name, birth_day, birth_month, birth_year } = row
  const yearDisplay = birth_year ? `/${birth_year}` : ''
  console.log(`[testBirthday] Anniversaire cible : ${discord_name} — ${birth_day}/${birth_month}${yearDisplay}`)

  // 2. Construire un faux timestamp qui place parisNow sur ce jour/mois
  //    checkBirthdays fait : parisNow = new Date(Date.now() + 2h)
  //    On veut parisNow.getUTCDate() == birth_day et getUTCMonth()+1 == birth_month
  //    Donc Date.now() doit pointer sur 08:00 UTC ce jour-là (= 10:00 Paris)
  const currentYear = new Date().getUTCFullYear()
  const fakeNow = Date.UTC(currentYear, birth_month - 1, birth_day, 8, 0, 0)

  const fakeDisplayDate = new Date(fakeNow + 2 * 3600000)
  console.log(`[testBirthday] Date simulée (Paris) : ${fakeDisplayDate.getUTCDate()}/${fakeDisplayDate.getUTCMonth() + 1}/${fakeDisplayDate.getUTCFullYear()} à ${fakeDisplayDate.getUTCHours()}h`)

  // 3. Supprimer la clé anti-doublon pour ne pas bloquer le test
  const dateStr = `${currentYear}-${String(birth_month).padStart(2, '0')}-${String(birth_day).padStart(2, '0')}`
  const sentKey = `birthday_sent_${dateStr}`
  const { error: delErr } = await supabase.from('bot_config').delete().eq('key', sentKey)
  if (!delErr) console.log(`[testBirthday] Clé anti-doublon supprimée : ${sentKey}`)

  // 4. Monkey-patch Date.now pour que checkBirthdays voie la bonne date
  const realNow = Date.now
  Date.now = () => fakeNow

  console.log('[testBirthday] Appel de checkBirthdays…')
  try {
    await checkBirthdays(client)
    console.log('[testBirthday] ✅ checkBirthdays terminé.')
  } catch (e) {
    console.error('[testBirthday] ❌ Erreur :', e)
  } finally {
    Date.now = realNow
  }

  await client.destroy()
  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
