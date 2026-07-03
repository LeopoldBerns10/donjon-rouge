import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import supabase from '../lib/supabase.js'

const router = Router()

// GET /api/members/me/performance — stats de participation du membre connecté
router.get('/me/performance', requireAuth, async (req, res) => {
  try {
    const { coc_tag, coc_name } = req.user
    if (!coc_tag) return res.status(400).json({ error: 'Aucun compte CoC associé' })

    const { data: rows, error } = await supabase
      .from('member_participation')
      .select('event_type, participated, attack_percentage, double_perf, event_date')
      .eq('coc_tag', coc_tag)
      .order('event_date', { ascending: false })
    if (error) throw error

    const events = rows || []
    const gdcRows = events.filter(r => r.event_type === 'gdc')
    const jdcRows = events.filter(r => r.event_type === 'jdc')

    const gdcParticipated = gdcRows.filter(r => r.participated).length
    const withPct = gdcRows.filter(r => r.attack_percentage != null)
    const avgAttack = withPct.length > 0
      ? Math.round(withPct.reduce((s, r) => s + r.attack_percentage, 0) / withPct.length)
      : null

    const gdc = {
      guerresJouees:   gdcRows.length,
      participated:    gdcParticipated,
      taux:            gdcRows.length > 0 ? Math.round((gdcParticipated / gdcRows.length) * 100) : 0,
      avgAttackPercent: avgAttack,
      doublePerfs:     gdcRows.filter(r => r.double_perf).length,
    }

    const jdcParticipated = jdcRows.filter(r => r.participated).length
    const jdc = {
      sessionsJouees: jdcRows.length,
      participated:   jdcParticipated,
      taux:           jdcRows.length > 0 ? Math.round((jdcParticipated / jdcRows.length) * 100) : 0,
    }

    const totalParticipated = events.filter(r => r.participated).length
    const activityScore = events.length > 0
      ? Math.round((totalParticipated / events.length) * 100)
      : 0

    res.json({ coc_name, gdc, jdc, activityScore })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
