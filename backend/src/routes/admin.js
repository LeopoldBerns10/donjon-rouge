import { Router } from 'express'
import verifyToken, { requireAdmin, requireSuperAdmin } from '../middleware/auth.js'
import {
  getUsers,
  resetPassword,
  promoteUser,
  demoteUser,
  disableUser,
  enableUser,
  deleteUser,
  triggerSync,
  getPerformanceAll,
  getPerformanceDetail,
  getBannedWords,
  addBannedWord,
  deleteBannedWord,
} from '../controllers/adminController.js'

const router = Router()

router.get('/users', verifyToken, requireAdmin, getUsers)
router.post('/reset-password', verifyToken, requireAdmin, resetPassword)
router.post('/promote', verifyToken, requireSuperAdmin, promoteUser)
router.post('/demote', verifyToken, requireSuperAdmin, demoteUser)
router.post('/disable', verifyToken, requireSuperAdmin, disableUser)
router.post('/enable', verifyToken, requireSuperAdmin, enableUser)
router.delete('/users/:userId', verifyToken, requireSuperAdmin, deleteUser)
router.post('/sync-members', verifyToken, requireSuperAdmin, triggerSync)
router.get('/performance', verifyToken, requireSuperAdmin, getPerformanceAll)
router.get('/performance/:coc_tag', verifyToken, requireSuperAdmin, getPerformanceDetail)

router.get('/banned-words',          verifyToken, requireSuperAdmin, getBannedWords)
router.post('/banned-words',         verifyToken, requireSuperAdmin, addBannedWord)
router.delete('/banned-words/:wordId', verifyToken, requireSuperAdmin, deleteBannedWord)

export default router
