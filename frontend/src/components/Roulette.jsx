import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'

const SEGMENTS = [
  // Index 0 — REJOUER (1/12)
  { type: 'replay', label: '🔄 REJOUER', color: '#1a3a1a', borderColor: '#22c55e', textColor: '#4ade80' },
  // Index 1-9 — PERDU (9/12)
  { type: 'lose', label: '✕', color: '#0d0d0d', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#111111', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#0d0d0d', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#111111', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#0d0d0d', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#111111', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#0d0d0d', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#111111', borderColor: '#1f1f1f', textColor: '#222' },
  { type: 'lose', label: '✕', color: '#0d0d0d', borderColor: '#1f1f1f', textColor: '#222' },
  // Index 10 — GAGNANT (1/12)
  { type: 'win',    label: '🏆',         color: '#78350f', borderColor: '#f59e0b', textColor: '#f59e0b' },
  // Index 11 — PERDU (1/12)
  { type: 'lose', label: '✕', color: '#111111', borderColor: '#1f1f1f', textColor: '#222' },
]

const N = SEGMENTS.length
const SEG_ANGLE = 360 / N

// Roue SVG segments + textes
function RouletteWheel({ rotation, animating }) {
  const size = 256
  const cx = size / 2
  const cy = size / 2
  const r = cx - 4

  const slices = SEGMENTS.map((seg, i) => {
    const startAngle = (i * SEG_ANGLE - 90) * (Math.PI / 180)
    const endAngle = ((i + 1) * SEG_ANGLE - 90) * (Math.PI / 180)
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    const midAngle = ((i + 0.5) * SEG_ANGLE - 90) * (Math.PI / 180)
    const labelR = r * 0.68
    const lx = cx + labelR * Math.cos(midAngle)
    const ly = cy + labelR * Math.sin(midAngle)
    return { seg, x1, y1, x2, y2, lx, ly, midAngle }
  })

  return (
    <div className="relative w-64 h-64 mx-auto select-none">
      {/* Indicateur haut */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
        <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[22px]
                        border-l-transparent border-r-transparent border-b-[#dc2626]
                        drop-shadow-[0_0_6px_rgba(220,38,38,0.9)]" />
      </div>

      {/* Roue */}
      <svg
        width={size} height={size} viewBox={`0 0 ${size} ${size}`}
        className="w-full h-full"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: animating ? 'transform 6s cubic-bezier(0.17,0.67,0.12,0.99)' : 'none',
          filter: 'drop-shadow(0 0 20px rgba(220,38,38,0.3))',
        }}
      >
        {/* Bord extérieur */}
        <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="#dc2626" strokeWidth="3" strokeOpacity="0.5" />

        {slices.map(({ seg, x1, y1, x2, y2, lx, ly }, i) => (
          <g key={i}>
            <path
              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`}
              fill={seg.color}
              stroke={seg.borderColor || '#dc2626'}
              strokeWidth={seg.type === 'lose' ? '0.5' : '1.2'}
              strokeOpacity={seg.type === 'lose' ? '0.4' : '0.8'}
            />
            <text
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={seg.label.length > 4 ? '9' : '14'}
              fontWeight="700"
              fill={seg.textColor}
              style={{ userSelect: 'none' }}
            >
              {seg.label}
            </text>
          </g>
        ))}

        {/* Centre */}
        <circle cx={cx} cy={cy} r={28} fill="#0d0d0d" stroke="#dc2626" strokeWidth="2" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="18">🎰</text>
      </svg>
    </div>
  )
}

export function Roulette() {
  const { user } = useAuth()
  const [event, setEvent] = useState(null)
  const [hasClickedToday, setHasClickedToday] = useState(false)
  const [isSpinning, setIsSpinning] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetTitle, setResetTitle] = useState('')
  const [resetPrize, setResetPrize] = useState('')
  const [newTarget, setNewTarget] = useState(100)
  const [wheelRotation, setWheelRotation] = useState(0)
  const [wheelAnimating, setWheelAnimating] = useState(false)
  const rotationRef = useRef(0)

  const isCyberAlf = user?.coc_name === 'CyberAlf' || user?.site_role === 'superadmin'

  useEffect(() => { fetchEvent() }, [user])

  const fetchEvent = async () => {
    try {
      const res = await api.get('/api/roulette/current')
      const data = res.data
      setEvent(data.active ? { ...data.event, active: true } : null)
      setHasClickedToday(data.hasClickedToday || false)
    } catch {
      setEvent(null)
    }
  }

  const handleSpin = async () => {
    if (isSpinning) return
    setIsSpinning(true)

    const LOSE_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 11]

    // Vérification replay en local AVANT l'appel backend
    const isReplay = Math.random() < 0.08

    let targetSegment
    let isWinner = false

    if (isReplay) {
      // Rejouer : pas d'appel API, hasClickedToday reste false
      targetSegment = 0
    } else {
      try {
        const res = await api.post('/api/roulette/click')
        isWinner = res.data.isWinner
        setHasClickedToday(true)
      } catch {
        setIsSpinning(false)
        return
      }
      targetSegment = isWinner
        ? 10 // 🏆
        : LOSE_INDICES[Math.floor(Math.random() * LOSE_INDICES.length)]
    }

    const targetRotation = rotationRef.current + 1800 + (360 - targetSegment * SEG_ANGLE - SEG_ANGLE / 2)

    setWheelAnimating(true)
    setWheelRotation(targetRotation)
    rotationRef.current = targetRotation

    await new Promise(resolve => setTimeout(resolve, 6400))
    setWheelAnimating(false)
    setIsSpinning(false)

    if (isWinner) triggerWinAnimation()
    fetchEvent()
  }

  const handleReset = async () => {
    try {
      await api.post('/api/roulette/reset', {
        title: resetTitle || undefined,
        prize: resetPrize || undefined,
        target_clicks: newTarget || 100,
      })
      setShowResetModal(false)
      setResetTitle('')
      setResetPrize('')
      setNewTarget(100)
      fetchEvent()
    } catch {}
  }

  const triggerWinAnimation = () => {
    const toast = document.createElement('div')
    toast.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:99999;
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

      {/* Bouton lancer — CyberAlf seulement */}
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
        <div className="relative rounded-3xl overflow-hidden
                        bg-gradient-to-b from-[#1a0000] via-[#111111] to-[#0d0d0d]
                        border border-[#dc2626]/30 shadow-2xl shadow-[#dc2626]/10">

          {/* Trait brillant haut */}
          <div className="absolute top-0 left-0 right-0 h-px
                          bg-gradient-to-r from-transparent via-[#dc2626]/60 to-transparent" />

          {/* Header */}
          <div className="px-6 pt-6 pb-4 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full
                            bg-[#dc2626]/10 border border-[#dc2626]/30 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626] animate-pulse" />
              <span className="text-[10px] uppercase tracking-widest text-[#dc2626] font-bold">
                Événement Spécial
              </span>
            </div>
            <h3 className="text-2xl font-black text-white uppercase tracking-wide mb-1">
              ROULETTE
            </h3>
            <p className="text-sm text-gray-400">{event.title}</p>
            <p className="text-xs text-gray-600 mt-1">
              Le 100ème joueur à tourner la roulette remporte le lot !
            </p>
          </div>

          {/* Roue */}
          <div className="px-6 py-4 flex flex-col items-center gap-6">
            <RouletteWheel rotation={wheelRotation} animating={wheelAnimating} />

            {/* Lot */}
            <div className="text-center px-6 py-3 rounded-2xl
                            bg-[#111111] border border-[#f59e0b]/20 w-full max-w-xs">
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">
                Lot à gagner
              </p>
              <p className="text-xl font-black text-[#f59e0b]">🏆 {event.prize}</p>
              <p className="text-xs text-gray-600 mt-0.5">Offert par CyberAlf</p>
            </div>

            {/* Compteur admin */}
            {isCyberAlf && (
              <div className="px-4 py-2 rounded-xl bg-[#0a0a0a] border border-[#dc2626]/20 w-full max-w-xs">
                <p className="text-xs text-center text-gray-500">
                  Compteur :
                  <span className="text-[#dc2626] font-bold ml-1">
                    {event.currentClicks} / {event.targetClicks}
                  </span>
                </p>
                <div className="w-full bg-[#1a1a1a] rounded-full h-1 mt-1.5">
                  <div
                    className="bg-[#dc2626] h-1 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((event.currentClicks / event.targetClicks) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Bouton jouer */}
            {user && !hasClickedToday && (
              <button
                onClick={handleSpin}
                disabled={isSpinning}
                className="relative px-10 py-4 rounded-2xl text-base font-black
                           uppercase tracking-widest text-white
                           bg-gradient-to-r from-[#dc2626] to-[#7f1d1d]
                           hover:from-[#ef4444] hover:to-[#dc2626]
                           shadow-lg shadow-[#dc2626]/30
                           disabled:opacity-50 transition-all duration-300
                           hover:scale-105 border border-[#ef4444]/30
                           overflow-hidden group">
                <span className="absolute inset-0 bg-gradient-to-r from-transparent
                                 via-white/10 to-transparent -translate-x-full
                                 group-hover:translate-x-full transition-transform duration-700" />
                <span className="relative">
                  {isSpinning ? '🎰 En cours...' : '🎰 Tenter sa chance !'}
                </span>
              </button>
            )}

            {user && hasClickedToday && (
              <div className="text-center py-3 px-6 rounded-2xl bg-[#111111]
                              border border-[#1f1f1f] w-full max-w-xs">
                <p className="text-sm text-gray-400">✓ Déjà joué aujourd'hui</p>
                <p className="text-xs text-gray-600 mt-1">Reviens demain !</p>
              </div>
            )}

            {!user && (
              <p className="text-sm text-gray-600">
                Connecte-toi pour participer
              </p>
            )}
          </div>

          {/* Trait brillant bas */}
          <div className="absolute bottom-0 left-0 right-0 h-px
                          bg-gradient-to-r from-transparent via-[#dc2626]/30 to-transparent" />
        </div>
      )}

      {/* Gagnant annoncé */}
      {event?.isWon && (
        <div className="rounded-2xl border border-[#f59e0b]/40 bg-[#111111]
                        p-6 text-center shadow-2xl shadow-[#f59e0b]/10">
          <p className="text-4xl mb-3">🏆</p>
          <h3 className="text-xl font-black text-[#f59e0b] uppercase mb-2">Félicitations !</h3>
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

      {/* Modal reset — CyberAlf */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999]
                        flex items-center justify-center p-4"
             onClick={() => setShowResetModal(false)}>
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-2xl
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
                         text-white text-sm mb-3 focus:outline-none focus:border-[#dc2626]/50"
            />
            <div className="mb-3">
              <label className="text-xs uppercase tracking-wide text-gray-500 mb-1 block">
                Nombre de clics pour gagner
              </label>
              <input
                type="number"
                value={newTarget}
                onChange={e => setNewTarget(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                placeholder="Ex: 100"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0d0d0d]
                           border border-[#2a2a2a] text-white text-sm
                           focus:outline-none focus:border-[#dc2626]/50"
              />
              <p className="text-[10px] text-gray-600 mt-1">
                Le joueur qui effectue ce clic remporte le lot
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowResetModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#333] text-gray-400
                           text-sm font-semibold uppercase hover:border-[#555]">
                Annuler
              </button>
              <button onClick={handleReset}
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
