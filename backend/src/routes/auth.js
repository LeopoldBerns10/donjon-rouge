import { Router } from 'express'
import { register, login, me } from '../controllers/authController.js'
import authMiddleware from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimiter.js'

const router = Router()

router.post('/register', authLimiter, register)
router.post('/login', authLimiter, login)
router.get('/me', authMiddleware, me)

export default router
