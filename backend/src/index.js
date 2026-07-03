import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import supabase from './lib/supabase.js'
import { apiLimiter, chatLimiter } from './middleware/rateLimiter.js'
import { syncMembers } from './services/syncMembers.js'
import jwt from 'jsonwebtoken'
import verifyToken, { requireAdmin } from './middleware/auth.js'

import authRoutes from './routes/auth.js'
import dashboardRoutes from './routes/dashboard.js'
// import playersRoutes from './routes/players.js' // table players obsolète — routes désactivées
import cocRoutes from './routes/coc.js'
import forumRoutes from './routes/forum.js'
import chatRouter from './routes/chat.js'
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
const httpServer = createServer(app)

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.DASHBOARD_URL,
].filter(Boolean)

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST']
  }
})

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
app.use('/api/forum', forumRoutes)
app.use('/api/chat', chatLimiter, chatRouter(io))
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

  socket.on('send_message', async ({ channel, content, user, replyTo, token }) => {
    if (!channel || !content || !user?.id) return

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      if (decoded.discord_id !== user.id) return
    } catch {
      return
    }

    const { data: userData } = await supabase
      .from('users')
      .select('coc_name, coc_role, site_role')
      .eq('id', user.id)
      .single()

    if (!userData) return

    const insertData = {
      author_id: user.id,
      channel,
      content,
      ...(replyTo?.id && {
        reply_to_id: replyTo.id,
        reply_to_name: replyTo.name,
        reply_to_content: replyTo.content,
      }),
    }

    const { data: saved, error: insertError } = await supabase
      .from('chat_messages')
      .insert(insertData)
      .select('id')
      .single()

    console.log('Insert chat:', insertError ? insertError.message : 'OK - id: ' + saved?.id)

    const message = {
      id: saved?.id || Date.now(),
      author_id: user.id,
      author_name: userData.coc_name,
      author_coc_role: userData.coc_role,
      author_site_role: userData.site_role || null,
      author_coc_name: userData.coc_name,
      author_hdv: null,
      content,
      created_at: new Date().toISOString(),
      reply_to: replyTo?.id ? true : null,
      reply_to_name: replyTo?.name || null,
      reply_to_content: replyTo?.content || null,
      reactions: {},
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
  setInterval(syncMembers, 60 * 60 * 1000)
})
