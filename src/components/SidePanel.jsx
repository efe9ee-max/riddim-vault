import React, { useEffect, useRef, useState } from 'react'
import { useAudio } from '../context/AudioContext'
import { Music, Zap, Activity, Radio, Clock, TrendingUp } from 'lucide-react'

// ── Ortak araçlar ──────────────────────────────────────────────────────────────
function getEnergy(data) {
  if (!data) return 0
  let sum = 0
  const s = Math.floor(data.length * 0.35)
  for (let i = 0; i < s; i++) sum += data[i]
  return Math.min(1, sum / (s * 200))
}

function getBassEnergy(data) {
  if (!data) return 0
  let sum = 0
  const s = Math.floor(data.length * 0.08)
  for (let i = 0; i < s; i++) sum += data[i]
  return Math.min(1, sum / (s * 180))
}

// ── VU Meter (dikey) ──────────────────────────────────────────────────────────
function VUMeter({ value = 0, color = 'neon', label = '' }) {
  const bars = 16
  const lit = Math.round(value * bars)
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex flex-col-reverse gap-[2px]">
        {Array.from({ length: bars }).map((_, i) => {
          const isLit = i < lit
          const isDanger = i >= bars - 3
          const isWarn   = i >= bars - 6 && i < bars - 3
          let bg = 'bg-border'
          if (isLit) {
            if (isDanger) bg = 'bg-danger shadow-sm'
            else if (isWarn) bg = 'bg-warning'
            else if (color === 'purple') bg = 'bg-purple'
            else bg = 'bg-neon'
          }
          return (
            <div
              key={i}
              className={`w-4 rounded-sm transition-all duration-75 ${bg}`}
              style={{ height: 5, opacity: isLit ? 1 : 0.15 }}
            />
          )
        })}
      </div>
      {label && <span className="text-[8px] text-slate-600 font-mono tracking-widest">{label}</span>}
    </div>
  )
}

