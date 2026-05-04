'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import ShiftCell from './ShiftCell'
import SummaryTable from './SummaryTable'
import { DAYS, getWeekStart, formatWeekLabel } from '@/lib/utils'
import toast from 'react-hot-toast'

type ShiftType = 'TIME' | 'LIBRE' | 'OFF' | 'IMAGINARY'
type Period = 'MORNING' | 'AFTERNOON'
type Group = 'BARRA' | 'COCINA'

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
  group: Group
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
  const [activeGroup, setActiveGroup] = useState<Group>('BARRA')

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
    const d = new Date(currentWeek); d.setDate(d.getDate() - 7); setCurrentWeek(d)
  }
  function nextWeek() {
    const d = new Date(currentWeek); d.setDate(d.getDate() + 7); setCurrentWeek(d)
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
      toast.success('Guardado')
    } else {
      toast.error('Error al guardar')
    }
  }

  async function handleToggleClose() {
    if (!schedule) return
    setClosing(true)
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reopen: schedule.isClosed }),
      })
      if (res.ok) {
        toast.success(schedule.isClosed ? 'Semana reabierta' : 'Semana publicada')
        fetchSchedule()
      }
    } finally {
      setClosing(false)
    }
  }

  function getShift(userId: string, day: string, period: Period) {
    return schedule?.shifts.find(s => s.userId === userId && s.day === day && s.period === period)
  }

  const isManagerOrAdmin = ['ADMIN', 'GESTOR'].includes(session?.user?.role || '')
  const editable = isManagerOrAdmin && !readOnly
  const isCurrentWeek = currentWeek.getTime() === getWeekStart(new Date()).getTime()
  const groupUsers = users.filter(u => (u.group ?? 'BARRA') === activeGroup)

  const renderSection = (period: Period, label: string) => (
    <>
      <tr>
        <td colSpan={8} className="bg-rose-50 text-rose-600 font-semibold text-xs px-3 py-1.5 border-b border-rose-100">
          {label}
        </td>
      </tr>
      {groupUsers.map(user => (
        <tr key={`${period}-${user.id}`}>
          <td
            className="text-sm font-medium px-2 py-2 border border-gray-200 whitespace-nowrap sticky left-0 z-10"
            style={{ borderLeft: `4px solid ${user.color}`, backgroundColor: user.color + '22' }}
          >
            {user.name}
          </td>
          {DAYS.map(day => (
            <ShiftCell
              key={day.key}
              shift={getShift(user.id, day.key, period)}
              userColor={user.color}
              editable={editable}
              period={period}
              onSave={(type, startTime) => handleSaveShift(user.id, day.key, period, type, startTime)}
            />
          ))}
        </tr>
      ))}
    </>
  )

  return (
    <div className="space-y-3">
      {/* Week navigation */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">‹</button>
          <span className="font-semibold text-gray-800 text-sm sm:text-base">{formatWeekLabel(currentWeek)}</span>
          <button onClick={nextWeek} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">›</button>
          {isCurrentWeek && <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Actual</span>}
        </div>
        {editable && schedule && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSummary(!showSummary)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 hidden sm:block"
            >
              {showSummary ? 'Ocultar resumen' : 'Resumen'}
            </button>
            <button
              onClick={handleToggleClose}
              disabled={closing}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                schedule.isClosed ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {closing ? '...' : schedule.isClosed ? 'Reabrir' : 'Publicar semana'}
            </button>
          </div>
        )}
      </div>

      {schedule?.isClosed && (
        <div className="text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg">
          ✓ Semana publicada
        </div>
      )}

      {/* Group tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['BARRA', 'COCINA'] as Group[]).map(g => (
          <button
            key={g}
            onClick={() => setActiveGroup(g)}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeGroup === g ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {g.charAt(0) + g.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm -mx-3 sm:mx-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-2 py-2 border border-gray-200 min-w-[90px] sticky left-0 bg-gray-50 z-10">
                  Empleado
                </th>
                {DAYS.map(d => (
                  <th key={d.key} className="text-xs font-semibold text-gray-500 px-1 py-2 border border-gray-200 min-w-[68px]">
                    {d.label.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {renderSection('MORNING', 'Mañanas')}
              <tr><td colSpan={8} className="h-2 bg-gray-50" /></tr>
              {renderSection('AFTERNOON', 'Tarde')}
            </tbody>
          </table>
        </div>
      )}

      {showSummary && schedule && <SummaryTable weekScheduleId={schedule.id} />}
    </div>
  )
}
