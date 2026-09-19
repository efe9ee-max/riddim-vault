import React, { useEffect, useRef, useCallback } from 'react'
import { useAudio } from '../context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const { analyserData, isPlaying, currentTrack } = useAudio()
  const particlesRef = useRef([])
  const timeRef = useRef(0)
  const animRef = useRef(null)

  // Parçacık sistemi başlat
  const initParticles = useCallback(() => {
    particlesRef.current = Array.from({ length: 60 }, () => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.0003,
      vy: (Math.random() - 0.5) * 0.0003,
      size: Math.random() * 1.5 + 0.5,
      alpha: Math.random() * 0.4 + 0.05,
      hue: Math.random() < 0.6 ? 'neon' : Math.random() < 0.5 ? 'purple' : 'cyan',
    }))
  }, [])

  useEffect(() => {
    initParticles()
  }, [initParticles])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const render = () => {
      timeRef.current += 0.012
      const W = canvas.width
      const H = canvas.height

      drawFrame(ctx, W, H, analyserData, isPlaying, timeRef.current, particlesRef.current)
      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserData, isPlaying])

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden"
      style={{ height: '220px', background: 'linear-gradient(180deg, #07080d 0%, #0d0e17 100%)' }}
    >
      <canvas
        ref={canvasRef}
        width={1200}
        height={220}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}

// ── Renk yardımcısı ────────────────────────────────────────────────────────────
function hueColor(type, alpha) {
  if (type === 'neon')   return `rgba(34,197,94,${alpha})`
  if (type === 'purple') return `rgba(168,85,247,${alpha})`
  return `rgba(6,182,212,${alpha})`
}

// ── Ana çizim fonksiyonu ───────────────────────────────────────────────────────
function drawFrame(ctx, W, H, data, isPlaying, t, particles) {
  // Temizle - hafif iz bırakarak (motion trail)
  ctx.fillStyle = 'rgba(7,8,13,0.75)'
  ctx.fillRect(0, 0, W, H)

  // ── 1. Arka plan ızgara ────────────────────────────────────────────────────
  drawGrid(ctx, W, H, t)

  // ── 2. Parçacıklar ─────────────────────────────────────────────────────────
  drawParticles(ctx, W, H, particles, data, isPlaying, t)

  // ── 3. Orta dairesel ring ─────────────────────────────────────────────────
  const cx = W / 2
  const cy = H / 2

  drawCircularRing(ctx, cx, cy, data, isPlaying, t)

  // ── 4. Ayna barlar (sol & sağ) ─────────────────────────────────────────────
  drawMirrorBars(ctx, W, H, data, isPlaying, t)

  // ── 5. Orta yatay dalga ────────────────────────────────────────────────────
  drawCenterWave(ctx, W, H, data, isPlaying, t)

  // ── 6. Kenar ışıma çerçevesi ───────────────────────────────────────────────
  if (isPlaying && data) drawEdgeGlow(ctx, W, H, data, t)
}

// ── Izgara ────────────────────────────────────────────────────────────────────
function drawGrid(ctx, W, H, t) {
  const spacing = 50
  const alpha = 0.06 + 0.02 * Math.sin(t * 0.5)
  ctx.strokeStyle = `rgba(34,197,94,${alpha})`
  ctx.lineWidth = 0.5

  for (let x = (t * 8) % spacing; x < W; x += spacing) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y < H; y += spacing) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }
}

