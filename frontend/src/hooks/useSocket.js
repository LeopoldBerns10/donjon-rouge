import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export function useSocket(channel, user) {
  const socketRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(0)

  useEffect(() => {
    if (!channel) return

    let mounted = true

    const socket = io(import.meta.env.VITE_SOCKET_URL || '', {
      transports: ['polling', 'websocket']
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_channel', { channel, user })
    })

    socket.on('new_message', (msg) => {
      if (mounted) setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
    })

    socket.on('message_deleted', ({ id }) => {
      if (mounted) setMessages((prev) => prev.filter((m) => m.id !== id))
    })

    socket.on('message_edited', ({ id, content }) => {
      if (mounted) setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content } : m))
    })

    socket.on('message_reaction', ({ id, reactions }) => {
      if (mounted) setMessages((prev) => prev.map((m) => m.id === id ? { ...m, reactions } : m))
    })

    socket.on('connected_count', (count) => {
      if (mounted) setConnected(count)
    })

    return () => {
      mounted = false
      socket.off('connect')
      socket.off('new_message')
      socket.off('message_deleted')
      socket.off('message_edited')
      socket.off('message_reaction')
      socket.off('connected_count')
      socket.disconnect()
      socketRef.current = null
    }
  }, [channel])

  function sendMessage(content, replyTo = null) {
    if (!socketRef.current || !content.trim()) return
    socketRef.current.emit('send_message', { channel, content, user, replyTo })
  }

  return { messages, connected, sendMessage, setMessages }
}
