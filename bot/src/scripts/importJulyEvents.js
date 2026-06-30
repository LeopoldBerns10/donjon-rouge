require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const { createDiscordEvent } = require('../lib/discordEvents.js')
const supabase = require('../supabase.js')

// Heure par défaut : début à 8h UTC, fin à 8h UTC du lendemain du dernier jour
const EVENTS = [
  {
    title:     '🏅 Summer Jam Or',
    description: 'Événement Clash of Clans — Summer Jam Or : accumulez de l\'or pour des récompenses exclusives !',
    startTime: new Date(Date.UTC(2026, 6,  1, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6,  9, 8, 0, 0)),
  },
  {
    title:     '🏆 Ligue GDC',
    description: 'Événement Clash of Clans — Ligue Guerre de Clans : combattez pour monter dans les ligues !',
    startTime: new Date(Date.UTC(2026, 6,  1, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 12, 8, 0, 0)),
  },
  {
    title:     '👺 Gobelin à 1 gemme',
    description: 'Événement Clash of Clans — Gobelin à 1 gemme : débloquez le Gobelin pour seulement 1 gemme !',
    startTime: new Date(Date.UTC(2026, 6,  8, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 23, 8, 0, 0)),
  },
  {
    title:     '🧪 Summer Jam Élixir',
    description: 'Événement Clash of Clans — Summer Jam Élixir : boostez vos troupes avec de l\'élixir bonus !',
    startTime: new Date(Date.UTC(2026, 6,  8, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 16, 8, 0, 0)),
  },
  {
    title:     '⭐ Mini Event',
    description: 'Événement Clash of Clans — Mini Event : défiez des objectifs express pour des récompenses rapides !',
    startTime: new Date(Date.UTC(2026, 6,  8, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 18, 8, 0, 0)),
  },
  {
    title:     '⚗️ Summer Jam Élixir Noir',
    description: 'Événement Clash of Clans — Summer Jam Élixir Noir : améliorez vos héros et troupes sombres !',
    startTime: new Date(Date.UTC(2026, 6, 15, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 23, 8, 0, 0)),
  },
  {
    title:     '🦸 Héros Illimitée',
    description: 'Événement Clash of Clans — Héros Illimitée : utilisez vos héros sans temps de recharge !',
    startTime: new Date(Date.UTC(2026, 6, 15, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 23, 8, 0, 0)),
  },
  {
    title:     '🗝️ Chasse aux coffres',
    description: 'Événement Clash of Clans — Chasse aux coffres : trouvez des coffres cachés pour des butins exceptionnels !',
    startTime: new Date(Date.UTC(2026, 6, 16, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 22, 8, 0, 0)),
  },
  {
    title:     '🌟 Summer Jam Toutes les Ressources',
    description: 'Événement Clash of Clans — Summer Jam Toutes les Ressources : bonus sur toutes les ressources pour finir l\'été en beauté !',
    startTime: new Date(Date.UTC(2026, 6, 22, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 7,  2, 8, 0, 0)), // 1er août + 1 jour
  },
  {
    title:     '🎮 Jeux de Clan — Donjon Rouge',
    description: 'Les Jeux de Clan sont lancés ! Objectif minimum : 5 000 pts pour les membres DR.',
    startTime: new Date(Date.UTC(2026, 6, 22, 8, 0, 0)),
    endTime:   new Date(Date.UTC(2026, 6, 29, 8, 0, 0)), // 28 juillet + 1 jour
  },
]

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  console.log(`[ImportJuly] Connecté en tant que ${client.user.tag}`)
  console.log(`[ImportJuly] ${EVENTS.length} événement(s) à traiter...\n`)

  let created = 0
  let skipped = 0

  for (const { title, description, startTime, endTime } of EVENTS) {
    const { data: existing } = await supabase
      .from('discord_events')
      .select('id')
      .eq('title', title)
      .eq('start_time', startTime.toISOString())
      .maybeSingle()

    if (existing) {
      console.log(`[ImportJuly] ⏭  Ignoré (déjà présent) : "${title}"`)
      skipped++
      continue
    }

    try {
      const eventId = await createDiscordEvent(client, { title, description, startTime, endTime })
      await supabase.from('discord_events').insert({
        discord_event_id: eventId,
        type:        'manual',
        title,
        description,
        start_time:  startTime.toISOString(),
        end_time:    endTime.toISOString(),
        announced:   false,
      })
      console.log(`[ImportJuly] ✅ Créé : "${title}" (${startTime.toISOString()})`)
      created++
    } catch (e) {
      console.error(`[ImportJuly] ❌ Erreur "${title}" :`, e.message)
    }
  }

  console.log(`\n[ImportJuly] Terminé — ${created} créé(s), ${skipped} ignoré(s)`)
  await client.destroy()
})

client.login(process.env.DISCORD_TOKEN)
