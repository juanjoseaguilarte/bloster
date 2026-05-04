'use client'
import { useState, useEffect, useCallback } from 'react'
import { getWeekStart, formatWeekLabel, DAYS } from '@/lib/utils'

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

function ShiftBadge({ shift }: { shift?: Shift }) {
  if (!shift || shift.type === 'OFF') return null
  if (shift.type === 'LIBRE') return (
    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-600">Libre</span>
  )
  if (shift.type === 'IMAGINARY') return (
    <span className="px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">Imaginária</span>
  )
  return (
    <span className="px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700">{shift.startTime}</span>
  )
}

export default function EmployeeScheduleView({ userId }: { userId: string }) {
  const currentWeek = getWeekStart(new Date())
  const nextWeek = new Date(currentWeek); nextWeek.setDate(nextWeek.getDate() + 7)

  const [viewing, setViewing] = useState<Date>(currentWeek)
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [status, setStatus] = useState<'loading' | 'unpublished' | 'ok' | 'error'>('loading')

  const isCurrentWeek = viewing.getTime() === currentWeek.getTime()

  const fetchSchedule = useCallback(async () => {
    setStatus('loading')
    setSchedule(null)
    try {
      const res = await fetch(`/api/schedules?week=${viewing.toISOString()}`)
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
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Mi Bloster</h1>
          <p className="text-sm text-gray-400 mt-0.5">{formatWeekLabel(viewing)}</p>
        </div>
        <div className="flex items-center gap-1">
          {!isCurrentWeek && (
            <button
              onClick={() => setViewing(currentWeek)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
            >
              ← Actual
            </button>
          )}
          {isCurrentWeek && (
            <button
              onClick={() => setViewing(nextWeek)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 text-sm"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>

      {/* States */}
      {status === 'loading' && (
        <div className="flex justify-center py-20">
          <div className="text-gray-400 text-sm">Cargando...</div>
        </div>
      )}

      {status === 'unpublished' && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="text-5xl mb-4">🕐</div>
          <h2 className="text-lg font-bold text-gray-700 mb-1">No disponible</h2>
          <p className="text-gray-400 text-sm">Vuelve más tarde.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-gray-400 text-sm">Error al cargar. Recarga la página.</p>
        </div>
      )}

      {/* Day list */}
      {status === 'ok' && (
        <div className="space-y-3">
          {DAYS.map(day => {
            const morning = getShift(day.key, 'MORNING')
            const afternoon = getShift(day.key, 'AFTERNOON')
            const hasMorning = morning && morning.type !== 'OFF'
            const hasAfternoon = afternoon && afternoon.type !== 'OFF'
            const noShifts = !hasMorning && !hasAfternoon

            return (
              <div
                key={day.key}
                className={`bg-white rounded-2xl border px-4 py-4 shadow-sm transition-opacity ${noShifts ? 'opacity-40 border-gray-100' : 'border-gray-200'}`}
              >
                <p className="font-bold text-gray-800 text-base mb-3">{day.label}</p>
                {noShifts ? (
                  <p className="text-xs text-gray-400">Sin turno</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {hasMorning && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">M</span>
                        <ShiftBadge shift={morning} />
                      </div>
                    )}
                    {hasAfternoon && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">T</span>
                        <ShiftBadge shift={afternoon} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
