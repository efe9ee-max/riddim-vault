import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { X, Image, Save, Trash } from 'lucide-react'
import { KEYS } from '../data/demoTracks'

export default function EditTrackModal({ track, isOpen, onClose, onUpdated }) {
  const [form, setForm] = useState({
    title: track.title || '',
    artist: track.artist || '',
    bpm: track.bpm !== null && track.bpm !== undefined ? track.bpm : '',
    key: track.key || '',
    genre: track.genre || 'Riddim',
    tags: Array.isArray(track.tags) ? track.tags.join(', ') : (track.tags || ''),
    description: track.description || ''
  })
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(track.coverUrl || null)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const handleClearBpm = () => {
    setForm(prev => ({ ...prev, bpm: '' }))
    toast('BPM temizlendi (boş olarak kaydedilecek)', { icon: 'ℹ️' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) {
      toast.error('Parça adı zorunludur.')
      return
    }

    try {
      setLoading(true)
      const pin = localStorage.getItem('admin_pin') || ''

      const data = new FormData()
      data.append('title', form.title.trim())
      data.append('artist', form.artist.trim() || 'Nammu')
      data.append('bpm', form.bpm === '' ? '' : form.bpm)
      data.append('key', form.key)
      data.append('genre', form.genre)
      data.append('tags', form.tags)
      data.append('description', form.description)
      if (coverFile) {
        data.append('cover', coverFile)
      }

      const res = await axios.put(`/api/tracks/${track.id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'x-admin-pin': pin
        }
      })

      toast.success(`"${res.data.title}" başarıyla güncellendi!`)
      onUpdated?.(res.data)
      onClose()
    } catch (err) {
      console.error('Update error:', err)
      toast.error(err.response?.data?.error || 'Güncelleme başarısız.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop overflow-y-auto">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative my-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border mb-5">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan shadow-cyan-sm" />
            <h2 className="text-sm font-display font-bold text-slate-100 tracking-wider uppercase">
              Parçayı Düzenle
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-void-3 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cover Preview & Change */}
          <div className="flex items-center gap-4 bg-void-3 p-3 rounded-xl border border-border/60">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-void-2 flex-shrink-0 border border-border flex items-center justify-center">
              {coverPreview ? (
                <img src={coverPreview} alt="cover" className="w-full h-full object-cover" />
              ) : (
                <Image size={20} className="text-slate-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <label className="text-xs text-slate-300 font-mono block mb-1">Yeni Kapak Resmi</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-mono file:bg-cyan/10 file:text-cyan hover:file:bg-cyan/20 cursor-pointer"
              />
            </div>
          </div>

          {/* Title & Artist */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-mono mb-1 block">Parça Adı *</label>
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="input-void"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-mono mb-1 block">Sanatçı / Alias</label>
              <input
                name="artist"
                value={form.artist}
                onChange={handleChange}
                className="input-void"
              />
            </div>
          </div>

          {/* BPM & Key & Genre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-slate-400 font-mono">BPM</label>
                {form.bpm && (
                  <button
                    type="button"
                    onClick={handleClearBpm}
                    className="text-[10px] text-red-400 hover:underline flex items-center gap-0.5"
                  >
                    <Trash size={10} /> Kaldır
                  </button>
                )}
              </div>
              <input
                name="bpm"
                type="number"
                min="40"
                max="240"
                placeholder="BPM Yok"
                value={form.bpm}
                onChange={handleChange}
                className="input-void"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono mb-1 block">Nota / Key</label>
              <select name="key" value={form.key} onChange={handleChange} className="input-void">
                <option value="">Seçilmedi</option>
                {KEYS.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-mono mb-1 block">Alt Tür</label>
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
            <label className="text-xs text-slate-400 font-mono mb-1 block">
              Etiketler <span className="text-slate-600">(virgülle ayır: DUBPLATE, VIP, FREE DL, WIP)</span>
            </label>
            <input
              name="tags"
              value={form.tags}
              onChange={handleChange}
              className="input-void"
              placeholder="DUBPLATE, VIP, FREE DL"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs text-slate-400 font-mono mb-1 block">Açıklama</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={2}
              className="input-void resize-none"
              placeholder="Parça hakkında kısa not..."
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-slate-200 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-neon flex items-center gap-2 text-xs"
            >
              <Save size={14} />
              {loading ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
