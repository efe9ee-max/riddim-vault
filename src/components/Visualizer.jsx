import React, { useEffect, useRef } from 'react'
import { useAudio } from '../context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const { analyserData, isPlaying, currentTrack } = useAudio()

  const timeRef = useRef(0)
  const animRef = useRef(null)
  const shakeRef = useRef({ x: 0, y: 0 })
  const starsRef = useRef([])
  const smoothedDataRef = useRef(new Float32Array(64))
  const lastBassRef = useRef(0)
  const currentTrackRef = useRef(currentTrack)

  useEffect(() => {
    currentTrackRef.current = currentTrack
  }, [currentTrack])

  // 3D Siber Parçacıklar (Derinlik hissi veren hız tozları)
  useEffect(() => {
    starsRef.current = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 1100,
      y: (Math.random() - 0.5) * 550,
      z: Math.random() * 1000 + 20,
      sz: Math.random() * 2.2 + 0.8,
      color: Math.random() < 0.4 ? '#00ffff' : Math.random() < 0.7 ? '#ff007f' : '#00ff88'
    }))
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const render = () => {
      const W = canvas.width
      const H = canvas.height
      const cx = W / 2
      const cy = H / 2

      // 1. Frekans Analizi & Yumuşatma (Hızlı tepki, akıcı iniş)
      let bassEnergy = 0
      let midEnergy = 0
      let trebleEnergy = 0

      if (analyserData && isPlaying) {
        let bSum = 0
        for (let i = 0; i < 8; i++) bSum += analyserData[i]
        bassEnergy = bSum / (8 * 255)

        let mSum = 0
        for (let i = 8; i < 32; i++) mSum += analyserData[i]
        midEnergy = mSum / (24 * 255)

        let tSum = 0
        for (let i = 32; i < 64; i++) tSum += analyserData[i]
        trebleEnergy = tSum / (32 * 255)

        for (let i = 0; i < 64; i++) {
          const target = analyserData[i] || 0
          if (target > smoothedDataRef.current[i]) {
            // Hızlı vuruş tepkisi
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.45
          } else {
            // Yumuşak süzülüş
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.12
          }
        }
      } else {
        // Müzik dururken akıcı, nefes alan siber dalga
        for (let i = 0; i < 64; i++) {
          const idle = 40 + Math.sin(timeRef.current * 2.0 + i * 0.28) * 22
          smoothedDataRef.current[i] += (idle - smoothedDataRef.current[i]) * 0.1
        }
      }

      // Hız: Çok hızlı değil, sinematik ve müzikle uyumlu kayış
      const moveSpeed = isPlaying ? 0.60 + bassEnergy * 0.45 : 0.35
      timeRef.current += moveSpeed * 0.011

      // Ağır Riddim Kick vuruşlarında kamera sarsıntısı
      const bassDelta = bassEnergy - lastBassRef.current
      if (isPlaying && bassEnergy > 0.62 && bassDelta > 0.11) {
        shakeRef.current.x = (Math.random() - 0.5) * (bassEnergy * 5.5)
        shakeRef.current.y = (Math.random() - 0.5) * (bassEnergy * 5.5)
      } else {
        shakeRef.current.x *= 0.72
        shakeRef.current.y *= 0.72
      }
      lastBassRef.current = bassEnergy

      // ── ÇİZİM KATMANLARI ──────────────────────────────────────────────────
      // Arka plan: Derin Gece Mavisi / Kozmik Siyah
      ctx.fillStyle = '#03030c'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(shakeRef.current.x, shakeRef.current.y)

      const vpX = cx
      const vpY = cy - 6 // Ufuk noktası (Zemin ve duvarlara tam orantılı)

      // 1. Tünel İçi Hız Tozları (Warp Stars)
      drawWarpStars(ctx, vpX, vpY, starsRef.current, moveSpeed, bassEnergy)

      // 2. Tavan Tel Izgarası (Ceiling Wireframe)
      drawCeilingGrid(ctx, W, H, vpX, vpY)

      // 3. BOŞLUKSUZ VE AŞIRI PARLAK YAN DUVAR EKOLAYZIRLARI
      // (Referans görseldeki gibi zemin tepelerinin ARKASINDA yer alır, tepe dalgaları önünü keser)
      drawSolidEqualizerWalls(ctx, W, H, vpX, vpY, smoothedDataRef.current, bassEnergy, trebleEnergy, isPlaying)

      // 4. Yan Siber HUD Panelleri ve Frekans Çizelgeleri (Referans görseldeki gibi)
      drawHolographicHud(ctx, W, H, vpX, vpY, smoothedDataRef.current, bassEnergy, currentTrackRef.current, isPlaying)

      // 5. Üst Lazer Rayları (Neon Yeşil + Akkor Çekirdek)
      drawIntenseLaserRails(ctx, W, H, vpX, vpY, bassEnergy)

      // 6. DOLGUN ZEMİN TEPELERİ & ORTADAKİ CYAN YOL (3D Wireframe Terrain)
      // (Ön planda durur, derinlik hissi yaratır)
      drawSolidFloorAndHills(ctx, W, H, vpX, vpY, timeRef.current, bassEnergy, isPlaying)

      // 7. Ufuk Merkezindeki Parlak Güneş Patlaması (Anamorphic Cyan Flare)
      drawHorizonCoreFlare(ctx, vpX, vpY, bassEnergy, isPlaying)

      ctx.restore()

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserData, isPlaying])

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-cyan/40"
      style={{
        height: '350px',
        background: 'radial-gradient(ellipse at center, rgba(14,20,50,0.98) 0%, rgba(2,3,8,1) 85%)'
      }}
    >
      <canvas
        ref={canvasRef}
        width={1200}
        height={350}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  )
}

