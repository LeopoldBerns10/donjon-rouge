import { Router } from 'express'
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement
} from '../controllers/announcementController.js'
import authMiddleware, { requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', getAnnouncements)
router.post('/', authMiddleware, requireAdmin, createAnnouncement)
router.put('/:id', authMiddleware, requireAdmin, updateAnnouncement)

export default router
