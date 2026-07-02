export default function adminOnly(req, res, next) {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.site_role)) {
    return res.status(403).json({ error: 'Accès réservé aux administrateurs' })
  }
  next()
}
