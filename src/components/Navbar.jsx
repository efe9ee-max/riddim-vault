import React, { useState } from 'react'
import { Upload, Lock, LogOut } from 'lucide-react'
import AdminModal from './AdminModal'
import UploadModal from './UploadModal'

export default function Navbar({ isAdmin, onAdminChange, onUploaded }) {
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('admin_pin')
    onAdminChange(false)
  }

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-void/90 backdrop-blur-xl">
        <div className="px-4 sm:px-6 flex items-center justify-between h-14 gap-4">
          {/* Boş sol */}
          <div />

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <>
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="btn-neon flex items-center gap-1.5 text-xs"
                >
                  <Upload size={13} />
                  <span className="hidden sm:inline">YÜKLE</span>
                </button>
                <button
                  onClick={handleLogout}
                  title="Admin çıkışı"
                  className="p-2 text-slate-500 hover:text-slate-200 transition-colors border border-transparent hover:border-border rounded"
                >
                  <LogOut size={15} />
                </button>
                <span className="badge-purple text-[9px] hidden sm:inline-flex">ADMIN</span>
              </>
            ) : (
              <button
                onClick={() => setShowAdminModal(true)}
                className="btn-purple flex items-center gap-1.5 text-xs"
              >
                <Lock size={13} />
                <span>ADMIN</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {showAdminModal && (
        <AdminModal
          onClose={() => setShowAdminModal(false)}
          onSuccess={() => onAdminChange(true)}
        />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUploaded={onUploaded}
        />
      )}
    </>
  )
}
