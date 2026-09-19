import React, { useState } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Lock, X, Eye, EyeOff } from 'lucide-react'

export default function AdminModal({ onClose, onSuccess }) {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!pin.trim()) return
    setLoading(true)
    try {
      await axios.post('/api/admin/verify', { pin })
      localStorage.setItem('admin_pin', pin)
      toast.success('Admin girişi başarılı! 🔓')
      onSuccess?.()
      onClose()
    } catch {
      toast.error('Yanlış PIN. Tekrar dene.')
      setPin('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm mx-4 bg-void-2 border border-purple/30 rounded-xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-purple" />
            <h2 className="font-display text-base font-bold text-purple tracking-wider">ADMIN GİRİŞİ</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-xs text-slate-500 font-mono">
            Parça yüklemek ve silmek için admin PIN'ini gir.
          </p>

          <div className="relative">
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={e => setPin(e.target.value)}
              className="input-void pr-10 text-center tracking-widest text-base"
              placeholder="••••••••"
              autoFocus
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPin(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showPin ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !pin.trim()}
            className="btn-purple w-full flex items-center justify-center gap-2 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Lock size={14} />
            {loading ? 'DOĞRULANYOR...' : 'GİRİŞ YAP'}
          </button>

          <p className="text-[10px] text-slate-700 font-mono text-center">
            Varsayılan: riddim140 &nbsp;·&nbsp; server/index.js'den değiştir
          </p>
        </form>
      </div>
    </div>
  )
}