// ── 1. BOŞLUKSUZ, DOLGUN VE CANLI DUVAR EKOLAYZIRLARI ──────────────────────────
function drawSolidEqualizerWalls(ctx, W, H, vpX, vpY, data, bass, treble, isPlaying) {
  const numColumns = 34 // Daha sık sütunlar -> Duvarlar tamamen dolu
  const barsPerCol = 19 // Dikey tuğla sayısı

  // Sol Duvar (Neon Magenta / Pembe)
  drawPerspectiveWall(ctx, W, H, vpX, vpY, -1, numColumns, barsPerCol, data, 'left', bass, treble, isPlaying)

  // Sağ Duvar (Neon Magenta + Neon Yeşil Matrix Vurguları)
  drawPerspectiveWall(ctx, W, H, vpX, vpY, 1, numColumns, barsPerCol, data, 'right', bass, treble, isPlaying)
}

function drawPerspectiveWall(ctx, W, H, vpX, vpY, side, numCols, barsPerCol, data, sideName, bass, treble, isPlaying) {
  // side: -1 (sol), 1 (sağ)
  for (let col = 0; col < numCols; col++) {
    // 0: ufuk (en uzak), 1: en yakın (ön plan)
    const zNorm = (col + 1) / (numCols + 1)
    const zSq = Math.pow(zNorm, 1.7)

    // Duvar X koordinatları (Sütunlar birbirine yapışık, boşluk yok)
    const wallXNear = vpX + side * (60 + (W * 0.44) * zSq)
    const nextZSq = Math.pow((col + 2) / (numCols + 1), 1.7)
    const wallXNext = vpX + side * (60 + (W * 0.44) * nextZSq)
    const colWidth = Math.max(3, Math.abs(wallXNext - wallXNear) - 0.8) // Boşluk sadece 0.8px (tam bitişik LED paneller)

    // Duvar Y koordinatları (Tavan lazerinden zemin tabanına kadar tam boy)
    const wallYTop = vpY - (28 + 140 * zSq)
    const wallYBottom = vpY + (22 + 155 * zSq)
    const wallHeight = wallYBottom - wallYTop

    // Frekans tepkisi
    const sampleIdx = Math.floor(col * 1.6) % data.length
    const val = (data[sampleIdx] || 0) / 255
    // Taban bloklar DAİMA yanıktır (görseldeki gibi alttan dolgun başlar)
    const baseLit = 4
    const dynamicLit = Math.floor(val * (barsPerCol - baseLit))
    const activeCount = Math.min(barsPerCol, baseLit + dynamicLit)

    const blockH = Math.max(2, (wallHeight / barsPerCol) * 0.80)
    const blockGap = (wallHeight / barsPerCol) * 0.20

    const bx = side === -1 ? wallXNear - colWidth : wallXNear

    for (let b = 0; b < barsPerCol; b++) {
      const by = wallYBottom - b * (blockH + blockGap) - blockH
      const isActive = b <= activeCount

      // Görseldeki gibi yeşil matrix kolonları veya magenta kolonlar
      const isGreenAccentCol = sideName === 'right' ? (col % 4 === 0) : (col % 7 === 0)

      let fillStyle = ''
      let glowColor = ''

      if (isGreenAccentCol) {
        // Neon Yeşil Matrix Sütunu
        if (isActive) {
          if (b > barsPerCol - 3) {
            fillStyle = '#ffffff' // En tepe beyaz akkor
            glowColor = '#00ff88'
          } else if (b > barsPerCol - 6) {
            fillStyle = '#55ff99'
            glowColor = '#00ff88'
          } else {
            fillStyle = '#00e566'
            glowColor = 'rgba(0, 229, 102, 0.85)'
          }
        } else {
          fillStyle = 'rgba(0, 160, 70, 0.22)' // Sönükken de canlı yeşil aurası
        }
      } else {
        // Neon Magenta / Pembe Sütun (Referans görseldeki ana fuşya renk)
        if (isActive) {
          if (b > barsPerCol - 3) {
            fillStyle = '#ffffff' // En tepe akkor beyazı
            glowColor = '#ff3df0'
          } else if (b > barsPerCol - 6) {
            fillStyle = '#ff3df0' // Parlak elektrik pembe
            glowColor = '#ff007f'
          } else {
            fillStyle = '#e0007b' // Koyu neon fuşya
            glowColor = 'rgba(224, 0, 123, 0.85)'
          }
        } else {
          fillStyle = 'rgba(160, 0, 90, 0.24)' // Sönükken de görünür neon pembe
        }
      }

      ctx.save()
      ctx.fillStyle = fillStyle
      if (isActive) {
        ctx.shadowBlur = (8 + bass * 12) * zNorm
        ctx.shadowColor = glowColor
      }
      ctx.fillRect(bx, by, colWidth, blockH)
      ctx.restore()
    }
  }
}

