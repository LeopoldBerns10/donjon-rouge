import { Router } from 'express'
import {
  getPosts,
  getPost,
  createPost,
  editPost,
  pinPost,
  replyPost,
  likePost,
  deletePost
} from '../controllers/forumController.js'
import authMiddleware from '../middleware/auth.js'

const router = Router()

router.get('/posts', getPosts)
router.get('/posts/:id', getPost)
router.post('/posts', authMiddleware, createPost)
router.patch('/posts/:id', authMiddleware, editPost)
router.delete('/posts/:id', authMiddleware, deletePost)
router.post('/posts/:id/reply', authMiddleware, replyPost)
router.post('/posts/:id/like', authMiddleware, likePost)
router.post('/posts/:id/pin', authMiddleware, pinPost)

export default router
