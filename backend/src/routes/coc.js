import { Router } from 'express'
import { clan, members, war, warlog, raids, cwl, player } from '../controllers/cocController.js'

const router = Router()

router.get('/clan', clan)
router.get('/clan/members', members)
router.get('/clan/war', war)
router.get('/clan/warlog', warlog)
router.get('/clan/raids', raids)
router.get('/clan/cwl', cwl)
router.get('/player/:tag', player)

export default router
