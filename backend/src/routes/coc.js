import { Router } from 'express'
import { clan, members, war, warlog, raids, cwl, player, ldcCurrent, ldcWar, clanByKey, membersByKey, warByKey, warlogByKey } from '../controllers/cocController.js'

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

// Routes DR1 / DR2 explicites (avant le :clanKey dynamique)
router.get('/clan/dr1/members', (req, res, next) => { req.params.clanKey = 'dr1'; membersByKey(req, res, next) })
router.get('/clan/dr2/members', (req, res, next) => { req.params.clanKey = 'dr2'; membersByKey(req, res, next) })

// Routes DR1 / DR2 dynamiques
router.get('/clan/:clanKey', clanByKey)
router.get('/clan/:clanKey/members', membersByKey)
router.get('/clan/:clanKey/war', warByKey)
router.get('/clan/:clanKey/warlog', warlogByKey)

export default router
