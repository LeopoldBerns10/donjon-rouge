import bcrypt from 'bcryptjs'
import supabase from '../lib/supabase.js'

function canAdmin(role) {
  return role === 'admin' || role === 'superadmin'
}

export async function getUsers(req, res) {
  if (!canAdmin(req.user.site_role)) return res.status(403).json({ error: 'Accès refusé' })

  const { data, error } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, has_custom_password, is_disabled, created_at')
    .order('coc_name')

  if (error) return res.status(500).json({ error: error.message })

  const userIds = (data || []).map((u) => u.id)

  // Get latest session per user
  const { data: sessions } = await supabase
    .from('user_sessions')
    .select('user_id, last_seen, is_online')
    .in('user_id', userIds)
    .order('last_seen', { ascending: false })

  const sessionMap = {}
  for (const s of sessions || []) {
    if (!sessionMap[s.user_id]) sessionMap[s.user_id] = s
  }

  res.json(
    (data || []).map((u) => ({
      ...u,
      last_seen: sessionMap[u.id]?.last_seen || null,
      is_online: sessionMap[u.id]?.is_online || false,
    }))
  )
}

export async function resetPassword(req, res) {
  if (!canAdmin(req.user.site_role)) return res.status(403).json({ error: 'Accès refusé' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { data: user } = await supabase.from('users').select('coc_tag').eq('id', userId).single()
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  const password_hash = await bcrypt.hash(user.coc_tag, 10)
  const { error } = await supabase
    .from('users')
    .update({ password_hash, has_custom_password: false, is_first_login: true })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

export async function promoteUser(req, res) {
  if (req.user.site_role !== 'superadmin') return res.status(403).json({ error: 'Réservé au superadmin' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { error } = await supabase.from('users').update({ site_role: 'admin' }).eq('id', userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

export async function demoteUser(req, res) {
  if (req.user.site_role !== 'superadmin') return res.status(403).json({ error: 'Réservé au superadmin' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { error } = await supabase.from('users').update({ site_role: 'member' }).eq('id', userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

export async function disableUser(req, res) {
  if (req.user.site_role !== 'superadmin') return res.status(403).json({ error: 'Réservé au superadmin' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { error } = await supabase.from('users').update({ is_disabled: true }).eq('id', userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}

export async function enableUser(req, res) {
  if (req.user.site_role !== 'superadmin') return res.status(403).json({ error: 'Réservé au superadmin' })

  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'userId requis' })

  const { error } = await supabase.from('users').update({ is_disabled: false }).eq('id', userId)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
}
