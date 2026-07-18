const supabase = require('../supabase.js')
const { log }  = require('./botLogger.js')

// ── Config cache ──────────────────────────────────────────────────────────────

let _config  = null
let _configTs = 0
const CONFIG_TTL = 5 * 60 * 1000

const DEFAULTS = {
  automod_enabled:        false,
  exempt_roles:           ['611123759864348672', '1297318759396278425'],
  exempt_members:         [],
  ignored_channels:       ['1522722935918559364'],
  banned_words_enabled:   true,
  banned_words_list:      [],
  spam_enabled:           true,
  spam_threshold:         5,
  spam_interval_seconds:  10,
  caps_enabled:           true,
  caps_threshold_percent: 70,
  caps_min_length:        10,
  links_enabled:          false,
  links_whitelist:        [],
  mentions_enabled:       true,
  mentions_max:           5,
  warn_threshold:         3,
  mute_durations:         [10, 60, 1440],
  warn_expiry_hours:      24,
  log_channel:            '1522722935918559364',
  warn_dm_enabled:        true,
}

async function getConfig() {
  if (_config && Date.now() - _configTs < CONFIG_TTL) return _config
  try {
    const { data } = await supabase.from('mod_config').select('key, value')
    if (data?.length) {
      const fresh = { ...DEFAULTS }
      for (const row of data) {
        const v = row.value
        if (typeof v === 'string' && (v.startsWith('[') || v.startsWith('{') || v === 'true' || v === 'false')) {
          try { fresh[row.key] = JSON.parse(v) } catch { fresh[row.key] = v }
        } else {
          fresh[row.key] = v
        }
      }
      _config  = fresh
      _configTs = Date.now()
    }
  } catch (e) {
    console.error('[automod] Erreur chargement config:', e.message)
  }
  return _config || DEFAULTS
}

function invalidateConfig() { _configTs = 0 }

// ── Spam tracker (mémoire) ────────────────────────────────────────────────────

const spamTracker = new Map() // userId → [{ norm, ts }]

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function similarity(a, b) {
  if (a === b) return 1.0
  const longer  = a.length >= b.length ? a : b
  const shorter = a.length >= b.length ? b : a
  if (longer.length === 0) return 1.0
  const pool = longer.split('')
  let matches = 0
  for (const ch of shorter) {
    const i = pool.indexOf(ch)
    if (i >= 0) { matches++; pool.splice(i, 1) }
  }
  return (2 * matches) / (shorter.length + longer.length)
}

// ── Détections ────────────────────────────────────────────────────────────────

function checkBannedWords(content, list) {
  const norm = normalize(content)
  for (const word of list) {
    if (norm.includes(word.toLowerCase())) return `Mot interdit : « ${word} »`
  }
  return null
}

function checkSpam(userId, content, threshold, intervalSec) {
  const now  = Date.now()
  const win  = intervalSec * 1000
  const norm = normalize(content)

  const history = (spamTracker.get(userId) || []).filter(e => now - e.ts < win)
  history.push({ norm, ts: now })
  spamTracker.set(userId, history)

  const similar = history.filter(e => similarity(e.norm, norm) >= 0.8)
  if (similar.length >= threshold) {
    spamTracker.set(userId, [])
    return 'Spam (messages répétés)'
  }
  return null
}

function checkCaps(content, thresholdPct, minLen) {
  if (content.length < minLen) return null
  const letters = content.replace(/[^a-zA-ZÀ-ÖØ-öø-ÿ]/g, '')
  if (letters.length < 3) return null
  const upper = letters.replace(/[^A-ZÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝ]/g, '')
  if ((upper.length / letters.length) * 100 >= thresholdPct) return 'Abus de majuscules'
  return null
}

function checkLinks(content, whitelist) {
  const urlRe = /https?:\/\/\S+|www\.\S+|\b[\w-]+\.(com|fr|net|org|io|gg|tv|me|co|uk|de|xyz)\b\S*/gi
  const matches = [...new Set(content.match(urlRe) || [])]
  for (const url of matches) {
    const domain = url.replace(/https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0].toLowerCase()
    const allowed = (whitelist || []).some(w => {
      const wl = w.toLowerCase().replace(/^www\./, '')
      return domain === wl || domain.endsWith('.' + wl)
    })
    if (!allowed) return `Lien non autorisé : ${domain}`
  }
  return null
}

function checkMentions(message, maxMentions) {
  const total = message.mentions.users.size + message.mentions.roles.size
  if (total > maxMentions) return `Trop de mentions (${total}/${maxMentions})`
  return null
}

// ── Sanctions progressives ────────────────────────────────────────────────────

async function sendDM(member, content) {
  try { await member.send(content) } catch { /* DMs fermés */ }
}

