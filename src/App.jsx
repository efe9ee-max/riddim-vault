import React, { useState, useEffect, useCallback } from 'react'
import axios from 'axios'
import Navbar from './components/Navbar'
import Visualizer from './components/Visualizer'
import Player from './components/Player'
import TrackGrid from './components/TrackGrid'
import SidePanel from './components/SidePanel'
import { useAudio } from './context/AudioContext'

export default function App() {
  const [tracks, setTracks] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const { currentTrack } = useAudio()

  useEffect(() => {
    if (currentTrack) {
      document.title = `▶ ${currentTrack.title} — RIDDIM VAULT`
    } else {
      document.title = 'RIDDIM VAULT'
    }
  }, [currentTrack])

  useEffect(() => {
    const savedPin = localStorage.getItem('admin_pin')
    if (savedPin) {
      axios.post('/api/admin/verify', { pin: savedPin })
        .then(() => setIsAdmin(true))
        .catch(() => localStorage.removeItem('admin_pin'))
    }
  }, [])

  const fetchTracks = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await axios.get('/api/tracks')
      setTracks(data)
    } catch {
      setTracks([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTracks() }, [fetchTracks])

  const handleUploaded = useCallback((t) => setTracks(p => [t, ...p]), [])
  const handleDelete   = useCallback((id) => setTracks(p => p.filter(t => t.id !== id)), [])

  return (
    <div className="min-h-screen bg-void relative overflow-x-hidden">

      {/* ── Arka plan dekor katmanı ────────────────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        {/* Izgara */}
        <div className="absolute inset-0 bg-grid-void bg-grid opacity-100" />

        {/* Büyük ambient glow'lar */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-neon/5 rounded-full blur-[120px]" />
        <div className="absolute top-[30%] right-[-8%] w-[400px] h-[400px] bg-purple/6 rounded-full blur-[100px]" />
        <div className="absolute bottom-[10%] left-[15%] w-[350px] h-[350px] bg-cyan/4 rounded-full blur-[100px]" />

        {/* Sol dekoratif dikey çizgi şeridi */}
        <div className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(34,197,94,0.6) 20%, rgba(168,85,247,0.4) 60%, transparent 100%)' }} />
        {/* Sağ dekoratif dikey çizgi şeridi */}
        <div className="absolute right-0 top-0 bottom-0 w-[3px]"
          style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(168,85,247,0.6) 20%, rgba(34,197,94,0.4) 60%, transparent 100%)' }} />

        {/* Köşe köşe dekor kareleri */}
        <CornerDeco pos="top-14 left-0"    colorA="neon"   colorB="purple" />
        <CornerDeco pos="top-14 right-0"   colorA="purple" colorB="neon"   flipX />
        <CornerDeco pos="bottom-20 left-0" colorA="cyan"   colorB="neon"   />
        <CornerDeco pos="bottom-20 right-0" colorA="neon"  colorB="cyan"   flipX />
      </div>

      <Navbar isAdmin={isAdmin} onAdminChange={setIsAdmin} onUploaded={handleUploaded} />

      {/* ── Ana üç sütun layout ──────────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-screen">

        {/* Sol panel */}
        <aside className="hidden xl:flex flex-col w-[200px] flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border/40 bg-void/30 backdrop-blur-sm overflow-hidden">
          <SidePanel side="left" tracks={tracks} />
        </aside>

        {/* Orta içerik */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 pb-32 pt-6">

          {/* Visualizer */}
          <section className="mb-6">
            <div className="rounded-xl overflow-hidden border border-border/50">
              <Visualizer />
            </div>
          </section>

          {/* Track Grid */}
          <section>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-4 bg-purple rounded-full shadow-purple-sm" />
              <span className="text-xs text-slate-500 font-mono tracking-widest uppercase">Parçalar</span>
              {tracks.length > 0 && (
                <span className="badge-neon text-[9px]">{tracks.length}</span>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-surface border border-border rounded-lg overflow-hidden">
                    <div className="aspect-square animate-shimmer bg-void-3" />
                    <div className="p-3 space-y-2">
                      <div className="h-3 bg-void-3 rounded animate-shimmer" />
                      <div className="h-2 w-2/3 bg-void-3 rounded animate-shimmer" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <TrackGrid tracks={tracks} isAdmin={isAdmin} onDelete={handleDelete} />
            )}
          </section>
        </main>

        {/* Sağ panel */}
        <aside className="hidden xl:flex flex-col w-[200px] flex-shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-l border-border/40 bg-void/30 backdrop-blur-sm overflow-hidden">
          <SidePanel side="right" tracks={tracks} />
        </aside>
      </div>

      <Player />
    </div>
  )
}

// ── Köşe dekor bileşeni ────────────────────────────────────────────────────────
function CornerDeco({ pos, colorA, colorB, flipX }) {
  const colors = {
    neon:   'rgba(34,197,94,VAL)',
    purple: 'rgba(168,85,247,VAL)',
    cyan:   'rgba(6,182,212,VAL)',
  }

  const c1 = colors[colorA].replace('VAL', '0.5')
  const c2 = colors[colorB].replace('VAL', '0.3')

  return (
    <div className={`absolute ${pos} ${flipX ? 'scale-x-[-1]' : ''}`} style={{ width: 120, height: 200 }}>
      {/* L-şekli çizgiler */}
      <div className="absolute top-0 left-0 w-8 h-[2px]" style={{ background: c1 }} />
      <div className="absolute top-0 left-0 w-[2px] h-16" style={{ background: `linear-gradient(180deg, ${c1}, transparent)` }} />
      {/* Köşe nokta */}
      <div className="absolute top-[-2px] left-[-2px] w-2 h-2 rounded-full"
        style={{ background: c1, boxShadow: `0 0 8px ${c1}` }} />
      {/* İkinci L */}
      <div className="absolute top-10 left-4 w-5 h-[1px]" style={{ background: c2 }} />
      <div className="absolute top-10 left-4 w-[1px] h-12" style={{ background: `linear-gradient(180deg, ${c2}, transparent)` }} />
      {/* Metin */}
      <div className="absolute top-[72px] left-2 text-[8px] font-mono tracking-widest"
        style={{ color: c2, writingMode: 'vertical-rl', transform: 'rotate(180deg)', opacity: 0.6 }}>
        SYS::ACTIVE
      </div>
    </div>
  )
}
