import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useLocation } from 'react-router-dom'
import { ChatMessage } from './ChatMessage'
import api from '../lib/api'

export function FloatingChat() {
  const { user } = useAuth()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [unreadCount, setUnreadCount] = useState(0)
  const [replyTo, setReplyTo] = useState(null)
  const [newMessagesSeparatorIndex, setNewMessagesSeparatorIndex] = useState(-1)
  const messagesEndRef = useRef(null)
  const isOpenRef = useRef(false)
  const userRef = useRef(user)

  isOpenRef.current = isOpen
  userRef.current = user

  // Masquer sur /forum
  const hiddenPaths = ['/forum']
  if (hiddenPaths.some(p => location.pathname.startsWith(p))) return null

  useEffect(() => {
    let mounted = true
    let abortController = new AbortController()

    const fetchMessages = async () => {
      abortController = new AbortController()
      try {
        const res = await api.get('/api/chat/messages/général?limit=50', {
          signal: abortController.signal,
        })
        if (!mounted) return
        const data = res.data
        setMessages(data)

        const currentUser = userRef.current
        if (currentUser?.last_seen_chat_at && !isOpenRef.current) {
          const lastSeen = new Date(currentUser.last_seen_chat_at)
          setUnreadCount(data.filter(m => new Date(m.created_at) > lastSeen).length)
        }

        if (currentUser?.last_seen_chat_at) {
          const lastSeen = new Date(currentUser.last_seen_chat_at)
          setNewMessagesSeparatorIndex(data.findIndex(m => new Date(m.created_at) > lastSeen))
        }
      } catch (err) {
        if (err?.name === 'CanceledError' || err?.name === 'AbortError') return
      }
    }

    fetchMessages()
    const interval = setInterval(fetchMessages, 5000)

    return () => {
      mounted = false
      abortController.abort()
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 150)
    }
  }, [isOpen])

  const markAsRead = async () => {
    setUnreadCount(0)
    if (!userRef.current) return
    try { await api.post('/api/chat/mark-read') } catch {}
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !userRef.current) return
    try {
      await api.post('/api/chat/messages', {
        channel: 'général',
        content: newMessage.trim(),
        reply_to_id: replyTo?.id || null,
        reply_to_name: replyTo?.author_name || null,
        reply_to_content: replyTo?.content || null,
      })
      setNewMessage('')
      setReplyTo(null)
      try {
        const res = await api.get('/api/chat/messages/général?limit=50')
        setMessages(res.data)
      } catch {}
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {}
  }

  const toggleReaction = async (msgId, emoji) => {
    try {
      const res = await api.post(`/api/chat/messages/${msgId}/reaction`, { emoji })
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: res.data.reactions } : m))
    } catch {}
  }

  return (
    <div className="fixed bottom-6 right-6 z-[9999]">
      {/* Bulle fermée */}
      {!isOpen && (
        <button
          onClick={() => { setIsOpen(true); markAsRead() }}
          className="relative w-14 h-14 rounded-full
                     bg-[#dc2626] hover:bg-[#b91c1c]
                     shadow-2xl shadow-[#dc2626]/40
                     flex items-center justify-center
                     transition-all duration-200 hover:scale-110
                     border-2 border-[#ef4444]/50"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full
                             bg-white text-[#dc2626] text-[10px] font-black
                             flex items-center justify-center
                             animate-pulse border border-[#dc2626]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Panneau ouvert */}
      {isOpen && (
        <div className="w-[350px] h-[500px] flex flex-col
                        bg-[#0d0d0d] border border-[#1f1f1f] rounded-2xl
                        shadow-2xl shadow-black/50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3
                          border-b border-[#1a1a1a] rounded-t-2xl
                          bg-gradient-to-r from-[#111111] to-[#0d0d0d]">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold text-white uppercase tracking-wide">Tchat Live</span>
              <span className="text-[10px] text-gray-600"># général</span>
            </div>
            <div className="flex items-center gap-2">
              <a href="/forum"
                 className="text-gray-600 hover:text-gray-300 transition-colors text-xs">↗</a>
              <button onClick={() => setIsOpen(false)}
                      className="text-gray-600 hover:text-gray-300 transition-colors">✕</button>
            </div>
          </div>

          {/* Zone messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {messages.map((msg, i) => (
              <div key={msg.id || i}>
                {i === newMessagesSeparatorIndex && newMessagesSeparatorIndex > -1 && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 h-px bg-[#dc2626]/30" />
                    <span className="text-[10px] text-[#dc2626] uppercase tracking-wide px-2">
                      Nouveaux messages
                    </span>
                    <div className="flex-1 h-px bg-[#dc2626]/30" />
                  </div>
                )}
                <ChatMessage
                  msg={msg}
                  currentUser={user}
                  onReply={setReplyTo}
                  toggleReaction={toggleReaction}
                />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Barre réponse */}
          {replyTo && (
            <div className="mx-3 mb-1 px-3 py-1.5 rounded-xl bg-[#0a0a0a]
                            border border-[#dc2626]/30 flex items-center justify-between">
              <span className="text-[10px] text-gray-500 truncate">
                ↩ <span className="text-[#dc2626]">{replyTo.author_name}</span>
                : {replyTo.content}
              </span>
              <button onClick={() => setReplyTo(null)}
                      className="text-gray-700 hover:text-gray-400 ml-2 flex-shrink-0">✕</button>
            </div>
          )}

          {/* Zone saisie */}
          {user ? (
            <div className="px-3 pb-3 pt-2 border-t border-[#1a1a1a]">
              <div className="flex gap-2 items-center">
                <input
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMessage()}
                  placeholder={replyTo ? `↩ ${replyTo.author_name}...` : 'Message...'}
                  className="flex-1 px-3 py-2 rounded-xl bg-[#111111] border border-[#2a2a2a]
                             text-sm text-white placeholder-gray-600
                             focus:outline-none focus:border-[#dc2626]/50 transition-colors"
                />
                <button onClick={sendMessage}
                        disabled={!newMessage.trim()}
                        className="w-9 h-9 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c]
                                   flex items-center justify-center transition-colors
                                   disabled:opacity-40 disabled:cursor-not-allowed">
                  <span className="text-white text-sm font-bold">→</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="px-3 pb-3 pt-2 border-t border-[#1a1a1a] text-center">
              <p className="text-xs text-gray-600">
                <a href="/login" className="text-[#dc2626] hover:underline">Connecte-toi</a> pour participer
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
