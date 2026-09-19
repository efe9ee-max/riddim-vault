import React, { useEffect, useRef, useCallback } from 'react'
import { useAudio } from '../context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const { analyserData, isPlaying } = useAudio()

  const pulseScaleRef = useRef(1)
  const shakeRef = useRef({ x: 0, y: 0 })
  const shockwavesRef = useRef([])
  const particlesRef = useRef([])
  const animRef = useRef(null)
  const lastBassRef = useRef(0)
  const phaseRef = useRef(0)

  // Parçacık sistemi (Blood Abyss tarzı köz ve magma kıvılcımları)
  const initParticles = useCallback(() => {
    particlesRef.current = Array.from({ length: 80 }, () => ({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 320 + 60,
      speed: Math.random() * 0.75 + 0.3,
      size: Math.random() * 2.2 + 0.6,
      alpha: Math.random() * 0.75 + 0.2,
      hue: Math.random() < 0.5 ? 'red' : Math.random() < 0.4 ? 'orange' : 'gold'
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

      phaseRef.current += 0.038

      // 1. Bas ve Orta Frekans Enerjisi
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

      // 2. The Dub Rebellion "Bass Punch" Zıplaması
      const targetScale = isPlaying ? 1.0 + Math.pow(bassEnergy, 1.6) * 0.30 : 1.0
      pulseScaleRef.current += (targetScale - pulseScaleRef.current) * 0.28

      // Sert kick/snare anında ekran sarsıntısı (Tearout Screen Shake)
      const bassDelta = bassEnergy - lastBassRef.current
      if (isPlaying && bassEnergy > 0.65 && bassDelta > 0.12) {
        shakeRef.current.x = (Math.random() - 0.5) * (bassEnergy * 8)
        shakeRef.current.y = (Math.random() - 0.5) * (bassEnergy * 8)

        // Kan kırmızısı / Magma turuncusu şok dalgası fırlat
        shockwavesRef.current.push({
          r: 65 * pulseScaleRef.current,
          maxR: Math.max(W, H) * 0.46,
          alpha: 0.85,
          speed: 7 + bassEnergy * 8,
          color: Math.random() > 0.5 ? 'rgba(255, 20, 70,' : 'rgba(255, 110, 0,'
        })
      } else {
        shakeRef.current.x *= 0.75
        shakeRef.current.y *= 0.75
      }
      lastBassRef.current = bassEnergy

      // ── ÇİZİM AŞAMALARI ──────────────────────────────────────────────────
      
      // Arka plan temizle (Koyu antrasit / kan gölgesi izi ile)
      ctx.fillStyle = 'rgba(6, 6, 10, 0.84)'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      // Ekran sarsıntısını uygula
      ctx.translate(shakeRef.current.x, shakeRef.current.y)

      // Şok dalgaları
      drawShockwaves(ctx, cx, cy, shockwavesRef.current)

      // Dışarıya süzülen köz / kıvılcım parçacıkları
      drawParticles(ctx, cx, cy, particlesRef.current, bassEnergy, isPlaying)

      // Blood Abyss (Kan Kırmızısı & Siber Turuncu) Sıvı Dalga Halkaları
      drawBloodAbyssWaves(ctx, cx, cy, analyserData, isPlaying, pulseScaleRef.current, phaseRef.current, bassEnergy, midEnergy)

      // Merkez: The Abyss Core / Singularity Çekirdeği (Kapak yerine reaktif reaktör)
      drawAbyssCore(ctx, cx, cy, pulseScaleRef.current, phaseRef.current, bassEnergy, isPlaying)

      ctx.restore()

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserData, isPlaying])

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-red-950/40"
      style={{
        height: '270px',
        background: 'radial-gradient(ellipse at center, rgba(255,20,70,0.08) 0%, rgba(6,6,10,0.96) 72%)'
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

// ── 🔴 BLOOD ABYSS (KAN KIRMIZISI & SİBER TURUNCU) SIVI ELEKTRİK DALGALARI ────
function drawBloodAbyssWaves(ctx, cx, cy, data, isPlaying, scale, phase, bassEnergy, midEnergy) {
  const baseRadius = 60 * scale
  const pointsCount = 96
  const maxAmp = 48

  const points1 = [] // Ana Kan Kırmızısı Dalga
  const points2 = [] // Dış Siber Turuncu Rezonans Dalga
  const points3 = [] // İç Magma Dolgu Aurası

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

    // Riddim Tearout Wobble dalgalanması
    const wobble1 = Math.sin(phase * 3 + i * 0.4) * (midEnergy * 11)
    const wobble2 = Math.cos(phase * 2.5 - i * 0.3) * (bassEnergy * 15)

    // Katman 1: Ana Kan Kırmızısı
    const r1 = baseRadius + Math.max(3, val * maxAmp) + wobble1
    points1.push({ x: cx + Math.cos(angle) * r1, y: cy + Math.sin(angle) * r1 })

    // Katman 2: Dış Siber Turuncu
    const r2 = baseRadius + Math.max(2, val * (maxAmp * 1.25)) + wobble2 + 5
    points2.push({ x: cx + Math.cos(angle) * r2, y: cy + Math.sin(angle) * r2 })

    // Katman 3: İç Magma Dolgusu
    const r3 = baseRadius + Math.max(1, val * (maxAmp * 0.55))
    points3.push({ x: cx + Math.cos(angle) * r3, y: cy + Math.sin(angle) * r3 })
  }

  // 1. KATMAN: DIŞ ELEKTRİK CYAN & MOR REZONANS DALGA
  ctx.save()
  drawSmoothClosedCurve(ctx, points2)
  const outerGrad = ctx.createLinearGradient(cx - baseRadius * 1.5, cy - baseRadius * 1.5, cx + baseRadius * 1.5, cy + baseRadius * 1.5)
  outerGrad.addColorStop(0, `rgba(0, 240, 255, ${0.4 + bassEnergy * 0.5})`)
  outerGrad.addColorStop(0.5, `rgba(217, 70, 239, ${0.5 + bassEnergy * 0.5})`)
  outerGrad.addColorStop(1, `rgba(255, 100, 0, ${0.4 + bassEnergy * 0.5})`)
  ctx.strokeStyle = outerGrad
  ctx.lineWidth = 2.5
  ctx.shadowBlur = 22
  ctx.shadowColor = 'rgba(0, 240, 255, 0.85)'
  ctx.stroke()

  // 2. KATMAN: İÇ ULTRAVİYOLE / MAGMA DOLGU AURA
  drawSmoothClosedCurve(ctx, points3)
  ctx.fillStyle = `rgba(217, 70, 239, ${0.07 + bassEnergy * 0.15})`
  ctx.fill()
  ctx.restore()

  // 3. KATMAN: ANA SIVI DALGA (Ultra Canlı Neon Crimson -> Magenta -> Cyan Akışı)
  ctx.save()
  drawSmoothClosedCurve(ctx, points1)
  const mainGrad = ctx.createLinearGradient(cx - baseRadius, cy - baseRadius, cx + baseRadius, cy + baseRadius)
  mainGrad.addColorStop(0, '#ff0055')
  mainGrad.addColorStop(0.35, '#d946ef')
  mainGrad.addColorStop(0.7, '#00f0ff')
  mainGrad.addColorStop(1, '#ff6600')
  ctx.strokeStyle = mainGrad
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.shadowBlur = 26 + bassEnergy * 24
  ctx.shadowColor = bassEnergy > 0.45 ? 'rgba(255, 0, 85, 0.95)' : 'rgba(0, 240, 255, 0.85)'
  ctx.stroke()
  ctx.restore()

  // 4. FREKANS KIVILCIMLARI (Akkor Beyaz / Cyan Elmas Işıklar)
  if (isPlaying && (bassEnergy > 0.35 || midEnergy > 0.32)) {
    ctx.save()
    for (let i = 0; i < points1.length; i += 4) {
      const p = points1[i]
      ctx.fillStyle = '#ffffff'
      ctx.shadowBlur = 14
      ctx.shadowColor = i % 8 === 0 ? '#00f0ff' : '#ff007f'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.8 + bassEnergy * 1.6, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()
  }
}

// ── MERKEZ: THE ABYSS CORE (REAKTİF SİBER ÇEKİRDEK / KARA DELİK) ─────────────
function drawAbyssCore(ctx, cx, cy, scale, phase, bassEnergy, isPlaying) {
  const radius = 58 * scale

  ctx.save()
  ctx.translate(cx, cy)

  // 1. Dış Plazma Aurası (Ağır bas vuruşunda kırmızı-magenta-cyan patlar)
  const glowGrad = ctx.createRadialGradient(0, 0, radius * 0.6, 0, 0, radius * 1.45)
  glowGrad.addColorStop(0, `rgba(255, 0, 85, ${0.25 + bassEnergy * 0.5})`)
  glowGrad.addColorStop(0.5, `rgba(217, 70, 239, ${0.15 + bassEnergy * 0.35})`)
  glowGrad.addColorStop(0.85, `rgba(0, 240, 255, ${0.12 + bassEnergy * 0.25})`)
  glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = glowGrad
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.45, 0, Math.PI * 2)
  ctx.fill()

  // 2. Koyu Obsidyen Zemin (Event Horizon)
  const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
  coreGrad.addColorStop(0, '#150616')
  coreGrad.addColorStop(0.65, '#0a050f')
  coreGrad.addColorStop(1, '#020104')
  ctx.fillStyle = coreGrad
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.fill()

  // 3. İç İçe Dönen Siber Hedefleme & Rezonans Çemberleri
  ctx.strokeStyle = `rgba(0, 240, 255, ${0.25 + bassEnergy * 0.45})`
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2)
  ctx.stroke()

  ctx.strokeStyle = `rgba(255, 0, 85, ${0.3 + bassEnergy * 0.45})`
  ctx.beginPath()
  ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2)
  ctx.stroke()

  // 4. Merkezde Akkor Parlayan Geometrik "NAMMU" Siber Amblemi
  const emblemGlow = 16 + bassEnergy * 32
  ctx.fillStyle = bassEnergy > 0.5 ? '#ffffff' : '#00f0ff'
  ctx.font = `900 ${Math.round(14 * scale)}px Orbitron, monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.shadowBlur = emblemGlow
  ctx.shadowColor = bassEnergy > 0.4 ? 'rgba(255, 255, 255, 0.95)' : 'rgba(217, 70, 239, 0.95)'
  ctx.fillText('NAMMU', 0, 0)
  ctx.shadowBlur = 0

  // 5. Çekirdek Dış Çember Neon Çerçevesi
  ctx.restore() // Çeviri kalktı
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = bassEnergy > 0.4 ? 'rgba(255, 20, 70, 0.98)' : 'rgba(255, 110, 0, 0.8)'
  ctx.lineWidth = 3
  ctx.shadowBlur = 20 + bassEnergy * 16
  ctx.shadowColor = bassEnergy > 0.4 ? 'rgba(255, 20, 70, 0.98)' : 'rgba(255, 110, 0, 0.8)'
  ctx.stroke()
  ctx.restore()
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

  const last = points.length - 1
  const xc = (points[last].x + points[0].x) / 2
  const yc = (points[last].y + points[0].y) / 2
  ctx.quadraticCurveTo(points[last].x, points[last].y, xc, yc)
  ctx.closePath()
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

// ── KÖZ / KIVILCIM PARÇACIKLARI (BLOOD ABYSS) ────────────────────────────────
function drawParticles(ctx, cx, cy, particles, bassEnergy, isPlaying) {
  const boost = isPlaying ? 1 + bassEnergy * 4 : 1

  particles.forEach(p => {
    p.dist += p.speed * boost
    if (p.dist > 520) {
      p.dist = 60
      p.angle = Math.random() * Math.PI * 2
    }

    const px = cx + Math.cos(p.angle) * p.dist
    const py = cy + Math.sin(p.angle) * p.dist
    const size = p.size * (1 + bassEnergy * 0.7)

    let color = 'rgba(255,20,70,'
    if (p.hue === 'orange') color = 'rgba(255,110,0,'
    if (p.hue === 'gold') color = 'rgba(255,200,50,'

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
