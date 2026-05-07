'use client'
import { useState, useEffect } from 'react'

type Platform = 'android' | 'ios' | 'desktop' | null

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [platform, setPlatform] = useState<Platform>(null)
  const [showModal, setShowModal] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa-install-dismissed')) return

    const ua = navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isAndroid = /android/i.test(ua)

    if (isIOS) {
      setPlatform('ios')
      setVisible(true)
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform(isAndroid ? 'android' : 'desktop')
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleClick() {
    if (platform === 'ios' || (platform === 'desktop' && !deferredPrompt)) {
      setShowModal(true)
      return
    }
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setVisible(false)
      setDeferredPrompt(null)
    }
  }

  function dismiss() {
    localStorage.setItem('pwa-install-dismissed', '1')
    setVisible(false)
    setShowModal(false)
  }

  if (!visible) return null

  return (
    <>
      <button
        onClick={handleClick}
        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-lg font-semibold hover:bg-blue-200 transition-colors"
      >
        Instalar
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            {platform === 'ios' && (
              <>
                <div className="text-3xl mb-3 text-center">📱</div>
                <h3 className="font-bold text-gray-800 text-lg mb-1 text-center">Instalar en iPhone / iPad</h3>
                <p className="text-gray-500 text-xs text-center mb-4">Ábrelo en <strong>Safari</strong> si aún no lo has hecho</p>
                <ol className="text-sm text-gray-700 space-y-3">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <span>Pulsa el botón <strong>Compartir</strong> <span className="text-base">⬆️</span> en la barra de Safari</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <span>Desplázate hacia abajo y pulsa <strong>"Añadir a pantalla de inicio"</strong></span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <span>Pulsa <strong>Añadir</strong> para confirmar</span>
                  </li>
                </ol>
              </>
            )}

            {platform === 'desktop' && (
              <>
                <div className="text-3xl mb-3 text-center">💻</div>
                <h3 className="font-bold text-gray-800 text-lg mb-1 text-center">Instalar en escritorio</h3>
                <p className="text-gray-500 text-sm text-center mb-4">En Chrome, busca el icono <strong>⊕</strong> en la barra de direcciones y pulsa <strong>"Instalar"</strong>.</p>
                <p className="text-gray-400 text-xs text-center">En Edge verás un icono similar. En Safari de Mac no está disponible.</p>
              </>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={dismiss}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium"
              >
                No mostrar más
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
