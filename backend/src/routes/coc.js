import { Router } from 'express'
import { clan, members, war, warlog, raids, cwl, player, ldcCurrent, ldcWar, clanByKey, membersByKey, warlogByKey } from '../controllers/cocController.js'

const router = Router()

router.get('/clan', clan)
router.get('/clan/members', members)
router.get('/clan/war', war)
router.get('/clan/warlog', warlog)
router.get('/clan/raids', raids)
router.get('/clan/cwl', cwl)
router.get('/player/:tag', player)

// LDC détail 7 jours
router.get('/ldc/current', ldcCurrent)
router.get('/ldc/war/:warTag', ldcWar)

// Routes DR1 / DR2 dynamiques
router.get('/clan/:clanKey', clanByKey)
router.get('/clan/:clanKey/members', membersByKey)
router.get('/clan/:clanKey/warlog', warlogByKey)

export default router
