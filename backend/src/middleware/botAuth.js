export function requireBotSecret(req, res, next) {
  if (!process.env.BOT_SECRET || req.headers['x-bot-secret'] !== process.env.BOT_SECRET) {
    return res.status(401).json({ error: 'Non autorisé' })
  }
  next()
}
