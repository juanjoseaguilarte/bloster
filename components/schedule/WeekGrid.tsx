'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import ShiftCell from './ShiftCell'
import SummaryTable from './SummaryTable'
import { DAYS, getWeekStart, formatWeekLabel } from '@/lib/utils'
import toast from 'react-hot-toast'

type ShiftType = 'TIME' | 'LIBRE' | 'OFF' | 'IMAGINARY'
type Period = 'MORNING' | 'AFTERNOON'

interface Shift {
  id: string
  userId: string
  day: string
  period: Period
  type: ShiftType
  startTime?: string | null
  user: { id: string; name: string; color: string }
}

interface WeekSchedule {
  id: string
  weekStart: string
  isClosed: boolean
  shifts: Shift[]
}

interface User {
  id: string
  name: string
  color: string
}

interface Props {
  users: User[]
  readOnly?: boolean
}

export default function WeekGrid({ users, readOnly = false }: Props) {
  const { data: session } = useSession()
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()))
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)

  const fetchSchedule = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/schedules?week=${currentWeek.toISOString()}`)
      if (res.ok) setSchedule(await res.json())
      else setSchedule(null)
    } finally {
      setLoading(false)
    }
  }, [currentWeek])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  function prevWeek() {
    const d = new Date(currentWeek)
    d.setDate(d.getDate() - 7)
    setCurrentWeek(d)
  }

  function nextWeek() {
    const d = new Date(currentWeek)
    d.setDate(d.getDate() + 7)
    setCurrentWeek(d)
  }

  async function handleSaveShift(userId: string, day: string, period: Period, type: ShiftType, startTime?: string) {
    if (!schedule) return
    const res = await fetch('/api/shifts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, weekScheduleId: schedule.id, day, period, type, startTime }),
    })
    if (res.ok) {
      const updated = await res.json()
      setSchedule(prev => {
        if (!prev) return prev
        const shifts = prev.shifts.filter(s => !(s.userId === userId && s.day === day && s.period === period))
        return { ...prev, shifts: [...shifts, updated] }
      })
      toast.success('Turno guardado')
    } else {
      toast.error('Error al guardar')
    }
  }

  async function handleToggleClose() {
    if (!schedule) return
    setClosing(true)
    try {
      const reopen = schedule.isClosed
      const res = await fetch(`/api/schedules/${schedule.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reopen }),
      })
      if (res.ok) {
        toast.success(reopen ? 'Semana reabierta' : 'Semana cerrada y publicada')
        fetchSchedule()
      }
    } finally {
      setClosing(false)
    }
  }

  function getShift(userId: string, day: string, period: Period): Shift | undefined {
    return schedule?.shifts.find(s => s.userId === userId && s.day === day && s.period === period)
  }

  const isManagerOrAdmin = ['ADMIN', 'GESTOR'].includes(session?.user?.role || '')
  const editable = isManagerOrAdmin && !readOnly
  const now = getWeekStart(new Date())
  const isCurrentWeek = currentWeek.getTime() === now.getTime()

  const renderSection = (period: Period, label: string) => (
    <>
      <tr>
        <td colSpan={8} className="bg-rose-50 text-rose-700 font-semibold text-sm px-3 py-2 border-b border-rose-100">{label}</td>
      </tr>
      {users.map(user => (
        <tr key={`${period}-${user.id}`}>
          <td className="text-sm font-medium px-3 py-2 border border-gray-200 whitespace-nowrap" style={{ backgroundColor: user.color + '22', borderLeft: `4px solid ${user.color}` }}>
            {user.name}
          </td>
          {DAYS.map(day => (
            <ShiftCell
              key={day.key}
              shift={getShift(user.id, day.key, period)}
              userColor={user.color}
              editable={editable}
              onSave={(type, startTime) => handleSaveShift(user.id, day.key, period, type, startTime)}
            />
          ))}
        </tr>
      ))}
    </>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">←</button>
          <span className="font-semibold text-gray-800">{formatWeekLabel(currentWeek)}</span>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600">→</button>
          {isCurrentWeek && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Semana actual</span>}
        </div>
        {editable && schedule && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
            >
              {showSummary ? 'Ocultar resumen' : 'Ver resumen'}
            </button>
            <button
              onClick={handleToggleClose}
              disabled={closing}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                schedule.isClosed
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {closing ? '...' : schedule.isClosed ? 'Reabrir semana' : 'Cerrar y publicar semana'}
            </button>
          </div>
        )}
      </div>

      {schedule?.isClosed && (
        <div className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg">Semana publicada — visible para empleados</div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-3 py-2 border border-gray-200 min-w-[120px]">Empleado</th>
                {DAYS.map(d => (
                  <th key={d.key} className="text-xs font-semibold text-gray-500 px-3 py-2 border border-gray-200 min-w-[80px]">{d.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderSection('MORNING', 'Mañanas')}
              <tr><td colSpan={8} className="py-1 bg-gray-50"></td></tr>
              {renderSection('AFTERNOON', 'Tarde')}
            </tbody>
          </table>
        </div>
      )}

      {showSummary && schedule && (
        <SummaryTable weekScheduleId={schedule.id} />
      )}
    </div>
  )
}
