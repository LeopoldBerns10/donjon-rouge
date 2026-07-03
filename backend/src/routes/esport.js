import { Router } from 'express'
import supabase from '../lib/supabase.js'
import { getCached } from '../services/cacheService.js'
import { getClanInfo, getClanMembers } from '../services/cocApiService.js'
import verifyToken, { requireSuperAdmin } from '../middleware/auth.js'

const router = Router()
const ESPORT_TAG = '#2CLY9L0LY'

async function getEsportEnabled() {
  const { data } = await supabase
    .from('bot_config')
    .select('value')
    .eq('key', 'esport_enabled')
    .single()
  return data?.value === 'true'
}

// GET /api/esport/status — public
router.get('/status', async (req, res) => {
  try {
    const enabled = await getEsportEnabled()
    let memberCount = 0
    if (enabled) {
      try {
        const clan = await getCached(`clan:${ESPORT_TAG}`, () => getClanInfo(ESPORT_TAG))
        memberCount = clan?.members || 0
      } catch {}
    }
    res.json({ enabled, memberCount })
  } catch (e) {
    res.json({ enabled: false, memberCount: 0 })
  }
})

// GET /api/esport/clan-info — requires auth
router.get('/clan-info', verifyToken, async (req, res) => {
  try {
    const enabled = await getEsportEnabled()
    if (!enabled && req.user?.site_role !== 'superadmin' && req.user?.coc_name !== 'CyberAlf') {
      return res.status(403).json({ error: 'Feature E-Sport désactivée' })
    }
    const [clan, membersData] = await Promise.all([
      getCached(`clan:${ESPORT_TAG}`, () => getClanInfo(ESPORT_TAG)),
      getCached(`members:${ESPORT_TAG}`, () => getClanMembers(ESPORT_TAG)),
    ])
    const members = membersData?.items || membersData || []
    res.json({ clan, members })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

// GET /api/esport/results — requires auth
router.get('/results', verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from('esport_results')
    .select('*')
    .order('played_at', { ascending: false })
  if (error) return res.status(500).json({ error: error.message })
  res.json(data || [])
})

// POST /api/esport/results — superadmin only
router.post('/results', verifyToken, requireSuperAdmin, async (req, res) => {
  const { round, opponent, score_dr, score_opp, won, played_at } = req.body
  if (!round || !opponent || score_dr == null || score_opp == null || won == null || !played_at) {
    return res.status(400).json({ error: 'Champs manquants' })
  }
  const { data, error } = await supabase
    .from('esport_results')
    .insert({ round, opponent, score_dr: Number(score_dr), score_opp: Number(score_opp), won: Boolean(won), played_at })
    .select()
    .single()
  if (error) return res.status(500).json({ error: error.message })
  res.json(data)
})

// DELETE /api/esport/results/:id — superadmin only
router.delete('/results/:id', verifyToken, requireSuperAdmin, async (req, res) => {
  const { error } = await supabase
    .from('esport_results')
    .delete()
    .eq('id', req.params.id)
  if (error) return res.status(500).json({ error: error.message })
  res.json({ success: true })
})

// PUT /api/esport/enabled — superadmin only
router.put('/enabled', verifyToken, requireSuperAdmin, async (req, res) => {
  const { enabled } = req.body
  if (typeof enabled !== 'boolean') return res.status(400).json({ error: 'enabled doit être un boolean' })
  const { error } = await supabase
    .from('bot_config')
    .upsert({ key: 'esport_enabled', value: String(enabled) }, { onConflict: 'key' })
  if (error) return res.status(500).json({ error: error.message })
  res.json({ enabled })
})

export default router
