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
      setMessages((prev) => [...prev, msg])
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
    socketRef.current.emit('send_message', { channel, content, user })
  }

  return { messages, connected, sendMessage, setMessages }
}