// ── 2. DOLGUN ZEMİN TEPELERİ & CYAN YOL (3D WIREFRAME TERRAIN) ────────────────
function drawSolidFloorAndHills(ctx, W, H, vpX, vpY, time, bass, isPlaying) {
  const floorTop = vpY + 16
  const floorBottom = H + 60
  const cols = 56 // Yoğun çizgi sıklığı
  const rows = 32 // Yoğun derinlik

  const meshY = (col, r) => {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.05)
    const baseY = floorTop + (floorBottom - floorTop) * zSq

    const distFromCenter = Math.abs(col - cols / 2) / (cols / 2)
    const isCenterRoad = distFromCenter < 0.21

    if (isCenterRoad) {
      // Ortadaki Cyan yol düz ve pürüzsüz kalır
      return baseY
    }

    // Kenar mor tepelerin kıvrımı (Referans görseldeki gibi dalgalı yüksek dağlar)
    const sideFactor = (distFromCenter - 0.21) / 0.79
    // Taban tepe formu + müzikle kabaran dalga
    const hillBase = Math.sin(col * 0.36 - r * 0.20) * 18
    const dynamicWave = Math.sin(col * 0.42 + time * 2.4 - r * 0.28) * (isPlaying ? (16 + bass * 38) : 12)
    const totalWave = (hillBase + dynamicWave) * sideFactor * zNorm * 1.45

    return baseY - totalWave
  }

  const meshX = (col, r) => {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.05)
    const spread = (W * 0.86) * zSq
    return vpX + ((col - cols / 2) / (cols / 2)) * spread
  }

  // 1. Zemin Yatay Çizgileri
  for (let r = 1; r < rows; r++) {
    const zNorm = r / rows
    const zAlpha = Math.min(1.0, zNorm * 1.3)
    ctx.lineWidth = r > rows - 6 ? 2.2 : 1.15

    for (let c = 0; c < cols - 1; c++) {
      const distFromCenter = Math.abs(c - cols / 2) / (cols / 2)
      const isCenter = distFromCenter < 0.21

      ctx.beginPath()
      ctx.moveTo(meshX(c, r), meshY(c, r))
      ctx.lineTo(meshX(c + 1, r), meshY(c + 1, r))

      if (isCenter) {
        // Ortadaki Yol: Parlak Elektrik Cyan (#00ffff)
        ctx.strokeStyle = `rgba(0, 255, 255, ${zAlpha * 0.98})`
        ctx.shadowBlur = 10
        ctx.shadowColor = 'rgba(0, 255, 255, 0.85)'
      } else {
        // Kenar Tepeler: Referans Görseldeki Canlı Neon Mor (#c026d3 / #a855f7)
        ctx.strokeStyle = `rgba(192, 38, 211, ${zAlpha * 0.94})`
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(192, 38, 211, 0.8)'
      }
      ctx.stroke()
    }
  }

  // 2. Zemin Boyuna Derinlik Çizgileri
  for (let c = 0; c < cols; c++) {
    const distFromCenter = Math.abs(c - cols / 2) / (cols / 2)
    const isCenter = distFromCenter < 0.21

    ctx.beginPath()
    for (let r = 0; r < rows; r++) {
      const x = meshX(c, r)
      const y = meshY(c, r)
      if (r === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    if (isCenter) {
      // Cyan yol çizgileri
      const isBorder = Math.abs(distFromCenter - 0.21) < 0.04
      const isCenterLine = c === Math.floor(cols / 2)
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.98)'
      ctx.lineWidth = isBorder || isCenterLine ? 2.5 : 1.35
      ctx.shadowBlur = 12
      ctx.shadowColor = 'rgba(0, 255, 255, 0.9)'
    } else {
      // Kenar mor derinlik çizgileri
      ctx.strokeStyle = `rgba(175, 75, 250, ${0.45 + distFromCenter * 0.55})`
      ctx.lineWidth = 1.1
      ctx.shadowBlur = 7
      ctx.shadowColor = 'rgba(175, 75, 250, 0.7)'
    }
    ctx.stroke()
  }
}

