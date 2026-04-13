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

// POST /api/ldc-board/launch — créer une LDC depuis le tableau guerriers
router.post('/launch', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { proposed_date, close_date, signup_open_date } = req.body
    if (!proposed_date || !close_date) {
      return res.status(400).json({ error: 'proposed_date et close_date requis' })
    }

    const { data: warriors, error: wErr } = await supabase
      .from('ldc_board_warriors')
      .select('*')
    if (wErr) throw wErr
    if (!warriors || warriors.length === 0) {
      return res.status(400).json({ error: 'Aucun guerrier dans le tableau' })
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const autoDeleteDate = new Date(proposed_date)
    autoDeleteDate.setDate(autoDeleteDate.getDate() + 9)
    const auto_delete_date = autoDeleteDate.toISOString().split('T')[0]

    const monthLabel = new Date(proposed_date).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    const title = `LDC — ${monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}`

    const { data: userData } = await supabase
      .from('users')
      .select('coc_name')
      .eq('id', req.user.id)
      .single()

    const { data: event, error: evErr } = await supabase
      .from('war_events')
      .insert({
        type: 'ldc',
        title,
        created_by: req.user.id,
        created_by_name: userData?.coc_name || '',
        proposed_date,
        post_date: signup_open_date || todayStr,
        close_date,
        auto_delete_date,
        status: 'open',
        min_players: 0
      })
      .select()
      .single()
    if (evErr) throw evErr

    const signupsToInsert = warriors.map(w => ({
      event_id: event.id,
      user_id: w.user_id,
      coc_name: w.coc_name,
      coc_tag: w.coc_tag,
      coc_role: w.coc_role || null
    }))

    const { error: signupErr } = await supabase
      .from('war_signups')
      .insert(signupsToInsert)
    if (signupErr) throw signupErr

    res.json({ event_id: event.id, signup_count: signupsToInsert.length })
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
