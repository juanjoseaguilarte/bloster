'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output.buffer as ArrayBuffer
}

export default function PushManager() {
  const { data: session } = useSession()
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!session?.user?.id) return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported')
      return
    }

    setPermission(Notification.permission)

    navigator.serviceWorker.register('/push-sw.js', { scope: '/' })
      .then(reg => reg.pushManager.getSubscription())
      .then(sub => { if (sub) setSubscribed(true) })
      .catch(() => {})
  }, [session?.user?.id])

  async function subscribe() {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      toast.error('VAPID key no configurada')
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (res.ok) {
        setSubscribed(true)
        toast.success('Notificaciones activadas')
      } else {
        toast.error('Error al guardar suscripción')
      }
    } catch (e: any) {
      toast.error(`Error: ${e?.message ?? 'desconocido'}`)
      setPermission(Notification.permission as NotificationPermission)
    }
  }

  async function requestAndSubscribe() {
    const result = await Notification.requestPermission()
    setPermission(result)
    if (result === 'granted') await subscribe()
    else if (result === 'denied') toast('Notificaciones bloqueadas en el navegador')
  }

  // Auto-suscribir si ya tiene permiso pero no está suscrito
  useEffect(() => {
    if (permission === 'granted' && !subscribed && session?.user?.id) {
      subscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission, subscribed, session?.user?.id])

  if (!session?.user?.id || subscribed || dismissed || permission === 'unsupported' || permission === 'denied' || permission === 'granted') return null

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
          onClick={() => setDismissed(true)}
          className="px-4 text-gray-400 text-sm py-2 rounded-xl hover:bg-gray-100"
        >
          Ahora no
        </button>
      </div>
    </div>
  )
}
