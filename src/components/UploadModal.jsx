import React, { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, Upload, Music, Image, Loader2 } from 'lucide-react'
import { GENRES, KEYS } from '../data/demoTracks'

export default function UploadModal({ onClose, onUploaded }) {
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const [form, setForm] = useState({
    title: '',
    artist: '',
    bpm: '',
    key: '',
    genre: 'Heavy Riddim',
    tags: '',
    description: '',
  })

  // ── Audio dropzone ────────────────────────────────────────────────────────
  const onDropAudio = useCallback((accepted) => {
    if (accepted[0]) setAudioFile(accepted[0])
  }, [])

  const { getRootProps: getAudioRoot, getInputProps: getAudioInput, isDragActive: isAudioDrag } = useDropzone({
    onDrop: onDropAudio,
    accept: { 'audio/*': ['.mp3', '.wav', '.flac', '.ogg'] },
    maxFiles: 1,
    maxSize: 200 * 1024 * 1024,
  })

  // ── Cover dropzone ────────────────────────────────────────────────────────
  const onDropCover = useCallback((accepted) => {
    if (accepted[0]) {
      setCoverFile(accepted[0])
      setCoverPreview(URL.createObjectURL(accepted[0]))
    }
  }, [])

  const { getRootProps: getCoverRoot, getInputProps: getCoverInput, isDragActive: isCoverDrag } = useDropzone({
    onDrop: onDropCover,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  })

  const handleChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!audioFile) return toast.error('Lütfen bir ses dosyası seç.')
    if (!form.title.trim()) return toast.error('Parça adı boş olamaz.')

    const pin = localStorage.getItem('admin_pin') || ''
    const data = new FormData()
    data.append('audio', audioFile)
    if (coverFile) data.append('cover', coverFile)
    Object.entries(form).forEach(([k, v]) => data.append(k, v))

    setUploading(true)
    setProgress(0)

    try {
      const res = await axios.post('/api/tracks', data, {
        headers: { 'x-admin-pin': pin },
        onUploadProgress: e => setProgress(Math.round((e.loaded / e.total) * 100)),
      })
      toast.success(`"${res.data.title}" yüklendi! 🎵`)
      onUploaded?.(res.data)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Yükleme başarısız.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl mx-4 bg-void-2 border border-neon/20 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-display text-lg font-bold text-neon tracking-wider">PARÇA YÜKLE</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Audio Drop */}
          <div>
            <label className="text-xs text-neon font-mono tracking-widest uppercase mb-2 block">
              Ses Dosyası <span className="text-danger">*</span>
            </label>
            <div
              {...getAudioRoot()}
              className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all duration-200 ${
                isAudioDrag ? 'dropzone-active' : 'border-border hover:border-neon/40 hover:bg-neon/3'
              }`}
            >
              <input {...getAudioInput()} />
              {audioFile ? (
                <div className="flex items-center gap-3 justify-center">
                  <Music size={20} className="text-neon" />
                  <div className="text-left">
                    <p className="text-sm font-mono text-slate-200">{audioFile.name}</p>
                    <p className="text-xs text-slate-500">{(audioFile.size / (1024 * 1024)).toFixed(1)} MB</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload size={28} className="mx-auto text-slate-600" />
                  <p className="text-sm text-slate-400">Sürükle-bırak veya tıkla</p>
                  <p className="text-xs text-slate-600">MP3, WAV, FLAC, OGG — max 200MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Cover + Form fields in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Cover */}
            <div>
              <label className="text-xs text-neon font-mono tracking-widest uppercase mb-2 block">Kapak</label>
              <div
                {...getCoverRoot()}
                className={`border-2 border-dashed rounded-lg cursor-pointer overflow-hidden transition-all duration-200 ${
                  isCoverDrag ? 'dropzone-active' : 'border-border hover:border-purple/40'
                }`}
                style={{ aspectRatio: '1', minHeight: '100px' }}
              >
                <input {...getCoverInput()} />
                {coverPreview ? (
                  <img src={coverPreview} alt="kapak" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-2">
                    <Image size={20} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600 text-center">Kapak resmi</span>
                  </div>
                )}
              </div>
            </div>

            {/* Fields */}
            <div className="sm:col-span-2 space-y-3">
              <div>
                <label className="text-xs text-slate-500 font-mono mb-1 block">Parça Adı *</label>
                <input name="title" value={form.title} onChange={handleChange}
                  className="input-void" placeholder="Subterranean" required />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-mono mb-1 block">Sanatçı / Alias</label>
                <input name="artist" value={form.artist} onChange={handleChange}
                  className="input-void" placeholder="Sanatçı adın" />
              </div>
            </div>
          </div>

          {/* BPM / Key / Genre */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-500 font-mono mb-1 block">BPM</label>
              <input name="bpm" value={form.bpm} onChange={handleChange}
                className="input-void" placeholder="140" type="number" min="60" max="220" />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-mono mb-1 block">Nota / Key</label>
              <select name="key" value={form.key} onChange={handleChange} className="input-void">
                <option value="">Seç...</option>
                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-500 font-mono mb-1 block">Alt Tür</label>
              <select name="genre" value={form.genre} onChange={handleChange} className="input-void">
                <optgroup label="── Bass / Dubstep ──">
                  <option>Heavy Riddim</option>
                  <option>Trench</option>
                  <option>Tearout</option>
                  <option>Briddim</option>
                  <option>Riddim</option>
                  <option>Dubstep</option>
                  <option>Brostep</option>
                  <option>Melodic Dubstep</option>
                  <option>Hybrid Trap</option>
                  <option>Deathstep</option>
                </optgroup>
                <optgroup label="── Bass House / Future ──">
                  <option>Future Bass</option>
                  <option>Color Bass</option>
                  <option>Wave</option>
                  <option>Bass House</option>
                  <option>G-House</option>
                </optgroup>
                <optgroup label="── Trap / Hip-Hop ──">
                  <option>Trap</option>
                  <option>Dark Trap</option>
                  <option>Phonk</option>
                  <option>Memphis Phonk</option>
                  <option>Rage</option>
                  <option>Hard Trap</option>
                  <option>Lo-Fi Hip-Hop</option>
                </optgroup>
                <optgroup label="── EDM / Dance ──">
                  <option>EDM</option>
                  <option>Big Room</option>
                  <option>Progressive House</option>
                  <option>Electro House</option>
                  <option>Tech House</option>
                  <option>Deep House</option>
                  <option>Future House</option>
                  <option>Bounce</option>
                </optgroup>
                <optgroup label="── Drum & Bass / Jungle ──">
                  <option>Drum and Bass</option>
                  <option>Liquid DnB</option>
                  <option>Neurofunk</option>
                  <option>Jungle</option>
                </optgroup>
                <optgroup label="── Electronic / Synth ──">
                  <option>Electronic</option>
                  <option>Synthwave</option>
                  <option>Retrowave</option>
                  <option>Darkwave</option>
                  <option>Industrial</option>
                  <option>Electro</option>
                  <option>Glitch</option>
                  <option>Experimental</option>
                </optgroup>
                <optgroup label="── Ambient / Sinema ──">
                  <option>Ambient</option>
                  <option>Dark Ambient</option>
                  <option>Cinematic</option>
                  <option>Atmospheric</option>
                  <option>Drone</option>
                </optgroup>
                <optgroup label="── Dünya / Kültür ──">
                  <option>Celtic</option>
                  <option>Celtic Trap</option>
                  <option>Viking / Norse</option>
                  <option>Flamenco Fusion</option>
                  <option>Oriental Trap</option>
                  <option>Arabian Phonk</option>
                  <option>Latin Trap</option>
                  <option>Afrobeat</option>
                  <option>Reggaeton</option>
                  <option>Bollywood Trap</option>
                </optgroup>
                <optgroup label="── Diğer ──">
                  <option>Diğer</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs text-slate-500 font-mono mb-1 block">
              Etiketler <span className="text-slate-600">(virgülle ayır: DUBPLATE, VIP, FREE DL, WIP)</span>
            </label>
            <input name="tags" value={form.tags} onChange={handleChange}
              className="input-void" placeholder="DUBPLATE, VIP" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-500 font-mono mb-1 block">Açıklama</label>
            <textarea name="description" value={form.description} onChange={handleChange}
              className="input-void resize-none" rows={2} placeholder="Kısa açıklama..." />
          </div>

          {/* Upload button + progress */}
          {uploading && (
            <div className="space-y-1">
              <div className="h-1 bg-border rounded overflow-hidden">
                <div className="h-full bg-neon transition-all duration-200 shadow-neon-sm"
                  style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-neon font-mono text-center">{progress}% yüklendi...</p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="btn-neon w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <><Loader2 size={16} className="animate-spin" /> YÜKLENIYOR...</>
            ) : (
              <><Upload size={16} /> PARÇAYI YÜKLE</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
