import bcrypt from 'bcryptjs'
import supabase from '../lib/supabase.js'

// Liste tous les utilisateurs
export async function getUsers(req, res) {
  const { data, error } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, has_custom_password, is_disabled, last_login, created_at')
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
