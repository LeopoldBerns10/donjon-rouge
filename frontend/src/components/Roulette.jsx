import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'

export function Roulette() {
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [hasClickedToday, setHasClickedToday] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetTitle, setResetTitle] = useState('')
  const [resetPrize, setResetPrize] = useState('')

  const isCyberAlf = user?.coc_name === 'CyberAlf' || user?.site_role === 'superadmin'

  useEffect(() => { fetchEvent() }, [user])

  const fetchEvent = async () => {
    try {
      const res = await api.get('/api/roulette/current')
      const data = res.data
      if (data.active) {
        setEvent({ ...data.event, active: true })
      } else {
        setEvent(null)
      }
      setHasClickedToday(data.hasClickedToday || false)
    } catch {
      setEvent(null)
    }
  }

  const handleSpin = async () => {
    setIsSpinning(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    try {
      const res = await api.post('/api/roulette/click')
      const data = res.data
      setHasClickedToday(true)
      if (data.isWinner) triggerWinAnimation()
    } catch {}
    setIsSpinning(false)
    fetchEvent()
  }

  const handleReset = async () => {
    try {
      await api.post('/api/roulette/reset', {
        title: resetTitle || undefined,
        prize: resetPrize || undefined,
      })
      setShowResetModal(false)
      setResetTitle('')
      setResetPrize('')
      fetchEvent()
    } catch {}
  }

  const triggerWinAnimation = () => {
    const toast = document.createElement('div')
    toast.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.9);z-index:99999;
                  display:flex;flex-direction:column;align-items:center;
                  justify-content:center;animation:fadeIn 0.3s ease">
        <div style="font-size:80px;animation:bounce 0.5s infinite alternate">🏆</div>
        <h2 style="color:#f59e0b;font-size:2rem;font-weight:900;
                   text-transform:uppercase;margin:16px 0 8px">
          TU AS GAGNÉ !
        </h2>
        <p style="color:white;font-size:1.1rem;margin-bottom:8px">
          Félicitations ${user?.coc_name} !
        </p>
        <p style="color:#f59e0b;font-size:1.3rem;font-weight:700">🎉 Pass d'Or 🎉</p>
        <p style="color:#666;font-size:0.8rem;margin-top:16px">
          Contacte CyberAlf sur Discord pour récupérer ton lot !
        </p>
        <button onclick="this.closest('[style]').remove()"
                style="margin-top:24px;padding:12px 32px;background:#dc2626;
                       color:white;border:none;border-radius:12px;font-weight:700;
                       font-size:0.9rem;text-transform:uppercase;cursor:pointer">
          Fermer
        </button>
      </div>
    `
    document.body.appendChild(toast)
  }

  return (
    <div className="my-8 mx-4">

      {/* Bouton lancer event — CyberAlf only, si pas d'event actif */}
      {(!event || !event.active) && isCyberAlf && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowResetModal(true)}
            className="px-6 py-3 rounded-xl text-sm font-bold uppercase tracking-wide
                       bg-[#111111] border border-dashed border-[#f59e0b]/40
                       text-[#f59e0b]/60 hover:border-[#f59e0b] hover:text-[#f59e0b]
                       transition-all duration-200">
            🎰 Lancer un nouvel événement roulette
          </button>
        </div>
      )}

      {/* Roulette active */}
      {event?.active && !event.isWon && (
        <div className="relative rounded-2xl overflow-hidden border border-[#1f1f1f]
                        bg-gradient-to-b from-[#111111] to-[#0a0a0a]
                        shadow-2xl shadow-black/50">

          {/* Header */}
          <div className="px-6 py-4 border-b border-[#1f1f1f] text-center">
            <p className="text-[10px] uppercase tracking-widest text-[#f59e0b] mb-1">
              🎰 Événement Spécial
            </p>
            <h3 className="text-lg font-black text-white uppercase tracking-wide">
              {event.title}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Le 100ème joueur à tourner la roulette remporte le lot !
            </p>
          </div>

          {/* Zone roulette */}
          <div className="px-6 py-8 flex flex-col items-center gap-6">

            {/* Roulette visuelle */}
            <div className="relative">
              <div
                className={`w-48 h-48 rounded-full border-4 border-[#1a1a1a]
                              bg-[#0a0a0a] relative overflow-hidden
                              ${isSpinning ? 'animate-spin' : ''}`}
                style={{ animationDuration: '0.5s' }}>

                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute inset-0"
                    style={{
                      background: `conic-gradient(
                        from ${i * 30}deg,
                        #111111 0deg,
                        #111111 28deg,
                        #dc2626 28deg,
                        #dc2626 30deg
                      )`
                    }}
                  />
                ))}

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-[#0d0d0d] border-2
                                  border-[#dc2626]/30 flex items-center justify-center">
                    <span className="text-2xl">🎰</span>
                  </div>
                </div>
              </div>

              {/* Indicateur rouge en haut */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1
                              w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px]
                              border-l-transparent border-r-transparent border-b-[#dc2626]
                              z-10" />
            </div>

            {/* Prix */}
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">
                Lot à gagner
              </p>
              <p className="text-xl font-black text-[#f59e0b]">
                🏆 {event.prize}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Offert par CyberAlf
              </p>
            </div>

            {/* Compteur (admins seulement) */}
            {isCyberAlf && (
              <div className="px-4 py-2 rounded-xl bg-[#0a0a0a] border border-[#dc2626]/20">
                <p className="text-xs text-center text-gray-500">
                  Compteur admin :
                  <span className="text-[#dc2626] font-bold ml-1">
                    {event.currentClicks} / {event.targetClicks}
                  </span>
                </p>
              </div>
            )}

            {/* Bouton jouer */}
            {user ? (
              hasClickedToday ? (
                <div className="text-center">
                  <p className="text-sm text-gray-500">
                    ✓ Tu as déjà tourné aujourd'hui
                  </p>
                  <p className="text-xs text-gray-700 mt-1">
                    Reviens demain pour une nouvelle chance !
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleSpin}
                  disabled={isSpinning}
                  className="px-8 py-4 rounded-2xl text-base font-black uppercase
                             tracking-wide bg-[#dc2626] hover:bg-[#b91c1c] text-white
                             shadow-lg shadow-[#dc2626]/30
                             disabled:opacity-50 disabled:cursor-not-allowed
                             transition-all duration-200 hover:scale-105
                             border-2 border-[#ef4444]/50">
                  {isSpinning ? '🎰 En cours...' : '🎰 Tourner la roulette !'}
                </button>
              )
            ) : (
              <p className="text-sm text-gray-600">
                Connecte-toi pour participer !
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gagnant annoncé publiquement */}
      {event?.isWon && (
        <div className="rounded-2xl border border-[#f59e0b]/40 bg-[#111111]
                        p-6 text-center shadow-2xl shadow-[#f59e0b]/10">
          <p className="text-4xl mb-3">🏆</p>
          <h3 className="text-xl font-black text-[#f59e0b] uppercase mb-2">
            Félicitations !
          </h3>
          <p className="text-white font-bold text-lg">{event.winnerName}</p>
          <p className="text-sm text-gray-400 mt-1">
            a remporté le <span className="text-[#f59e0b] font-bold">{event.prize}</span> !
          </p>
          <p className="text-xs text-gray-600 mt-3">
            Contacte CyberAlf sur Discord pour récupérer ton lot 🎉
          </p>

          {isCyberAlf && (
            <button
              onClick={() => setShowResetModal(true)}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold uppercase
                         border border-dashed border-[#f59e0b]/30 text-[#f59e0b]/60
                         hover:border-[#f59e0b] hover:text-[#f59e0b] transition-all">
              🔄 Relancer un event
            </button>
          )}
        </div>
      )}

      {/* Modal reset (CyberAlf only) */}
      {showResetModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]
                      flex items-center justify-center p-4"
          onClick={() => setShowResetModal(false)}>
          <div
            className="bg-[#111111] border border-[#1f1f1f] rounded-2xl
                        p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-white uppercase mb-4">
              🎰 Nouvel événement roulette
            </h3>
            <input
              value={resetTitle}
              onChange={e => setResetTitle(e.target.value)}
              placeholder="Titre (ex: Pass d'Or — Offert par CyberAlf)"
              className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#2a2a2a]
                         text-white text-sm mb-3 focus:outline-none focus:border-[#dc2626]/50"
            />
            <input
              value={resetPrize}
              onChange={e => setResetPrize(e.target.value)}
              placeholder="Lot (ex: Pass d'Or)"
              className="w-full px-4 py-3 rounded-xl bg-[#0d0d0d] border border-[#2a2a2a]
                         text-white text-sm mb-4 focus:outline-none focus:border-[#dc2626]/50"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400
                           text-sm font-semibold uppercase hover:border-[#555]">
                Annuler
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl bg-[#dc2626] text-white
                           text-sm font-semibold uppercase hover:bg-[#b91c1c]">
                Lancer 🎰
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