// ── 3. TAVAN TEL IZGARASI (CEILING WIREFRAME) ─────────────────────────────────
function drawCeilingGrid(ctx, W, H, vpX, vpY) {
  const ceilBottom = vpY - 24
  const ceilTop = -40
  const cols = 42
  const rows = 24

  // Yatay tavan çizgileri
  for (let r = 1; r < rows; r++) {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.05)
    const y = ceilBottom - (ceilBottom - ceilTop) * zSq
    const spread = (W * 0.78) * zSq

    ctx.strokeStyle = `rgba(168, 85, 247, ${zNorm * 0.58})`
    ctx.lineWidth = 1.1

    ctx.beginPath()
    ctx.moveTo(vpX - spread, y)
    ctx.lineTo(vpX + spread, y)
    ctx.stroke()
  }

  // Boyuna tavan çizgileri (Ufka doğru birleşen perspektif)
  for (let c = 0; c < cols; c++) {
    const spreadFar = W * 0.06
    const spreadNear = W * 0.78
    const norm = (c - cols / 2) / (cols / 2)

    ctx.strokeStyle = 'rgba(168, 85, 247, 0.38)'
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(vpX + norm * spreadFar, ceilBottom)
    ctx.lineTo(vpX + norm * spreadNear, ceilTop)
    ctx.stroke()
  }
}

