import React, { useEffect, useRef } from 'react'
import { useAudio } from '../context/AudioContext'

export default function Visualizer() {
  const canvasRef = useRef(null)
  const { analyserData, isPlaying } = useAudio()

  const timeRef = useRef(0)
  const animRef = useRef(null)
  const shakeRef = useRef({ x: 0, y: 0 })
  const starsRef = useRef([])
  const smoothedDataRef = useRef(new Float32Array(64))
  const lastBassRef = useRef(0)

  // Tünelden ileriye doğru uçuşan yıldız/parçacık sistemi
  useEffect(() => {
    starsRef.current = Array.from({ length: 90 }, () => ({
      x: (Math.random() - 0.5) * 800,
      y: (Math.random() - 0.5) * 500,
      z: Math.random() * 1000 + 50,
      sz: Math.random() * 2 + 0.8,
      color: Math.random() < 0.4 ? '#00f0ff' : Math.random() < 0.7 ? '#a855f7' : '#00ff66'
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

      // 1. Frekans Analizi & Yumuşatma
      let bassEnergy = 0
      let midEnergy = 0
      let highEnergy = 0

      if (analyserData && isPlaying) {
        let bSum = 0
        for (let i = 0; i < 8; i++) bSum += analyserData[i]
        bassEnergy = bSum / (8 * 255)

        let mSum = 0
        for (let i = 8; i < 32; i++) mSum += analyserData[i]
        midEnergy = mSum / (24 * 255)

        let hSum = 0
        for (let i = 32; i < 64; i++) hSum += analyserData[i]
        highEnergy = hSum / (32 * 255)

        for (let i = 0; i < 64; i++) {
          const target = analyserData[i] || 0
          if (target > smoothedDataRef.current[i]) {
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.4
          } else {
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.12
          }
        }
      } else {
        // Bekleme modu
        for (let i = 0; i < 64; i++) {
          const idle = 15 + Math.sin(timeRef.current * 2 + i * 0.2) * 10
          smoothedDataRef.current[i] += (idle - smoothedDataRef.current[i]) * 0.1
        }
      }

      // Hız: Müzik çalarken basla birlikte ileriye akış hızlanır
      const speed = isPlaying ? 3.5 + bassEnergy * 7 : 1.8
      timeRef.current += speed * 0.015

      // Kamera Shake (Ağır Kick vuruşlarında titreşim)
      const bassDelta = bassEnergy - lastBassRef.current
      if (isPlaying && bassEnergy > 0.62 && bassDelta > 0.12) {
        shakeRef.current.x = (Math.random() - 0.5) * (bassEnergy * 9)
        shakeRef.current.y = (Math.random() - 0.5) * (bassEnergy * 9)
      } else {
        shakeRef.current.x *= 0.8
        shakeRef.current.y *= 0.8
      }
      lastBassRef.current = bassEnergy

      // ── ÇİZİM AŞAMALARI ──────────────────────────────────────────────────

      // 1. Arka Plan: Gece Mavisi / Siber Kozmik Boşluk
      ctx.fillStyle = '#050713'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(shakeRef.current.x, shakeRef.current.y)

      // Merkez Kaçış Noktası (Vanishing Point)
      const vpX = cx
      const vpY = cy + 10

      // 2. İleriye Doğru Akan Hız Parçacıkları (Warp Stars)
      drawWarpStars(ctx, vpX, vpY, starsRef.current, speed, bassEnergy)

      // 3. Tavan Tel Izgarası (Ceiling Wireframe Grid)
      drawCeilingGrid(ctx, W, H, vpX, vpY, timeRef.current)

      // 4. Zemin Mesh Kick/Bass Kıvrımı (3D Dalgalanan Zemin Tel Izgarası)
      drawTerrainMesh(ctx, W, H, vpX, vpY, timeRef.current, bassEnergy, isPlaying)

      // 5. Yan Duvarlar (3D Perspektif Spektrum Barları - Sol: Neon Mor, Sağ: Lazer Yeşili)
      drawSideEqualizerWalls(ctx, W, H, vpX, vpY, smoothedDataRef.current, bassEnergy, isPlaying)

      // 6. Yan Lazer Işınları (Üst Duvar Neon Rayları)
      drawLaserRails(ctx, W, H, vpX, vpY, bassEnergy)

      ctx.restore()

      animRef.current = requestAnimationFrame(render)
    }

    animRef.current = requestAnimationFrame(render)
    return () => cancelAnimationFrame(animRef.current)
  }, [analyserData, isPlaying])

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden shadow-2xl border border-cyan/30"
      style={{
        height: '280px',
        background: 'radial-gradient(ellipse at center, rgba(10,14,35,0.95) 0%, rgba(3,4,10,0.98) 85%)'
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

// ── 1. ZEMİN MESH KICK/BASS KIVRIMI (3D PERSPEKTİF DALGALANAN TEL IZGARA) ──────
function drawTerrainMesh(ctx, W, H, vpX, vpY, time, bass, isPlaying) {
  const floorTop = vpY + 22
  const floorBottom = H + 40
  const cols = 26
  const rows = 18

  const meshY = (col, r) => {
    // Perspektif Z derinliği (0: ufuk, 1: en yakın)
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.2)

    // Temel zemin çizgisi
    const baseY = floorTop + (floorBottom - floorTop) * zSq

    // Zemin dalgalanma kıvrımı (Kick/Bass vuruşlarında kabaran tepeler)
    const distFromCenter = Math.abs(col - cols / 2) / (cols / 2)
    const wave = Math.sin(col * 0.45 + time * 4 - r * 0.4) * Math.cos(r * 0.3 - time * 3)
    const bassAmp = isPlaying ? (12 + bass * 38) : 8
    const heightOffset = wave * bassAmp * zNorm * (0.3 + distFromCenter * 0.7)

    return baseY - heightOffset
  }

  const meshX = (col, r) => {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.2)
    const spread = (W * 0.75) * zSq
    return vpX + ((col - cols / 2) / (cols / 2)) * spread
  }

  // Yatay Tel Çizgileri (Gözlemciye doğru akan hatlar)
  for (let r = 1; r < rows; r++) {
    const zNorm = r / rows
    const alpha = Math.min(0.85, zNorm * 0.95)
    ctx.strokeStyle = `rgba(0, 180, 255, ${alpha})`
    ctx.lineWidth = r > rows - 4 ? 2 : 1

    ctx.beginPath()
    for (let c = 0; c < cols; c++) {
      const x = meshX(c, r)
      const y = meshY(c, r)
      if (c === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  // Boyuna Derinlik Çizgileri (Ufuktan kameraya doğru uzanan hatlar)
  for (let c = 0; c < cols; c++) {
    const distFromCenter = Math.abs(c - cols / 2) / (cols / 2)
    ctx.strokeStyle = `rgba(0, 220, 255, ${0.15 + distFromCenter * 0.5})`
    ctx.lineWidth = 1

    ctx.beginPath()
    for (let r = 0; r < rows; r++) {
      const x = meshX(c, r)
      const y = meshY(c, r)
      if (r === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

// ── 2. TAVAN TEL IZGARASI (CEILING WIREFRAME) ─────────────────────────────────
function drawCeilingGrid(ctx, W, H, vpX, vpY, time) {
  const ceilBottom = vpY - 25
  const ceilTop = -20
  const cols = 22
  const rows = 14

  for (let r = 1; r < rows; r++) {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.2)
    const y = ceilBottom - (ceilBottom - ceilTop) * zSq
    const spread = (W * 0.65) * zSq

    ctx.strokeStyle = `rgba(0, 140, 220, ${zNorm * 0.35})`
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(vpX - spread, y)
    ctx.lineTo(vpX + spread, y)
    ctx.stroke()
  }

  for (let c = 0; c < cols; c++) {
    const spreadFar = (W * 0.05)
    const spreadNear = (W * 0.65)
    const norm = (c - cols / 2) / (cols / 2)

    ctx.strokeStyle = 'rgba(0, 140, 220, 0.22)'
    ctx.lineWidth = 1

    ctx.beginPath()
    ctx.moveTo(vpX + norm * spreadFar, ceilBottom)
    ctx.lineTo(vpX + norm * spreadNear, ceilTop)
    ctx.stroke()
  }
}

// ── 3. YAN DUVAR SPEKTRUM BARLARI (SOL: NEON MOR, SAĞ: LAZER YEŞİLİ) ─────────
function drawSideEqualizerWalls(ctx, W, H, vpX, vpY, data, bass, isPlaying) {
  const numColumns = 14
  const barsPerCol = 12

  // Sol Duvar (Neon Mor / Magenta: #d946ef / #a855f7)
  drawPerspectiveWall(ctx, W, H, vpX, vpY, -1, numColumns, barsPerCol, data, 'purple', bass, isPlaying)

  // Sağ Duvar (Lazer Yeşili: #00ff66 / #22c55e)
  drawPerspectiveWall(ctx, W, H, vpX, vpY, 1, numColumns, barsPerCol, data, 'green', bass, isPlaying)
}

function drawPerspectiveWall(ctx, W, H, vpX, vpY, side, numCols, barsPerCol, data, theme, bass, isPlaying) {
  // side: -1 (sol), 1 (sağ)
  for (let col = 0; col < numCols; col++) {
    // Derinlik normu (0: ufuk yakını, 1: ön plan)
    const zNorm = (col + 1) / (numCols + 1)
    const zSq = Math.pow(zNorm, 1.8)

    // X ve Y perspektif koordinatları
    const wallX = vpX + side * (120 + (W * 0.38) * zSq)
    const wallYTop = vpY - (30 + 95 * zSq)
    const wallYBottom = vpY + (20 + 80 * zSq)
    const wallHeight = wallYBottom - wallYTop

    // Frekans verisini sütuna eşle (Tizler ve orta sesler parıldasın)
    const sampleIdx = Math.floor(col * 2.8) % data.length
    const val = (data[sampleIdx] || 0) / 255
    const activeBars = Math.floor(val * barsPerCol)

    const blockH = Math.max(2, (wallHeight / barsPerCol) * 0.72)
    const blockW = Math.max(3, 7 + 16 * zSq)

    for (let b = 0; b < barsPerCol; b++) {
      const bNorm = b / barsPerCol
      const by = wallYBottom - bNorm * wallHeight

      const isActive = b <= activeBars

      let colStyle = ''
      let glowStyle = ''

      if (theme === 'purple') {
        // Sol Duvar: Neon Fuşya / Mor
        if (isActive) {
          colStyle = b > barsPerCol - 3 ? '#ffffff' : b > barsPerCol - 6 ? '#ff2df7' : '#a855f7'
          glowStyle = 'rgba(217, 70, 239, 0.9)'
        } else {
          colStyle = 'rgba(168, 85, 247, 0.12)'
        }
      } else {
        // Sağ Duvar: Lazer Yeşili / Lime
        if (isActive) {
          colStyle = b > barsPerCol - 3 ? '#ffffff' : b > barsPerCol - 6 ? '#39ff14' : '#00e676'
          glowStyle = 'rgba(0, 255, 102, 0.9)'
        } else {
          colStyle = 'rgba(0, 255, 102, 0.12)'
        }
      }

      ctx.save()
      ctx.fillStyle = colStyle
      if (isActive && isPlaying) {
        ctx.shadowBlur = 10 + bass * 12
        ctx.shadowColor = glowStyle
      }
      // 3D eğiklik için hafif perspektif çizimi
      const bx = side === -1 ? wallX - blockW : wallX
      ctx.fillRect(bx, by - blockH, blockW, blockH)
      ctx.restore()
    }
  }
}

// ── 4. YAN LAZER IŞINLARI (ÜST DUVAR RAYLARI) ──────────────────────────────────
function drawLaserRails(ctx, W, H, vpX, vpY, bass) {
  // Sol Mor Lazer Rayı
  ctx.save()
  ctx.strokeStyle = '#d946ef'
  ctx.lineWidth = 2.5
  ctx.shadowBlur = 16 + bass * 16
  ctx.shadowColor = 'rgba(217, 70, 239, 0.95)'
  ctx.beginPath()
  ctx.moveTo(vpX - 60, vpY - 30)
  ctx.lineTo(0, vpY - 125)
  ctx.stroke()

  // Sağ Lazer Yeşili Rayı
  ctx.strokeStyle = '#00ff66'
  ctx.shadowColor = 'rgba(0, 255, 102, 0.95)'
  ctx.beginPath()
  ctx.moveTo(vpX + 60, vpY - 30)
  ctx.lineTo(W, vpY - 125)
  ctx.stroke()
  ctx.restore()
}

// ── 5. UÇUŞAN HIZ YILDIZLARI (WARP STARS) ──────────────────────────────────────
function drawWarpStars(ctx, vpX, vpY, stars, speed, bass) {
  stars.forEach(s => {
    s.z -= speed * 1.8
    if (s.z <= 10) {
      s.z = 1000
      s.x = (Math.random() - 0.5) * 800
      s.y = (Math.random() - 0.5) * 450
    }

    // 3D Perspektif İzdüşümü
    const fov = 260
    const px = vpX + (s.x / s.z) * fov
    const py = vpY + (s.y / s.z) * fov
    const pSize = Math.max(0.6, (1 - s.z / 1000) * s.sz * (1 + bass * 0.8))
    const alpha = Math.min(1, (1 - s.z / 1000) * 1.2)

    ctx.save()
    ctx.fillStyle = s.color
    ctx.globalAlpha = alpha
    ctx.shadowBlur = 6
    ctx.shadowColor = s.color
    ctx.beginPath()
    ctx.arc(px, py, pSize, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  })
}