// ── Parçacıklar ───────────────────────────────────────────────────────────────
function drawParticles(ctx, W, H, particles, data, isPlaying, t) {
  const energy = getEnergy(data)

  particles.forEach(p => {
    // Hareket
    p.x += p.vx * (1 + energy * 4)
    p.y += p.vy * (1 + energy * 2)

    if (p.x < 0) p.x = 1
    if (p.x > 1) p.x = 0
    if (p.y < 0) p.y = 1
    if (p.y > 1) p.y = 0

    const px = p.x * W
    const py = p.y * H
    const pulse = isPlaying ? 0.6 + energy * 0.8 : 0.3 + 0.2 * Math.sin(t + p.x * 10)
    const a = p.alpha * pulse
    const size = p.size * (1 + energy * 2)

    ctx.shadowBlur = size * 6
    ctx.shadowColor = hueColor(p.hue, a)
    ctx.fillStyle = hueColor(p.hue, a)
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.shadowBlur = 0
}

// ── Dairesel ring ─────────────────────────────────────────────────────────────
function drawCircularRing(ctx, cx, cy, data, isPlaying, t) {
  const baseR = 48
  const maxSpike = 38
  const bars = 120

  // Dış parlama halkası
  const energy = getEnergy(data)
  const glowR = baseR + 4 + energy * 10

  const ringGrad = ctx.createRadialGradient(cx, cy, baseR - 8, cx, cy, glowR + 12)
  ringGrad.addColorStop(0, `rgba(168,85,247,${0.03 + energy * 0.1})`)
  ringGrad.addColorStop(0.5, `rgba(34,197,94,${0.06 + energy * 0.15})`)
  ringGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = ringGrad
  ctx.beginPath()
  ctx.arc(cx, cy, glowR + 16, 0, Math.PI * 2)
  ctx.fill()

  // Çubuklar
  for (let i = 0; i < bars; i++) {
    const angle = (i / bars) * Math.PI * 2 - Math.PI / 2
    let value = 0

    if (data && isPlaying) {
      const idx = Math.floor((i / bars) * (data.length / 2))
      value = data[idx] / 255
    } else {
      value = 0.04 + 0.03 * Math.sin(t * 1.5 + i * 0.15)
    }

    const spike = value * maxSpike
    const r1 = baseR
    const r2 = baseR + spike + 2

    const x1 = cx + Math.cos(angle) * r1
    const y1 = cy + Math.sin(angle) * r1
    const x2 = cx + Math.cos(angle) * r2
    const y2 = cy + Math.sin(angle) * r2

    // Renk → pozisyona göre mor→neon→cyan döngüsü
    const norm = i / bars
    let color
    if (norm < 0.33)      color = lerp3([168,85,247], [34,197,94], norm / 0.33)
    else if (norm < 0.66) color = lerp3([34,197,94], [6,182,212], (norm - 0.33) / 0.33)
    else                  color = lerp3([6,182,212], [168,85,247], (norm - 0.66) / 0.34)

    const alpha = 0.4 + value * 0.6
    ctx.strokeStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`
    ctx.lineWidth = spike > 4 ? 2 : 1
    ctx.shadowBlur = value > 0.5 ? 10 : 4
    ctx.shadowColor = `rgba(${color[0]},${color[1]},${color[2]},${value * 0.8})`

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()
  }

  // İç dolgu dairesi
  const innerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, baseR)
  innerGrad.addColorStop(0, `rgba(168,85,247,${0.04 + energy * 0.08})`)
  innerGrad.addColorStop(0.6, `rgba(34,197,94,${0.02 + energy * 0.05})`)
  innerGrad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = innerGrad
  ctx.shadowBlur = 0
  ctx.beginPath()
  ctx.arc(cx, cy, baseR, 0, Math.PI * 2)
  ctx.fill()

  // Merkez nokta
  ctx.shadowBlur = 16
  ctx.shadowColor = `rgba(34,197,94,${0.6 + energy * 0.4})`
  ctx.fillStyle = `rgba(34,197,94,${0.7 + energy * 0.3})`
  ctx.beginPath()
  ctx.arc(cx, cy, 3 + energy * 3, 0, Math.PI * 2)
  ctx.fill()
  ctx.shadowBlur = 0
}

// ── Ayna çubuklar (sol ve sağ kenarda) ───────────────────────────────────────
function drawMirrorBars(ctx, W, H, data, isPlaying, t) {
  if (!data || !isPlaying) return

  const barCount = 32
  const maxH = H * 0.7
  const barW = 3
  const gap = 2
  const rightEdge = W - 20
  const leftEdge = 20

  for (let i = 0; i < barCount; i++) {
    const idx = Math.floor((i / barCount) * (data.length * 0.4))
    const val = data[idx] / 255
    const bh = val * maxH

    const yTop = (H - bh) / 2

    // Renk
    const t2 = i / barCount
    const color = lerp3([168,85,247], [34,197,94], t2)
    const alpha = 0.5 + val * 0.5

    ctx.shadowBlur = val > 0.4 ? 12 : 5
    ctx.shadowColor = `rgba(${color[0]},${color[1]},${color[2]},${val})`

    const grad = ctx.createLinearGradient(0, yTop, 0, yTop + bh)
    grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},0.1)`)
    grad.addColorStop(0.5, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`)
    grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0.1)`)

    ctx.fillStyle = grad

    // Sağ
    const rx = rightEdge - i * (barW + gap)
    if (rx > W / 2 + 80) {
      ctx.fillRect(rx, yTop, barW, bh)
    }

    // Sol
    const lx = leftEdge + i * (barW + gap)
    if (lx < W / 2 - 80) {
      ctx.fillRect(lx, yTop, barW, bh)
    }
  }
  ctx.shadowBlur = 0
}

// ── Orta dalga formu ─────────────────────────────────────────────────────────
function drawCenterWave(ctx, W, H, data, isPlaying, t) {
  const cy = H / 2
  const points = 200
  const amp = isPlaying && data ? 28 : 8

  ctx.beginPath()
  for (let i = 0; i <= points; i++) {
    const x = (i / points) * W
    let y

    if (data && isPlaying) {
      const idx = Math.floor((i / points) * data.length)
      const val = (data[idx] / 255 - 0.5) * 2
      y = cy + val * amp
    } else {
      const wave1 = Math.sin(t * 1.2 + i * 0.08) * amp * 0.4
      const wave2 = Math.sin(t * 0.7 + i * 0.15) * amp * 0.2
      y = cy + wave1 + wave2
    }

    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }

  const waveGrad = ctx.createLinearGradient(0, 0, W, 0)
  waveGrad.addColorStop(0, 'rgba(168,85,247,0)')
  waveGrad.addColorStop(0.2, 'rgba(168,85,247,0.6)')
  waveGrad.addColorStop(0.5, 'rgba(34,197,94,0.8)')
  waveGrad.addColorStop(0.8, 'rgba(6,182,212,0.6)')
  waveGrad.addColorStop(1, 'rgba(6,182,212,0)')

  ctx.strokeStyle = waveGrad
  ctx.lineWidth = 1.5
  ctx.shadowBlur = isPlaying ? 12 : 5
  ctx.shadowColor = 'rgba(34,197,94,0.5)'
  ctx.stroke()
  ctx.shadowBlur = 0
}

// ── Kenar ışıma ───────────────────────────────────────────────────────────────
function drawEdgeGlow(ctx, W, H, data, t) {
  const energy = getEnergy(data)
  if (energy < 0.1) return

  const alpha = energy * 0.3

  // Alt kenar
  const bottomGrad = ctx.createLinearGradient(0, H - 4, 0, H)
  bottomGrad.addColorStop(0, `rgba(34,197,94,${alpha})`)
  bottomGrad.addColorStop(1, 'rgba(34,197,94,0)')
  ctx.fillStyle = bottomGrad
  ctx.fillRect(0, H - 4, W, 4)

  // Üst kenar
  const topGrad = ctx.createLinearGradient(0, 0, 0, 4)
  topGrad.addColorStop(0, 'rgba(168,85,247,0)')
  topGrad.addColorStop(1, `rgba(168,85,247,${alpha * 0.5})`)
  ctx.fillStyle = topGrad
  ctx.fillRect(0, 0, W, 4)
}

// ── Yardımcılar ───────────────────────────────────────────────────────────────
function getEnergy(data) {
  if (!data) return 0
  let sum = 0
  const slice = Math.floor(data.length * 0.4)
  for (let i = 0; i < slice; i++) sum += data[i]
  return Math.min(1, sum / (slice * 200))
}

function lerp3(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ]
}
