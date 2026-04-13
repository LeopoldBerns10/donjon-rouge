import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import supabase from './lib/supabase.js'
import { apiLimiter } from './middleware/rateLimiter.js'
import { syncMembers } from './services/syncMembers.js'

import authRoutes from './routes/auth.js'
import playersRoutes from './routes/players.js'
import cocRoutes from './routes/coc.js'
import forumRoutes from './routes/forum.js'
import chatRouter from './routes/chat.js'
import announcementsRoutes from './routes/announcements.js'
import warEventsRoutes from './routes/warEvents.js'
import adminRoutes from './routes/admin.js'

const app = express()
app.set('trust proxy', 1)
const httpServer = createServer(app)

const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST']
  }
})

app.use(cors({ origin: process.env.FRONTEND_URL }))
app.use(express.json())
app.use(apiLimiter)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', clan: '#29292QPRC' })
})

app.use('/api/auth', authRoutes)
app.use('/api/players', playersRoutes)
app.use('/api/coc', cocRoutes)
app.use('/api/forum', forumRoutes)
app.use('/api/chat', chatRouter(io))
app.use('/api/announcements', announcementsRoutes)
app.use('/api/war-events', warEventsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/api/debug/sync', async (req, res) => {
  const result = await syncMembers()
  res.json(result)
})

// Socket.io
const connectedUsers = new Map()

io.on('connection', (socket) => {
  socket.on('join_channel', ({ channel, user }) => {
    socket.join(channel)
    if (user) {
      connectedUsers.set(socket.id, { ...user, channel })
      socket.to(channel).emit('user_joined', { username: user.username })
      io.to(channel).emit('connected_count', countInChannel(channel))
    }
  })

  socket.on('send_message', async ({ channel, content, user }) => {
    if (!channel || !content || !user?.id) return

    const { data: userData } = await supabase
      .from('users')
      .select('coc_name, coc_role')
      .eq('id', user.id)
      .single()

    if (!userData) return

    const { data: saved, error: insertError } = await supabase
      .from('chat_messages')
      .insert({ author_id: user.id, channel, content })
      .select('id')
      .single()

    console.log('Insert chat:', insertError ? insertError.message : 'OK - id: ' + saved?.id)

    const message = {
      id: saved?.id || Date.now(),
      authorId: user.id,
      author: userData.coc_name,
      role: userData.coc_role,
      content,
      time: new Date().toISOString()
    }

    io.to(channel).emit('new_message', message)
  })

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id)
    if (user) {
      socket.to(user.channel).emit('user_left', { username: user.username })
      connectedUsers.delete(socket.id)
      io.to(user.channel).emit('connected_count', countInChannel(user.channel))
    }
  })
})

function countInChannel(channel) {
  let count = 0
  for (const u of connectedUsers.values()) {
    if (u.channel === channel) count++
  }
  return count
}

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
httpServer.listen(PORT, async () => {
  console.log(`Donjon Rouge backend en écoute sur le port ${PORT}`)
  console.log('🚀 Initialisation : compte admin + sync membres CoC...')
  await initAdminAccount()
  await syncMembers()
  console.log('✅ Initialisation terminée')
  setInterval(syncMembers, 10 * 60 * 1000)

  // Clôture automatique des événements de guerre expirés
  const autoCloseEvents = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const { error } = await supabase
        .from('war_events')
        .update({ status: 'closed' })
        .eq('status', 'open')
        .lte('close_date', today)
      if (error) console.error('autoCloseEvents:', error.message)
    } catch (err) {
      console.error('autoCloseEvents:', err.message)
    }
  }
  autoCloseEvents()
  setInterval(autoCloseEvents, 60 * 60 * 1000)

  // Vérification toutes les heures : si guerre en cours depuis > 24h → reset inscriptions
  setInterval(async () => {
    try {
      const { getCurrentWar } = await import('./services/cocApiService.js')
      const war = await getCurrentWar(process.env.COC_CLAN_TAG)
      if (war?.state === 'inWar' && war?.startTime) {
        const startTime = new Date(
          war.startTime.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/, '$1-$2-$3T$4:$5:$6Z')
        )
        const hoursSinceStart = (Date.now() - startTime.getTime()) / (1000 * 60 * 60)
        if (hoursSinceStart >= 24) {
          const { count } = await supabase
            .from('war_signups')
            .select('*', { count: 'exact', head: true })
          if (count > 0) {
            await supabase.from('war_signups').delete().neq('id', '00000000-0000-0000-0000-000000000000')
            console.log('✅ Inscriptions GDC/LDC remises à zéro (guerre > 24h)')
          }
        }
      }
    } catch (err) {
      console.error('Erreur reset war signups:', err.message)
    }
  }, 60 * 60 * 1000) // toutes les heures
})
