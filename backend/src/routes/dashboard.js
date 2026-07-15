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
  getRouteLastPlayer,
  updateRoute,
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getSnapshots,
  getNotifications,
} from '../controllers/dashboardController.js'
import {
  getAutomodConfig,
  updateAutomodConfig,
  getAutomodWarnings,
  deleteAutomodWarning,
  purgeAutomodMemberWarnings,
  getDiscordChannels,
  getDiscordRoles,
} from '../controllers/adminController.js'

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
router.get('/route/last-player', getRouteLastPlayer)
router.post('/route', updateRoute)
router.get('/events', getEvents)
router.post('/events', createEvent)
router.put('/events/:id', updateEvent)
router.delete('/events/:id', deleteEvent)
router.get('/snapshots', getSnapshots)
router.get('/notifications', getNotifications)

router.get('/automod/config',                         getAutomodConfig)
router.put('/automod/config',                         updateAutomodConfig)
router.get('/automod/warnings',                       getAutomodWarnings)
router.delete('/automod/warnings/member/:discord_id', purgeAutomodMemberWarnings)
router.delete('/automod/warnings/:id',                deleteAutomodWarning)
router.get('/automod/channels',                       getDiscordChannels)
router.get('/automod/roles',                          getDiscordRoles)

export default router
