'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { formatWeekLabel } from '@/lib/utils'

interface ClearLog {
  id: string
  weekStart: string
  clearedAt: string
  shifts: unknown[]
  clearedBy: { name: string } | null
}

interface Props {
  onRestored: () => void
}

export default function ClearHistory({ onRestored }: Props) {
  const [open, setOpen] = useState(false)
  const [logs, setLogs] = useState<ClearLog[]>([])
  const [loading, setLoading] = useState(false)
  const [restoring, setRestoring] = useState<string | null>(null)

  async function fetchLogs() {
    setLoading(true)
    const res = await fetch('/api/schedules/history', { cache: 'no-store' })
    if (res.ok) setLogs(await res.json())
    setLoading(false)
  }

  useEffect(() => { if (open) fetchLogs() }, [open])

  async function handleRestore(logId: string) {
    setRestoring(logId)
    try {
      const res = await fetch(`/api/schedules/history/${logId}/restore`, { method: 'POST' })
      if (res.ok) {
        const { restored } = await res.json()
        toast.success(`${restored} turnos restaurados`)
        setLogs(prev => prev.filter(l => l.id !== logId))
        onRestored()
      } else {
        toast.error('Error al restaurar')
      }
    } finally {
      setRestoring(null)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50"
      >
        ↩ Historial
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">Historial de semanas borradas</h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            {loading ? (
              <p className="text-center text-gray-400 text-sm py-8">Cargando...</p>
            ) : logs.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No hay semanas borradas en el historial.</p>
            ) : (
              <ul className="overflow-y-auto space-y-2 flex-1">
                {logs.map(log => (
                  <li key={log.id} className="flex items-center justify-between gap-3 border border-gray-200 rounded-xl px-4 py-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {formatWeekLabel(new Date(log.weekStart))}
                      </p>
                      <p className="text-xs text-gray-400">
                        {log.shifts.length} turnos · borrada el{' '}
                        {new Date(log.clearedAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        {log.clearedBy ? ` por ${log.clearedBy.name}` : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRestore(log.id)}
                      disabled={restoring === log.id}
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap"
                    >
                      {restoring === log.id ? '...' : 'Restaurar'}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
