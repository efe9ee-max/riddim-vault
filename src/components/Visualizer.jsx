import React, { useEffect, useRef, useCallback } from 'react'
import { useAudio } from '../context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const { analyserData, isPlaying } = useAudio()

  const pulseScaleRef = useRef(1)
  const smoothedDataRef = useRef(new Float32Array(128))
  const shardsRef = useRef([])
  const animRef = useRef(null)
  const angleOffsetRef = useRef(0)

  // Geometrik kristal / prizma parçacıkları (Referans görseldeki gibi Chromatic Aberration'lı cam kırıkları)
  const initShards = useCallback(() => {
    shardsRef.current = Array.from({ length: 45 }, () => ({
      x: 0,
      y: 0,
      angle: Math.random() * Math.PI * 2,
      dist: Math.random() * 340 + 75,
      speed: Math.random() * 0.6 + 0.25,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.03,
      size: Math.random() * 7 + 4,
      shape: Math.floor(Math.random() * 3), // 0: üçgen, 1: eşkenar dörtgen, 2: yamuk
      alpha: Math.random() * 0.6 + 0.2,
      side: Math.random() > 0.5 ? 'cyan' : 'magenta'
    }))
  }, [])

  useEffect(() => {
    initShards()
  }, [initShards])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const render = () => {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2

      angleOffsetRef.current += 0.0015

      // 1. Frekans Analizi & Yumuşatma (Ultra Akıcı Barlar)
      let bassEnergy = 0
      if (analyserData && isPlaying) {
        let bSum = 0
        const bCount = Math.min(10, analyserData.length)
        for (let i = 0; i < bCount; i++) bSum += analyserData[i]
        bassEnergy = bSum / (bCount * 255)

        for (let i = 0; i < 128; i++) {
          const target = analyserData[i] || 0
          // Yumuşak geçiş sönümlemesi
          if (target > smoothedDataRef.current[i]) {
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.35
          } else {
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.12
          }
        }
      } else {
        // Müzik çalmıyorken hafif canlı bekleme dalgası
        for (let i = 0; i < 128; i++) {
          const idle = 12 + Math.sin(Date.now() * 0.0025 + i * 0.18) * 8
          smoothedDataRef.current[i] += (idle - smoothedDataRef.current[i]) * 0.1
        }
      }

      // 2. Sub/Bass Scale Pulse (Trap Nation / Monstercat Tarzı Zıplama)
      const targetScale = isPlaying ? 1.0 + Math.pow(bassEnergy, 1.7) * 0.26 : 1.0
      pulseScaleRef.current += (targetScale - pulseScaleRef.current) * 0.25

      // ── ÇİZİM AŞAMALARI ──────────────────────────────────────────────────

      // 1. Arka Plan (Derin Siber Uzay & Hafif Motion Blur İzi)
      ctx.fillStyle = 'rgba(7, 8, 14, 0.86)'
      ctx.fillRect(0, 0, W, H)

      // 2. Anamorfik Lens Flare (Yatay Işık Hüzmesi: Solda Cyan, Sağda Magenta)
      drawAnamorphicFlare(ctx, cx, cy, W, bassEnergy, isPlaying)

      // 3. Chromatic Aberration'lı Geometrik Cam Kırıkları / Prizmalar
      drawFloatingShards(ctx, cx, cy, shardsRef.current, bassEnergy, isPlaying)

      // 4. Dairesel Reaktif Çember Barları (360° Renkli Spektrum)
      drawRadialSpectrumBars(ctx, cx, cy, smoothedDataRef.current, pulseScaleRef.current, bassEnergy, isPlaying)

      // 5. Merkez "N" Logolu Madalyon / Çekirdek Rozet
      drawCenterBadge(ctx, cx, cy, pulseScaleRef.current, bassEnergy)

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserData, isPlaying])

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-border/40"
      style={{
        height: '280px',
        background: 'radial-gradient(ellipse at center, rgba(13,17,32,0.9) 0%, rgba(5,6,10,0.98) 75%)'
      }}
    >
      <canvas
        ref={canvasRef}
        width={1200}
        height={280}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}

