import { Router } from 'express'
import {
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement
} from '../controllers/announcementController.js'
import authMiddleware from '../middleware/auth.js'
import adminOnly from '../middleware/adminOnly.js'

const router = Router()

router.get('/', getAnnouncements)
router.post('/', authMiddleware, adminOnly, createAnnouncement)
router.put('/:id', authMiddleware, adminOnly, updateAnnouncement)

export default router
