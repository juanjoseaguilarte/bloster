'use client'
import { useEffect, useRef, useState } from 'react'

const POLL_INTERVAL = 3 * 60 * 1000 // 3 minutos

export default function VersionChecker() {
  const initialVersion = useRef(process.env.NEXT_PUBLIC_APP_VERSION || 'dev')
  const [outdated, setOutdated] = useState(false)

  useEffect(() => {
    // No comprobar en dev
    if (initialVersion.current === 'dev') return

    const check = async () => {
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json()
        if (version !== initialVersion.current) setOutdated(true)
      } catch {}
    }

    const interval = setInterval(check, POLL_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  if (!outdated) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
        <div className="text-4xl mb-4">🔄</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Nueva versión disponible</h2>
        <p className="text-gray-500 text-sm mb-6">
          Hay una actualización de Bloster. Recarga la página para tener la última versión.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition-colors"
        >
          Recargar ahora
        </button>
      </div>
    </div>
  )
}
