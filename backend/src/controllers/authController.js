import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../lib/supabase.js'

// LOGIN — par coc_name (insensible à la casse)
export async function login(req, res) {
  const { coc_name, password } = req.body

  if (!coc_name || !password) {
    return res.status(400).json({ error: 'Identifiant et mot de passe requis' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, password_hash, has_custom_password, is_disabled')
    .ilike('coc_name', coc_name.trim())
    .single()

  if (error || !user) {
    return res.status(401).json({ error: 'Identifiant incorrect' })
  }

  if (user.is_disabled) {
    return res.status(403).json({ error: 'Compte désactivé' })
  }

  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    return res.status(401).json({ error: 'Mot de passe incorrect' })
  }

  const token = jwt.sign(
    {
      id: user.id,
      coc_name: user.coc_name,
      coc_tag: user.coc_tag,
      coc_role: user.coc_role,
      site_role: user.site_role || 'member',
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )

  return res.json({
    token,
    user: {
      id: user.id,
      coc_name: user.coc_name,
      coc_tag: user.coc_tag,
      coc_role: user.coc_role,
      site_role: user.site_role || 'member',
      has_custom_password: user.has_custom_password,
    },
  })
}

// CHANGER MOT DE PASSE
export async function changePassword(req, res) {
  const { newPassword } = req.body
  const userId = req.user.id

  if (!newPassword || newPassword.length < 1) {
    return res.status(400).json({ error: 'Mot de passe requis' })
  }

  const hash = await bcrypt.hash(newPassword, 10)

  const { error } = await supabase
    .from('users')
    .update({ password_hash: hash, has_custom_password: true })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: error.message })

  const { data: user } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, has_custom_password')
    .eq('id', userId)
    .single()

  return res.json({ user })
}

// LOGOUT
export async function logout(req, res) {
  res.json({ ok: true })
}

// ME — utilisateur connecté
export async function me(req, res) {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, has_custom_password')
    .eq('id', req.user.id)
    .single()

  if (error || !user) return res.status(404).json({ error: 'Utilisateur non trouvé' })

  return res.json(user)
}
