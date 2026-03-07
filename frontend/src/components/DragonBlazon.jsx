import { useEffect, useRef } from 'react'

export default function DragonBlazon({ size = 'large' }) {
  const px = size === 'large' ? 460 : 32
  const eyeRef = useRef(null)
  const glowRef = useRef(null)

  useEffect(() => {
    let frame
    const start = performance.now()

    function tick(now) {
      const t = (now - start) / 1000
      // Eye blink: 4s cycle
      const eyeAlpha = 0.85 + 0.15 * Math.sin((t / 4) * Math.PI * 2)
      if (eyeRef.current) eyeRef.current.style.opacity = eyeAlpha
      // Gold glow pulse: 3s cycle
      const glowScale = 1 + 0.02 * Math.sin((t / 3) * Math.PI * 2)
      if (glowRef.current) glowRef.current.style.transform = `scale(${glowScale})`
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const svgContent = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 240"
      width={px}
      height={px * 1.2}
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B0000" />
          <stop offset="100%" stopColor="#1a0000" />
        </linearGradient>
        <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffd700" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#d4af37" stopOpacity="0" />
        </radialGradient>
        <filter id="goldGlow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Shield shape */}
      <path
        d="M10,10 Q10,5 15,5 L185,5 Q190,5 190,10 L190,140 Q190,180 100,235 Q10,180 10,140 Z"
        fill="url(#shieldGrad)"
        stroke="#d4af37"
        strokeWidth="2"
      />
      {/* Inner border */}
      <path
        d="M18,14 Q18,10 22,10 L178,10 Q182,10 182,14 L182,138 Q182,172 100,222 Q18,172 18,138 Z"
        fill="#0d0000"
        stroke="#d4af37"
        strokeWidth="0.8"
        strokeOpacity="0.7"
      />

      {/* Ornament top-left */}
      <g fill="#d4af37" opacity="0.8" filter="url(#goldGlow)">
        <circle cx="30" cy="25" r="3" />
        <circle cx="30" cy="25" r="1.2" fill="#fff8" />
        <line x1="27" y1="25" x2="33" y2="25" stroke="#d4af37" strokeWidth="0.8" />
        <line x1="30" y1="22" x2="30" y2="28" stroke="#d4af37" strokeWidth="0.8" />
      </g>
      {/* Ornament top-right */}
      <g fill="#d4af37" opacity="0.8" filter="url(#goldGlow)">
        <circle cx="170" cy="25" r="3" />
        <circle cx="170" cy="25" r="1.2" fill="#fff8" />
        <line x1="167" y1="25" x2="173" y2="25" stroke="#d4af37" strokeWidth="0.8" />
        <line x1="170" y1="22" x2="170" y2="28" stroke="#d4af37" strokeWidth="0.8" />
      </g>

      {/* --- Dragon head --- */}
      <g ref={glowRef} style={{ transformOrigin: '100px 100px' }}>
        {/* Neck */}
        <path d="M88,148 Q100,140 112,148 L108,120 Q100,115 92,120 Z" fill="#aa0000" stroke="#1a0000" strokeWidth="0.5" />

        {/* Body/chest hint */}
        <ellipse cx="100" cy="155" rx="20" ry="10" fill="#990000" />

        {/* Head */}
        <path
          d="M72,115 Q70,90 85,78 Q100,68 115,78 Q130,90 128,115 Q120,130 100,132 Q80,130 72,115 Z"
          fill="#cc0000"
          stroke="#1a0000"
          strokeWidth="1"
        />

        {/* Snout */}
        <path d="M88,118 Q100,128 112,118 Q110,132 100,136 Q90,132 88,118 Z" fill="#bb0000" stroke="#1a0000" strokeWidth="0.8" />

        {/* Jaw / open mouth hint */}
        <path d="M92,126 Q100,132 108,126" fill="none" stroke="#1a0000" strokeWidth="1" />

        {/* Small flame from mouth */}
        <path d="M97,133 Q100,142 103,133 Q105,138 100,144 Q95,138 97,133 Z" fill="#ff6600" opacity="0.85" />
        <path d="M99,136 Q100,141 101,136 Q102,139 100,142 Q98,139 99,136 Z" fill="#ffd700" opacity="0.7" />

        {/* Left horn */}
        <path d="M80,85 Q70,60 75,48 Q82,58 85,78 Z" fill="#aa0000" stroke="#d4af37" strokeWidth="0.8" />
        <circle cx="75" cy="48" r="2" fill="#d4af37" />
        {/* Right horn */}
        <path d="M120,85 Q130,60 125,48 Q118,58 115,78 Z" fill="#aa0000" stroke="#d4af37" strokeWidth="0.8" />
        <circle cx="125" cy="48" r="2" fill="#d4af37" />

        {/* Scale hints */}
        <path d="M90,95 Q95,90 100,95 Q105,90 110,95" fill="none" stroke="#1a0000" strokeWidth="0.7" opacity="0.7" />
        <path d="M87,105 Q93,100 100,105 Q107,100 113,105" fill="none" stroke="#1a0000" strokeWidth="0.7" opacity="0.7" />

        {/* Eyes */}
        <g ref={eyeRef}>
          {/* Left eye glow */}
          <circle cx="88" cy="95" r="6" fill="url(#eyeGlow)" />
          <circle cx="88" cy="95" r="3.5" fill="#d4af37" />
          <circle cx="88" cy="95" r="2" fill="#8B6914" />
          <circle cx="87" cy="94" r="0.7" fill="#fffde0" />
          {/* Right eye glow */}
          <circle cx="112" cy="95" r="6" fill="url(#eyeGlow)" />
          <circle cx="112" cy="95" r="3.5" fill="#d4af37" />
          <circle cx="112" cy="95" r="2" fill="#8B6914" />
          <circle cx="111" cy="94" r="0.7" fill="#fffde0" />
        </g>
      </g>

      {/* Crossed swords at bottom */}
      <g stroke="#d4af37" strokeWidth="1.2" opacity="0.8" filter="url(#goldGlow)">
        {/* Left sword */}
        <line x1="80" y1="215" x2="95" y2="195" />
        <line x1="83" y1="210" x2="78" y2="208" />
        <line x1="83" y1="210" x2="85" y2="205" />
        {/* Right sword */}
        <line x1="120" y1="215" x2="105" y2="195" />
        <line x1="117" y1="210" x2="122" y2="208" />
        <line x1="117" y1="210" x2="115" y2="205" />
      </g>

      {/* DR letters */}
      <text
        x="100"
        y="228"
        textAnchor="middle"
        fontFamily="Cinzel, serif"
        fontSize="7"
        fill="#d4af37"
        opacity="0.9"
      >
        DR
      </text>
    </svg>
  )

  return svgContent
}
