'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function PushManager() {
  const { data: session } = useSession()
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribed, setSubscribed] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

    // Registrar service worker
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => {
        setSubscribed(!!sub)
      })
    })
  }, [session?.user?.id])

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      setSubscribed(true)
      setPermission('granted')
    } catch {
      setPermission(Notification.permission as NotificationPermission)
    }
  }

  async function requestAndSubscribe() {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') await subscribe()
  }

  // Si ya está suscrito o no hay sesión, no mostrar nada
  if (!session?.user?.id || subscribed || permission === 'unsupported' || permission === 'denied') return null

  // Si ya tiene permiso pero no está suscrito
  if (permission === 'granted') {
    subscribe()
    return null
  }

  // Pedir permiso
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 z-50">
      <div className="flex items-start gap-3">
        <span className="text-2xl">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">Activa las notificaciones</p>
          <p className="text-gray-500 text-xs mt-0.5">Te avisaremos cuando se publiquen tus blosters.</p>
        </div>
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={requestAndSubscribe}
          className="flex-1 bg-blue-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-blue-700"
        >
          Activar
        </button>
        <button
          onClick={() => setPermission('denied')}
          className="px-4 text-gray-400 text-sm py-2 rounded-xl hover:bg-gray-100"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
