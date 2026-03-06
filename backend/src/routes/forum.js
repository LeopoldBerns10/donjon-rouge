import { Router } from 'express'
import {
  getPosts,
  getPost,
  createPost,
  replyPost,
  likePost,
  deletePost
} from '../controllers/forumController.js'
import authMiddleware from '../middleware/auth.js'
import adminOnly from '../middleware/adminOnly.js'

const router = Router()

router.get('/posts', getPosts)
router.get('/posts/:id', getPost)
router.post('/posts', authMiddleware, createPost)
router.post('/posts/:id/reply', authMiddleware, replyPost)
router.post('/posts/:id/like', authMiddleware, likePost)
router.delete('/posts/:id', authMiddleware, adminOnly, deletePost)

export default router
