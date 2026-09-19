import React, { useState } from 'react'
import { useAudio } from '../context/AudioContext'
import { Play, Pause, Download, Trash2, Music } from 'lucide-react'
import { TAG_COLORS } from '../data/demoTracks'
import clsx from 'clsx'
import axios from 'axios'
import toast from 'react-hot-toast'

function formatDuration(s) {
  if (!s || isNaN(s)) return '--:--'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export default function TrackCard({ track, isAdmin, onDelete }) {
  const [imgError, setImgError] = useState(false)
  const { playTrack, currentTrack, isPlaying } = useAudio()
  const isActive = currentTrack?.id === track.id
  const isCurrentPlaying = isActive && isPlaying

  const handlePlay = () => {
    if (track.isDemo) {
      toast('Demo parça — ses yok. Kendi parçanı yükle!', { icon: '🎵' })
      return
    }
    playTrack(track)
  }

  const handleDownload = (e) => {
    e.stopPropagation()
    if (!track.audioUrl) return
    const a = document.createElement('a')
    a.href = track.audioUrl
    a.download = `${track.title} - ${track.artist}.mp3`
    a.click()
  }

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!window.confirm(`"${track.title}" silinecek. Emin misin?`)) return
    try {
      const pin = localStorage.getItem('admin_pin') || ''
      await axios.delete(`/api/tracks/${track.id}`, {
        headers: { 'x-admin-pin': pin }
      })
      toast.success(`"${track.title}" silindi.`)
      onDelete?.(track.id)
    } catch {
      toast.error('Silme başarısız.')
    }
  }

  return (
    <div
      className={clsx(
        'card-riddim cursor-pointer group select-none',
        isActive && 'card-playing',
        track.isDemo && 'opacity-60'
      )}
      onClick={handlePlay}
    >
      {/* Cover */}
      <div className="relative aspect-square bg-void-3 overflow-hidden">
        {track.coverUrl && !imgError ? (
          <img
            src={track.coverUrl}
            alt={track.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-void-3 to-surface-2 border-b border-border/30">
            <Music size={44} className="text-neon/25" />
            <span className="text-[10px] font-mono text-slate-600 mt-2 tracking-wider">NO COVER</span>
          </div>
        )}

        {/* Play overlay */}
        <div className={clsx(
          'absolute inset-0 flex items-center justify-center bg-black/50 transition-opacity duration-200',
          isCurrentPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}>
          <div className={clsx(
            'w-14 h-14 rounded-full flex items-center justify-center border-2 border-neon',
            isCurrentPlaying ? 'bg-neon/20 shadow-neon' : 'bg-black/40'
          )}>
            {isCurrentPlaying
              ? <Pause size={22} className="text-neon" fill="currentColor" />
              : <Play size={22} className="text-neon translate-x-0.5" fill="currentColor" />
            }
          </div>
        </div>

        {/* Playing indicator */}
        {isCurrentPlaying && (
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5 h-4">
            {[0, 1, 2, 3].map(i => (
              <div
                key={i}
                className="w-1 bg-neon rounded-sm"
                style={{
                  height: `${40 + i * 20}%`,
                  animation: `pulseNeon ${0.5 + i * 0.1}s ease-in-out infinite alternate`,
                  animationDelay: `${i * 0.12}s`,
                  boxShadow: '0 0 4px rgba(34,197,94,0.8)',
                }}
              />
            ))}
          </div>
        )}

        {/* Tags */}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          {track.tags?.slice(0, 2).map(tag => {
            const color = TAG_COLORS[tag] || 'grey'
            return (
              <span key={tag} className={`badge-${color} text-[9px]`}>{tag}</span>
            )
          })}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-display text-sm font-semibold text-slate-100 truncate group-hover:text-neon transition-colors">
          {track.title}
        </h3>
        <p className="text-xs text-slate-400 font-mono truncate">{track.artist}</p>

        {/* Meta */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {track.bpm && (
            <span className="badge-neon text-[9px]">{track.bpm} BPM</span>
          )}
          {track.key && (
            <span className="badge-purple text-[9px]">{track.key}</span>
          )}
          {track.genre && (
            <span className="badge-grey text-[9px]">{track.genre}</span>
          )}
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-slate-600 font-mono">
            {track.plays > 0 ? `▶ ${track.plays}` : ''}
            {track.audioSize ? `  ${formatSize(track.audioSize)}` : ''}
          </span>
          <div className="flex items-center gap-1">
            {!track.isDemo && track.audioUrl && (
              <button
                onClick={handleDownload}
                title="İndir"
                className="p-1 text-slate-600 hover:text-neon transition-colors rounded"
              >
                <Download size={13} />
              </button>
            )}
            {isAdmin && !track.isDemo && (
              <button
                onClick={handleDelete}
                title="Sil"
                className="p-1 text-slate-600 hover:text-danger transition-colors rounded"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
