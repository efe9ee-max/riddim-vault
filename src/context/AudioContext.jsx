import React, {
  createContext, useContext, useRef, useState, useEffect, useCallback
} from 'react'

const AudioCtx = createContext(null)

export function useAudio() {
  return useContext(AudioCtx)
}

export function AudioProvider({ children }) {
  const [currentTrack, setCurrentTrack] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)
  const [isLooping, setIsLooping] = useState(false)
  const [bassBoost, setBassBoost] = useState(false)
  const [analyserData, setAnalyserData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const audioRef = useRef(null)
  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const gainRef = useRef(null)
  const bassFilterRef = useRef(null)
  const sourceRef = useRef(null)
  const animFrameRef = useRef(null)
  const connectedRef = useRef(false)

  // ── Web Audio API Kurulumu ─────────────────────────────────────────────────
  const setupAudioGraph = useCallback(() => {
    if (connectedRef.current) return
    if (!audioRef.current) return

    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    audioCtxRef.current = ctx

    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    analyserRef.current = analyser

    const gain = ctx.createGain()
    gain.gain.value = volume
    gainRef.current = gain

    // Sub-bass boost filter (40-80 Hz)
    const bassFilter = ctx.createBiquadFilter()
    bassFilter.type = 'lowshelf'
    bassFilter.frequency.value = 80
    bassFilter.gain.value = 0
    bassFilterRef.current = bassFilter

    const source = ctx.createMediaElementSource(audioRef.current)
    sourceRef.current = source

    // Audio chain: source → gain → bassFilter → analyser → output
    source.connect(gain)
    gain.connect(bassFilter)
    bassFilter.connect(analyser)
    analyser.connect(ctx.destination)

    connectedRef.current = true
  }, [volume])

  // ── Analiz Döngüsü ─────────────────────────────────────────────────────────
  const startAnalysis = useCallback(() => {
    if (!analyserRef.current) return
    const bufferLength = analyserRef.current.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const tick = () => {
      analyserRef.current.getByteFrequencyData(dataArray)
      setAnalyserData(new Uint8Array(dataArray))
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
  }, [])

  const stopAnalysis = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
  }, [])

  // ── Parça Yükleme ──────────────────────────────────────────────────────────
  const loadTrack = useCallback(async (track) => {
    if (!track.audioUrl) return
    setIsLoading(true)
    setCurrentTrack(track)
    setIsPlaying(false)
    setCurrentTime(0)

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = track.audioUrl
      audioRef.current.load()
    }

    setIsLoading(false)
  }, [])

  // ── Oynat / Duraklat ───────────────────────────────────────────────────────
  const play = useCallback(async () => {
    if (!audioRef.current || !currentTrack?.audioUrl) return
    setupAudioGraph()
    if (audioCtxRef.current?.state === 'suspended') {
      await audioCtxRef.current.resume()
    }
    try {
      await audioRef.current.play()
      setIsPlaying(true)
      startAnalysis()
    } catch (e) {
      console.error('Oynatma hatası:', e)
    }
  }, [currentTrack, setupAudioGraph, startAnalysis])

  const pause = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.pause()
    setIsPlaying(false)
    stopAnalysis()
  }, [stopAnalysis])

  const togglePlay = useCallback(() => {
    if (isPlaying) pause()
    else play()
  }, [isPlaying, play, pause])

  // ── Parça Seçme ve Oynatma ─────────────────────────────────────────────────
  const playTrack = useCallback(async (track) => {
    if (!track.audioUrl) return
    if (currentTrack?.id === track.id) {
      togglePlay()
      return
    }
    stopAnalysis()
    setIsPlaying(false)
    await loadTrack(track)
  }, [currentTrack, togglePlay, loadTrack, stopAnalysis])

  // audioRef src yüklenince otomatik oynat
  useEffect(() => {
    if (!audioRef.current) return
    const el = audioRef.current

    const onCanPlay = async () => {
      if (currentTrack) {
        await play()
      }
    }

    el.addEventListener('canplay', onCanPlay)
    return () => el.removeEventListener('canplay', onCanPlay)
  }, [currentTrack, play])

  // ── Audio element event listeners ──────────────────────────────────────────
  useEffect(() => {
    const el = audioRef.current
    if (!el) return

    const onTimeUpdate = () => setCurrentTime(el.currentTime)
    const onDurationChange = () => setDuration(el.duration || 0)
    const onEnded = () => {
      setIsPlaying(false)
      stopAnalysis()
      if (!isLooping) setCurrentTime(0)
    }

    el.addEventListener('timeupdate', onTimeUpdate)
    el.addEventListener('durationchange', onDurationChange)
    el.addEventListener('ended', onEnded)

    return () => {
      el.removeEventListener('timeupdate', onTimeUpdate)
      el.removeEventListener('durationchange', onDurationChange)
      el.removeEventListener('ended', onEnded)
    }
  }, [isLooping, stopAnalysis])

  // ── Seek ───────────────────────────────────────────────────────────────────
  const seek = useCallback((time) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = time
    setCurrentTime(time)
  }, [])

  // ── Volume ─────────────────────────────────────────────────────────────────
  const setVolume = useCallback((v) => {
    setVolumeState(v)
    if (gainRef.current) gainRef.current.gain.value = v
    if (audioRef.current) audioRef.current.volume = v
  }, [])

  // ── Bass Boost ─────────────────────────────────────────────────────────────
  const toggleBassBoost = useCallback(() => {
    setBassBoost(prev => {
      const next = !prev
      if (bassFilterRef.current) {
        bassFilterRef.current.gain.value = next ? 12 : 0
      }
      return next
    })
  }, [])

  // ── Loop ───────────────────────────────────────────────────────────────────
  const toggleLoop = useCallback(() => {
    setIsLooping(prev => {
      const next = !prev
      if (audioRef.current) audioRef.current.loop = next
      return next
    })
  }, [])

  const value = {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isLooping,
    bassBoost,
    analyserData,
    isLoading,
    playTrack,
    togglePlay,
    play,
    pause,
    seek,
    setVolume,
    toggleBassBoost,
    toggleLoop,
  }

  return (
    <AudioCtx.Provider value={value}>
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous" />
      {children}
    </AudioCtx.Provider>
  )
}
