import bcrypt from 'bcryptjs'
import supabase from '../lib/supabase.js'
import { syncMembers } from '../services/syncMembers.js'

// Liste tous les utilisateurs actifs (partis depuis moins de 48h inclus)
export async function getUsers(req, res) {
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString()
  const { data, error } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, has_custom_password, is_disabled, last_login, created_at, clan_tag')
    .or(`left_at.is.null,left_at.gt.${cutoff}`)
    .order('coc_name')

  if (error) return res.status(500).json({ error: error.message })

  return res.json(data || [])
}

// Reset mot de passe → remet le coc_tag comme mdp
export async function resetPassword(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('coc_tag')
    .eq('id', userId)
    .single()

  if (fetchErr || !user) return res.status(404).json({ error: 'Utilisateur non trouvé' })

  const hash = await bcrypt.hash(user.coc_tag, 10)

  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash, has_custom_password: false })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

// Promouvoir en admin (superadmin uniquement)
export async function promoteUser(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { data: target } = await supabase
    .from('users')
    .select('site_role, coc_name')
    .eq('id', userId)
    .single()

  if (target?.site_role === 'superadmin') {
    return res.status(403).json({ error: 'Impossible de modifier un super administrateur' })
  }

  const { error } = await supabase
    .from('users')
    .update({ site_role: 'admin' })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

// Retirer le rôle admin (superadmin uniquement)
export async function demoteUser(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { data: target } = await supabase
    .from('users')
    .select('site_role')
    .eq('id', userId)
    .single()

  if (target?.site_role === 'superadmin') {
    return res.status(403).json({ error: 'Impossible de modifier un super administrateur' })
  }

  const { error } = await supabase
    .from('users')
    .update({ site_role: 'member' })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

// Désactiver un compte (superadmin uniquement)
export async function disableUser(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { error } = await supabase
    .from('users')
    .update({ is_disabled: true })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

// Réactiver un compte (superadmin uniquement)
export async function enableUser(req, res) {
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { error } = await supabase
    .from('users')
    .update({ is_disabled: false })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

// Classement global performance (superadmin uniquement)
export async function getPerformanceAll(req, res) {
  try {
    const { data: rows, error } = await supabase
      .from('member_participation')
      .select('coc_tag, coc_name, event_type, participated, attack_percentage, double_perf, event_date')
      .order('event_date', { ascending: false })
    if (error) throw error

    const byTag = {}
    for (const row of (rows || [])) {
      if (!byTag[row.coc_tag]) {
        byTag[row.coc_tag] = { coc_tag: row.coc_tag, coc_name: row.coc_name, gdc: [], jdc: [], ldc: [] }
      }
      if (row.event_type === 'gdc') byTag[row.coc_tag].gdc.push(row)
      else if (row.event_type === 'jdc') byTag[row.coc_tag].jdc.push(row)
      else if (row.event_type === 'ldc') byTag[row.coc_tag].ldc.push(row)
    }

    const result = Object.values(byTag).map(m => {
      const gdcRows = m.gdc
      const jdcRows = m.jdc
      const ldcRows = m.ldc
      const gdcParticipated = gdcRows.filter(r => r.participated).length
      const withPct = gdcRows.filter(r => r.attack_percentage != null)
      const avgAttack = withPct.length > 0
        ? Math.round(withPct.reduce((s, r) => s + r.attack_percentage, 0) / withPct.length)
        : null
      const jdcParticipated = jdcRows.filter(r => r.participated).length
      const ldcParticipated = ldcRows.filter(r => r.participated).length
      const ldcWithPct = ldcRows.filter(r => r.attack_percentage != null)
      const ldcAvgAttack = ldcWithPct.length > 0
        ? Math.round(ldcWithPct.reduce((s, r) => s + r.attack_percentage, 0) / ldcWithPct.length)
        : null
      const totalEvents = gdcRows.length + jdcRows.length + ldcRows.length
      const totalParticipated = gdcParticipated + jdcParticipated + ldcParticipated
      const activityScore = totalEvents > 0 ? Math.round((totalParticipated / totalEvents) * 100) : 0
      return {
        coc_tag: m.coc_tag,
        coc_name: m.coc_name,
        gdc: {
          guerresJouees: gdcRows.length,
          participated: gdcParticipated,
          taux: gdcRows.length > 0 ? Math.round((gdcParticipated / gdcRows.length) * 100) : 0,
          avgAttackPercent: avgAttack,
          doublePerfs: gdcRows.filter(r => r.double_perf).length,
        },
        jdc: {
          sessionsJouees: jdcRows.length,
          participated: jdcParticipated,
          taux: jdcRows.length > 0 ? Math.round((jdcParticipated / jdcRows.length) * 100) : 0,
        },
        ldc: {
          roundsJoues: ldcRows.length,
          participated: ldcParticipated,
          taux: ldcRows.length > 0 ? Math.round((ldcParticipated / ldcRows.length) * 100) : 0,
          avgAttackPercent: ldcAvgAttack,
          doublePerfs: ldcRows.filter(r => r.double_perf).length,
        },
        activityScore,
      }
    }).sort((a, b) => b.activityScore - a.activityScore)

    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// Fiche détaillée performance d'un membre (superadmin uniquement)
export async function getPerformanceDetail(req, res) {
  try {
    const { coc_tag } = req.params
    const { data: rows, error } = await supabase
      .from('member_participation')
      .select('event_type, event_date, participated, attack_percentage, double_perf, coc_name')
      .eq('coc_tag', coc_tag)
      .order('event_date', { ascending: false })
    if (error) throw error

    const events = rows || []
    const gdcRows = events.filter(r => r.event_type === 'gdc')
    const jdcRows = events.filter(r => r.event_type === 'jdc')
    const ldcRows = events.filter(r => r.event_type === 'ldc')
    const gdcParticipated = gdcRows.filter(r => r.participated).length
    const withPct = gdcRows.filter(r => r.attack_percentage != null)
    const avgAttack = withPct.length > 0
      ? Math.round(withPct.reduce((s, r) => s + r.attack_percentage, 0) / withPct.length)
      : null
    const jdcParticipated = jdcRows.filter(r => r.participated).length
    const ldcParticipated = ldcRows.filter(r => r.participated).length
    const ldcWithPct = ldcRows.filter(r => r.attack_percentage != null)
    const ldcAvgAttack = ldcWithPct.length > 0
      ? Math.round(ldcWithPct.reduce((s, r) => s + r.attack_percentage, 0) / ldcWithPct.length)
      : null
    const totalParticipated = gdcParticipated + jdcParticipated + ldcParticipated
    const activityScore = events.length > 0 ? Math.round((totalParticipated / events.length) * 100) : 0

    return res.json({
      coc_tag,
      coc_name: events[0]?.coc_name || coc_tag,
      gdc: {
        guerresJouees: gdcRows.length,
        participated: gdcParticipated,
        taux: gdcRows.length > 0 ? Math.round((gdcParticipated / gdcRows.length) * 100) : 0,
        avgAttackPercent: avgAttack,
        doublePerfs: gdcRows.filter(r => r.double_perf).length,
      },
      jdc: {
        sessionsJouees: jdcRows.length,
        participated: jdcParticipated,
        taux: jdcRows.length > 0 ? Math.round((jdcParticipated / jdcRows.length) * 100) : 0,
      },
      ldc: {
        roundsJoues: ldcRows.length,
        participated: ldcParticipated,
        taux: ldcRows.length > 0 ? Math.round((ldcParticipated / ldcRows.length) * 100) : 0,
        avgAttackPercent: ldcAvgAttack,
        doublePerfs: ldcRows.filter(r => r.double_perf).length,
      },
      activityScore,
      history: events,
    })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// Déclencher manuellement la sync CoC (superadmin uniquement)
export async function triggerSync(req, res) {
  try {
    const result = await syncMembers()
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// ── Automodération v2 ─────────────────────────────────────────────────────────

export async function getAutomodConfig(req, res) {
  const { data, error } = await supabase
    .from('mod_config')
    .select('key, value, updated_at, updated_by')
  if (error) return res.status(500).json({ error: error.message })
  const config = {}
  for (const row of (data || [])) config[row.key] = row.value
  return res.json(config)
}

export async function updateAutomodConfig(req, res) {
  const updates = req.body
  if (!updates || typeof updates !== 'object' || Array.isArray(updates)) {
    return res.status(400).json({ error: 'Body invalide' })
  }
  const now       = new Date().toISOString()
  const updatedBy = req.user?.coc_name || req.discordUser?.global_name || req.discordUser?.username || 'unknown'
  const upserts   = Object.entries(updates).map(([key, value]) => ({ key, value, updated_at: now, updated_by: updatedBy }))
  const { error } = await supabase.from('mod_config').upsert(upserts, { onConflict: 'key' })
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

export async function getAutomodWarnings(req, res) {
  const limit  = Math.min(parseInt(req.query.limit)  || 50, 200)
  const offset = parseInt(req.query.offset) || 0
  const { data, error, count } = await supabase
    .from('mod_warnings')
    .select('*', { count: 'exact' })
    .order('warned_at', { ascending: false })
    .range(offset, offset + limit - 1)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ data: data || [], total: count || 0 })
}

export async function deleteAutomodWarning(req, res) {
  const { id } = req.params
  const { error } = await supabase.from('mod_warnings').delete().eq('id', id)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

export async function purgeAutomodMemberWarnings(req, res) {
  const { discord_id } = req.params
  if (!discord_id) return res.status(400).json({ error: 'discord_id requis' })
  const { error } = await supabase.from('mod_warnings').delete().eq('discord_id', discord_id)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

export async function getDiscordChannels(req, res) {
  const guildId = process.env.DISCORD_GUILD_ID
  const token   = process.env.DISCORD_BOT_TOKEN
  if (!guildId || !token) return res.json([])
  try {
    const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${token}` },
    })
    if (!r.ok) return res.json([])
    const channels = await r.json()
    return res.json(
      channels
        .filter(c => c.type === 0 || c.type === 5)
        .map(c => ({ id: c.id, name: c.name, parent_id: c.parent_id }))
        .sort((a, b) => a.name.localeCompare(b.name))
    )
  } catch { return res.json([]) }
}

export async function getDiscordRoles(req, res) {
  const guildId = process.env.DISCORD_GUILD_ID
  const token   = process.env.DISCORD_BOT_TOKEN
  if (!guildId || !token) return res.json([])
  try {
    const r = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
      headers: { Authorization: `Bot ${token}` },
    })
    if (!r.ok) return res.json([])
    const roles = await r.json()
    return res.json(
      roles
        .filter(r => !r.managed && r.name !== '@everyone')
        .map(r => ({ id: r.id, name: r.name, color: r.color }))
        .sort((a, b) => b.position - a.position)
    )
  } catch { return res.json([]) }
}

// ── Accès Dashboard (superadmin uniquement) ───────────────────────────────────

const DEFAULT_DASHBOARD_PERMISSIONS = {
  home: 'read', welcome: 'none', members: 'read',
  messages: 'none', birthdays: 'read', polls: 'read',
  route_infinie: 'read', events: 'read',
  config: 'none', logs: 'none', moderation: 'write',
}

export async function getDashboardAccess(req, res) {
  const { data, error } = await supabase
    .from('dashboard_access')
    .select('*')
    .order('granted_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  return res.json(data || [])
}

export async function grantDashboardAccess(req, res) {
  const { discord_id, discord_username, permissions } = req.body
  if (!discord_id) return res.status(400).json({ error: 'discord_id requis' })
  const { error } = await supabase.from('dashboard_access').upsert({
    discord_id,
    discord_username: discord_username || null,
    permissions: permissions || DEFAULT_DASHBOARD_PERMISSIONS,
    granted_by: req.user?.coc_name || 'superadmin',
    granted_at: new Date().toISOString(),
  }, { onConflict: 'discord_id' })
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

export async function updateDashboardPermissions(req, res) {
  const { discord_id } = req.params
  const { permissions } = req.body
  if (!permissions) return res.status(400).json({ error: 'permissions requis' })
  const { error } = await supabase
    .from('dashboard_access')
    .update({ permissions })
    .eq('discord_id', discord_id)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

export async function revokeDashboardAccess(req, res) {
  const { discord_id } = req.params
  const { error } = await supabase
    .from('dashboard_access')
    .delete()
    .eq('discord_id', discord_id)
  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}

// ── Supprimer définitivement un compte (superadmin uniquement) ────────────────

export async function deleteUser(req, res) {
  const { userId } = req.params
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  // Vérifier que la cible n'est pas superadmin
  const { data: target } = await supabase
    .from('users')
    .select('site_role, coc_name')
    .eq('id', userId)
    .single()

  if (!target) return res.status(404).json({ error: 'Utilisateur non trouvé' })
  if (target.site_role === 'superadmin') {
    return res.status(403).json({ error: 'Impossible de supprimer un super administrateur' })
  }

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
}
