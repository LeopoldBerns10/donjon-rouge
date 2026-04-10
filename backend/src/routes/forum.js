import { Router } from 'express'
import {
  getPosts,
  getPost,
  createPost,
  editPost,
  pinPost,
  replyPost,
  likePost,
  deletePost,
  getCategories,
  getCategoryPosts,
  createCategoryPost,
  toggleReaction,
  getReactions,
  getUserReactions,
  getAllPostsReactions,
} from '../controllers/forumController.js'
import authMiddleware from '../middleware/auth.js'

const router = Router()

// ── Anciennes routes (compatibilité) ─────────────────────────────────────
router.get('/posts', getPosts)
router.get('/posts/:id', getPost)
router.post('/posts', authMiddleware, createPost)
router.patch('/posts/:id', authMiddleware, editPost)
router.delete('/posts/:id', authMiddleware, deletePost)
router.post('/posts/:id/reply', authMiddleware, replyPost)
router.post('/posts/:id/like', authMiddleware, likePost)
router.post('/posts/:id/pin', authMiddleware, pinPost)

// ── Nouvelles routes Discord-like ─────────────────────────────────────────
router.get('/categories', getCategories)
router.get('/categories/:catId/posts', getCategoryPosts)
router.post('/category-posts', authMiddleware, createCategoryPost)

// Réactions
router.post('/posts/:id/reactions', authMiddleware, toggleReaction)
router.get('/posts/:id/reactions', getReactions)
router.get('/posts/:id/my-reactions', authMiddleware, getUserReactions)
router.get('/reactions', getAllPostsReactions)

export default router
