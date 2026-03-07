import jwt from 'jsonwebtoken'

export default function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = payload
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide' })
  }
}

export function requireAuth(req, res, next) {
  return authMiddleware(req, res, next)
}

export function requireAdmin(req, res, next) {
  authMiddleware(req, res, () => {
    if (!req.user?.isAdmin) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
    }
    next()
  })
}

export function requireChief(req, res, next) {
  authMiddleware(req, res, () => {
    const { cocRole, isAdmin } = req.user || {}
    if (!isAdmin && cocRole !== 'leader' && cocRole !== 'coLeader') {
      return res.status(403).json({ error: 'Accès réservé aux chefs de clan' })
    }
    next()
  })
}
