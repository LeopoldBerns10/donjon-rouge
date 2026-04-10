import jwt from 'jsonwebtoken'

// ── Vérification du token JWT ─────────────────────────────────────────────────

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' })
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' })
  }
}

// Export par défaut (rétrocompatibilité avec toutes les routes existantes)
export default verifyToken

// Export nommé (pour les nouvelles routes admin)
export { verifyToken }

// Alias pour warSignups.js
export const requireAuth = verifyToken

// ── Middlewares de permissions ────────────────────────────────────────────────

// Seul superadmin peut gérer les rôles
export function requireSuperAdmin(req, res, next) {
  if (req.user?.site_role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé au super administrateur' })
  }
  next()
}

// Admin ou superadmin
export function requireAdmin(req, res, next) {
  if (!['admin', 'superadmin'].includes(req.user?.site_role)) {
    return res.status(403).json({ error: 'Accès administrateur requis' })
  }
  next()
}

// Gestion des catégories forum (chef de clan ou admin)
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
