import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../lib/supabase.js'

export async function login(req, res) {
  const { email, password, coc_name, coc_tag } = req.body

  // Admin login
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
      { userId: admin.id, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRY || '7d' }
    )

    return res.json({
      token,
      user: { id: admin.id, email: admin.email, isAdmin: true },
    })
  }

  // Member login
  if (!coc_name || !coc_tag) {
    return res.status(400).json({ error: 'Pseudo CoC et tag CoC requis' })
  }

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('coc_name', coc_name)
    .single()

  if (!user) return res.status(401).json({ error: 'Identifiants incorrects' })

  const valid = await bcrypt.compare(coc_tag, user.password_hash)
  if (!valid) return res.status(401).json({ error: 'Identifiants incorrects' })

  const token = jwt.sign(
    {
      userId: user.id,
      cocTag: user.coc_tag,
      cocName: user.coc_name,
      cocRole: user.coc_role,
      isAdmin: false,
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
      cocTag: user.coc_tag,
      cocName: user.coc_name,
      cocRole: user.coc_role,
      isAdmin: false,
    },
  })
}

export async function changePassword(req, res) {
  const { newPassword } = req.body
  if (!newPassword) return res.status(400).json({ error: 'Nouveau mot de passe requis' })

  const { userId } = req.user
  const password_hash = await bcrypt.hash(newPassword, 10)

  const { error } = await supabase
    .from('users')
    .update({ password_hash, is_first_login: false, updated_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) return res.status(500).json({ error: 'Erreur lors du changement de mot de passe' })

  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()

  return res.json({
    user: {
      id: user.id,
      cocTag: user.coc_tag,
      cocName: user.coc_name,
      cocRole: user.coc_role,
      isAdmin: false,
    },
  })
}

export async function logout(req, res) {
  res.json({ ok: true })
}

export async function me(req, res) {
  const { userId, isAdmin } = req.user

  if (isAdmin) {
    const { data: admin } = await supabase
      .from('admin_account')
      .select('id, email, created_at')
      .eq('id', userId)
      .single()
    if (!admin) return res.status(404).json({ error: 'Compte introuvable' })
    return res.json({ id: admin.id, email: admin.email, isAdmin: true })
  }

  const { data: user } = await supabase.from('users').select('*').eq('id', userId).single()
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })

  return res.json({
    id: user.id,
    cocTag: user.coc_tag,
    cocName: user.coc_name,
    cocRole: user.coc_role,
    isAdmin: false,
    isFirstLogin: user.is_first_login,
  })
}
