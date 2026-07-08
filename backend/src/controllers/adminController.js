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
        byTag[row.coc_tag] = { coc_tag: row.coc_tag, coc_name: row.coc_name, gdc: [], jdc: [] }
      }
      if (row.event_type === 'gdc') byTag[row.coc_tag].gdc.push(row)
      else byTag[row.coc_tag].jdc.push(row)
    }

    const result = Object.values(byTag).map(m => {
      const gdcRows = m.gdc
      const jdcRows = m.jdc
      const gdcParticipated = gdcRows.filter(r => r.participated).length
      const withPct = gdcRows.filter(r => r.attack_percentage != null)
      const avgAttack = withPct.length > 0
        ? Math.round(withPct.reduce((s, r) => s + r.attack_percentage, 0) / withPct.length)
        : null
      const jdcParticipated = jdcRows.filter(r => r.participated).length
      const totalEvents = gdcRows.length + jdcRows.length
      const totalParticipated = gdcParticipated + jdcParticipated
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
    const gdcParticipated = gdcRows.filter(r => r.participated).length
    const withPct = gdcRows.filter(r => r.attack_percentage != null)
    const avgAttack = withPct.length > 0
      ? Math.round(withPct.reduce((s, r) => s + r.attack_percentage, 0) / withPct.length)
      : null
    const jdcParticipated = jdcRows.filter(r => r.participated).length
    const totalParticipated = gdcParticipated + jdcParticipated
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

// Supprimer définitivement un compte (superadmin uniquement)
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
