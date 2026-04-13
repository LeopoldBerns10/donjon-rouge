import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getCategoryPosts, getPost, createPost, updatePost, deletePost, pinPost,
  addComment, deleteComment, clearComments,
  toggleReaction, getReactions,
} from '../controllers/forumController.js'

const router = Router()

// ── Catégories ────────────────────────────────────────────────────────────────
router.get('/categories', getCategories)
router.post('/categories', requireAuth, createCategory)
router.put('/categories/:id', requireAuth, updateCategory)
router.delete('/categories/:id', requireAuth, deleteCategory)

// ── Posts ─────────────────────────────────────────────────────────────────────
router.get('/categories/:catId/posts', getCategoryPosts)
router.get('/posts/:id', getPost)
router.post('/posts', requireAuth, createPost)
router.put('/posts/:id', requireAuth, updatePost)
router.delete('/posts/:id', requireAuth, deletePost)
router.post('/posts/:id/pin', requireAuth, pinPost)

// ── Commentaires ──────────────────────────────────────────────────────────────
router.post('/posts/:id/comments', requireAuth, addComment)
router.delete('/comments/:id', requireAuth, deleteComment)
router.delete('/posts/:id/comments', requireAuth, clearComments)

// ── Réactions ─────────────────────────────────────────────────────────────────
router.post('/posts/:id/reactions', requireAuth, toggleReaction)
router.get('/posts/:id/reactions', getReactions)

export default router
