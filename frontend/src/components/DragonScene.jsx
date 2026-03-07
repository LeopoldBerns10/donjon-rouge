import { useEffect, useRef } from 'react'

function drawDragon(ctx, t, isMobile) {
  const scale = isMobile ? 0.65 : 1
  ctx.save()
  ctx.scale(scale, scale)

  // Animation values
  const breathe = Math.sin((t / 4) * Math.PI * 2) // -1 to 1, 4s
  const headTurn = Math.sin((t / 6) * Math.PI * 2) * (3 * Math.PI / 180)
  const tailSwing = Math.sin((t / 5) * Math.PI * 2) * (8 * Math.PI / 180)
  const wingVib = Math.sin((t / 3) * Math.PI * 2) * (2 * Math.PI / 180)
  const eyeGlow = 0.7 + 0.3 * Math.sin((t / 4) * Math.PI * 2)

  const cx = 220 // canvas center-ish
  const cy = 280 // body center

  // Body scale with breathing
  const bodyScaleX = 1 + 0.015 * breathe
  const bodyScaleY = 1 + 0.008 * breathe

  // --- Wings (behind body) ---
  ctx.save()
  ctx.translate(cx - 30, cy - 40)
  ctx.rotate(wingVib)
  // Left wing membrane
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-120, -80, -160, 20, -140, 100)
  ctx.bezierCurveTo(-100, 60, -40, 40, 0, 50)
  ctx.closePath()
  ctx.fillStyle = '#6B0000'
  ctx.fill()
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 1
  ctx.stroke()
  // Wing membrane veins
  ctx.strokeStyle = '#3a0000'
  ctx.lineWidth = 0.7
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-110, 60); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-140, 20); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(-90, 90); ctx.stroke()
  ctx.restore()

  // Right wing (same, mirrored, slightly offset)
  ctx.save()
  ctx.translate(cx + 30, cy - 40)
  ctx.rotate(-wingVib * 0.6)
  ctx.scale(-1, 1)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-120, -80, -160, 20, -140, 100)
  ctx.bezierCurveTo(-100, 60, -40, 40, 0, 50)
  ctx.closePath()
  ctx.fillStyle = '#550000'
  ctx.fill()
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  // --- Body ---
  ctx.save()
  ctx.translate(cx, cy)
  ctx.scale(bodyScaleX, bodyScaleY)
  ctx.beginPath()
  ctx.ellipse(0, 0, 70, 90, 0, 0, Math.PI * 2)
  const bodyGrad = ctx.createRadialGradient(-20, -20, 10, 0, 0, 80)
  bodyGrad.addColorStop(0, '#ff4444')
  bodyGrad.addColorStop(0.5, '#cc0000')
  bodyGrad.addColorStop(1, '#1a0000')
  ctx.fillStyle = bodyGrad
  ctx.fill()
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Scale pattern on body
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 0.7
  for (let row = -3; row <= 3; row++) {
    for (let col = -2; col <= 2; col++) {
      const ox = col * 20 + (row % 2 === 0 ? 10 : 0)
      const oy = row * 22
      if (ox * ox / 5000 + oy * oy / 8000 < 1) {
        ctx.beginPath()
        ctx.arc(ox, oy, 9, Math.PI, Math.PI * 2)
        ctx.stroke()
      }
    }
  }
  ctx.restore()

  // --- Tail ---
  ctx.save()
  ctx.translate(cx + 60, cy + 60)
  ctx.rotate(tailSwing * 0.3)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(60, -10, 120, 20, 150, -20)
  ctx.bezierCurveTo(160, -40, 145, -60, 130, -50)
  ctx.strokeStyle = '#cc0000'
  ctx.lineWidth = 18
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 1
  ctx.stroke()
  // Tail tip with more swing
  ctx.save()
  ctx.translate(150, -20)
  ctx.rotate(tailSwing * 0.8)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(25, -30)
  ctx.strokeStyle = '#cc0000'
  ctx.lineWidth = 8
  ctx.stroke()
  ctx.restore()
  ctx.restore()

  // --- Front legs ---
  // Left leg
  ctx.save()
  ctx.translate(cx - 50, cy + 70)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(-10, 30, -5, 60, -5, 80)
  ctx.strokeStyle = '#bb0000'
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.stroke()
  // Claws
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(-5 + i * 8, 80)
    ctx.lineTo(-5 + i * 10, 95)
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()

  // Right leg
  ctx.save()
  ctx.translate(cx + 50, cy + 70)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(10, 30, 5, 60, 5, 80)
  ctx.strokeStyle = '#bb0000'
  ctx.lineWidth = 16
  ctx.lineCap = 'round'
  ctx.stroke()
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath()
    ctx.moveTo(5 + i * 8, 80)
    ctx.lineTo(5 + i * 10, 95)
    ctx.strokeStyle = '#d4af37'
    ctx.lineWidth = 2
    ctx.stroke()
  }
  ctx.restore()

  // --- Neck ---
  ctx.save()
  ctx.translate(cx, cy - 90)
  ctx.beginPath()
  ctx.moveTo(-20, 0)
  ctx.bezierCurveTo(-25, -30, -15, -55, 0, -60)
  ctx.bezierCurveTo(15, -55, 25, -30, 20, 0)
  ctx.closePath()
  const neckGrad = ctx.createLinearGradient(-25, 0, 25, 0)
  neckGrad.addColorStop(0, '#bb0000')
  neckGrad.addColorStop(1, '#880000')
  ctx.fillStyle = neckGrad
  ctx.fill()
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 1
  ctx.stroke()
  ctx.restore()

  // --- Head ---
  ctx.save()
  ctx.translate(cx, cy - 150)
  ctx.rotate(headTurn)

  // Head shape
  ctx.beginPath()
  ctx.ellipse(0, 0, 42, 38, 0, 0, Math.PI * 2)
  const headGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, 45)
  headGrad.addColorStop(0, '#ff3333')
  headGrad.addColorStop(0.6, '#cc0000')
  headGrad.addColorStop(1, '#1a0000')
  ctx.fillStyle = headGrad
  ctx.fill()
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Snout
  ctx.beginPath()
  ctx.ellipse(2, 18, 22, 14, 0, 0, Math.PI * 2)
  ctx.fillStyle = '#bb0000'
  ctx.fill()
  ctx.stroke()

  // Mouth line
  ctx.beginPath()
  ctx.moveTo(-18, 20)
  ctx.quadraticCurveTo(2, 26, 22, 20)
  ctx.strokeStyle = '#1a0000'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // Nostril
  ctx.beginPath()
  ctx.ellipse(-5, 14, 3, 2, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = '#1a0000'
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(10, 14, 3, 2, 0.3, 0, Math.PI * 2)
  ctx.fillStyle = '#1a0000'
  ctx.fill()

  // Left horn
  ctx.beginPath()
  ctx.moveTo(-28, -18)
  ctx.bezierCurveTo(-45, -45, -38, -70, -30, -75)
  ctx.strokeStyle = '#aa0000'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.stroke()
  // Gold tip left horn
  ctx.beginPath()
  ctx.arc(-30, -75, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#d4af37'
  ctx.fill()

  // Right horn
  ctx.beginPath()
  ctx.moveTo(28, -18)
  ctx.bezierCurveTo(45, -45, 38, -70, 30, -75)
  ctx.strokeStyle = '#aa0000'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.stroke()
  // Gold tip right horn
  ctx.beginPath()
  ctx.arc(30, -75, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#d4af37'
  ctx.fill()

  // Eyes glow
  ctx.save()
  ctx.globalAlpha = eyeGlow * 0.5
  ctx.beginPath()
  ctx.arc(-16, -5, 10, 0, Math.PI * 2)
  ctx.fillStyle = '#ffd700'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(16, -5, 10, 0, Math.PI * 2)
  ctx.fillStyle = '#ffd700'
  ctx.fill()
  ctx.restore()

  // Eye pupils
  ctx.beginPath()
  ctx.arc(-16, -5, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#d4af37'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(-16, -5, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#5a3a00'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(16, -5, 6, 0, Math.PI * 2)
  ctx.fillStyle = '#d4af37'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(16, -5, 3, 0, Math.PI * 2)
  ctx.fillStyle = '#5a3a00'
  ctx.fill()
  // Eye highlight
  ctx.beginPath()
  ctx.arc(-14, -7, 1.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,220,0.8)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(18, -7, 1.5, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,220,0.8)'
  ctx.fill()

  ctx.restore() // end head

  ctx.restore() // end scale
}

export default function DragonScene() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const size = Math.min(window.innerHeight * (isMobile ? 0.25 : 0.4), 500)
    canvas.width = size * 0.9
    canvas.height = size

    const ctx = canvas.getContext('2d')
    const start = performance.now()

    function animate(now) {
      const t = (now - start) / 1000
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Translate so dragon sits at bottom-right of canvas
      ctx.save()
      ctx.translate(canvas.width * 0.5 - 220, canvas.height - 400)
      drawDragon(ctx, t, isMobile)
      ctx.restore()

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        opacity: 0.75,
        zIndex: 1,
        pointerEvents: 'none',
      }}
    />
  )
}
