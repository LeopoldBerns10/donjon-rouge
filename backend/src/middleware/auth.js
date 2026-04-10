import jwt from 'jsonwebtoken'

// ── Vérification du token JWT ─────────────────────────────────────────────────

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

// ── Helpers de permissions ────────────────────────────────────────────────────

export const isSuperAdmin = (req) => req.user?.site_role === 'superadmin'

export const isAdmin = (req) =>
  ['superadmin', 'admin'].includes(req.user?.site_role)

export const isLeader = (req) =>
  ['superadmin', 'admin'].includes(req.user?.site_role) ||
  ['leader', 'coLeader', 'co-chef', 'chef'].some(
    (r) => req.user?.coc_role?.toLowerCase().includes(r.toLowerCase())
  )

// ── Middlewares de routes ─────────────────────────────────────────────────────

export function requireAdmin(req, res, next) {
  authMiddleware(req, res, () => {
    if (!isAdmin(req) && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
    }
    next()
  })
}

export function requireChief(req, res, next) {
  authMiddleware(req, res, () => {
    if (!isLeader(req) && !req.user?.isAdmin) {
      return res.status(403).json({ error: 'Accès réservé aux chefs de clan' })
    }
    next()
  })
}

export function canManageCategories(req, res, next) {
  const allowedSiteRoles = ['superadmin', 'admin']
  const allowedCocRoles = ['leader', 'coLeader', 'chef', 'co-chef', 'coleader']

  const siteRoleOk = allowedSiteRoles.includes(req.user?.site_role)
  const cocRoleOk = allowedCocRoles.some((r) =>
    req.user?.coc_role?.toLowerCase().includes(r.toLowerCase())
  )

  if (!siteRoleOk && !cocRoleOk) {
    return res.status(403).json({ error: 'Réservé aux chefs et administrateurs' })
  }
  next()
}
