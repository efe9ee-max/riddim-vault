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

  // Tünelde süzülen ince kıvılcım / köz parçacıkları
  useEffect(() => {
    starsRef.current = Array.from({ length: 70 }, () => ({
      x: (Math.random() - 0.5) * 850,
      y: (Math.random() - 0.5) * 450,
      z: Math.random() * 1000 + 40,
      sz: Math.random() * 1.8 + 0.6,
      color: Math.random() < 0.4 ? '#00f5ff' : Math.random() < 0.7 ? '#d946ef' : '#00ff88'
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

      // 1. Frekans Analizi & Müzikle Uyumlu Yumuşak Sönümleme
      let bassEnergy = 0
      let midEnergy = 0

      if (analyserData && isPlaying) {
        let bSum = 0
        for (let i = 0; i < 8; i++) bSum += analyserData[i]
        bassEnergy = bSum / (8 * 255)

        let mSum = 0
        for (let i = 8; i < 28; i++) mSum += analyserData[i]
        midEnergy = mSum / (20 * 255)

        // Barların müzikle pürüzsüz ve ritmik dans etmesi için akıllı interpolasyon
        for (let i = 0; i < 64; i++) {
          const target = analyserData[i] || 0
          if (target > smoothedDataRef.current[i]) {
            // Yükselirken hızlı tepki (Drop vuruşu)
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.32
          } else {
            // İnerken yumuşak süzülme (Akıcı hareket)
            smoothedDataRef.current[i] += (target - smoothedDataRef.current[i]) * 0.09
          }
        }
      } else {
        // Bekleme modu: Sakin, estetik bekleme dalgası
        for (let i = 0; i < 64; i++) {
          const idle = 14 + Math.sin(timeRef.current * 1.5 + i * 0.22) * 9
          smoothedDataRef.current[i] += (idle - smoothedDataRef.current[i]) * 0.08
        }
      }

      // 2. Kontrollü ve Sinematik Hız (Göz yormayan, müzikle akıcı ileri kayma)
      const moveSpeed = isPlaying ? 0.75 + bassEnergy * 0.55 : 0.4
      timeRef.current += moveSpeed * 0.013

      // 3. Bas Vuruşunda İnce Kamera Titremesi (Screen Shake)
      const bassDelta = bassEnergy - lastBassRef.current
      if (isPlaying && bassEnergy > 0.65 && bassDelta > 0.12) {
        shakeRef.current.x = (Math.random() - 0.5) * (bassEnergy * 6)
        shakeRef.current.y = (Math.random() - 0.5) * (bassEnergy * 6)
      } else {
        shakeRef.current.x *= 0.75
        shakeRef.current.y *= 0.75
      }
      lastBassRef.current = bassEnergy

      // ── ÇİZİM AŞAMALARI ──────────────────────────────────────────────────

      // Derin Gece Mavisi Zemin
      ctx.fillStyle = '#04050d'
      ctx.fillRect(0, 0, W, H)

      ctx.save()
      ctx.translate(shakeRef.current.x, shakeRef.current.y)

      const vpX = cx
      const vpY = cy + 6

      // 1. İleriye Akıcı Uçuşan Hız Parçacıkları (Warp Stars)
      drawWarpStars(ctx, vpX, vpY, starsRef.current, moveSpeed, bassEnergy)

      // 2. Yüksek Yoğunluklu Tavan Tel Izgarası (Ceiling Wireframe)
      drawHighDensityCeiling(ctx, W, H, vpX, vpY, timeRef.current)

      // 3. Yüksek Yoğunluklu Zemin Tel Izgarası & Tepeler (Ortası Cyan Yol, Kenarları Mor Tepeler)
      drawHighDensityTerrain(ctx, W, H, vpX, vpY, timeRef.current, bassEnergy, isPlaying)

      // 4. Yan Duvar Ekolayzır Barları (Referans Görseldeki Magenta & Lazer Yeşili)
      drawDetailedEqualizerWalls(ctx, W, H, vpX, vpY, smoothedDataRef.current, bassEnergy, isPlaying)

      // 5. Üst Lazer Rayları (Neon Lazer Yeşili Parlayan Işın Hatları)
      drawIntenseLaserRails(ctx, W, H, vpX, vpY, bassEnergy)

      // 6. Ufuk Merkezindeki Parlak Işık Patlaması (Center Anamorphic Flare Core)
      drawHorizonFlare(ctx, vpX, vpY, bassEnergy, isPlaying)

      // 7. Yan Siber HUD Veri Çizgileri (Referans görseldeki fütüristik çizgiler)
      drawSideHudElements(ctx, W, H, vpY)

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
        height: '280px',
        background: 'radial-gradient(ellipse at center, rgba(14,19,45,0.95) 0%, rgba(3,4,9,0.99) 80%)'
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

// ── 1. YÜKSEK ÇİZGİ SIKLIKLI 3D ZEMİN TEL IZGARASI (HIGH DENSITY MESH) ────────
function drawHighDensityTerrain(ctx, W, H, vpX, vpY, time, bass, isPlaying) {
  const floorTop = vpY + 18
  const floorBottom = H + 45
  const cols = 48 // Çizgi sıklığı yüksek tutuldu
  const rows = 28 // Derinlik çizgileri sıklaştırıldı

  const meshY = (col, r) => {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.1)
    const baseY = floorTop + (floorBottom - floorTop) * zSq

    // Ortadaki Cyan Yol (Düz hat) ve Kenarlardaki Mor Dalgalanan Tepeler
    const distFromCenter = Math.abs(col - cols / 2) / (cols / 2)
    const isCenterRoad = distFromCenter < 0.22

    if (isCenterRoad) {
      // Ortadaki yol düz ve pürüzsüz kalır
      return baseY
    }

    // Kenar tepelerin dalgalanması (Müzikle uyumlu ritmik akış)
    const sideFactor = (distFromCenter - 0.22) / 0.78
    const wave = Math.sin(col * 0.4 + time * 2.8 - r * 0.3) * Math.cos(r * 0.25 - time * 2.2)
    const bassAmp = isPlaying ? (10 + bass * 30) : 6
    const heightOffset = wave * bassAmp * zNorm * sideFactor * 1.25

    return baseY - heightOffset
  }

  const meshX = (col, r) => {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.1)
    const spread = (W * 0.82) * zSq
    return vpX + ((col - cols / 2) / (cols / 2)) * spread
  }

  // Yatay Çizgiler (Öne doğru akan tarama çizgileri)
  for (let r = 1; r < rows; r++) {
    const zNorm = r / rows
    const zAlpha = Math.min(0.9, zNorm * 1.1)

    // Orta yol için Cyan, kenar tepeler için Parlak Mor ayrımı
    ctx.lineWidth = r > rows - 4 ? 1.6 : 0.95

    for (let c = 0; c < cols - 1; c++) {
      const distFromCenter = Math.abs(c - cols / 2) / (cols / 2)
      const isCenter = distFromCenter < 0.22

      ctx.beginPath()
      ctx.moveTo(meshX(c, r), meshY(c, r))
      ctx.lineTo(meshX(c + 1, r), meshY(c + 1, r))

      if (isCenter) {
        // Ortadaki Yol: Parlak Elektrik Cyan (#00f5ff)
        ctx.strokeStyle = `rgba(0, 245, 255, ${zAlpha * 0.95})`
        ctx.shadowBlur = 8
        ctx.shadowColor = 'rgba(0, 245, 255, 0.7)'
      } else {
        // Kenar Tepeler: Referans Görseldeki Neon Mor (#bf00ff / #a855f7)
        ctx.strokeStyle = `rgba(180, 50, 255, ${zAlpha * 0.75})`
        ctx.shadowBlur = 5
        ctx.shadowColor = 'rgba(180, 50, 255, 0.5)'
      }
      ctx.stroke()
    }
  }

  // Boyuna Çizgiler (Ufuktan kameraya uzanan hatlar)
  for (let c = 0; c < cols; c++) {
    const distFromCenter = Math.abs(c - cols / 2) / (cols / 2)
    const isCenter = distFromCenter < 0.22

    ctx.beginPath()
    for (let r = 0; r < rows; r++) {
      const x = meshX(c, r)
      const y = meshY(c, r)
      if (r === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    if (isCenter) {
      ctx.strokeStyle = 'rgba(0, 245, 255, 0.85)'
      ctx.lineWidth = (c === Math.floor(cols / 2) || Math.abs(distFromCenter - 0.22) < 0.04) ? 1.8 : 1.1
      ctx.shadowBlur = 8
      ctx.shadowColor = 'rgba(0, 245, 255, 0.6)'
    } else {
      ctx.strokeStyle = `rgba(170, 40, 255, ${0.25 + distFromCenter * 0.55})`
      ctx.lineWidth = 0.95
      ctx.shadowBlur = 4
      ctx.shadowColor = 'rgba(170, 40, 255, 0.4)'
    }
    ctx.stroke()
  }
}

// ── 2. YÜKSEK SIKLIKLI TAVAN TEL IZGARASI (CEILING GRID) ──────────────────────
function drawHighDensityCeiling(ctx, W, H, vpX, vpY, time) {
  const ceilBottom = vpY - 20
  const ceilTop = -25
  const cols = 38
  const rows = 20

  for (let r = 1; r < rows; r++) {
    const zNorm = r / rows
    const zSq = Math.pow(zNorm, 2.1)
    const y = ceilBottom - (ceilBottom - ceilTop) * zSq
    const spread = (W * 0.72) * zSq

    ctx.strokeStyle = `rgba(140, 40, 230, ${zNorm * 0.45})`
    ctx.lineWidth = 0.9

    ctx.beginPath()
    ctx.moveTo(vpX - spread, y)
    ctx.lineTo(vpX + spread, y)
    ctx.stroke()
  }

  for (let c = 0; c < cols; c++) {
    const spreadFar = W * 0.06
    const spreadNear = W * 0.72
    const norm = (c - cols / 2) / (cols / 2)

    ctx.strokeStyle = 'rgba(140, 40, 230, 0.28)'
    ctx.lineWidth = 0.9

    ctx.beginPath()
    ctx.moveTo(vpX + norm * spreadFar, ceilBottom)
    ctx.lineTo(vpX + norm * spreadNear, ceilTop)
    ctx.stroke()
  }
}

// ── 3. DETAYLI YAN DUVAR SPEKTRUMU (SOL: FUŞYA/MAGENTA, SAĞ: LAZER YEŞİLİ) ────
function drawDetailedEqualizerWalls(ctx, W, H, vpX, vpY, data, bass, isPlaying) {
  const numColumns = 16
  const barsPerCol = 14

  // Sol Duvar (Referans Görseldeki Neon Fuşya / Magenta: #ff007f & #d946ef)
  drawPerspectiveWallPanel(ctx, W, H, vpX, vpY, -1, numColumns, barsPerCol, data, 'magenta', bass, isPlaying)

  // Sağ Duvar (Referans Görseldeki Lazer Yeşili / Lime: #00ff66)
  drawPerspectiveWallPanel(ctx, W, H, vpX, vpY, 1, numColumns, barsPerCol, data, 'green', bass, isPlaying)
}

function drawPerspectiveWallPanel(ctx, W, H, vpX, vpY, side, numCols, barsPerCol, data, theme, bass, isPlaying) {
  for (let col = 0; col < numCols; col++) {
    const zNorm = (col + 1) / (numCols + 1)
    const zSq = Math.pow(zNorm, 1.7)

    const wallX = vpX + side * (100 + (W * 0.40) * zSq)
    const wallYTop = vpY - (25 + 98 * zSq)
    const wallYBottom = vpY + (18 + 84 * zSq)
    const wallHeight = wallYBottom - wallYTop

    // Frekansı sütuna bağla (Tizler ve ortalar)
    const sampleIdx = Math.floor(col * 2.5) % data.length
    const val = (data[sampleIdx] || 0) / 255
    const activeBars = Math.floor(val * barsPerCol)

    const blockH = Math.max(2, (wallHeight / barsPerCol) * 0.72)
    const blockW = Math.max(3.5, 6 + 18 * zSq)

    for (let b = 0; b < barsPerCol; b++) {
      const bNorm = b / barsPerCol
      const by = wallYBottom - bNorm * wallHeight
      const isActive = b <= activeBars

      let colStyle = ''
      let glowStyle = ''

      if (theme === 'magenta') {
        // Sol Duvar: Referans görseldeki gibi parlak Fuşya / Pembe LED'ler
        if (isActive) {
          colStyle = b > barsPerCol - 3 ? '#ffffff' : b > barsPerCol - 6 ? '#ff2df7' : '#d946ef'
          glowStyle = 'rgba(255, 45, 247, 0.95)'
        } else {
          colStyle = 'rgba(217, 70, 239, 0.12)'
        }
      } else {
        // Sağ Duvar: Referans görseldeki gibi parlak Lazer Yeşili LED'ler
        if (isActive) {
          colStyle = b > barsPerCol - 3 ? '#ffffff' : b > barsPerCol - 6 ? '#39ff14' : '#00ff88'
          glowStyle = 'rgba(0, 255, 136, 0.95)'
        } else {
          colStyle = 'rgba(0, 255, 136, 0.12)'
        }
      }

      ctx.save()
      ctx.fillStyle = colStyle
      if (isActive && isPlaying) {
        ctx.shadowBlur = 12 + bass * 14
        ctx.shadowColor = glowStyle
      }
      const bx = side === -1 ? wallX - blockW : wallX
      ctx.fillRect(bx, by - blockH, blockW, blockH)
      ctx.restore()
    }
  }
}

// ── 4. ÜST PARLAK LAZER RAYLARI (INTENSE LASER BEAMS) ─────────────────────────
function drawIntenseLaserRails(ctx, W, H, vpX, vpY, bass) {
  ctx.save()

  // Sol Lazer Işını (Referans görseldeki gibi Neon Lazer Yeşili / Mint)
  ctx.strokeStyle = '#00ff99'
  ctx.lineWidth = 3.2
  ctx.shadowBlur = 22 + bass * 18
  ctx.shadowColor = 'rgba(0, 255, 153, 0.95)'
  ctx.beginPath()
  ctx.moveTo(vpX - 50, vpY - 25)
  ctx.lineTo(0, vpY - 122)
  ctx.stroke()

  // Sağ Lazer Işını
  ctx.beginPath()
  ctx.moveTo(vpX + 50, vpY - 25)
  ctx.lineTo(W, vpY - 122)
  ctx.stroke()

  ctx.restore()
}

// ── 5. UFUKTAKİ PARLAK ANAMORFİK LENS FLARE / YILDIZ ÇEKİRDEĞİ ────────────────
function drawHorizonFlare(ctx, vpX, vpY, bass, isPlaying) {
  const intensity = isPlaying ? 0.35 + bass * 0.55 : 0.25

  ctx.save()

  // 1. Yatay Keskin Flare Çizgisi (Merkezden iki yana uzanan lazer ışığı)
  const flareGrad = ctx.createLinearGradient(vpX - 180, vpY, vpX + 180, vpY)
  flareGrad.addColorStop(0, 'rgba(0, 245, 255, 0)')
  flareGrad.addColorStop(0.3, `rgba(0, 245, 255, ${intensity * 0.5})`)
  flareGrad.addColorStop(0.5, `rgba(255, 255, 255, ${intensity * 0.95})`)
  flareGrad.addColorStop(0.7, `rgba(0, 245, 255, ${intensity * 0.5})`)
  flareGrad.addColorStop(1, 'rgba(0, 245, 255, 0)')

  ctx.fillStyle = flareGrad
  ctx.fillRect(vpX - 180, vpY - 1.5, 360, 3)

  // 2. Merkez Parlak Küre (Görseldeki mavi-beyaz ufuk güneşi)
  const starGrad = ctx.createRadialGradient(vpX, vpY, 1, vpX, vpY, 28)
  starGrad.addColorStop(0, '#ffffff')
  starGrad.addColorStop(0.3, 'rgba(0, 245, 255, 0.9)')
  starGrad.addColorStop(0.7, 'rgba(0, 150, 255, 0.3)')
  starGrad.addColorStop(1, 'rgba(0, 0, 0, 0)')

  ctx.fillStyle = starGrad
  ctx.beginPath()
  ctx.arc(vpX, vpY, 28, 0, Math.PI * 2)
  ctx.fill()

  ctx.restore()
}

// ── 6. YAN SİBER HUD ELEMANLARI (REFERANS GÖRSELDEKİ VERİ GRAFİKLERİ) ─────────
function drawSideHudElements(ctx, W, H, vpY) {
  ctx.save()
  ctx.strokeStyle = 'rgba(0, 245, 255, 0.22)'
  ctx.lineWidth = 1

  // Sol Köşe Çerçevesi
  ctx.beginPath()
  ctx.moveTo(15, 25)
  ctx.lineTo(15, 75)
  ctx.moveTo(15, 25)
  ctx.lineTo(60, 25)
  ctx.stroke()

  // Sağ Köşe Çerçevesi
  ctx.beginPath()
  ctx.moveTo(W - 15, 25)
  ctx.lineTo(W - 15, 75)
  ctx.moveTo(W - 15, 25)
  ctx.lineTo(W - 60, 25)
  ctx.stroke()

  ctx.restore()
}

// ── 7. UÇUŞAN HIZ PARÇACIKLARI (WARP STARS) ──────────────────────────────────
function drawWarpStars(ctx, vpX, vpY, stars, speed, bass) {
  stars.forEach(s => {
    s.z -= speed * 2.2
    if (s.z <= 15) {
      s.z = 1000
      s.x = (Math.random() - 0.5) * 850
      s.y = (Math.random() - 0.5) * 450
    }

    const fov = 260
    const px = vpX + (s.x / s.z) * fov
    const py = vpY + (s.y / s.z) * fov
    const pSize = Math.max(0.6, (1 - s.z / 1000) * s.sz * (1 + bass * 0.7))
    const alpha = Math.min(1, (1 - s.z / 1000) * 1.1)

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
