import React, { useEffect, useRef, useCallback } from 'react'
import { useAudio } from '../context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const { analyserData, isPlaying, currentTrack } = useAudio()
  
  const rotationRef = useRef(0)
  const pulseScaleRef = useRef(1)
  const shockwavesRef = useRef([])
  const particlesRef = useRef([])
  const coverImgRef = useRef(null)
  const animRef = useRef(null)
  const lastBassRef = useRef(0)

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

  // Parçacık sistemi (Dışa doğru patlayan toz/yıldız efekti)
  const initParticles = useCallback(() => {
    particlesRef.current = Array.from({ length: 80 }, () => ({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 300 + 60,
      speed: Math.random() * 0.8 + 0.3,
      size: Math.random() * 2 + 0.8,
      alpha: Math.random() * 0.6 + 0.2,
      hue: Math.random() < 0.5 ? 'neon' : Math.random() < 0.5 ? 'purple' : 'cyan'
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

      // Bas enerjisini hesapla
      let bassEnergy = 0
      if (analyserData && isPlaying) {
        let sum = 0
        const sampleCount = Math.min(12, analyserData.length)
        for (let i = 0; i < sampleCount; i++) {
          sum += analyserData[i]
        }
        bassEnergy = sum / (sampleCount * 255)
      }

      // Trap Nation tarzı Bas Zıplaması (Spring Pulse)
      const targetScale = isPlaying ? 1.0 + Math.pow(bassEnergy, 1.8) * 0.32 : 1.0
      pulseScaleRef.current += (targetScale - pulseScaleRef.current) * 0.22

      // Dönme açısı (Müzik çalarken yavaş plak dönüşü)
      if (isPlaying) {
        rotationRef.current += 0.007 + bassEnergy * 0.012
      } else {
        rotationRef.current += 0.002
      }

      // Bas vuruşu (Kick) tespiti -> Şok dalgası fırlat
      if (isPlaying && bassEnergy > 0.62 && (bassEnergy - lastBassRef.current) > 0.12) {
        shockwavesRef.current.push({
          r: 65 * pulseScaleRef.current,
          maxR: Math.max(W, H) * 0.45,
          alpha: 0.8,
          speed: 6 + bassEnergy * 6,
          color: Math.random() > 0.5 ? 'rgba(34,197,94,' : 'rgba(168,85,247,'
        })
      }
      lastBassRef.current = bassEnergy

      // ── ÇİZİM AŞAMALARI ──────────────────────────────────────────────────
      
      // 1. Arka plan temizleme (Hafif hareket izi / Motion trail ile)
      ctx.fillStyle = 'rgba(7, 8, 13, 0.82)'
      ctx.fillRect(0, 0, W, H)

      // 2. Şok dalgaları (Bass Shockwaves)
      drawShockwaves(ctx, cx, cy, shockwavesRef.current)

      // 3. Patlayan dış parçacıklar
      drawParticles(ctx, cx, cy, particlesRef.current, bassEnergy, isPlaying)

      // 4. Trap Nation 360° Simetrik Spektrum Işınları
      drawTrapNationBars(ctx, cx, cy, analyserData, isPlaying, pulseScaleRef.current)

      // 5. Merkez Dönen Plak / Kapak / NAMMU Logosu
      drawCenterDisc(ctx, cx, cy, pulseScaleRef.current, rotationRef.current, coverImgRef.current, bassEnergy, isPlaying)

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
        background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.08) 0%, rgba(7,8,13,0.95) 75%)'
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

// ── ŞOK DALGALARI (SHOCKWAVES) ────────────────────────────────────────────────
function drawShockwaves(ctx, cx, cy, waves) {
  for (let i = waves.length - 1; i >= 0; i--) {
    const w = waves[i]
    w.r += w.speed
    w.alpha -= 0.02

    if (w.alpha <= 0 || w.r >= w.maxR) {
      waves.splice(i, 1)
      continue
    }

    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, w.r, 0, Math.PI * 2)
    ctx.strokeStyle = `${w.color}${w.alpha})`
    ctx.lineWidth = 3
    ctx.shadowBlur = 15
    ctx.shadowColor = `${w.color}0.8)`
    ctx.stroke()
    ctx.restore()
  }
}

// ── DIŞA PATLAYAN PARÇACIKLAR ─────────────────────────────────────────────────
function drawParticles(ctx, cx, cy, particles, bassEnergy, isPlaying) {
  const boost = isPlaying ? 1 + bassEnergy * 4 : 1

  particles.forEach(p => {
    p.dist += p.speed * boost
    if (p.dist > 500) {
      p.dist = 60
      p.angle = Math.random() * Math.PI * 2
    }

    const px = cx + Math.cos(p.angle) * p.dist
    const py = cy + Math.sin(p.angle) * p.dist
    const size = p.size * (1 + bassEnergy * 0.8)

    let color = 'rgba(34,197,94,'
    if (p.hue === 'purple') color = 'rgba(168,85,247,'
    if (p.hue === 'cyan') color = 'rgba(6,182,212,'

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

// ── TRAP NATION 360° SİMETRİK SPEKTRUM BARS ──────────────────────────────────
function drawTrapNationBars(ctx, cx, cy, data, isPlaying, scale) {
  const baseRadius = 60 * scale
  const totalBars = 128
  const half = totalBars / 2
  const maxBarLength = 65

  ctx.save()

  for (let i = 0; i < totalBars; i++) {
    // Simetrik ayna eşlemesi: Sol ve sağ yarılar tam simetrik vursun
    let sampleIdx = 0
    if (i < half) {
      sampleIdx = Math.floor((i / half) * (data ? data.length * 0.45 : 32))
    } else {
      sampleIdx = Math.floor(((totalBars - i) / half) * (data ? data.length * 0.45 : 32))
    }

    let val = 0
    if (data && isPlaying) {
      val = (data[sampleIdx] || 0) / 255
    } else {
      val = 0.05 + Math.sin(Date.now() * 0.003 + i * 0.15) * 0.03
    }

    // Açı: Üstten başla (-PI/2) ve 360° etrafında dön
    const angle = (i / totalBars) * Math.PI * 2 - Math.PI / 2
    const barHeight = Math.max(3, val * maxBarLength)

    const x1 = cx + Math.cos(angle) * baseRadius
    const y1 = cy + Math.sin(angle) * baseRadius
    const x2 = cx + Math.cos(angle) * (baseRadius + barHeight)
    const y2 = cy + Math.sin(angle) * (baseRadius + barHeight)

    // Trap Nation renk geçişi (Toksik yeşil -> Cyan -> Elektrik moru)
    const norm = Math.abs(i - half) / half
    let r = Math.round(34 + (168 - 34) * norm)
    let g = Math.round(197 * (1 - norm * 0.6))
    let b = Math.round(94 + (247 - 94) * norm)

    const alpha = 0.6 + val * 0.4

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`
    ctx.lineWidth = barHeight > 15 ? 3 : 2
    ctx.lineCap = 'round'
    ctx.shadowBlur = val > 0.4 ? 14 : 5
    ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`
    ctx.stroke()

    // Çubuk tepelerinde Trap Nation parlak nokta şapkası (Peak dots)
    if (barHeight > 10) {
      const dotR = baseRadius + barHeight + 3
      const dotX = cx + Math.cos(angle) * dotR
      const dotY = cy + Math.sin(angle) * dotR
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
      ctx.beginPath()
      ctx.arc(dotX, dotY, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

// ── MERKEZ PLAK / KAPAK / LOGO ───────────────────────────────────────────────
function drawCenterDisc(ctx, cx, cy, scale, rotation, coverImg, bassEnergy, isPlaying) {
  const radius = 58 * scale

  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(rotation)

  // 1. Dış Parlama Aurası (Bass vuruşunda mor-yeşil patlar)
  const auraGrad = ctx.createRadialGradient(0, 0, radius * 0.7, 0, 0, radius * 1.35)
  auraGrad.addColorStop(0, `rgba(34, 197, 94, ${0.15 + bassEnergy * 0.35})`)
  auraGrad.addColorStop(0.6, `rgba(168, 85, 247, ${0.1 + bassEnergy * 0.25})`)
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = auraGrad
  ctx.beginPath()
  ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2)
  ctx.fill()

  // 2. Daire Klip Alanı
  ctx.beginPath()
  ctx.arc(0, 0, radius, 0, Math.PI * 2)
  ctx.closePath()
  ctx.clip()

  if (coverImg) {
    // 3A. Çalan parçanın kapak resmi plak gibi döner
    ctx.drawImage(coverImg, -radius, -radius, radius * 2, radius * 2)
    
    // Üzerine hafif karanlık siber filtre
    ctx.fillStyle = 'rgba(7, 8, 13, 0.25)'
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2)
  } else {
    // 3B. Kapak yoksa: Fütüristik Gece Mavisi / Siyah Vinil Plak
    const vinylGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius)
    vinylGrad.addColorStop(0, '#121324')
    vinylGrad.addColorStop(0.7, '#07080d')
    vinylGrad.addColorStop(1, '#020205')
    ctx.fillStyle = vinylGrad
    ctx.fillRect(-radius, -radius, radius * 2, radius * 2)

    // Vinil plak yivleri (Grooves)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    for (let gr = 18; gr < radius; gr += 8) {
      ctx.beginPath()
      ctx.arc(0, 0, gr, 0, Math.PI * 2)
      ctx.stroke()
    }

    // Merkezde neon NAMMU logosu
    ctx.fillStyle = '#22c55e'
    ctx.font = `900 ${Math.round(13 * scale)}px Orbitron, monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.shadowBlur = 12
    ctx.shadowColor = 'rgba(34, 197, 94, 0.9)'
    ctx.fillText('NAMMU', 0, 0)
    ctx.shadowBlur = 0
  }

  // 4. Plak orta göbek deliği & Parlak Dış Çember
  ctx.restore() // Klip'i kaldır

  // Plak dış kenar neon çerçevesi
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, radius, 0, Math.PI * 2)
  ctx.strokeStyle = bassEnergy > 0.4 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(168, 85, 247, 0.7)'
  ctx.lineWidth = 2.5
  ctx.shadowBlur = 16
  ctx.shadowColor = bassEnergy > 0.4 ? 'rgba(34, 197, 94, 0.9)' : 'rgba(168, 85, 247, 0.7)'
  ctx.stroke()

  // Minik merkez iğne pini
  ctx.beginPath()
  ctx.arc(cx, cy, 4, 0, Math.PI * 2)
  ctx.fillStyle = '#22c55e'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#22c55e'
  ctx.fill()
  ctx.restore()
}
