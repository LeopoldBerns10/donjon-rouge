import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// GET /api/ldc-board — titre + liste guerriers
router.get('/', async (req, res) => {
  try {
    const { data: board } = await supabase
      .from('ldc_board')
      .select('*')
      .single()

    const { data: warriors, error } = await supabase
      .from('ldc_board_warriors')
      .select('*')
      .order('score', { ascending: false })
    if (error) throw error

    res.json({ board: board || { title: 'Guerriers Sélectionnés — LDC' }, warriors: warriors || [] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/ldc-board/title — modifier le titre
router.put('/title', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title } = req.body
    const { data: userData } = await supabase
      .from('users')
      .select('coc_name')
      .eq('id', req.user.id)
      .single()

    const { data, error } = await supabase
      .from('ldc_board')
      .update({ title, updated_at: new Date().toISOString(), updated_by: userData?.coc_name || '' })
      .neq('id', '00000000-0000-0000-0000-000000000000')
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ldc-board/warriors — ajouter un guerrier
router.post('/warriors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { user_id, coc_name, coc_tag, coc_role, auto_selected = false, score = 0 } = req.body

    const { data, error } = await supabase
      .from('ldc_board_warriors')
      .insert({ user_id, coc_name, coc_tag, coc_role, auto_selected, score })
      .select()
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/ldc-board/warriors/:id — retirer un guerrier
router.delete('/warriors/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('ldc_board_warriors')
      .delete()
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/ldc-board/clear — vider tout le tableau
router.delete('/clear', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('ldc_board_warriors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
