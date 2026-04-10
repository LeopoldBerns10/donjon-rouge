import { Router } from 'express'
import authMiddleware from '../middleware/auth.js'
import {
  getUsers,
  resetPassword,
  promoteUser,
  demoteUser,
  disableUser,
  enableUser,
} from '../controllers/adminController.js'

const router = Router()

router.use(authMiddleware)

router.get('/users', getUsers)
router.post('/reset-password', resetPassword)
router.post('/promote', promoteUser)
router.post('/demote', demoteUser)
router.post('/disable', disableUser)
router.post('/enable', enableUser)

export default router
