'use client'
import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'

const APP_URL = 'https://bloster.vercel.app'

export default function QRModal() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-sm text-gray-500 hover:text-blue-600 transition-colors"
        title="Compartir QR"
      >
        QR
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-xs w-full text-center">
            <h3 className="font-bold text-gray-800 text-lg mb-1">Acceso a Bloster</h3>
            <p className="text-xs text-gray-400 mb-4">{APP_URL}</p>
            <div className="flex justify-center mb-4">
              <QRCodeSVG
                value={APP_URL}
                size={200}
                bgColor="#ffffff"
                fgColor="#1e40af"
                level="M"
                includeMargin
              />
            </div>
            <p className="text-xs text-gray-500 mb-4">
              Escanea con la cámara del móvil para acceder a la aplicación.
            </p>
            <button
              onClick={() => setOpen(false)}
              className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  )
}