// ── 1. ANAMORFİK LENS FLARE (YATAY IŞIK HÜZMESİ) ──────────────────────────────
function drawAnamorphicFlare(ctx, cx, cy, W, bass, isPlaying) {
  const intensity = isPlaying ? 0.25 + bass * 0.5 : 0.15

  // Sol Cyan Işık Hüzmesi
  const leftFlare = ctx.createLinearGradient(cx, cy, 0, cy)
  leftFlare.addColorStop(0, `rgba(0, 240, 255, ${intensity * 0.45})`)
  leftFlare.addColorStop(0.5, `rgba(0, 240, 255, ${intensity * 0.15})`)
  leftFlare.addColorStop(1, 'rgba(0, 240, 255, 0)')
  ctx.fillStyle = leftFlare
  ctx.fillRect(0, cy - 1.5, cx, 3)

  // Sağ Magenta / Pembe Işık Hüzmesi
  const rightFlare = ctx.createLinearGradient(cx, cy, W, cy)
  rightFlare.addColorStop(0, `rgba(255, 45, 117, ${intensity * 0.45})`)
  rightFlare.addColorStop(0.5, `rgba(255, 45, 117, ${intensity * 0.15})`)
  rightFlare.addColorStop(1, 'rgba(255, 45, 117, 0)')
  ctx.fillStyle = rightFlare
  ctx.fillRect(cx, cy - 1.5, cx, 3)
}

