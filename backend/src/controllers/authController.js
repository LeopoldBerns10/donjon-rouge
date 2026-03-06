import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import supabase from '../lib/supabase.js'

export async function register(req, res) {
  const { username, password, coc_tag } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username et password requis' })
  }

  const { data: existing } = await supabase
    .from('players')
    .select('id')
    .eq('username', username)
    .single()

  if (existing) {
    return res.status(409).json({ error: 'Ce nom d\'utilisateur est déjà pris' })
  }

  const password_hash = await bcrypt.hash(password, 10)

  const { data: player, error } = await supabase
    .from('players')
    .insert({ username, password_hash, coc_tag: coc_tag || null, role: 'Membre', is_admin: false })
    .select()
    .single()

  if (error) {
    return res.status(500).json({ error: 'Erreur lors de la création du compte' })
  }

  const token = jwt.sign(
    { id: player.id, username: player.username, is_admin: player.is_admin, role: player.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY }
  )

  res.status(201).json({ token, player: sanitize(player) })
}

export async function login(req, res) {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ error: 'Username et password requis' })
  }

  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('username', username)
    .single()

  if (!player) {
    return res.status(401).json({ error: 'Identifiants incorrects' })
  }

  const valid = await bcrypt.compare(password, player.password_hash)
  if (!valid) {
    return res.status(401).json({ error: 'Identifiants incorrects' })
  }

  await supabase
    .from('players')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', player.id)

  const token = jwt.sign(
    { id: player.id, username: player.username, is_admin: player.is_admin, role: player.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY }
  )

  res.json({ token, player: sanitize(player) })
}

export async function me(req, res) {
  const { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', req.user.id)
    .single()

  if (!player) {
    return res.status(404).json({ error: 'Joueur introuvable' })
  }

  res.json(sanitize(player))
}

function sanitize(p) {
  const { password_hash, ...rest } = p
  return rest
}
