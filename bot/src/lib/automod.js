const supabase = require('../supabase.js')
const { log }  = require('./botLogger.js')

const CHEF_ROLE_ID    = '611123759864348672'
const ADJOINT_ROLE_ID = '1297318759396278425'
const LOG_CHANNEL_ID  = '1522722935918559364'

// ── Cache mots interdits (TTL 5 min) ──────────────────────────────────────────

let bannedWordsCache  = []
let cacheLastRefresh  = 0
const CACHE_TTL       = 5 * 60 * 1000

async function getBannedWords() {
  if (Date.now() - cacheLastRefresh > CACHE_TTL) {
    const { data } = await supabase.from('mod_banned_words').select('word')
    bannedWordsCache = (data || []).map(r => r.word.toLowerCase())
    cacheLastRefresh = Date.now()
  }
  return bannedWordsCache
}

function invalidateBannedWordsCache() { cacheLastRefresh = 0 }

// ── Tracker anti-spam (mémoire) ───────────────────────────────────────────────

const spamTracker = new Map() // userId → [{ norm, ts }]
const SPAM_WINDOW    = 10_000 // 10 secondes
const SPAM_THRESHOLD = 5      // messages similaires

function normalize(text) {
  return text.toLowerCase().replace(/\s+/g, ' ').trim()
}

function simplify(text) {
  return text.toLowerCase().replace(/[^a-z0-9àâçéèêëîïôùûüÿœæ]/g, '')
}

function isSimilar(a, b) {
  return a === b || simplify(a) === simplify(b)
}

function checkSpam(userId, content) {
  const now  = Date.now()
  const norm = normalize(content)

  const history = (spamTracker.get(userId) || []).filter(e => now - e.ts < SPAM_WINDOW)
  history.push({ norm, ts: now })
  spamTracker.set(userId, history)

  const similar = history.filter(e => isSimilar(e.norm, norm))
  if (similar.length >= SPAM_THRESHOLD) {
    spamTracker.set(userId, [])
    return 'Spam (messages répétés)'
  }
  return null
}

// ── Comportements inappropriés (liste de base, enrichie via mots interdits) ───

const INAPPROPRIATE_PATTERNS = [
  /\b(connard|salope|fdp|fils\s*de\s*put[ée]|enculé|enc[uù]l[eé]|pd\b|attard[eé]|b[aâ]tard|nique\s*(ta|ton|tes|sa|son|ses)|va\s+te\s+faire|ferme\s+ta\s+gueule|ta\s+gueule|grosse?\s+merde|t(?:a|as)\s+mère|ngl|imbécile)\b/i,
]

function checkInappropriate(content) {
  const norm = normalize(content)
  for (const pattern of INAPPROPRIATE_PATTERNS) {
    const m = norm.match(pattern)
    if (m) return `Comportement inapproprié : « ${m[0]} »`
  }
  return null
}

// ── Mots interdits ────────────────────────────────────────────────────────────

function checkBannedWords(content, bannedWords) {
  const norm = normalize(content)
  for (const word of bannedWords) {
    if (norm.includes(word)) return `Mot interdit : « ${word} »`
  }
  return null
}

// ── Sanctions progressives ────────────────────────────────────────────────────

async function sendDM(member, content) {
  try { await member.send(content) } catch { /* DMs fermés */ }
}

async function doMute(member, durationMs, originalReason, client, durationLabel) {
  const muteKey = `MUTE_${durationLabel.toUpperCase().replace(/\s+/g, '_')}`

  try {
    await member.timeout(durationMs, originalReason)
  } catch (e) {
    await log(client, 'MODERATION', `❌ Timeout échoué pour **${member.displayName}** : ${e.message}`, true)
  }

  const now = new Date()
  await supabase.from('mod_warnings').insert({
    discord_id: member.id,
    reason:     `${muteKey} — ${originalReason}`,
    warned_at:  now.toISOString(),
    expires_at: new Date(now.getTime() + durationMs).toISOString(),
  })

  await log(client, 'MODERATION', `🔇 **${member.displayName}** mis en sourdine **${durationLabel}** — ${originalReason}`)
}

async function applyModeration(message, member, reason, client) {
  await message.delete().catch(() => {})

  const discordId = member.id
  const now       = new Date()

  const [{ data: activeWarns }, { count: muteCount }] = await Promise.all([
    supabase
      .from('mod_warnings')
      .select('id')
      .eq('discord_id', discordId)
      .not('reason', 'like', 'MUTE_%')
      .gt('expires_at', now.toISOString()),
    supabase
      .from('mod_warnings')
      .select('id', { count: 'exact', head: true })
      .eq('discord_id', discordId)
      .like('reason', 'MUTE_%'),
  ])

  const warnCount  = activeWarns?.length ?? 0
  const totalMutes = muteCount ?? 0

  if (totalMutes >= 2) {
    await sendDM(member, `🔇 Tu as été mis en sourdine **24 heures** — ${reason}`)
    await doMute(member, 24 * 60 * 60 * 1000, reason, client, '24 heures')

  } else if (totalMutes === 1) {
    await sendDM(member, `🔇 Tu as été mis en sourdine **1 heure** — ${reason}`)
    await doMute(member, 60 * 60 * 1000, reason, client, '1 heure')

  } else if (warnCount >= 2) {
    // 3ème avertissement → mute 10 min + reset des warnings actifs
    await sendDM(member, `⚠️ Avertissement 3/3 — ${reason}\nTu as été mis en sourdine pour **10 minutes**.`)
    await doMute(member, 10 * 60 * 1000, reason, client, '10 minutes')
    await supabase
      .from('mod_warnings')
      .update({ expires_at: now.toISOString() })
      .eq('discord_id', discordId)
      .not('reason', 'like', 'MUTE_%')
      .gt('expires_at', now.toISOString())

  } else {
    // 1er ou 2ème avertissement
    const num = warnCount + 1
    await sendDM(member, `⚠️ Avertissement ${num}/3 — ${reason}`)
    await supabase.from('mod_warnings').insert({
      discord_id: discordId,
      reason,
      warned_at:  now.toISOString(),
      expires_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    })
    await log(client, 'MODERATION', `⚠️ **${member.displayName}** — Avertissement ${num}/3 — ${reason}`)
  }
}

// ── Point d'entrée ────────────────────────────────────────────────────────────

async function checkAndModerate(message, client) {
  if (message.author.bot)             return false
  if (message.channelId === LOG_CHANNEL_ID) return false
  if (!message.member)                return false
  if (message.member.roles.cache.has(CHEF_ROLE_ID))    return false
  if (message.member.roles.cache.has(ADJOINT_ROLE_ID)) return false

  const content = message.content || ''
  if (!content.trim()) return false

  // 1. Spam
  const spamReason = checkSpam(message.author.id, content)
  if (spamReason) {
    await applyModeration(message, message.member, spamReason, client)
    return true
  }

  // 2. Mots interdits (Supabase)
  const bannedWords  = await getBannedWords()
  const bannedReason = checkBannedWords(content, bannedWords)
  if (bannedReason) {
    await applyModeration(message, message.member, bannedReason, client)
    return true
  }

  // 3. Comportements inappropriés (patterns intégrés)
  const badReason = checkInappropriate(content)
  if (badReason) {
    await applyModeration(message, message.member, badReason, client)
    return true
  }

  return false
}

module.exports = { checkAndModerate, invalidateBannedWordsCache }
