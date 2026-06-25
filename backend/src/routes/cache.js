import { Router } from 'express'
import { requireBotSecret } from '../middleware/botAuth.js'
import { flushJdcCaches } from '../services/cacheService.js'

const router = Router()

router.post('/flush/players', requireBotSecret, async (req, res) => {
  try {
    await flushJdcCaches()
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

export default router
