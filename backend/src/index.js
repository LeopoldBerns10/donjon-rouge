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
import chatRoutes from './routes/chat.js'
import announcementsRoutes from './routes/announcements.js'

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
app.use('/api/chat', chatRoutes)
app.use('/api/announcements', announcementsRoutes)

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
    if (!channel || !content || !user) return

    const message = {
      id: Date.now(),
      author: user.username,
      role: user.role,
      content,
      time: new Date().toISOString()
    }

    try {
      await supabase
        .from('chat_messages')
        .insert({ author_id: user.id, channel, content })
    } catch {}

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
    console.log('✅ Compte admin créé')
  }
}

const PORT = process.env.PORT || 3000
httpServer.listen(PORT, async () => {
  console.log(`Donjon Rouge backend en écoute sur le port ${PORT}`)
  await initAdminAccount()
  await syncMembers()
  setInterval(syncMembers, 10 * 60 * 1000)
})
