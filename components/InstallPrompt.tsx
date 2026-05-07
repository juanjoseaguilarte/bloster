'use client'
import { useState, useEffect } from 'react'

// Persiste el evento entre re-renders y navegaciones de la misma sesión
let savedPrompt: any = null

function detectPlatform(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'desktop'
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(savedPrompt)
  const [showModal, setShowModal] = useState(false)
  const [visible, setVisible] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop')

  useEffect(() => {
    // Ya instalada en standalone → no mostrar
    if (window.matchMedia('(display-mode: standalone)').matches) return

    const p = detectPlatform()
    setPlatform(p)
    setVisible(true)

    // Capturar prompt nativo (Android/Chrome desktop)
    const handler = (e: Event) => {
      e.preventDefault()
      savedPrompt = e
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleClick() {
    // Android/desktop con prompt nativo disponible → instalar directamente
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setVisible(false)
        savedPrompt = null
      }
      setDeferredPrompt(null)
      savedPrompt = null
      return
    }
    // Sin prompt nativo → mostrar instrucciones
    setShowModal(true)
  }

  function dismiss() {
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
                <div className="text-4xl mb-3 text-center">📱</div>
                <h3 className="font-bold text-gray-800 text-lg mb-1 text-center">Instalar en iPhone / iPad</h3>
                <p className="text-gray-400 text-xs text-center mb-5">Ábrelo en <strong>Safari</strong> si aún no lo has hecho</p>
                <ol className="space-y-4">
                  {[
                    <>Pulsa el botón <strong>Compartir</strong> <span className="text-base">⬆️</span> en la barra inferior de Safari</>,
                    <>Desplázate y pulsa <strong>"Añadir a pantalla de inicio"</strong></>,
                    <>Pulsa <strong>Añadir</strong> para confirmar</>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {platform === 'android' && (
              <>
                <div className="text-4xl mb-3 text-center">🤖</div>
                <h3 className="font-bold text-gray-800 text-lg mb-1 text-center">Instalar en Android</h3>
                <p className="text-gray-400 text-xs text-center mb-5">Ábrelo en <strong>Chrome</strong> si aún no lo has hecho</p>
                <ol className="space-y-4">
                  {[
                    <>Pulsa el menú <strong>⋮</strong> (tres puntos) arriba a la derecha</>,
                    <>Pulsa <strong>"Añadir a pantalla de inicio"</strong> o <strong>"Instalar app"</strong></>,
                    <>Confirma pulsando <strong>Añadir</strong></>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                      <span className="text-sm text-gray-700">{step}</span>
                    </li>
                  ))}
                </ol>
              </>
            )}

            {platform === 'desktop' && (
              <>
                <div className="text-4xl mb-3 text-center">💻</div>
                <h3 className="font-bold text-gray-800 text-lg mb-3 text-center">Instalar en escritorio</h3>
                <p className="text-sm text-gray-700 mb-2">En <strong>Chrome o Edge</strong>, busca el icono <strong>⊕</strong> al final de la barra de direcciones y pulsa <strong>"Instalar"</strong>.</p>
                <p className="text-xs text-gray-400">En Safari de Mac la instalación no está disponible.</p>
              </>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={dismiss} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium">
                No mostrar más
              </button>
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
