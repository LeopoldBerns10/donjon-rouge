import { Router } from 'express'
import { login, changePassword, logout, me } from '../controllers/authController.js'
import authMiddleware from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = Router()

router.post('/login', authLimiter, login)
router.post('/change-password', authMiddleware, changePassword)
router.post('/logout', logout)
router.get('/me', authMiddleware, me)

export default router
