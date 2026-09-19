import React, { useMemo } from 'react'
import TrackCard from './TrackCard'
import { DEMO_TRACKS } from '../data/demoTracks'

export default function TrackGrid({ tracks, isAdmin, onDelete }) {
  const allTracks = tracks.length > 0 ? tracks : DEMO_TRACKS

  const sorted = useMemo(() =>
    [...allTracks].sort((a, b) => a.title.localeCompare(b.title, 'tr')),
    [allTracks]
  )

  if (sorted.length === 0) {
    return (
      <div className="text-center py-20 text-slate-600 font-mono">
        <p className="text-4xl mb-3">🎵</p>
        <p className="text-sm">Henüz parça yüklenmedi.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {sorted.map(track => (
        <TrackCard
          key={track.id}
          track={track}
          isAdmin={isAdmin}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
