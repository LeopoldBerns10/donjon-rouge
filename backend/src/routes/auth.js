import { Router } from 'express'
import { login, changePassword, logout, me } from '../controllers/authController.js'
import { discordOAuth, discordMe } from '../controllers/discordAuthController.js'
import authMiddleware from '../middleware/auth.js'
import { dashboardAuth } from '../middleware/dashboardAuth.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = Router()

router.post('/login', authLimiter, login)
router.post('/change-password', authMiddleware, changePassword)
router.post('/logout', logout)
router.get('/me', authMiddleware, me)

// Discord OAuth2 pour le dashboard admin
router.post('/discord', authLimiter, discordOAuth)
router.get('/discord/me', dashboardAuth, discordMe)

export default router
