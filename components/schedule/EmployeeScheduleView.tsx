'use client'
import { useState, useEffect } from 'react'
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

const PERIOD_LABEL = { MORNING: 'Mañana', AFTERNOON: 'Tarde' }

function ShiftBadge({ shift }: { shift?: Shift }) {
  if (!shift || shift.type === 'OFF') {
    return <span className="text-gray-300 font-medium">—</span>
  }
  if (shift.type === 'LIBRE') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-orange-100 text-orange-600">
        Libre
      </span>
    )
  }
  if (shift.type === 'IMAGINARY') {
    return (
      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 text-gray-500">
        Imaginária
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-blue-50 text-blue-700">
      {shift.startTime}
    </span>
  )
}

export default function EmployeeScheduleView({ userId }: { userId: string }) {
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [status, setStatus] = useState<'loading' | 'unpublished' | 'ok' | 'error'>('loading')
  const weekStart = getWeekStart(new Date())

  useEffect(() => {
    fetch(`/api/schedules?week=${weekStart.toISOString()}`)
      .then(async res => {
        if (res.status === 403) { setStatus('unpublished'); return }
        if (!res.ok) { setStatus('error'); return }
        const data = await res.json()
        setSchedule(data)
        setStatus('ok')
      })
      .catch(() => setStatus('error'))
  }, [])

  function getShift(day: string, period: 'MORNING' | 'AFTERNOON') {
    return schedule?.shifts.find(s => s.userId === userId && s.day === day && s.period === period)
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-400 text-sm">Cargando tu horario...</div>
      </div>
    )
  }

  if (status === 'unpublished') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="text-5xl mb-4">🕐</div>
        <h2 className="text-lg font-bold text-gray-700 mb-2">Horario no disponible</h2>
        <p className="text-gray-400 text-sm">Tu horario de esta semana aún no ha sido publicado.<br />Vuelve a consultar más tarde.</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-6">
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-gray-400 text-sm">Error al cargar el horario. Recarga la página.</p>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-xl font-bold text-gray-800">Mi horario</h1>
        <p className="text-sm text-gray-400 mt-0.5">{formatWeekLabel(weekStart)}</p>
      </div>

      {/* Day list */}
      <div className="space-y-3">
        {DAYS.map(day => {
          const morning = getShift(day.key, 'MORNING')
          const afternoon = getShift(day.key, 'AFTERNOON')
          const noShifts = (!morning || morning.type === 'OFF') && (!afternoon || afternoon.type === 'OFF')

          return (
            <div
              key={day.key}
              className={`bg-white rounded-2xl border px-4 py-4 shadow-sm ${noShifts ? 'border-gray-100 opacity-50' : 'border-gray-200'}`}
            >
              <p className="font-bold text-gray-800 text-base mb-3">{day.label}</p>
              <div className="flex flex-col gap-2">
                {(['MORNING', 'AFTERNOON'] as const).map(period => {
                  const shift = getShift(day.key, period)
                  if (shift?.type === 'OFF' || !shift) {
                    return null
                  }
                  return (
                    <div key={period} className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400 w-16">{PERIOD_LABEL[period]}</span>
                      <ShiftBadge shift={shift} />
                    </div>
                  )
                })}
                {noShifts && (
                  <span className="text-xs text-gray-400">Sin turno</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