// ── Radyal Güç Göstergesi ─────────────────────────────────────────────────────
function RadialMeter({ value = 0, label = '', color = '#22c55e' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const cx = W / 2, cy = H / 2, r = cx - 6

    ctx.clearRect(0, 0, W, H)

    // Arka halka
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI * 0.75, Math.PI * 2.25)
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.stroke()

    // Değer yayı
    const endAngle = Math.PI * 0.75 + value * Math.PI * 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, r, Math.PI * 0.75, endAngle)
    ctx.strokeStyle = color
    ctx.lineWidth = 5
    ctx.lineCap = 'round'
    ctx.shadowBlur = 10
    ctx.shadowColor = color
    ctx.stroke()
    ctx.shadowBlur = 0

    // Merkez metin
    ctx.fillStyle = color
    ctx.font = `bold 11px JetBrains Mono`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${Math.round(value * 100)}`, cx, cy - 2)
  }, [value, color])

  return (
    <div className="flex flex-col items-center gap-1">
      <canvas ref={canvasRef} width={52} height={52} />
      <span className="text-[8px] text-slate-600 font-mono tracking-widest uppercase">{label}</span>
    </div>
  )
}

// ── Akan metin (ticker) ───────────────────────────────────────────────────────
function Ticker({ text }) {
  return (
    <div className="overflow-hidden w-full">
      <div
        className="whitespace-nowrap text-[9px] font-mono text-neon/50 tracking-widest"
        style={{ animation: 'marquee 14s linear infinite' }}
      >
        {text}&nbsp;&nbsp;&nbsp;◆&nbsp;&nbsp;&nbsp;{text}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
    </div>
  )
}

// ── Beat Flash göstergesi ──────────────────────────────────────────────────────
function BeatDot({ active }) {
  return (
    <div
      className="w-2 h-2 rounded-full transition-all duration-75"
      style={{
        background: active ? '#22c55e' : 'rgba(34,197,94,0.15)',
        boxShadow: active ? '0 0 8px rgba(34,197,94,0.9)' : 'none',
      }}
    />
  )
}

// ── Ana SidePanel bileşeni ────────────────────────────────────────────────────
export default function SidePanel({ side, tracks }) {
  const { analyserData, isPlaying, currentTrack, bassBoost } = useAudio()

  const [energy, setEnergy]       = useState(0)
  const [bass, setBass]           = useState(0)
  const [beatActive, setBeat]     = useState(false)
  const [clock, setClock]         = useState('')
  const prevBass                  = useRef(0)
  const frameRef                  = useRef(null)

  // Canlı ses metrikleri
  useEffect(() => {
    const tick = () => {
      if (analyserData && isPlaying) {
        const e = getEnergy(analyserData)
        const b = getBassEnergy(analyserData)
        setEnergy(e)
        setBass(b)
        // Bas vuruşu tespiti
        if (b > 0.55 && prevBass.current < 0.45) setBeat(true)
        else if (b < 0.3) setBeat(false)
        prevBass.current = b
      } else {
        setEnergy(prev => prev * 0.92)
        setBass(prev => prev * 0.88)
        setBeat(false)
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [analyserData, isPlaying])

  // Saat
  useEffect(() => {
    const update = () => setClock(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  // Tür dağılımı
  const genreCounts = tracks.reduce((acc, t) => {
    const g = t.genre || 'Diğer'
    acc[g] = (acc[g] || 0) + 1
    return acc
  }, {})
  const topGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 4)

  // ── Sol Panel ────────────────────────────────────────────────────────────────
  if (side === 'left') return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">

      {/* Sistem durumu */}
      <div className="space-y-1">
        <div className="text-[9px] text-neon/60 font-mono tracking-widest uppercase mb-2">SYS STATUS</div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-neon animate-pulse-neon" />
          <span className="text-[10px] text-slate-400 font-mono">ONLINE</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'bg-neon' : 'bg-border'}`} />
          <span className="text-[10px] text-slate-400 font-mono">{isPlaying ? 'PLAYING' : 'STANDBY'}</span>
        </div>
        {bassBoost && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-purple animate-pulse-neon" />
            <span className="text-[10px] text-purple font-mono">BASS BOOST</span>
          </div>
        )}
      </div>

      <div className="border-t border-border/40" />

      {/* Saat */}
      <div className="space-y-1">
        <div className="text-[9px] text-neon/60 font-mono tracking-widest uppercase">CLOCK</div>
        <div className="text-sm font-mono text-neon font-bold tracking-widest" style={{ textShadow: '0 0 8px rgba(34,197,94,0.6)' }}>
          {clock}
        </div>
      </div>

      <div className="border-t border-border/40" />

      {/* Beat flash dots */}
      <div className="space-y-2">
        <div className="text-[9px] text-neon/60 font-mono tracking-widest uppercase">BEAT DETECT</div>
        <div className="flex gap-1.5 flex-wrap">
          {[0,1,2,3,4,5,6,7].map(i => (
            <BeatDot key={i} active={beatActive && isPlaying && i <= Math.round(bass * 7)} />
          ))}
        </div>
      </div>

      <div className="border-t border-border/40" />

      {/* VU Metreleri */}
      <div className="space-y-2">
        <div className="text-[9px] text-neon/60 font-mono tracking-widest uppercase">LEVELS</div>
        <div className="flex gap-4 justify-center">
          <VUMeter value={isPlaying ? energy : 0} color="neon"   label="MID" />
          <VUMeter value={isPlaying ? bass   : 0} color="purple" label="SUB" />
        </div>
      </div>

      <div className="border-t border-border/40" />

      {/* Şu an çalıyor */}
      {currentTrack && (
        <div className="space-y-2">
          <div className="text-[9px] text-neon/60 font-mono tracking-widest uppercase">NOW PLAYING</div>
          <div className="bg-void-3 border border-border/60 rounded-lg p-2 space-y-1">
            {currentTrack.coverUrl ? (
              <img src={currentTrack.coverUrl} alt="" className="w-full aspect-square object-cover rounded" />
            ) : (
              <div className="w-full aspect-square bg-surface rounded flex items-center justify-center">
                <Music size={20} className="text-neon/30" />
              </div>
            )}
            <Ticker text={`${currentTrack.title} · ${currentTrack.artist}`} />
            <div className="flex gap-1 flex-wrap">
              {currentTrack.bpm && <span className="badge-neon text-[8px]">{currentTrack.bpm}</span>}
              {currentTrack.key && <span className="badge-purple text-[8px]">{currentTrack.key}</span>}
            </div>
          </div>
        </div>
      )}

      {/* Alt boşluğu dolduran dekor */}
      <div className="flex-1 flex flex-col justify-end pb-2">
        <DecoLines color="neon" />
      </div>
    </div>
  )

  // ── Sağ Panel ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-3 gap-4 overflow-y-auto">

      {/* Enerji göstergesi */}
      <div className="space-y-2">
        <div className="text-[9px] text-purple/70 font-mono tracking-widest uppercase">ENERGY</div>
        <div className="flex justify-around">
          <RadialMeter value={isPlaying ? energy : 0} label="MID"  color="#22c55e" />
          <RadialMeter value={isPlaying ? bass   : 0} label="BASS" color="#a855f7" />
        </div>
      </div>

      <div className="border-t border-border/40" />

      {/* İstatistikler */}
      <div className="space-y-2">
        <div className="text-[9px] text-purple/70 font-mono tracking-widest uppercase">STATS</div>
        <Stat icon={<Music size={11}/>}      label="Tracks"  value={tracks.length} />
        <Stat icon={<TrendingUp size={11}/>} label="Top BPM" value={getTopBpm(tracks)} />
        <Stat icon={<Activity size={11}/>}   label="Plays"   value={tracks.reduce((s,t) => s+(t.plays||0),0)} />
      </div>

      <div className="border-t border-border/40" />

      {/* Tür dağılımı */}
      {topGenres.length > 0 && (
        <div className="space-y-2">
          <div className="text-[9px] text-purple/70 font-mono tracking-widest uppercase">GENRES</div>
          {topGenres.map(([genre, count]) => {
            const pct = Math.round((count / tracks.length) * 100)
            return (
              <div key={genre} className="space-y-0.5">
                <div className="flex justify-between text-[9px] font-mono">
                  <span className="text-slate-500 truncate max-w-[100px]">{genre}</span>
                  <span className="text-purple/70">{pct}%</span>
                </div>
                <div className="h-[3px] bg-border rounded overflow-hidden">
                  <div
                    className="h-full rounded"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #a855f7, #22c55e)',
                      boxShadow: '0 0 4px rgba(168,85,247,0.5)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="border-t border-border/40" />

      {/* Frekans band göstergesi */}
      <div className="space-y-2">
        <div className="text-[9px] text-purple/70 font-mono tracking-widest uppercase">FREQ BANDS</div>
        <FreqBands data={analyserData} isPlaying={isPlaying} />
      </div>

      {/* Alt dekor */}
      <div className="flex-1 flex flex-col justify-end pb-2">
        <DecoLines color="purple" />
      </div>
    </div>
  )
}

// ── İstatistik satırı ─────────────────────────────────────────────────────────
function Stat({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-slate-500">
        <span className="text-neon/60">{icon}</span>
        <span className="text-[10px] font-mono">{label}</span>
      </div>
      <span className="text-[11px] font-mono font-bold text-slate-300">{value || '—'}</span>
    </div>
  )
}

// ── Frekans band mini göstergesi ─────────────────────────────────────────────
function FreqBands({ data, isPlaying }) {
  const bands = [
    { label: 'SUB',  range: [0, 0.04],  color: '#a855f7' },
    { label: 'BASS', range: [0.04, 0.12], color: '#8b5cf6' },
    { label: 'MID',  range: [0.12, 0.4],  color: '#22c55e' },
    { label: 'HIGH', range: [0.4,  1.0],  color: '#06b6d4' },
  ]

  return (
    <div className="space-y-1.5">
      {bands.map(({ label, range, color }) => {
        let val = 0
        if (data && isPlaying) {
          const start = Math.floor(range[0] * data.length)
          const end   = Math.floor(range[1] * data.length)
          let sum = 0
          for (let i = start; i < end; i++) sum += data[i]
          val = Math.min(1, sum / ((end - start) * 180))
        }
        return (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[8px] font-mono w-8 text-slate-600">{label}</span>
            <div className="flex-1 h-[4px] bg-border rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-75"
                style={{ width: `${val * 100}%`, background: color, boxShadow: `0 0 4px ${color}` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Dekoratif çizgiler ─────────────────────────────────────────────────────────
function DecoLines({ color }) {
  const c = color === 'neon' ? 'rgba(34,197,94,VAL)' : 'rgba(168,85,247,VAL)'
  return (
    <div className="space-y-1 px-1">
      {[0.5, 0.3, 0.15, 0.08].map((a, i) => (
        <div
          key={i}
          className="h-[1px] rounded"
          style={{ background: c.replace('VAL', a), width: `${100 - i * 18}%` }}
        />
      ))}
      <div className="text-[7px] font-mono tracking-widest mt-2" style={{ color: c.replace('VAL', '0.3') }}>
        RIDDIM VAULT v1.0
      </div>
    </div>
  )
}

// ── Yardımcı ─────────────────────────────────────────────────────────────────
function getTopBpm(tracks) {
  if (!tracks.length) return null
  const counts = tracks.reduce((a, t) => { if (t.bpm) a[t.bpm] = (a[t.bpm]||0)+1; return a }, {})
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1])[0]
  return top ? `${top[0]}` : null
}
