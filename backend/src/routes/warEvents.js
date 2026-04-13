import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCloseDate(type, startDate) {
  const d = new Date(startDate)
  if (type === 'gdc') d.setDate(d.getDate() + 1)
  if (type === 'gdc_selection' || type === 'ldc') d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

function canCreateEvent(user, type) {
  if (type === 'gdc') return !!user
  if (type === 'gdc_selection' || type === 'ldc') {
    return ['superadmin', 'admin'].includes(user.site_role)
  }
  return false
}

function canManageEvent(user) {
  return ['superadmin', 'admin'].includes(user?.site_role) ||
    ['leader', 'coLeader'].includes(user?.coc_role)
}

// ─── War Events ───────────────────────────────────────────────────────────────

// GET /api/war-events — liste tous les événements ouverts ou récents
router.get('/', async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('war_events')
      .select('*')
      .in('status', ['open', 'validated'])
      .order('proposed_date', { ascending: true })
    if (error) throw error

    // Ajouter signup_count pour chaque événement
    const eventsWithCount = await Promise.all(
      events.map(async (ev) => {
        const { count } = await supabase
          .from('war_signups')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', ev.id)
        return { ...ev, signup_count: count || 0 }
      })
    )

    res.json(eventsWithCount)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/war-events/:id — détail d'un événement
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('war_events')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/war-events — créer un événement
router.post('/', requireAuth, async (req, res) => {
  try {
    const { type, title, description, proposed_date, post_date, min_players } = req.body

    if (!canCreateEvent(req.user, type)) {
      return res.status(403).json({ error: 'Non autorisé à créer ce type d\'événement' })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, coc_name')
      .eq('id', req.user.id)
      .single()

    const close_date = getCloseDate(type, proposed_date)

    const { data, error } = await supabase
      .from('war_events')
      .insert({
        type,
        title,
        description: description || null,
        created_by: req.user.id,
        created_by_name: userData?.coc_name || req.user.username,
        proposed_date,
        post_date: post_date || new Date().toISOString().split('T')[0],
        close_date,
        min_players: type === 'gdc' ? (min_players || 5) : (min_players || 0),
        status: 'open'
      })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/war-events/:id/signup — s'inscrire
router.post('/:id/signup', requireAuth, async (req, res) => {
  try {
    const { data: event, error: evErr } = await supabase
      .from('war_events')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (evErr || !event) return res.status(404).json({ error: 'Événement introuvable' })
    if (event.status !== 'open') return res.status(400).json({ error: 'Cet événement n\'est plus ouvert aux inscriptions' })

    const { data: userData } = await supabase
      .from('users')
      .select('id, coc_name, coc_tag, coc_role')
      .eq('id', req.user.id)
      .single()

    const { data, error } = await supabase
      .from('war_signups')
      .insert({
        event_id: req.params.id,
        user_id: req.user.id,
        coc_name: userData.coc_name,
        coc_tag: userData.coc_tag,
        coc_role: userData.coc_role
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Déjà inscrit à cet événement' })
      throw error
    }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/war-events/:id/validate — valider l'événement
router.post('/:id/validate', requireAuth, async (req, res) => {
  try {
    if (!canManageEvent(req.user)) return res.status(403).json({ error: 'Non autorisé' })

    const { data, error } = await supabase
      .from('war_events')
      .update({ status: 'validated', validated_by: req.user.id, validated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/war-events/:id/close — clôturer manuellement
router.post('/:id/close', requireAuth, async (req, res) => {
  try {
    if (!canManageEvent(req.user)) return res.status(403).json({ error: 'Non autorisé' })

    const { data, error } = await supabase
      .from('war_events')
      .update({ status: 'closed' })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/war-events/:id/signups — liste des inscrits
router.get('/:id/signups', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('war_signups')
      .select('*')
      .eq('event_id', req.params.id)
      .order('signed_up_at', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ─── LDC Warriors ─────────────────────────────────────────────────────────────

// GET /api/ldc-warriors — liste des guerriers sélectionnés LDC actifs
router.get('/ldc-warriors/active', async (req, res) => {
  try {
    // Trouver la LDC active (open ou validated)
    const { data: ldcEvent } = await supabase
      .from('war_events')
      .select('id')
      .eq('type', 'ldc')
      .in('status', ['open', 'validated'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!ldcEvent) return res.json([])

    const { data, error } = await supabase
      .from('ldc_warriors')
      .select('*')
      .eq('ldc_event_id', ldcEvent.id)
      .order('selected_at', { ascending: true })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/ldc-warriors — ajouter un guerrier
router.post('/ldc-warriors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ldc_event_id, user_id, coc_name, coc_tag } = req.body

    const { data, error } = await supabase
      .from('ldc_warriors')
      .insert({ ldc_event_id, user_id, coc_name, coc_tag, selected_by: req.user.id })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/ldc-warriors/:id — retirer un guerrier
router.delete('/ldc-warriors/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { error } = await supabase
      .from('ldc_warriors')
      .delete()
      .eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
