'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { data: session } = useSession()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (next !== confirm) { toast.error('Las contraseñas no coinciden'); return }
    if (next.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    setLoading(true)
    const res = await fetch(`/api/users/${session?.user?.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword: current, password: next }),
    })
    setLoading(false)
    if (res.ok) {
      toast.success('Contraseña actualizada')
      setCurrent(''); setNext(''); setConfirm('')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error')
    }
  }

  return (
    <div className="max-w-md">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Mi perfil</h1>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: session?.user?.color || '#3B82F6' }}>
            {session?.user?.name?.[0]?.toUpperCase()}
          </span>
          <div>
            <p className="font-semibold text-gray-800">{session?.user?.name}</p>
            <p className="text-sm text-gray-500">{session?.user?.email}</p>
          </div>
        </div>
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{session?.user?.role}</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Cambiar contraseña</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Contraseña actual</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Nueva contraseña</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm text-gray-600 mb-1 block">Confirmar nueva contraseña</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 mt-2">
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
