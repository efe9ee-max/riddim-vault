import React, { useEffect, useRef, useCallback } from 'react'
import { useAudio } from '../context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const { analyserData, isPlaying, currentTrack } = useAudio()

  const pulseScaleRef = useRef(1)
  const shakeRef = useRef({ x: 0, y: 0 })
  const shockwavesRef = useRef([])
  const particlesRef = useRef([])
  const coverImgRef = useRef(null)
  const animRef = useRef(null)
  const lastBassRef = useRef(0)
  const phaseRef = useRef(0)

  // Kapak görseli değiştiğinde yükle
  useEffect(() => {
    if (currentTrack?.coverUrl) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = currentTrack.coverUrl
      img.onload = () => { coverImgRef.current = img }
      img.onerror = () => { coverImgRef.current = null }
    } else {
      coverImgRef.current = null
    }
  }, [currentTrack])

  // Parçacık sistemi (The Dub Rebellion tarzı karanlık siber kıvılcımlar)
  const initParticles = useCallback(() => {
    particlesRef.current = Array.from({ length: 75 }, () => ({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 320 + 70,
      speed: Math.random() * 0.7 + 0.25,
      size: Math.random() * 2 + 0.6,
      alpha: Math.random() * 0.7 + 0.15,
      hue: Math.random() < 0.6 ? 'neon' : Math.random() < 0.5 ? 'cyan' : 'purple'
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
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2

      phaseRef.current += 0.035

      // 1. Bas enerjisi hesapla
      let bassEnergy = 0
      let midEnergy = 0
      if (analyserData && isPlaying) {
        let bSum = 0
        const bCount = Math.min(10, analyserData.length)
        for (let i = 0; i < bCount; i++) bSum += analyserData[i]
        bassEnergy = bSum / (bCount * 255)

        let mSum = 0
        const mStart = Math.floor(analyserData.length * 0.1)
        const mEnd = Math.floor(analyserData.length * 0.45)
        for (let i = mStart; i < mEnd; i++) mSum += analyserData[i]
        midEnergy = mSum / ((mEnd - mStart) * 255)
      }

      // 2. The Dub Rebellion "Bass Punch" Zıplaması (Sert Riddim Vuruşu)
      const targetScale = isPlaying ? 1.0 + Math.pow(bassEnergy, 1.6) * 0.28 : 1.0
      pulseScaleRef.current += (targetScale - pulseScaleRef.current) * 0.28

      // Sert bas/snare anında ekran mikro sarsıntısı (Screen Shake)
      const bassDelta = bassEnergy - lastBassRef.current
      if (isPlaying && bassEnergy > 0.65 && bassDelta > 0.12) {
        shakeRef.current.x = (Math.random() - 0.5) * (bassEnergy * 8)
        shakeRef.current.y = (Math.random() - 0.5) * (bassEnergy * 8)

        // Şok dalgası fırlat
        shockwavesRef.current.push({
          r: 65 * pulseScaleRef.current,
          maxR: Math.max(W, H) * 0.46,
          alpha: 0.85,
          speed: 7 + bassEnergy * 8,
          color: Math.random() > 0.4 ? 'rgba(34,197,94,' : 'rgba(6,182,212,'
        })
      } else {
        shakeRef.current.x *= 0.75
        shakeRef.current.y *= 0.75
      }
      lastBassRef.current = bassEnergy

      // ── ÇİZİM ─────────────────────────────────────────────────────────────
      
      // Arka plan temizle
      ctx.fillStyle = 'rgba(7, 8, 13, 0.84)'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      // Ekran sarsıntısını uygula
      ctx.translate(shakeRef.current.x, shakeRef.current.y)

      // Şok dalgaları
      drawShockwaves(ctx, cx, cy, shockwavesRef.current)

      // Dışarıya süzülen köz parçacıkları
      drawParticles(ctx, cx, cy, particlesRef.current, bassEnergy, isPlaying)

      // The Dub Rebellion Sıvı / Elektrik Dalga Halkaları
      drawDubRebellionWaves(ctx, cx, cy, analyserData, isPlaying, pulseScaleRef.current, phaseRef.current, bassEnergy, midEnergy)

      // Merkez Kapak Görseli (Dönmez, dik durur, basla zıplar)
      drawCenterCover(ctx, cx, cy, pulseScaleRef.current, coverImgRef.current, bassEnergy)

      ctx.restore()

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserData, isPlaying])

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-border/40"
      style={{
        height: '270px',
        background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.06) 0%, rgba(7,8,13,0.96) 72%)'
      }}
    >
      <canvas
        ref={canvasRef}
        width={1200}
        height={270}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}

