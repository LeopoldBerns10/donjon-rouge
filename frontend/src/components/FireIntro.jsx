import { useEffect, useRef, useState } from 'react'

export default function FireIntro() {
  const overlayCanvasRef = useRef(null)
  const fireCanvasRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const rafRef = useRef(null)

  useEffect(() => {
    if (sessionStorage.getItem('dragonIntroPlayed')) return
    setVisible(true)

    const overlayCanvas = overlayCanvasRef.current
    const fireCanvas = fireCanvasRef.current
    if (!overlayCanvas || !fireCanvas) return

    const W = window.innerWidth
    const H = window.innerHeight
    overlayCanvas.width = fireCanvas.width = W
    overlayCanvas.height = fireCanvas.height = H

    const octx = overlayCanvas.getContext('2d')
    const fctx = fireCanvas.getContext('2d')

    // Fill overlay black
    octx.fillStyle = '#000'
    octx.fillRect(0, 0, W, H)

    const particles = []
    const COUNT = Math.floor(W / 6)

    for (let i = 0; i < COUNT; i++) {
      particles.push({
        x: Math.random() * W,
        y: -Math.random() * H * 0.5,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 4 + Math.random() * 4,
        size: 10 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
      })
    }

    const startTime = performance.now()
    const DURATION = 2500

    function animate(now) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / DURATION, 1)

      fctx.globalCompositeOperation = 'source-over'
      fctx.fillStyle = 'rgba(0,0,0,0.12)'
      fctx.fillRect(0, 0, W, H)

      for (const p of particles) {
        p.x += p.vx + Math.sin(now * 0.003 + p.phase) * 0.8
        p.y += p.vy

        if (p.y > H + 20) {
          p.y = -20
          p.x = Math.random() * W
        }

        const t = p.y / H
        const r = Math.floor(255)
        const g = Math.floor(80 + t * 140)
        const b = 0
        const alpha = 0.6 + Math.sin(now * 0.01 + p.phase) * 0.3

        fctx.globalCompositeOperation = 'source-over'
        const grad = fctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
        fctx.fillStyle = grad
        fctx.beginPath()
        fctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        fctx.fill()

        // Burn through the overlay
        octx.globalCompositeOperation = 'destination-out'
        octx.fillStyle = `rgba(0,0,0,${0.08 * progress})`
        octx.beginPath()
        octx.arc(p.x, p.y, p.size * 1.4, 0, Math.PI * 2)
        octx.fill()
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        // Fade out the whole wrapper
        setTimeout(() => {
          setVisible(false)
          sessionStorage.setItem('dragonIntroPlayed', '1')
        }, 500)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <canvas ref={overlayCanvasRef} style={{ position: 'absolute', inset: 0 }} />
      <canvas ref={fireCanvasRef} style={{ position: 'absolute', inset: 0 }} />
    </div>
  )
}
