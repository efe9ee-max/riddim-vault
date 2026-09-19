import React, { useCallback } from 'react'
import { useAudio } from '../context/AudioContext'
import {
  Play, Pause, Volume2, VolumeX, Repeat, SkipBack, SkipForward
} from 'lucide-react'
import clsx from 'clsx'

function formatTime(s) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

export default function Player() {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLooping,
    bassBoost,
    togglePlay,
    seek,
    setVolume,
    toggleLoop,
    toggleBassBoost,
  } = useAudio()

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const handleSeek = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    seek(ratio * duration)
  }, [duration, seek])

  if (!currentTrack) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-void-2/95 backdrop-blur-xl">
        <div className="flex items-center justify-center h-16 text-slate-600 text-xs font-mono tracking-widest">
          [ PARÇA SEÇİLMEDİ — BİR PARÇAYA TIKLA ]
        </div>
      </div>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neon/20 bg-void-2/95 backdrop-blur-xl">
      {/* Progress Bar */}
      <div
        className="h-1 w-full cursor-pointer bg-border hover:h-1.5 transition-all duration-150 relative"
        onClick={handleSeek}
        title="Konuma atla"
      >
        <div
          className="h-full bg-gradient-to-r from-neon via-cyan to-neon transition-all duration-100"
          style={{ width: `${progress}%`, boxShadow: '0 0 8px rgba(34,197,94,0.6)' }}
        />
      </div>

      <div className="flex items-center gap-4 px-4 py-3 max-w-screen-2xl mx-auto">
        {/* Cover + Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded border border-border flex-shrink-0 overflow-hidden bg-void-3">
            {currentTrack.coverUrl ? (
              <img src={currentTrack.coverUrl} alt={currentTrack.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lg">🎵</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-display font-semibold text-slate-100 truncate">{currentTrack.title}</p>
            <p className="text-xs text-neon/70 truncate font-mono">{currentTrack.artist}</p>
          </div>
          {currentTrack.bpm && (
            <span className="badge-neon text-[10px] hidden sm:inline-flex">{currentTrack.bpm} BPM</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Loop */}
          <button
            onClick={toggleLoop}
            title="Döngü"
            className={clsx(
              'p-1.5 rounded transition-all duration-200',
              isLooping
                ? 'text-neon bg-neon/10 shadow-neon-sm'
                : 'text-slate-500 hover:text-slate-300'
            )}
          >
            <Repeat size={15} />
          </button>

          {/* Play / Pause */}
          <button
            onClick={togglePlay}
            className={clsx(
              'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
              'bg-neon/10 border border-neon/40 text-neon hover:bg-neon/20 hover:shadow-neon',
              'active:scale-90'
            )}
          >
            {isPlaying
              ? <Pause size={18} fill="currentColor" />
              : <Play size={18} fill="currentColor" className="translate-x-0.5" />
            }
          </button>
        </div>

        {/* Time */}
        <div className="text-xs font-mono text-slate-500 flex-shrink-0 hidden sm:flex items-center gap-1">
          <span className="text-slate-300">{formatTime(currentTime)}</span>
          <span>/</span>
          <span>{formatTime(duration)}</span>
        </div>




        {/* Volume */}
        <div className="flex items-center gap-1.5 flex-shrink-0 w-24 hidden lg:flex">
          <button
            onClick={() => setVolume(volume > 0 ? 0 : 0.8)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            {volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={e => setVolume(parseFloat(e.target.value))}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #22c55e ${volume * 100}%, #2a2d4a 0%)`,
              borderRadius: '2px',
            }}
          />
        </div>
      </div>
    </div>
  )
}