// ── THE DUB REBELLION SIVI ELEKTRİK DALGA HALKALARI ──────────────────────────
function drawDubRebellionWaves(ctx, cx, cy, data, isPlaying, scale, phase, bassEnergy, midEnergy) {
  const baseRadius = 60 * scale
  const pointsCount = 96
  const maxAmp = 46

  // Frekans noktalarını hesapla
  const points1 = []
  const points2 = []
  const points3 = []

  for (let i = 0; i <= pointsCount; i++) {
    const angle = (i / pointsCount) * Math.PI * 2 - Math.PI / 2

    // Sol ve sağ simetrik eşleme (Riddim stereo estetiği)
    const normI = Math.abs(i - pointsCount / 2) / (pointsCount / 2)
    const freqIdx = Math.floor(normI * (data ? data.length * 0.42 : 32))

    let val = 0
    if (data && isPlaying) {
      val = (data[freqIdx] || 0) / 255
    } else {
      val = 0.04 + Math.sin(phase * 2 + i * 0.25) * 0.02
    }

    // Riddim Wobble dalgası (Sıvı gibi kıvrılan organik hareket)
    const wobble1 = Math.sin(phase * 3 + i * 0.4) * (midEnergy * 10)
    const wobble2 = Math.cos(phase * 2.5 - i * 0.3) * (bassEnergy * 14)

    // Katman 1: Ana Toksik Yeşil Dalga
    const r1 = baseRadius + Math.max(3, val * maxAmp) + wobble1
    points1.push({ x: cx + Math.cos(angle) * r1, y: cy + Math.sin(angle) * r1 })

    // Katman 2: Dış Cyan / Mor Rezonans Dalgası
    const r2 = baseRadius + Math.max(2, val * (maxAmp * 1.25)) + wobble2 + 5
    points2.push({ x: cx + Math.cos(angle) * r2, y: cy + Math.sin(angle) * r2 })

    // Katman 3: İç Yumuşak Taban Dalgası
    const r3 = baseRadius + Math.max(1, val * (maxAmp * 0.55))
    points3.push({ x: cx + Math.cos(angle) * r3, y: cy + Math.sin(angle) * r3 })
  }

  // 1. KATMAN (ARKADAKİ CYAN / PURPLE REZONANS AURA)
  ctx.save()
  drawSmoothClosedCurve(ctx, points2)
  ctx.strokeStyle = `rgba(6, 182, 212, ${0.4 + bassEnergy * 0.5})`
  ctx.lineWidth = 2.5
  ctx.shadowBlur = 18
  ctx.shadowColor = 'rgba(6, 182, 212, 0.8)'
  ctx.stroke()

  // 2. KATMAN (ARA MOR DOLGU AURA)
  drawSmoothClosedCurve(ctx, points3)
  ctx.fillStyle = `rgba(168, 85, 247, ${0.08 + bassEnergy * 0.15})`
  ctx.fill()
  ctx.restore()

  // 3. KATMAN (ANA THE DUB REBELLION ELEKTRİK YEŞİLİ SIVI DALGA)
  ctx.save()
  drawSmoothClosedCurve(ctx, points1)
  ctx.strokeStyle = `rgba(34, 197, 94, ${0.85 + bassEnergy * 0.15})`
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 22 + bassEnergy * 18
  ctx.shadowColor = 'rgba(34, 197, 94, 0.95)'
  ctx.stroke()
  ctx.restore()

  // 4. DALGA ÜZERİNDEKİ FREKANS KIVILCIMLARI (TDR Glow Spikes)
  if (isPlaying && (bassEnergy > 0.4 || midEnergy > 0.35)) {
    ctx.save()
    for (let i = 0; i < points1.length; i += 4) {
      const p = points1[i]
      ctx.fillStyle = '#ffffff'
      ctx.shadowBlur = 10
      ctx.shadowColor = '#22c55e'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.8 + bassEnergy * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

// Kapalı düzgün eğri çizici (Smooth Spline Curve)
function drawSmoothClosedCurve(ctx, points) {
  if (points.length < 3) return
  ctx.beginPath()
  ctx.moveTo((points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2)

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  }

  // Son noktayı başa bağla
  const last = points.length - 1
  const xc = (points[last].x + points[0].x) / 2
  const yc = (points[last].y + points[0].y) / 2
  ctx.quadraticCurveTo(points[last].x, points[last].y, xc, yc)
  ctx.closePath()
}

// ── MERKEZ KAPAK GÖRSELİ (DÖNMEZ, BASLA PUNCH ATAR) ─────────────────────────
function drawCenterCover(ctx, cx, cy, scale, coverImg, bassEnergy) {
  const radius = 58 * scale

  ctx.save()
  ctx.translate(cx, cy)

  // 1. Kapak Arkası Ağır Neon Bas Patlaması
  const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.6, 0, 0, radius * 1.4)
  glowGrad.addColorStop(0, `rgba(34, 197, 94, ${0.2 + bassEnergy * 0.45})`)
  glowGrad.addColorStop(0.65, `rgba(6, 182, 212, ${0.12 + bassEnergy * 0.3})`)
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2)
  ctx.fill()

  // 2. Kapak Daire Klip
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (coverImg) {
    // Kapak tamamen DİK ve SABİT durur
    ctx.drawImage(coverImg, -radius, -radius, radius * 2, radius * 2)
  } else {
    // Kapak yokken: Karanlık siber daire
    const darkGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    darkGrad.addColorStop(0, '#15192e')
    darkGrad.addColorStop(0.7, '#080912')
    darkGrad.addColorStop(1, '#030306')
    ctx.fillStyle = darkGrad
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2)

    ctx.fillStyle = 'rgba(34, 197, 94, 0.5)'
    ctx.font = `${Math.round(26 * scale)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('⚡', 0, 0)
  }

  ctx.restore()

  // 3. TDR Neon Çerçeve Halkası
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = bassEnergy > 0.4 ? 'rgba(34, 197, 94, 0.95)' : 'rgba(6, 182, 212, 0.75)'
  ctx.lineWidth = 3
  ctx.shadowBlur = 18 + bassEnergy * 14
  ctx.shadowColor = bassEnergy > 0.4 ? 'rgba(34, 197, 94, 0.95)' : 'rgba(6, 182, 212, 0.75)'
  ctx.stroke()
  ctx.restore()
}

// ── ŞOK DALGALARI (BASS SHOCKWAVES) ──────────────────────────────────────────
function drawShockwaves(ctx, cx, cy, waves) {
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]
    w.r += w.speed
    w.alpha -= 0.024

    if (w.alpha <= 0 || w.r >= w.maxR) {
      waves.splice(i, 1)
      continue
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, w.r, 0, Math.PI * 2)
    ctx.strokeStyle = `${w.color}${w.alpha})`
    ctx.lineWidth = 3.5
    ctx.shadowBlur = 18
    ctx.shadowColor = `${w.color}0.9)`
    ctx.stroke()
    ctx.restore()
  }
}

// ── KÖZ / KIVILCIM PARÇACIKLARI ──────────────────────────────────────────────
function drawParticles(ctx, cx, cy, particles, bassEnergy, isPlaying) {
  const boost = isPlaying ? 1 + bassEnergy * 4 : 1

  particles.forEach(p => {
    p.dist += p.speed * boost
    if (p.dist > 520) {
      p.dist = 65
      p.angle = Math.random() * Math.PI * 2
    }

    const px = cx + Math.cos(p.angle) * p.dist
    const py = cy + Math.sin(p.angle) * p.dist
    const size = p.size * (1 + bassEnergy * 0.7)

    let color = 'rgba(34,197,94,'
    if (p.hue === 'cyan') color = 'rgba(6,182,212,'
    if (p.hue === 'purple') color = 'rgba(168,85,247,'

    ctx.save()
    ctx.fillStyle = `${color}${p.alpha})`
    ctx.shadowBlur = 8
    ctx.shadowColor = `${color}0.9)`
    ctx.beginPath()
    ctx.arc(px, py, size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}