// ── 2. DAİRESEL REAKTİF ÇEMBER BARI (360° MONSTERCAT / TRAP NATION) ───────────
function drawRadialSpectrumBars(ctx, cx, cy, data, scale, bassEnergy, isPlaying) {
  const baseRadius = 60 * scale
  const totalBars = 110
  const maxBarLength = 65

  ctx.save()

  for (let i = 0; i < totalBars; i++) {
    // 360 derece etrafında simetrik açı dağılımı (Hafif diyagonal eğim)
    const angle = (i / totalBars) * Math.PI * 2 - Math.PI / 2

    // Frekans indeksi eşleme (Sol ve sağ yarılar simetrik müzik tepkisi versin)
    const half = totalBars / 2
    let sampleIdx = 0
    if (i < half) {
      sampleIdx = Math.floor((i / half) * 48)
    } else {
      sampleIdx = Math.floor(((totalBars - i) / half) * 48)
    }

    const val = (data[sampleIdx] || 0) / 255
    const barHeight = Math.max(3, val * maxBarLength)

    const x1 = cx + Math.cos(angle) * baseRadius
    const y1 = cy + Math.sin(angle) * baseRadius
    const x2 = cx + Math.cos(angle) * (baseRadius + barHeight)
    const y2 = cy + Math.sin(angle) * (baseRadius + barHeight)

    // Referans görseldeki tam renk paleti:
    // Sol taraf: Electric Cyan (#00f0ff) -> Buz Mavisi -> Mor (#8a2be2)
    // Sağ taraf: Magenta (#ff2d75) -> Canlı Mercan -> Güneş Batımı Altın Sarısı (#ffaa00)
    let barColor = '#00f0ff'
    let glowColor = 'rgba(0, 240, 255, 0.8)'

    const progress = i / totalBars
    if (progress < 0.25) {
      // Üst-sol: Cyan -> Mavi
      barColor = '#00f0ff'
      glowColor = 'rgba(0, 240, 255, 0.85)'
    } else if (progress < 0.5) {
      // Alt-sol: Mavi -> Derin Mor
      barColor = '#7000ff'
      glowColor = 'rgba(112, 0, 255, 0.85)'
    } else if (progress < 0.75) {
      // Alt-sağ: Fuşya / Magenta -> Neon Pembe
      barColor = '#ff2d75'
      glowColor = 'rgba(255, 45, 117, 0.85)'
    } else {
      // Üst-sağ: Sıcak Mercan -> Altın Turuncu
      barColor = '#ff9900'
      glowColor = 'rgba(255, 153, 0, 0.85)'
    }

    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.strokeStyle = barColor
    ctx.lineWidth = barHeight > 18 ? 3.2 : 2.2
    ctx.lineCap = 'round'
    ctx.shadowBlur = val > 0.35 ? 18 : 6
    ctx.shadowColor = glowColor
    ctx.stroke()

    // Tepe Işık Noktaları (Peak Flare Dots)
    if (barHeight > 14) {
      const dotDist = baseRadius + barHeight + 3.5
      const dotX = cx + Math.cos(angle) * dotDist
      const dotY = cy + Math.sin(angle) * dotDist
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.arc(dotX, dotY, 1.4, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  ctx.restore()
}

// ── 3. MERKEZ "N" LOGOLU ROZET (MONSTERCAT STİLİ İKONİK ÇEKİRDEK) ─────────────
function drawCenterBadge(ctx, cx, cy, scale, bassEnergy) {
  const outerR = 58 * scale
  const innerR = 48 * scale

  ctx.save()

  // 1. Dış Halka Arkası Yumuşak Aura (Cyan/Magenta Çift Işıma)
  const auraGrad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR * 1.35)
  auraGrad.addColorStop(0, `rgba(0, 240, 255, ${0.15 + bassEnergy * 0.3})`)
  auraGrad.addColorStop(0.5, `rgba(255, 45, 117, ${0.12 + bassEnergy * 0.25})`)
  auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = auraGrad
  ctx.beginPath()
  ctx.arc(cx, cy, outerR * 1.35, 0, Math.PI * 2)
  ctx.fill()

  // 2. Koyu Metalik Dış Çerçeve Çemberi
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.fillStyle = '#080a14'
  ctx.fill()

  // Dış Çerçeve Kenar Gradyanı (Solda Cyan, Sağda Magenta)
  const rimGrad = ctx.createLinearGradient(cx - outerR, cy - outerR, cx + outerR, cy + outerR)
  rimGrad.addColorStop(0, '#00f0ff')
  rimGrad.addColorStop(0.5, '#7000ff')
  rimGrad.addColorStop(1, '#ff2d75')
  ctx.strokeStyle = rimGrad
  ctx.lineWidth = 3
  ctx.shadowBlur = 18 + bassEnergy * 14
  ctx.shadowColor = bassEnergy > 0.4 ? 'rgba(0, 240, 255, 0.9)' : 'rgba(255, 45, 117, 0.8)'
  ctx.stroke()

  // 3. İç Göbek Dairesi (Cyan-Magenta İç Geçişi)
  const innerGrad = ctx.createLinearGradient(cx - innerR, cy - innerR, cx + innerR, cy + innerR)
  innerGrad.addColorStop(0, '#0a1526')
  innerGrad.addColorStop(0.5, '#120d22')
  innerGrad.addColorStop(1, '#240b1e')
  ctx.beginPath()
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2)
  ctx.fillStyle = innerGrad
  ctx.fill()

  // İç İnce Kenar Çizgisi
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)'
  ctx.lineWidth = 1
  ctx.stroke()

  // 4. MERKEZDE KESKİN GEOMETRİK "N" LOGOSU
  drawGeometricN(ctx, cx, cy, innerR * 0.58, bassEnergy)

  ctx.restore()
}

