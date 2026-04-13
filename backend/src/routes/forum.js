import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  getCategoryPosts, getPost, createPost, updatePost, deletePost, pinPost,
  addComment, deleteComment, clearComments,
  toggleReaction, getReactions,
} from '../controllers/forumController.js'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

// ── Upload image ──────────────────────────────────────────────────────────────
router.post('/upload', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier fourni' })

    const ext = req.file.originalname.split('.').pop().toLowerCase()
    const path = `forum/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { error: upErr } = await supabase.storage
      .from('forum-images')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype, upsert: false })

    if (upErr) return res.status(500).json({ error: upErr.message })

    const { data: urlData } = supabase.storage.from('forum-images').getPublicUrl(path)
    res.json({ url: urlData.publicUrl })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

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
