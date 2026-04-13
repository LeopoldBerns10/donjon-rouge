import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'
import { getClanMembers } from '../services/cocApiService.js'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(dateStr, days) {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function today() {
  return new Date().toISOString().split('T')[0]
}

function calculateDates(type, body) {
  const { proposed_date, close_date, signup_open_date } = body

  if (type === 'gdc') {
    return {
      post_date: today(),
      close_date: addDays(proposed_date, -1),
      auto_delete_date: addDays(proposed_date, 2)
    }
  }

  if (type === 'gdc_selection') {
    return {
      post_date: today(),
      close_date: addDays(proposed_date, -1),
      auto_delete_date: addDays(proposed_date, 3)
    }
  }

  if (type === 'ldc') {
    return {
      post_date: signup_open_date || today(),
      close_date: close_date,
      auto_delete_date: addDays(proposed_date, 9)
    }
  }
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

// ─── Sélection automatique guerriers LDC ─────────────────────────────────────

async function autoSelectWarriors(gdcSelectionEventId) {
  try {
    const { data: signups } = await supabase
      .from('war_signups')
      .select('user_id, coc_name, coc_tag, coc_role')
      .eq('event_id', gdcSelectionEventId)

    if (!signups || signups.length === 0) return

    // Récupérer les données CoC du clan
    const clanData = await getClanMembers(process.env.COC_CLAN_TAG)
    const cocMembers = clanData?.items || []

    // Scorer chaque inscrit
    const scored = signups.map(signup => {
      const coc = cocMembers.find(m => m.tag === signup.coc_tag)
      return {
        ...signup,
        score: (coc?.townHallLevel || 0) * 1000 +
               (coc?.warStars || 0) * 10 +
               (coc?.donations || 0)
      }
    })

    const top5 = scored.sort((a, b) => b.score - a.score).slice(0, 5)

    // Trouver la LDC active
    const { data: activeLdc } = await supabase
      .from('war_events')
      .select('id')
      .eq('type', 'ldc')
      .in('status', ['open', 'validated'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!activeLdc) return

    // Supprimer les anciens guerriers auto-sélectionnés
    await supabase
      .from('ldc_warriors')
      .delete()
      .eq('ldc_event_id', activeLdc.id)
      .eq('auto_selected', true)

    // Insérer le nouveau top 5
    await supabase
      .from('ldc_warriors')
      .insert(top5.map(w => ({
        ldc_event_id: activeLdc.id,
        user_id: w.user_id,
        coc_name: w.coc_name,
        coc_tag: w.coc_tag,
        auto_selected: true,
        score: w.score
      })))
  } catch (err) {
    console.error('autoSelectWarriors:', err.message)
  }
}

// ─── War Events ───────────────────────────────────────────────────────────────

// GET /api/war-events
router.get('/', async (req, res) => {
  try {
    const { data: events, error } = await supabase
      .from('war_events')
      .select('*')
      .in('status', ['open', 'validated'])
      .order('proposed_date', { ascending: true })
    if (error) throw error

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

// GET /api/war-events/:id
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
    const { type, title, description, proposed_date, close_date, signup_open_date, min_players } = req.body

    if (!canCreateEvent(req.user, type)) {
      return res.status(403).json({ error: 'Non autorisé à créer ce type d\'événement' })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('id, coc_name')
      .eq('id', req.user.id)
      .single()

    const dates = calculateDates(type, { proposed_date, close_date, signup_open_date })

    const { data, error } = await supabase
      .from('war_events')
      .insert({
        type,
        title,
        description: description || null,
        created_by: req.user.id,
        created_by_name: userData?.coc_name || req.user.username,
        proposed_date,
        post_date: dates.post_date,
        close_date: dates.close_date,
        auto_delete_date: dates.auto_delete_date,
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

// POST /api/war-events/:id/signup
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

// POST /api/war-events/:id/signup-admin
router.post('/:id/signup-admin', requireAuth, async (req, res) => {
  try {
    if (!canManageEvent(req.user)) return res.status(403).json({ error: 'Non autorisé' })

    const { coc_tag } = req.body
    if (!coc_tag) return res.status(400).json({ error: 'coc_tag requis' })

    const { data: event, error: evErr } = await supabase
      .from('war_events')
      .select('id')
      .eq('id', req.params.id)
      .single()
    if (evErr || !event) return res.status(404).json({ error: 'Événement introuvable' })

    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('id, coc_name, coc_tag, coc_role')
      .eq('coc_tag', coc_tag)
      .single()
    if (userErr || !userData) return res.status(404).json({ error: 'Joueur introuvable dans la base' })

    const { data, error } = await supabase
      .from('war_signups')
      .insert({
        event_id: req.params.id,
        user_id: userData.id,
        coc_name: userData.coc_name,
        coc_tag: userData.coc_tag,
        coc_role: userData.coc_role
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Ce joueur est déjà inscrit' })
      throw error
    }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/war-events/:id/signup/:userId
router.delete('/:id/signup/:userId', requireAuth, async (req, res) => {
  try {
    if (!canManageEvent(req.user)) return res.status(403).json({ error: 'Non autorisé' })

    const { error } = await supabase
      .from('war_signups')
      .delete()
      .eq('event_id', req.params.id)
      .eq('user_id', req.params.userId)
    if (error) throw error
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/war-events/:id/validate
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

// POST /api/war-events/:id/close
router.post('/:id/close', requireAuth, async (req, res) => {
  try {
    if (!canManageEvent(req.user)) return res.status(403).json({ error: 'Non autorisé' })

    const { data: event, error: evErr } = await supabase
      .from('war_events')
      .select('type')
      .eq('id', req.params.id)
      .single()
    if (evErr) throw evErr

    const { data, error } = await supabase
      .from('war_events')
      .update({ status: 'closed' })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    // Sélection automatique guerriers si c'est une GDC sélection
    if (event.type === 'gdc_selection') {
      await autoSelectWarriors(req.params.id)
    }

    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// PUT /api/war-events/:id — modifier titre/dates
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { proposed_date, close_date, title, description } = req.body

    const { data: event, error: evErr } = await supabase
      .from('war_events')
      .select('*')
      .eq('id', req.params.id)
      .single()
    if (evErr || !event) return res.status(404).json({ error: 'Événement introuvable' })

    const isAuthor = event.created_by === req.user.id
    const isAdmin = ['superadmin', 'admin'].includes(req.user.site_role)
    const isChief = ['leader', 'coLeader'].includes(req.user.coc_role)
    if (!isAuthor && !isAdmin && !isChief) {
      return res.status(403).json({ error: 'Permission refusée' })
    }

    const dates = calculateDates(event.type, {
      proposed_date: proposed_date || event.proposed_date,
      close_date: close_date || event.close_date,
      signup_open_date: event.post_date
    })

    const { data, error } = await supabase
      .from('war_events')
      .update({
        proposed_date: proposed_date || event.proposed_date,
        close_date: dates.close_date,
        auto_delete_date: dates.auto_delete_date,
        title: title || event.title,
        description: description !== undefined ? description : event.description
      })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/war-events/:id/signups
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

// GET /api/war-events/ldc-warriors/active
router.get('/ldc-warriors/active', async (req, res) => {
  try {
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
      .order('score', { ascending: false })
    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/war-events/ldc-warriors — ajouter manuellement
router.post('/ldc-warriors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { ldc_event_id, user_id, coc_name, coc_tag } = req.body

    const { data, error } = await supabase
      .from('ldc_warriors')
      .insert({ ldc_event_id, user_id, coc_name, coc_tag, selected_by: req.user.id, auto_selected: false, score: 0 })
      .select()
      .single()

    if (error) throw error
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// DELETE /api/war-events/ldc-warriors/:id
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
