import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'

export function useSocket(channel, user) {
  const socketRef = useRef(null)
  const [messages, setMessages] = useState([])
  const [connected, setConnected] = useState(0)

  useEffect(() => {
    if (!channel) return

    const socket = io(import.meta.env.VITE_SOCKET_URL || '', {
      transports: ['polling', 'websocket']
    })
    socketRef.current = socket

    socket.on('connect', () => {
      socket.emit('join_channel', { channel, user })
    })

    socket.on('new_message', (msg) => {
      setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg])
    })

    socket.on('message_deleted', ({ id }) => {
      setMessages((prev) => prev.filter((m) => m.id !== id))
    })

    socket.on('message_edited', ({ id, content }) => {
      setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content } : m))
    })

    socket.on('connected_count', (count) => {
      setConnected(count)
    })

    return () => {
      socket.disconnect()
    }
  }, [channel])

  function sendMessage(content) {
    if (!socketRef.current || !content.trim()) return
    console.log('sendMessage user:', JSON.stringify(user))
    socketRef.current.emit('send_message', { channel, content, user })
  }

  return { messages, connected, sendMessage, setMessages }
}