// ── GEOMETRİK "N" LOGOSU ÇİZİCİ (PROFESYONEL VE KESKİN) ────────────────────────
function drawGeometricN(ctx, cx, cy, size, bass) {
  ctx.save()

  // Logoyu tam ortalamak için boyutlar
  const w = size * 0.78
  const h = size * 0.95
  const barW = size * 0.22

  const left = cx - w / 2
  const right = cx + w / 2
  const top = cy - h / 2
  const bottom = cy + h / 2

  // N Harfi Vektörel Yolu: Sol Dikey Sütun, Sağ Dikey Sütun ve Keskin Çapraz Köprü
  ctx.beginPath()
  // Sol Sütun
  ctx.moveTo(left, bottom)
  ctx.lineTo(left, top)
  ctx.lineTo(left + barW, top)
  // Çapraz İniş
  ctx.lineTo(right - barW, bottom - barW * 0.8)
  ctx.lineTo(right - barW, top)
  ctx.lineTo(right, top)
  ctx.lineTo(right, bottom)
  ctx.lineTo(right - barW, bottom)
  // Çapraz Çıkış
  ctx.lineTo(left + barW, top + barW * 0.8)
  ctx.lineTo(left + barW, bottom)
  ctx.closePath()

  // "N" Harfi Gradyan Dolgusu (Parlak Beyaz -> Neon Cyan / Magenta Işıması)
  const nGrad = ctx.createLinearGradient(left, top, right, bottom)
  nGrad.addColorStop(0, '#ffffff')
  nGrad.addColorStop(0.45, '#e0f7ff')
  nGrad.addColorStop(1, '#ffd1e8')
  ctx.fillStyle = nGrad
  ctx.shadowBlur = 18 + bass * 22
  ctx.shadowColor = bass > 0.4 ? 'rgba(0, 240, 255, 0.95)' : 'rgba(255, 45, 117, 0.85)'
  ctx.fill()

  ctx.restore()
}

// ── 4. CHROMATIC ABERRATION'LI GEOMETRİK CAM PRİZMALAR / ŞİLTLER ──────────────
function drawFloatingShards(ctx, cx, cy, shards, bass, isPlaying) {
  const boost = isPlaying ? 1 + bass * 3.5 : 1

  shards.forEach(s => {
    s.dist += s.speed * boost
    s.rot += s.rotSpeed
    if (s.dist > 520) {
      s.dist = 70
      s.angle = Math.random() * Math.PI * 2
    }

    const px = cx + Math.cos(s.angle) * s.dist
    const py = cy + Math.sin(s.angle) * s.dist

    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(s.rot)

    // Chromatic Aberration Efekti (Kırmızı ve Cyan Katman Kayması)
    // Katman 1: Kırmızı Renk Kayması (Offset -1.8px)
    ctx.save()
    ctx.translate(-1.8, 0)
    ctx.fillStyle = `rgba(255, 45, 117, ${s.alpha * 0.65})`
    drawSingleShardShape(ctx, s.size, s.shape)
    ctx.fill()
    ctx.restore()

    // Katman 2: Cyan Renk Kayması (Offset +1.8px)
    ctx.save()
    ctx.translate(1.8, 0)
    ctx.fillStyle = `rgba(0, 240, 255, ${s.alpha * 0.65})`
    drawSingleShardShape(ctx, s.size, s.shape)
    ctx.fill()
    ctx.restore()

    // Katman 3: Ana Beyaz Kristal Gövde
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha * 0.8})`
    ctx.shadowBlur = 6
    ctx.shadowColor = s.side === 'cyan' ? '#00f0ff' : '#ff2d75'
    drawSingleShardShape(ctx, s.size, s.shape)
    ctx.fill()

    ctx.restore()
  })
}

// Geometrik Parça Şekli Çizici
function drawSingleShardShape(ctx, size, shape) {
  ctx.beginPath()
  if (shape === 0) {
    // Üçgen kristal
    ctx.moveTo(0, -size)
    ctx.lineTo(size * 0.8, size * 0.7)
    ctx.lineTo(-size * 0.8, size * 0.7)
  } else if (shape === 1) {
    // Eşkenar dörtgen / Prizma
    ctx.moveTo(0, -size)
    ctx.lineTo(size * 0.6, 0)
    ctx.lineTo(0, size)
    ctx.lineTo(-size * 0.6, 0)
  } else {
    // Yamuk / Kesik kristal
    ctx.moveTo(-size * 0.4, -size * 0.8)
    ctx.lineTo(size * 0.7, -size * 0.4)
    ctx.lineTo(size * 0.5, size * 0.8)
    ctx.lineTo(-size * 0.6, size * 0.5)
  }
  ctx.closePath()
}
