import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import supabase from './lib/supabase.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import { syncMembers } from './services/syncMembers.js'
import verifyToken, { requireAdmin } from './middleware/auth.js'

import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
// import playersRoutes from './routes/players.js' // table players obsolète — routes désactivées
import cocRoutes from './routes/coc.js'
import announcementsRoutes from './routes/announcements.js'
import warEventsRoutes from './routes/warEvents.js'
import ldcBoardRoutes from './routes/ldcBoard.js'
import adminRoutes from './routes/admin.js'
import rouletteRoutes from './routes/roulette.js'
import vitrineRoutes from './routes/vitrine.js'
import cacheRoutes from './routes/cache.js'
import membersRoutes from './routes/members.js'
import esportRoutes from './routes/esport.js'

const app = express()
app.set('trust proxy', 1)

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.DASHBOARD_URL,
].filter(Boolean)

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))
app.use(express.json())
app.use(apiLimiter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', clan: '#29292QPRC' })
})

app.use('/api/auth', authRoutes)
app.use('/api/dashboard', dashboardRoutes)
// app.use('/api/players', playersRoutes) // table players obsolète — routes désactivées
app.use('/api/coc', cocRoutes)
app.use('/api/announcements', announcementsRoutes)
app.use('/api/war-events', warEventsRoutes)
app.use('/api/ldc-board', ldcBoardRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/roulette', rouletteRoutes)
app.use('/api/vitrine', vitrineRoutes)
app.use('/api/cache', cacheRoutes)
app.use('/api/members', membersRoutes)
app.use('/api/esport', esportRoutes)

app.get('/api/debug/sync', verifyToken, requireAdmin, async (req, res) => {
  const result = await syncMembers()
  res.json(result)
})

async function initAdminAccount() {
  const { count } = await supabase
    .from('admin_account')
    .select('*', { count: 'exact', head: true })

  if (count === 0) {
    const email = process.env.ADMIN_EMAIL
    const password = process.env.ADMIN_INITIAL_PASSWORD
    if (!email || !password) {
      console.warn('⚠️  ADMIN_EMAIL ou ADMIN_INITIAL_PASSWORD manquant — compte admin non créé')
      return
    }
    const password_hash = await bcrypt.hash(password, 10)
    await supabase.from('admin_account').insert({ email, password_hash })
    console.log(`✅ Compte admin créé : ${email}`)
  } else {
    console.log('✅ Compte admin déjà configuré')
  }
}

const PORT = process.env.PORT || 3000
app.listen(PORT, async () => {
  console.log(`Donjon Rouge backend en écoute sur le port ${PORT}`)
  console.log('🚀 Initialisation : compte admin + sync membres CoC...')
  await initAdminAccount()
  await syncMembers()
  console.log('✅ Initialisation terminée')
  setInterval(syncMembers, 60 * 60 * 1000)
})
