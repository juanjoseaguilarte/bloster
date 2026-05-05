'use client'
import { useState, useEffect, useCallback } from 'react'
import { getWeekStart, getWeekKey, formatWeekLabel, DAYS } from '@/lib/utils'

interface Shift {
  userId: string
  day: string
  period: 'MORNING' | 'AFTERNOON'
  type: 'TIME' | 'LIBRE' | 'OFF' | 'IMAGINARY'
  startTime?: string | null
}

interface Schedule {
  id: string
  isClosed: boolean
  shifts: Shift[]
}

function ShiftValue({ shift }: { shift?: Shift }) {
  if (!shift || shift.type === 'OFF') return <span className="text-gray-300">—</span>
  if (shift.type === 'LIBRE') return <span className="text-gray-400">—:—</span>
  if (shift.type === 'IMAGINARY') return <span className="bg-blue-100 text-blue-600 font-bold text-xs px-1.5 py-0.5 rounded-md">I</span>
  return <span className="text-blue-600 font-bold">{shift.startTime}</span>
}

export default function EmployeeScheduleView({ userId }: { userId: string }) {
  const currentWeek = getWeekStart(new Date())
  const nextWeek = new Date(currentWeek)
  nextWeek.setDate(nextWeek.getDate() + 7)

  const [viewing, setViewing] = useState<Date>(currentWeek)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [status, setStatus] = useState<'loading' | 'unpublished' | 'ok' | 'error'>('loading')

  const isCurrentWeek = viewing.getTime() === currentWeek.getTime()

  const fetchSchedule = useCallback(async () => {
    setStatus('loading')
    setSchedule(null)
    try {
      const res = await fetch(`/api/schedules?weekKey=${getWeekKey(viewing)}&t=${Date.now()}`, { cache: 'no-store' })
      if (res.status === 403) { setStatus('unpublished'); return }
      if (!res.ok) { setStatus('error'); return }
      setSchedule(await res.json())
      setStatus('ok')
    } catch {
      setStatus('error')
    }
  }, [viewing])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  function getShift(day: string, period: 'MORNING' | 'AFTERNOON') {
    return schedule?.shifts.find(s => s.userId === userId && s.day === day && s.period === period)
  }

  return (
    <div className="max-w-sm mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mi Bloster</h1>
          <p className="text-sm text-gray-400">{formatWeekLabel(viewing)}</p>
        </div>
        <div>
          {isCurrentWeek ? (
            <button
              onClick={() => setViewing(nextWeek)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium"
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={() => setViewing(currentWeek)}
              className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium"
            >
              ← Actual
            </button>
          )}
        </div>
      </div>

      {status === 'loading' && (
        <div className="text-center py-16 text-gray-400 text-sm">Cargando...</div>
      )}

      {status === 'unpublished' && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🕐</div>
          <p className="text-gray-500 font-semibold">No disponible</p>
          <p className="text-gray-400 text-sm mt-1">Vuelve más tarde.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-gray-400 text-sm">Error al cargar. Recarga la página.</p>
        </div>
      )}

      {status === 'ok' && (
        <>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Column headers */}
            <div className="grid grid-cols-3 border-b border-gray-100 bg-gray-50 px-4 py-2">
              <span className="text-xs font-semibold text-gray-400"></span>
              <span className="text-xs font-semibold text-gray-500 text-center">M</span>
              <span className="text-xs font-semibold text-gray-500 text-center">T</span>
            </div>

            {/* Day rows */}
            {DAYS.map((day, i) => {
              const morning = getShift(day.key, 'MORNING')
              const afternoon = getShift(day.key, 'AFTERNOON')
              const isLast = i === DAYS.length - 1

              return (
                <div
                  key={day.key}
                  className={`grid grid-cols-3 items-center px-4 py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}
                >
                  <span className="text-sm font-semibold text-gray-700">{day.label}</span>
                  <div className="text-sm text-center">
                    <ShiftValue shift={morning} />
                  </div>
                  <div className="text-sm text-center">
                    <ShiftValue shift={afternoon} />
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-center text-xs text-gray-400 mt-3 px-4">
            🚧 Aplicación en pruebas · Los datos mostrados son de ejemplo
          </p>
        </>
      )}
    </div>
  )
}