// ── 4. ÜST PARLAK LAZER RAYLARI (INTENSE DUAL-PASS LASER GREEN) ───────────────
function drawIntenseLaserRails(ctx, W, H, vpX, vpY, bass) {
  ctx.save()

  // 1. Dış Parlak Yeşil Lazer Parıltısı
  ctx.strokeStyle = '#00ff88'
  ctx.lineWidth = 5.2
  ctx.shadowBlur = 28 + bass * 22
  ctx.shadowColor = 'rgba(0, 255, 136, 1.0)'

  ctx.beginPath()
  ctx.moveTo(vpX - 58, vpY - 28)
  ctx.lineTo(0, vpY - 165)
  ctx.moveTo(vpX + 58, vpY - 28)
  ctx.lineTo(W, vpY - 165)
  ctx.stroke()

  // 2. İç Akkor Beyaz Çekirdek (Keskin lazer ışığı)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2.0
  ctx.shadowBlur = 10
  ctx.shadowColor = '#ffffff'

  ctx.beginPath()
  ctx.moveTo(vpX - 58, vpY - 28)
  ctx.lineTo(0, vpY - 165)
  ctx.moveTo(vpX + 58, vpY - 28)
  ctx.lineTo(W, vpY - 165)
  ctx.stroke()

  ctx.restore()
}

// ── 5. HOLOGRAFİK SİBER HUD & FREKANS ÇİZELGELERİ (REFERANS GÖRSELDEKİ DETAYLAR) ─
function drawHolographicHud(ctx, W, H, vpX, vpY, data, bass, currentTrack, isPlaying) {
  ctx.save()

  // SAĞ ÜST HUD PANELLERİ (Mini Spektrum Grafiği & Siber Veriler)
  const hudRightX = W - 190
  const hudRightY = 32

  ctx.strokeStyle = 'rgba(0, 245, 255, 0.45)'
  ctx.lineWidth = 1.2
  ctx.strokeRect(hudRightX, hudRightY, 160, 75)

  // Köşe vurguları
  ctx.strokeStyle = '#00ffff'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(hudRightX, hudRightY + 12); ctx.lineTo(hudRightX, hudRightY); ctx.lineTo(hudRightX + 14, hudRightY)
  ctx.moveTo(hudRightX + 160, hudRightY + 12); ctx.lineTo(hudRightX + 160, hudRightY); ctx.lineTo(hudRightX + 146, hudRightY)
  ctx.stroke()

  // Mini Bar Grafiği (Sağ panel içi)
  const barCount = 14
  for (let i = 0; i < barCount; i++) {
    const val = (data[i * 2 + 10] || 20) / 255
    const bh = val * 32
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0, 255, 255, 0.75)' : 'rgba(0, 255, 136, 0.75)'
    ctx.fillRect(hudRightX + 12 + i * 9.5, hudRightY + 58 - bh, 6.5, bh)
  }

  // Siber Metinler: Çalan parçanın GERÇEK BPM değeri dinamik gösterilir
  const trackBpm = currentTrack?.bpm
  const hasBpm = trackBpm !== null && trackBpm !== undefined && String(trackBpm).trim() !== ''
  const displayBpm = hasBpm ? `${trackBpm} BPM` : (isPlaying ? 'AUDIO SYNC' : 'STANDBY')

  ctx.fillStyle = 'rgba(0, 245, 255, 0.85)'
  ctx.font = '9px monospace'
  ctx.fillText('FREQ OSC // CH-R', hudRightX + 12, hudRightY + 18)
  ctx.fillText(`SUB ${Math.round(bass * 100)}% // ${displayBpm}`, hudRightX + 12, hudRightY + 70)

  // SOL ÜST HUD PANELLERİ (Terminal Kod Akışı)
  const hudLeftX = 30
  const hudLeftY = 32

  ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)'
  ctx.lineWidth = 1.2
  ctx.strokeRect(hudLeftX, hudLeftY, 150, 75)

  ctx.strokeStyle = '#00ff88'
  ctx.lineWidth = 2.2
  ctx.beginPath()
  ctx.moveTo(hudLeftX, hudLeftY + 12); ctx.lineTo(hudLeftX, hudLeftY); ctx.lineTo(hudLeftX + 14, hudLeftY)
  ctx.moveTo(hudLeftX + 150, hudLeftY + 12); ctx.lineTo(hudLeftX + 150, hudLeftY); ctx.lineTo(hudLeftX + 136, hudLeftY)
  ctx.stroke()

  const statusSuffix = hasBpm ? `[${trackBpm} BPM]` : (isPlaying ? '[STREAM]' : '[IDLE]')

  ctx.fillStyle = 'rgba(0, 255, 136, 0.8)'
  ctx.font = '9px monospace'
  ctx.fillText('NAMMU ABYSS SYSTEM', hudLeftX + 12, hudLeftY + 18)
  ctx.fillText(`STATUS: LOCKED ${statusSuffix}`, hudLeftX + 12, hudLeftY + 34)
  ctx.fillText('GRID: 56x32 MESH ACTIVE', hudLeftX + 12, hudLeftY + 48)
  ctx.fillText('TUNNEL: 3D RESONANCE', hudLeftX + 12, hudLeftY + 62)

  ctx.restore()
}

