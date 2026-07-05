import { Router } from 'express'
import jwt from 'jsonwebtoken'
import { verifyToken } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) return next()
  try {
    const token = authHeader.split(' ')[1]
    req.user = jwt.verify(token, process.env.JWT_SECRET)
  } catch {}
  next()
}

// GET /api/roulette/current
router.get('/current', optionalAuth, async (req, res) => {
  const { data: event } = await supabase
    .from('roulette_events')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!event) return res.json({ active: false })

  let hasClickedToday = false
  if (req.user) {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: click } = await supabase
      .from('roulette_clicks')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', req.user.id)
      .gte('clicked_at', since24h)
      .single()
    hasClickedToday = !!click
  }

  return res.json({
    active: true,
    event: {
      id: event.id,
      title: event.title,
      prize: event.prize,
      currentClicks: event.current_clicks,
      targetClicks: event.target_clicks,
      isWon: !!event.winner_id,
      winnerName: event.winner_name,
    },
    hasClickedToday,
  })
})

// POST /api/roulette/click
router.post('/click', verifyToken, async (req, res) => {
  const { data: event } = await supabase
    .from('roulette_events')
    .select('*')
    .eq('is_active', true)
    .single()

  if (!event || event.winner_id) {
    return res.status(400).json({ error: "Pas d'event actif" })
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('roulette_clicks')
    .select('id, clicked_at')
    .eq('event_id', event.id)
    .eq('user_id', req.user.id)
    .gte('clicked_at', since24h)
    .single()

  if (existing) {
    return res.status(429).json({ error: 'Tu as déjà joué dans les dernières 24h !' })
  }

  const newClickCount = event.current_clicks + 1

  await supabase.from('roulette_clicks').insert({
    event_id: event.id,
    user_id: req.user.id,
    click_number: newClickCount,
  })

  const updateData = { current_clicks: newClickCount }
  let isWinner = false

  if (newClickCount >= event.target_clicks) {
    updateData.winner_id = req.user.id
    updateData.winner_name = req.user.coc_name
    updateData.won_at = new Date().toISOString()
    isWinner = true
  }

  await supabase.from('roulette_events').update(updateData).eq('id', event.id)

  return res.json({
    success: true,
    clickNumber: newClickCount,
    isWinner,
    newCount: newClickCount,
    target: event.target_clicks,
  })
})

// POST /api/roulette/reset (CyberAlf only)
router.post('/reset', verifyToken, async (req, res) => {
  if (req.user.coc_name !== 'CyberAlf' && req.user.site_role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé à CyberAlf' })
  }

  const { prize, title, target_clicks } = req.body

  await supabase.from('roulette_events').update({ is_active: false }).eq('is_active', true)

  const { data } = await supabase
    .from('roulette_events')
    .insert({
      title: title || "Pass d'Or — Offert par CyberAlf",
      prize: prize || "Pass d'Or",
      target_clicks: target_clicks || 100,
      current_clicks: 0,
      is_active: true,
    })
    .select()
    .single()

  return res.json({ success: true, event: data })
})

// POST /api/roulette/activate (CyberAlf only)
router.post('/activate', verifyToken, async (req, res) => {
  if (req.user.coc_name !== 'CyberAlf' && req.user.site_role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé à CyberAlf' })
  }

  await supabase.from('roulette_events').update({ is_active: true }).eq('is_active', false)
  return res.json({ success: true })
})

// POST /api/roulette/delete (CyberAlf only)
router.post('/delete', verifyToken, async (req, res) => {
  if (req.user.coc_name !== 'CyberAlf' && req.user.site_role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé à CyberAlf' })
  }

  const { error } = await supabase
    .from('roulette_events')
    .update({ is_active: false })
    .eq('is_active', true)

  if (error) return res.status(500).json({ error: error.message })
  return res.json({ success: true })
})

// GET /api/roulette/history (CyberAlf only) — clics de l'event actif courant
router.get('/history', verifyToken, async (req, res) => {
  if (req.user.coc_name !== 'CyberAlf' && req.user.site_role !== 'superadmin') {
    return res.status(403).json({ error: 'Réservé à CyberAlf' })
  }

  const { data: event } = await supabase
    .from('roulette_events')
    .select('id, target_clicks')
    .eq('is_active', true)
    .single()

  if (!event) return res.json([])

  const { data: clicks } = await supabase
    .from('roulette_clicks')
    .select('id, user_id, click_number, clicked_at')
    .eq('event_id', event.id)
    .order('clicked_at', { ascending: false })

  if (!clicks?.length) return res.json([])

  const userIds = [...new Set(clicks.map(c => c.user_id))]
  const { data: users } = await supabase
    .from('users')
    .select('id, coc_name')
    .in('id', userIds)

  const userMap = {}
  users?.forEach(u => { userMap[u.id] = u.coc_name })

  return res.json(clicks.map(c => ({
    id: c.id,
    coc_name: userMap[c.user_id] || 'Inconnu',
    clicked_at: c.clicked_at,
    click_number: c.click_number,
    result: c.click_number === event.target_clicks ? 'win' : 'lose',
  })))
})

export default router
