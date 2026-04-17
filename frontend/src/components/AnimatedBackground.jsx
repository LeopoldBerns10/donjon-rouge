import { useEffect, useRef } from 'react'

// ─── Variants config ──────────────────────────────────────────────────────────

const VARIANTS = {
  home: {
    count: 200,
    bgColor: '#0a0101',
    particleColors: ['#ff4500', '#ff6a00', '#ff8c00', '#ffd700', '#ff2200'],
    minSize: 1.5,
    maxSize: 4,
    speed: 2.0,
    drift: 0.8,
    opacity: 1.0,
    glowColor: 'rgba(220, 38, 38, 0.2)',
  },
  members: {
    count: 100,
    bgColor: '#080808',
    particleColors: ['#dc2626', '#7f1d1d', '#991b1b', '#b91c1c'],
    minSize: 1,
    maxSize: 2.5,
    speed: 0.8,
    drift: 0.3,
    opacity: 0.8,
    glowColor: 'rgba(220, 38, 38, 0.12)',
  },
  wars: {
    count: 150,
    bgColor: '#0a0000',
    particleColors: ['#8b0000', '#dc143c', '#ff0000', '#b22222', '#ff4444'],
    minSize: 1.5,
    maxSize: 5,
    speed: 1.8,
    drift: 1.0,
    opacity: 0.9,
    glowColor: 'rgba(139, 0, 0, 0.2)',
  },
  stats: {
    count: 80,
    bgColor: '#050505',
    particleColors: ['#dc2626', '#ef4444', '#ff6b6b'],
    minSize: 1,
    maxSize: 2.5,
    speed: 0.6,
    drift: 0.1,
    opacity: 0.8,
    glowColor: 'rgba(220, 38, 38, 0.12)',
    grid: true,
  },
  vitrine: {
    count: 180,
    bgColor: '#080400',
    particleColors: ['#ffd700', '#ff8c00', '#ff6a00', '#ffa500', '#ffcc00'],
    minSize: 1.5,
    maxSize: 4,
    speed: 1.5,
    drift: 0.7,
    opacity: 1.0,
    glowColor: 'rgba(255, 165, 0, 0.2)',
  },
  forum: {
    count: 120,
    bgColor: '#050008',
    particleColors: ['#7c3aed', '#dc2626', '#9f1239', '#6d28d9', '#be185d'],
    minSize: 1,
    maxSize: 3,
    speed: 0.9,
    drift: 0.4,
    opacity: 0.8,
    glowColor: 'rgba(124, 58, 237, 0.15)',
  },
  admin: {
    count: 60,
    bgColor: '#040404',
    particleColors: ['#dc2626', '#7f1d1d'],
    minSize: 0.8,
    maxSize: 1.5,
    speed: 0.4,
    drift: 0.1,
    opacity: 0.6,
    glowColor: 'rgba(220, 38, 38, 0.1)',
    grid: true,
  },
}

// ─── Particle helpers ─────────────────────────────────────────────────────────

const createParticle = (config, canvasWidth, canvasHeight) => ({
  x: Math.random() * canvasWidth,
  y: Math.random() * canvasHeight + canvasHeight,
  size: config.minSize + Math.random() * (config.maxSize - config.minSize),
  color: config.particleColors[Math.floor(Math.random() * config.particleColors.length)],
  speedY: -(config.speed * 0.5 + Math.random() * config.speed),
  speedX: (Math.random() - 0.5) * config.drift,
  opacity: config.opacity * (0.5 + Math.random() * 0.5),
  life: 0,
  maxLife: 150 + Math.random() * 200,
})

const updateParticle = (p, canvas, config) => {
  p.x += p.speedX + Math.sin(p.life * 0.05) * 0.3
  p.y += p.speedY
  p.life++

  if (p.life > p.maxLife * 0.7) {
    p.opacity *= 0.98
  }

  if (p.y < -10 || p.life > p.maxLife || p.opacity < 0.01) {
    const fresh = createParticle(config, canvas.width, canvas.height)
    Object.assign(p, fresh)
    p.y = canvas.height + 10
  }
}

const drawParticle = (ctx, p) => {
  ctx.save()
  ctx.globalAlpha = p.opacity
  ctx.shadowBlur = p.size * 8
  ctx.shadowColor = p.color
  ctx.beginPath()
  ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
  ctx.fillStyle = p.color
  ctx.fill()
  ctx.restore()
}

const drawBackground = (ctx, canvas, variant) => {
  const config = VARIANTS[variant]

  // Lueur centrale — alpha doublé au centre
  const boostedGlow = config.glowColor.replace(
    /rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/,
    (_, r, g, b, a) => `rgba(${r}, ${g}, ${b}, ${Math.min(1, parseFloat(a) * 2)})`
  )
  const gradient = ctx.createRadialGradient(
    canvas.width / 2, canvas.height / 2, 0,
    canvas.width / 2, canvas.height / 2, canvas.width * 0.7
  )
  gradient.addColorStop(0, boostedGlow)
  gradient.addColorStop(0.4, config.glowColor)
  gradient.addColorStop(1, 'transparent')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Grille pour stats et admin
  if (config.grid) {
    ctx.strokeStyle = 'rgba(220, 38, 38, 0.04)'
    ctx.lineWidth = 0.5
    const gridSize = 60
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }
  }

  // Flammes basses pour guerres
  if (variant === 'wars') {
    const flameGrad = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height)
    flameGrad.addColorStop(0, 'transparent')
    flameGrad.addColorStop(1, 'rgba(139, 0, 0, 0.15)')
    ctx.fillStyle = flameGrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  // Brouillard pour membres et forum
  if (variant === 'members' || variant === 'forum') {
    const fogGrad = ctx.createRadialGradient(
      canvas.width * 0.3, canvas.height * 0.5, 0,
      canvas.width * 0.3, canvas.height * 0.5, canvas.width * 0.5
    )
    fogGrad.addColorStop(0, variant === 'forum'
      ? 'rgba(124, 58, 237, 0.04)'
      : 'rgba(220, 38, 38, 0.03)')
    fogGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = fogGrad
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AnimatedBackground({ variant = 'home' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animFrame
    let particles = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const config = VARIANTS[variant] || VARIANTS.home
    const isMobile = window.innerWidth < 768
    const count = isMobile ? Math.floor(config.count / 2) : config.count

    for (let i = 0; i < count; i++) {
      const p = createParticle(config, canvas.width, canvas.height)
      // Répartir les particules sur toute la hauteur au démarrage
      p.y = Math.random() * canvas.height
      p.life = Math.random() * p.maxLife
      particles.push(p)
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = config.bgColor
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      drawBackground(ctx, canvas, variant)

      particles.forEach(p => {
        updateParticle(p, canvas, config)
        drawParticle(ctx, p)
      })

      animFrame = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animFrame)
      window.removeEventListener('resize', resize)
    }
  }, [variant])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  )
}
