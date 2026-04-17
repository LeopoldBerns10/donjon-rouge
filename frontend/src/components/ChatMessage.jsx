import { useState } from 'react'

// ─── Helpers exportés ─────────────────────────────────────────────────────────

export const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '⚔️', '👑']

export const getNameColor = (cocRole, siteRole) => {
  if (siteRole === 'superadmin') return 'text-[#dc2626]'
  if (siteRole === 'admin') return 'text-[#f97316]'
  if (cocRole === 'leader') return 'text-[#f59e0b]'
  if (cocRole === 'coLeader') return 'text-[#d97706]'
  if (cocRole === 'admin') return 'text-[#a8a29e]'
  return 'text-gray-300'
}

export const formatChatTime = (d) => {
  if (!d) return ''
  return new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

const formatCocRoleLocal = (role) => {
  if (role === 'leader') return 'Chef'
  if (role === 'coLeader') return 'Co-Chef'
  if (role === 'admin') return 'Aîné'
  return 'Membre'
}

// ─── MessageActions ────────────────────────────────────────────────────────────

function MessageActionsWidget({ msgId, reactions, onReply, toggleReaction }) {
  const [showEmojis, setShowEmojis] = useState(false)

  return (
    <div className="flex items-center gap-1 mt-1 relative flex-wrap">
      {reactions && Object.entries(reactions).map(([emoji, count]) =>
        count > 0 && (
          <button key={emoji}
                  onClick={() => toggleReaction(msgId, emoji)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full
                             bg-[#1a1a1a] border border-[#2a2a2a] text-xs
                             hover:border-[#dc2626]/40 transition-colors">
            {emoji} <span className="text-gray-500">{count}</span>
          </button>
        )
      )}
      <button onClick={() => setShowEmojis(!showEmojis)}
              className="w-6 h-6 rounded-full bg-[#1a1a1a] border border-[#2a2a2a]
                         text-gray-600 hover:text-gray-300 hover:border-[#3a3a3a]
                         text-xs flex items-center justify-center transition-colors">
        +
      </button>
      <button onClick={onReply}
              className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors px-1">
        ↩
      </button>
      {showEmojis && (
        <div className="absolute bottom-full mb-1 left-0 flex gap-1 p-2
                        bg-[#111111] border border-[#1f1f1f] rounded-xl shadow-xl z-20">
          {QUICK_EMOJIS.map(e => (
            <button key={e}
                    onClick={() => { toggleReaction(msgId, e); setShowEmojis(false) }}
                    className="text-lg hover:scale-125 transition-transform p-1">
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ChatMessage ───────────────────────────────────────────────────────────────

export function ChatMessage({ msg, currentUser, onReply, onDelete, canDelete, toggleReaction }) {
  const isOwn = msg.author_id === currentUser?.id

  return (
    <div className={`flex items-start gap-3 mb-4 ${isOwn ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      {isOwn ? (
        <div className="w-9 h-9 rounded-full bg-[#dc2626]/30 border border-[#dc2626]/50
                        flex items-center justify-center text-sm font-bold text-[#dc2626] flex-shrink-0">
          {currentUser?.coc_name?.charAt(0).toUpperCase()}
        </div>
      ) : (
        <div className="relative flex-shrink-0 group/avatar">
          <div className="w-9 h-9 rounded-full bg-[#dc2626]/20 border border-[#dc2626]/30
                          flex items-center justify-center text-sm font-bold text-[#dc2626] cursor-pointer">
            {msg.author_name?.charAt(0).toUpperCase()}
          </div>
          <div className="absolute left-0 bottom-full mb-1 px-2 py-1 rounded-lg
                          bg-[#1a1a1a] border border-[#2a2a2a] text-xs text-gray-300
                          whitespace-nowrap opacity-0 group-hover/avatar:opacity-100
                          transition-opacity z-10 pointer-events-none">
            {formatCocRoleLocal(msg.author_coc_role)} — HV{msg.author_hdv || '?'}
            {msg.author_site_role === 'admin' && ' 🛡️ Admin'}
            {msg.author_coc_name === 'CyberAlf' && ' 👑 Chef'}
          </div>
        </div>
      )}

      <div className={`flex flex-col max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
        {/* Nom + heure */}
        {!isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold ${getNameColor(msg.author_coc_role, msg.author_site_role)}`}>
              {msg.author_name}
            </span>
            <span className="text-[10px] text-gray-700">{formatChatTime(msg.created_at)}</span>
            {canDelete && onDelete && (
              <button onClick={() => onDelete(msg.id)}
                      className="text-[10px] text-gray-700 hover:text-red-400 transition-colors ml-1">
                ✕
              </button>
            )}
          </div>
        )}
        {isOwn && (
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-gray-700">{formatChatTime(msg.created_at)}</span>
            {canDelete && onDelete && (
              <button onClick={() => onDelete(msg.id)}
                      className="text-[10px] text-gray-700 hover:text-red-400 transition-colors">
                ✕
              </button>
            )}
          </div>
        )}

        {/* Citation */}
        {msg.reply_to && (
          <div className={`mb-1 px-3 py-1.5 rounded-lg bg-[#0a0a0a] text-xs text-gray-500 line-clamp-1
                           ${isOwn ? 'border-r-2 border-[#dc2626]/50 text-right' : 'border-l-2 border-[#dc2626]/50'}`}>
            ↩ {msg.reply_to_name} : {msg.reply_to_content}
          </div>
        )}

        {/* Bulle message */}
        <div className={`px-4 py-2.5 text-sm leading-relaxed break-words
                          ${isOwn
                            ? 'rounded-2xl rounded-tr-sm bg-[#dc2626]/20 border border-[#dc2626]/30 text-gray-100'
                            : 'rounded-2xl rounded-tl-sm bg-[#1a1a1a] border border-[#2a2a2a] text-gray-200'
                          }`}>
          {msg.content}
        </div>

        {/* Réactions */}
        {toggleReaction && onReply && (
          <MessageActionsWidget
            msgId={msg.id}
            reactions={msg.reactions}
            onReply={() => onReply(msg)}
            toggleReaction={toggleReaction}
          />
        )}
      </div>
    </div>
  )
}