function fmtDuration(minutes) {
  return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)}h`
}

async function applyModeration(message, member, reason, type, conf, client) {
  await message.delete().catch(() => {})

  const discordId   = member.id
  const discordName = member.displayName
  const now         = new Date()
  const threshold   = Number(conf.warn_threshold) || 3

  // Insérer le warning de violation
  await supabase.from('mod_warnings').insert({
    discord_id:   discordId,
    discord_name: discordName,
    reason,
    type,
    warned_at:  now.toISOString(),
    expires_at: new Date(now.getTime() + (Number(conf.warn_expiry_hours) || 24) * 3600 * 1000).toISOString(),
    auto:       true,
  })

  // Compter les warnings actifs (hors mutes)
  const { count: activeCount } = await supabase
    .from('mod_warnings')
    .select('id', { count: 'exact', head: true })
    .eq('discord_id', discordId)
    .neq('type', 'mute')
    .gt('expires_at', now.toISOString())

  const warnCount = activeCount ?? 1
  const excerpt   = (message.content || '').slice(0, 100)

  if (warnCount >= threshold) {
    // Compter les mutes passés pour choisir la durée
    const { count: muteCount } = await supabase
      .from('mod_warnings')
      .select('id', { count: 'exact', head: true })
      .eq('discord_id', discordId)
      .eq('type', 'mute')

    const pastMutes  = muteCount ?? 0
    const durations  = conf.mute_durations || [10, 60, 1440]
    const durMin     = pastMutes === 0 ? durations[0] : pastMutes === 1 ? durations[1] : durations[2]
    const durMs      = Number(durMin) * 60 * 1000
    const durLabel   = fmtDuration(Number(durMin))

    // Timeout Discord
    try {
      await member.timeout(durMs, reason)
    } catch (e) {
      await log(client, 'MODERATION', `❌ Timeout échoué pour **${discordName}** : ${e.message}`, true)
    }

    // Enregistrer le mute
    await supabase.from('mod_warnings').insert({
      discord_id:   discordId,
      discord_name: discordName,
      reason:       `Mute ${durLabel} — ${reason}`,
      type:         'mute',
      warned_at:    now.toISOString(),
      expires_at:   new Date(now.getTime() + durMs).toISOString(),
      auto:         true,
    })

    // Reset des warnings actifs
    await supabase
      .from('mod_warnings')
      .delete()
      .eq('discord_id', discordId)
      .neq('type', 'mute')
      .gt('expires_at', now.toISOString())

    if (conf.warn_dm_enabled) {
      await sendDM(member, `🔇 Tu as été mis en sourdine **${durLabel}** — ${reason}`)
    }

    await log(client, 'MODERATION',
      `🔇 **${discordName}** | ${type} | « ${excerpt} » | Mute **${durLabel}**`)

  } else {
    // Avertissement simple
    if (conf.warn_dm_enabled) {
      const isPreLast = warnCount === threshold - 1
      const dm = isPreLast
        ? `⚠️ Avertissement ${warnCount}/${threshold} — ${reason} — ⚠️ Prochain message : **mute imminent !**`
        : `⚠️ Avertissement ${warnCount}/${threshold} — ${reason}`
      await sendDM(member, dm)
    }

    await log(client, 'MODERATION',
      `⚠️ **${discordName}** | ${type} | « ${excerpt} » | Avertissement ${warnCount}/${threshold}`)
  }
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

async function checkAndModerate(message, client) {
  if (message.author.bot) return false

  const conf = await getConfig()
  if (!conf.automod_enabled) return false

  if ((conf.ignored_channels || []).includes(message.channelId)) return false

  const member = message.member
  if (!member) return false

  if ((conf.exempt_members || []).includes(member.id)) return false
  for (const roleId of (conf.exempt_roles || [])) {
    if (member.roles.cache.has(roleId)) return false
  }

  const content = message.content || ''
  if (!content.trim()) return false

  // 1. Spam
  if (conf.spam_enabled) {
    const r = checkSpam(member.id, content, conf.spam_threshold, conf.spam_interval_seconds)
    if (r) { await applyModeration(message, member, r, 'spam', conf, client); return true }
  }

  // 2. Mots interdits
  if (conf.banned_words_enabled && (conf.banned_words_list || []).length > 0) {
    const r = checkBannedWords(content, conf.banned_words_list)
    if (r) { await applyModeration(message, member, r, 'banned_word', conf, client); return true }
  }

  // 3. Majuscules
  if (conf.caps_enabled) {
    const r = checkCaps(content, conf.caps_threshold_percent, conf.caps_min_length)
    if (r) { await applyModeration(message, member, r, 'caps', conf, client); return true }
  }

  // 4. Liens
  if (conf.links_enabled) {
    const r = checkLinks(content, conf.links_whitelist)
    if (r) { await applyModeration(message, member, r, 'links', conf, client); return true }
  }

  // 5. Mentions
  if (conf.mentions_enabled) {
    const r = checkMentions(message, conf.mentions_max)
    if (r) { await applyModeration(message, member, r, 'mentions', conf, client); return true }
  }

  return false
}

module.exports = { checkAndModerate, invalidateConfig }
