import { Router } from 'express'
import { dashboardAuth } from '../middleware/dashboardAuth.js'
import {
  getStats,
  getConfig,
  updateConfig,
  getBirthdays,
  deleteBirthday,
  getPolls,
  endPoll,
  getRoute,
  updateRoute,
} from '../controllers/dashboardController.js'

const router = Router()

router.use(dashboardAuth)

router.get('/stats', getStats)
router.get('/config', getConfig)
router.post('/config', updateConfig)
router.get('/birthdays', getBirthdays)
router.delete('/birthdays/:discord_id', deleteBirthday)
router.get('/polls', getPolls)
router.post('/polls/:id/end', endPoll)
router.get('/route', getRoute)
router.post('/route', updateRoute)

export default router