// ── 6. UFUK MERKEZİNDEKİ PARLAK ANAMORFİK LENS FLARE (GÜNEŞ ÇEKİRDEĞİ) ────────
function drawHorizonCoreFlare(ctx, vpX, vpY, bass, isPlaying) {
  const intensity = isPlaying ? 0.55 + bass * 0.45 : 0.40

  ctx.save()

  // 1. Geniş Yatay Lazer Flare Çizgisi (Tünel boyu ufuk çizgisi)
  const flareGrad = ctx.createLinearGradient(vpX - 260, vpY, vpX + 260, vpY)
  flareGrad.addColorStop(0, 'rgba(0, 255, 255, 0)')
  flareGrad.addColorStop(0.35, `rgba(0, 255, 255, ${intensity * 0.7})`)
  flareGrad.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 1.0})`)
  flareGrad.addColorStop(0.65, `rgba(0, 255, 255, ${intensity * 0.7})`)
  flareGrad.addColorStop(1, 'rgba(0, 255, 255, 0)')

  ctx.fillStyle = flareGrad
  ctx.fillRect(vpX - 260, vpY - 2.5, 520, 5)

  // 2. Merkez Parlak Güneş Patlaması
  const starGrad = ctx.createRadialGradient(vpX, vpY, 2, vpX, vpY, 40)
  starGrad.addColorStop(0, '#ffffff')
  starGrad.addColorStop(0.25, 'rgba(0, 255, 255, 0.98)')
  starGrad.addColorStop(0.65, 'rgba(0, 140, 255, 0.5)')
  starGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = starGrad
  ctx.beginPath()
  ctx.arc(vpX, vpY, 40, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ── 7. UÇUŞAN HIZ TOZLARI (WARP STARS) ────────────────────────────────────────
function drawWarpStars(ctx, vpX, vpY, stars, speed, bass) {
  stars.forEach(s => {
    s.z -= speed * 2.2
    if (s.z <= 12) {
      s.z = 1000
      s.x = (Math.random() - 0.5) * 1100
      s.y = (Math.random() - 0.5) * 500
    }

    const fov = 280
    const px = vpX + (s.x / s.z) * fov
    const py = vpY + (s.y / s.z) * fov
    const pSize = Math.max(0.7, (1 - s.z / 1000) * s.sz * (1 + bass * 0.6))
    const alpha = Math.min(1, (1 - s.z / 1000) * 1.2)

    ctx.save()
    ctx.fillStyle = s.color
    ctx.globalAlpha = alpha
    ctx.shadowBlur = 8
    ctx.shadowColor = s.color
    ctx.beginPath()
    ctx.arc(px, py, pSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}
