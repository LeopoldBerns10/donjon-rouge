require('dotenv').config()
const { Client, GatewayIntentBits } = require('discord.js')
const { writeFileSync, existsSync, readFileSync } = require('fs')
const path = require('path')
const sharp = require('sharp')

const MAX_SIZE = 2 * 1024 * 1024 // 2 MB

async function resizeIfNeeded(buffer) {
  if (buffer.length <= MAX_SIZE) return buffer
  return sharp(buffer).resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
}

const COC_ASSETS_BASE = 'https://xlibijjxzqsbayltorve.supabase.co/storage/v1/object/public/coc-assets'
const EMOJIS_PATH = path.join(__dirname, '../config/cocEmojis.json')

const ASSETS = [
  // ─── Héros ───────────────────────────────────────────────────────────────
  { path: 'heros/Icon_HV_Hero_Barbarian_King.png',      name: 'coc_roi_barbare'     },
  { path: 'heros/Icon_HV_Hero_Archer_Queen.png',        name: 'coc_reine_archere'   },
  { path: 'heros/Icon_HV_Hero_Grand_Warden.png',        name: 'coc_grand_gardien'   },
  { path: 'heros/Icon_HV_Hero_Royal_Champion.png',      name: 'coc_champion_royal'  },
  { path: 'heros/Hero_Minion_Prince_04_noShadow.png',   name: 'coc_prince_demon'    },
  { path: 'heros/Icon_BB_Hero_Battle_Machine.png',      name: 'coc_machine_combat'  },
  { path: 'heros/Icon_BB_Hero_Battle_Copter.png',       name: 'coc_helicoptere'     },
  // ─── Sorts ───────────────────────────────────────────────────────────────
  { path: 'sorts/Icon_HV_Spell_Lightning_new.png',      name: 'coc_sort_eclair'        },
  { path: 'sorts/Icon_HV_Spell_Heal.png',               name: 'coc_sort_soin'          },
  { path: 'sorts/Icon_HV_Spell_Rage.png',               name: 'coc_sort_rage'          },
  { path: 'sorts/Icon_HV_Spell_Jump.png',               name: 'coc_sort_saut'          },
  { path: 'sorts/Icon_HV_Spell_Freeze_new.png',         name: 'coc_sort_gel'           },
  { path: 'sorts/Icon_HV_Spell_Clone.png',              name: 'coc_sort_clone'         },
  { path: 'sorts/Icon_HV_Spell_Invisibility.png',       name: 'coc_sort_invisibilite'  },
  { path: 'sorts/Icon_HV_Spell_Recall.png',             name: 'coc_sort_rappel'        },
  { path: 'sorts/Icon_HV_Dark_Spell_Poison.png',        name: 'coc_sort_poison'        },
  { path: 'sorts/Icon_HV_Dark_Spell_Earthquake.png',    name: 'coc_sort_tremblement'   },
  { path: 'sorts/Icon_HV_Dark_Spell_Haste.png',         name: 'coc_sort_celerite'      },
  { path: 'sorts/Icon_HV_Dark_Spell_Skeleton.png',      name: 'coc_sort_squelette'     },
  { path: 'sorts/Icon_HV_Dark_Spell_Bat.png',           name: 'coc_sort_chauvesouris'  },
  { path: 'sorts/Icon_HV_Dark_Spell_Overgrowth.png',    name: 'coc_sort_surcroissance' },
  { path: 'sorts/Icon_HV_Dark_Spell_Ice_block.png',     name: 'coc_sort_glace'         },
  // ─── Troupes ─────────────────────────────────────────────────────────────
  { path: 'troupes/Icon_HV_Barbarian.png',              name: 'coc_barbare'        },
  { path: 'troupes/Icon_HV_Archer.png',                 name: 'coc_archere'        },
  { path: 'troupes/Icon_HV_Giant.png',                  name: 'coc_geant'          },
  { path: 'troupes/Icon_HV_Dragon.png',                 name: 'coc_dragon'         },
  { path: 'troupes/Icon_HV_Golem.png',                  name: 'coc_golem'          },
  { path: 'troupes/Icon_HV_Electro_Dragon.png',         name: 'coc_electro_dragon' },
  { path: 'troupes/Icon_HV_Electro_Titan.png',          name: 'coc_electro_titan'  },
  { path: 'troupes/Icon_HV_Hog_Rider.png',              name: 'coc_chevaucheur'    },
  { path: 'troupes/Icon_HV_Lava_Hound.png',             name: 'coc_limace_lave'    },
  { path: 'troupes/Icon_HV_Healer.png',                 name: 'coc_guerisseuse'    },
]

const sleep = ms => new Promise(r => setTimeout(r, ms))

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

client.once('ready', async () => {
  const guild = client.guilds.cache.get(process.env.DISCORD_GUILD_ID)
  if (!guild) {
    console.error('❌ Serveur introuvable — vérifier DISCORD_GUILD_ID')
    process.exit(1)
  }

  console.log(`\n🚀 Upload des emojis COC sur "${guild.name}" (${ASSETS.length} assets)\n`)

  // Charger les IDs existants
  let saved = {}
  if (existsSync(EMOJIS_PATH)) {
    try { saved = JSON.parse(readFileSync(EMOJIS_PATH, 'utf8')) } catch {}
  }

  // Index des emojis existants sur le serveur
  await guild.emojis.fetch()
  const existing = new Map(guild.emojis.cache.map(e => [e.name, e.id]))

  let ok = 0, skip = 0, fail = 0

  for (const asset of ASSETS) {
    // Déjà présent sur le serveur
    if (existing.has(asset.name)) {
      const id = existing.get(asset.name)
      saved[asset.name] = id
      console.log(`⏭️  ${asset.name} → déjà présent (ID: ${id})`)
      skip++
      continue
    }

    try {
      const url = `${COC_ASSETS_BASE}/${asset.path}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      let buffer = Buffer.from(await res.arrayBuffer())
      if (buffer.length > MAX_SIZE) {
        console.log(`   ⚠️  ${asset.name} — image ${(buffer.length / 1024 / 1024).toFixed(1)}MB → resize 128x128`)
        buffer = await resizeIfNeeded(buffer)
      }
      const emoji = await guild.emojis.create({ attachment: buffer, name: asset.name })

      saved[asset.name] = emoji.id
      console.log(`✅ ${asset.name} → ID: ${emoji.id}`)
      ok++
    } catch (err) {
      console.error(`❌ ${asset.name} → ${err.message}`)
      fail++
    }

    await sleep(500)
  }

  // Sauvegarder dans cocEmojis.json
  const output = { updated_at: new Date().toISOString(), emojis: saved }
  writeFileSync(EMOJIS_PATH, JSON.stringify(output, null, 2), 'utf8')

  console.log(`\n─────────────────────────────────`)
  console.log(`✅ ${ok} uploadés  ⏭️  ${skip} ignorés  ❌ ${fail} échoués`)
  console.log(`💾 IDs sauvegardés dans src/config/cocEmojis.json`)

  process.exit(0)
})

client.login(process.env.DISCORD_TOKEN)
