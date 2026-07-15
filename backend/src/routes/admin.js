import { Router } from 'express'
import verifyToken, { requireAdmin, requireSuperAdmin } from '../middleware/auth.js'
import {
  getUsers,
  resetPassword,
  promoteUser,
  demoteUser,
  disableUser,
  enableUser,
  deleteUser,
  triggerSync,
  getPerformanceAll,
  getPerformanceDetail,
  getAutomodConfig,
  updateAutomodConfig,
  getAutomodWarnings,
  deleteAutomodWarning,
  purgeAutomodMemberWarnings,
  getDiscordChannels,
  getDiscordRoles,
} from '../controllers/adminController.js'

const router = Router()

router.get('/users', verifyToken, requireAdmin, getUsers)
router.post('/reset-password', verifyToken, requireAdmin, resetPassword)
router.post('/promote', verifyToken, requireSuperAdmin, promoteUser)
router.post('/demote', verifyToken, requireSuperAdmin, demoteUser)
router.post('/disable', verifyToken, requireSuperAdmin, disableUser)
router.post('/enable', verifyToken, requireSuperAdmin, enableUser)
router.delete('/users/:userId', verifyToken, requireSuperAdmin, deleteUser)
router.post('/sync-members', verifyToken, requireSuperAdmin, triggerSync)
router.get('/performance', verifyToken, requireSuperAdmin, getPerformanceAll)
router.get('/performance/:coc_tag', verifyToken, requireSuperAdmin, getPerformanceDetail)

router.get('/automod/config',                       verifyToken, requireSuperAdmin, getAutomodConfig)
router.put('/automod/config',                       verifyToken, requireSuperAdmin, updateAutomodConfig)
router.get('/automod/warnings',                     verifyToken, requireSuperAdmin, getAutomodWarnings)
router.delete('/automod/warnings/member/:discord_id', verifyToken, requireSuperAdmin, purgeAutomodMemberWarnings)
router.delete('/automod/warnings/:id',              verifyToken, requireSuperAdmin, deleteAutomodWarning)
router.get('/automod/channels',                     verifyToken, requireSuperAdmin, getDiscordChannels)
router.get('/automod/roles',                        verifyToken, requireSuperAdmin, getDiscordRoles)

export default router
