import { Router } from 'express'
import verifyToken, { requireAdmin, requireSuperAdmin } from '../middleware/auth.js'
import {
  getUsers,
  resetPassword,
  promoteUser,
  demoteUser,
  disableUser,
  enableUser,
} from '../controllers/adminController.js'

const router = Router()

router.get('/users', verifyToken, requireAdmin, getUsers)
router.post('/reset-password', verifyToken, requireAdmin, resetPassword)
router.post('/promote', verifyToken, requireSuperAdmin, promoteUser)
router.post('/demote', verifyToken, requireSuperAdmin, demoteUser)
router.post('/disable', verifyToken, requireSuperAdmin, disableUser)
router.post('/enable', verifyToken, requireSuperAdmin, enableUser)

export default router
