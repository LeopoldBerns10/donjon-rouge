import { useEffect, useRef } from 'react'

export default function DragonBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    const embers = Array.from({ length: 80 }, () => createEmber(width, height))

    function createEmber(w, h) {
      return {
        x: Math.random() * w,
        y: h + Math.random() * 100,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 1.5 + 0.5,
        drift: (Math.random() - 0.5) * 0.8,
        opacity: Math.random() * 0.8 + 0.2,
        hue: Math.floor(Math.random() * 40) // 0-40 = red-orange range
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height)

      // Background gradient
      const bg = ctx.createRadialGradient(width / 2, height * 0.6, 0, width / 2, height * 0.6, height * 0.8)
      bg.addColorStop(0, 'rgba(107, 0, 0, 0.15)')
      bg.addColorStop(0.5, 'rgba(30, 0, 0, 0.08)')
      bg.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Stone cracks (static lines)
      ctx.strokeStyle = 'rgba(107, 0, 0, 0.06)'
      ctx.lineWidth = 1
      for (let i = 0; i < 8; i++) {
        ctx.beginPath()
        const sx = Math.random() * width
        ctx.moveTo(sx, 0)
        ctx.lineTo(sx + (Math.random() - 0.5) * 200, height)
        ctx.stroke()
      }

      // Embers
      embers.forEach((e) => {
        e.y -= e.speed
        e.x += e.drift
        e.opacity -= 0.003

        if (e.y < -10 || e.opacity <= 0) {
          Object.assign(e, createEmber(width, height))
        }

        ctx.beginPath()
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2)
        ctx.fillStyle = `hsla(${e.hue}, 100%, 60%, ${e.opacity})`
        ctx.shadowBlur = 8
        ctx.shadowColor = `hsla(${e.hue}, 100%, 50%, 0.8)`
        ctx.fill()
        ctx.shadowBlur = 0
      })
    }

    let animId
    function loop() {
      draw()
      animId = requestAnimationFrame(loop)
    }
    loop()

    function onResize() {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  )
}
