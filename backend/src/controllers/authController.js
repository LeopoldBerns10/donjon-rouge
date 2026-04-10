import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../lib/supabase.js'

export async function login(req, res) {
  const { email, password, coc_tag } = req.body

  // Admin login (email + password)
  if (email) {
    if (!password) return res.status(400).json({ error: 'Email et mot de passe requis' })

    const { data: admin } = await supabase
      .from('admin_account')
      .select('*')
      .eq('email', email)
      .single()

    if (!admin) return res.status(401).json({ error: 'Identifiants incorrects' })

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' })

    const token = jwt.sign(
      { id: admin.id, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    )

    return res.json({
      token,
      user: { id: admin.id, email: admin.email, isAdmin: true },
    })
  }

  // Member login (pseudo + mot de passe, défaut = tag CoC)
  const { coc_name, password: memberPassword } = req.body
  if (!coc_name || !memberPassword) {
    return res.status(400).json({ error: 'Pseudo et mot de passe requis' })
  }

  const { data: user, error } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, password_hash, site_role, is_disabled, has_custom_password, is_first_login')
    .eq('coc_name', coc_name)
    .single()

  if (error || !user) return res.status(401).json({ error: 'Identifiants incorrects' })

  // DEBUG — vérification des données utilisateur
  console.log('LOGIN DEBUG - user found:', {
    id: user.id,
    coc_name: user.coc_name,
    coc_tag: user.coc_tag,
    site_role: user.site_role,
    coc_role: user.coc_role,
  })

  if (user.is_disabled) {
    return res.status(403).json({ error: 'Compte désactivé' })
  }

  const valid = await bcrypt.compare(memberPassword, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' })

  const token = jwt.sign(
    {
      id: user.id,
      coc_name: user.coc_name,
      coc_tag: user.coc_tag,
      coc_role: user.coc_role,
      site_role: user.site_role || 'member',
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '7d' }
  )

  if (user.is_first_login) {
    return res.json({ requirePasswordChange: true, token })
  }

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

export async function changePassword(req, res) {
  const { newPassword } = req.body
  if (!newPassword) return res.status(400).json({ error: 'Nouveau mot de passe requis' })

  const { id } = req.user
  const password_hash = await bcrypt.hash(newPassword, 10)

  const { error } = await supabase
    .from('users')
    .update({ password_hash, is_first_login: false, has_custom_password: true, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return res.status(500).json({ error: 'Erreur lors du changement de mot de passe' })

  const { data: user } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, has_custom_password')
    .eq('id', id)
    .single()

  return res.json({
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

export async function logout(req, res) {
  res.json({ ok: true })
}

export async function me(req, res) {
  const { id, isAdmin } = req.user

  if (isAdmin) {
    const { data: admin } = await supabase
      .from('admin_account')
      .select('id, email, created_at')
      .eq('id', id)
      .single()
    if (!admin) return res.status(404).json({ error: 'Compte introuvable' })
    return res.json({ id: admin.id, email: admin.email, isAdmin: true })
  }

  const { data: user } = await supabase
    .from('users')
    .select('id, coc_name, coc_tag, coc_role, site_role, has_custom_password, is_first_login')
    .eq('id', id)
    .single()
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  return res.json({
    id: user.id,
    coc_name: user.coc_name,
    coc_tag: user.coc_tag,
    coc_role: user.coc_role,
    site_role: user.site_role || 'member',
    has_custom_password: user.has_custom_password,
    is_first_login: user.is_first_login,
  })
}
