'use client'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import ShiftCell from './ShiftCell'
import SummaryTable from './SummaryTable'
import MonthlySummary from './MonthlySummary'
import ClearHistory from './ClearHistory'
import { DAYS, getWeekStart, getWeekKey, formatWeekLabel } from '@/lib/utils'
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
  active?: boolean
}

interface Props {
  users: User[]
  readOnly?: boolean
  simulatedRole?: 'GESTOR' | 'ADMIN'
}

export default function WeekGrid({ users, readOnly = false, simulatedRole }: Props) {
  const { data: session } = useSession()
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()))
  const [schedule, setSchedule] = useState<WeekSchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [closing, setClosing] = useState(false)
  const [copying, setCopying] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [showMonthlySummary, setShowMonthlySummary] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [activeGroup, setActiveGroup] = useState<Group>('BARRA')
  const [showDebug, setShowDebug] = useState(false)
  const [debugLog, setDebugLog] = useState<string[]>([])

  function addLog(msg: string) {
    const ts = new Date().toLocaleTimeString('es-ES')
    setDebugLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 50))
  }

  const fetchSchedule = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    const url = `/api/schedules?weekKey=${getWeekKey(currentWeek)}&t=${Date.now()}`
    addLog(`FETCH ${silent ? '(silent)' : ''} → ${url}`)
    try {
      const res = await fetch(url, { cache: 'no-store' })
      addLog(`STATUS ${res.status} ${res.ok ? 'OK' : 'ERROR'}`)
      if (res.ok) {
        const data = await res.json()
        addLog(`scheduleId=${data.id} | isClosed=${data.isClosed} | shifts=${data.shifts?.length ?? 0}`)
        addLog(`shifts: ${JSON.stringify(data.shifts?.map((s: Shift) => `${s.userId.slice(0,6)}-${s.day}-${s.period}-${s.type}`)) ?? '[]'}`)
        setSchedule(data)
      } else {
        addLog(`ERROR: no se actualizó el schedule`)
        if (!silent) setSchedule(null)
      }
    } catch (e: any) {
      addLog(`EXCEPCION: ${e?.message}`)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentWeek])

  useEffect(() => { fetchSchedule() }, [fetchSchedule])

  // Auto-refresco silencioso cada 30 segundos
  useEffect(() => {
    const interval = setInterval(() => fetchSchedule(true), 30_000)
    return () => clearInterval(interval)
  }, [fetchSchedule])

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

  async function handleCopyPrevWeek() {
    if (!schedule) return
    setCopying(true)
    try {
      const res = await fetch('/api/schedules/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toWeekKey: getWeekKey(currentWeek) }),
      })
      if (res.ok) {
        const { copied } = await res.json()
        toast.success(`${copied} blosters copiados de la semana anterior`)
        fetchSchedule()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al copiar')
      }
    } finally {
      setCopying(false)
    }
  }

  async function handleClearWeek() {
    if (!schedule) return
    setClearing(true)
    setConfirmClear(false)
    try {
      const res = await fetch(`/api/schedules/${schedule.id}/clear`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Semana borrada')
        fetchSchedule()
      } else {
        toast.error('Error al borrar')
      }
    } finally {
      setClearing(false)
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

  const effectiveRole = simulatedRole ?? session?.user?.role ?? ''
  const isAdmin = effectiveRole === 'ADMIN'
  const isManagerOrAdmin = ['ADMIN', 'GESTOR'].includes(effectiveRole)
  const isPastWeek = currentWeek.getTime() < getWeekStart(new Date()).getTime()
  const editable = isManagerOrAdmin && !readOnly && (isAdmin || !isPastWeek)
  const isCurrentWeek = currentWeek.getTime() === getWeekStart(new Date()).getTime()
  const activeShiftUserIds = new Set(
    schedule?.shifts.filter(s => s.type !== 'OFF').map(s => s.userId) ?? []
  )
  const groupUsers = users.filter(u =>
    (u.group ?? 'BARRA') === activeGroup &&
    (u.active !== false || activeShiftUserIds.has(u.id))
  )

  function solidLight(hex: string): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.round(r + (255 - r) * 0.82)}, ${Math.round(g + (255 - g) * 0.82)}, ${Math.round(b + (255 - b) * 0.82)})`
  }

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
            className="text-sm font-medium px-2 py-2 border border-gray-200 whitespace-nowrap sticky left-0 z-20"
            style={{ borderLeft: `4px solid ${user.color}`, backgroundColor: solidLight(user.color) }}
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
        {editable && (
          <button
            onClick={() => setShowDebug(v => !v)}
            className="px-3 py-1.5 rounded-lg border border-yellow-300 bg-yellow-50 text-xs text-yellow-700 font-mono"
          >
            🐛 Debug
          </button>
        )}
        {editable && schedule && (
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={handleCopyPrevWeek}
              disabled={copying}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {copying ? '...' : '⎘ Copiar anterior'}
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              disabled={clearing}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {clearing ? '...' : '✕ Borrar semana'}
            </button>
            <ClearHistory onRestored={fetchSchedule} />
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

      {/* Group tabs + summary buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['BARRA', 'COCINA'] as Group[]).map(g => (
            <button
              key={g}
              onClick={() => { setActiveGroup(g); setShowSummary(false); setShowMonthlySummary(false) }}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeGroup === g && !showSummary && !showMonthlySummary ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        {isManagerOrAdmin && schedule && (
          <button
            onClick={() => { setShowSummary(v => !v); setShowMonthlySummary(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              showSummary ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 bg-gray-100'
            }`}
          >
            Resumen
          </button>
        )}
        {isManagerOrAdmin && (
          <button
            onClick={() => { setShowMonthlySummary(v => !v); setShowSummary(false) }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              showMonthlySummary ? 'bg-white shadow text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700 bg-gray-100'
            }`}
          >
            Resumen mensual
          </button>
        )}
      </div>

      {showMonthlySummary && <MonthlySummary />}

      {!showMonthlySummary && (loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm -mx-3 sm:mx-0">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left text-xs font-semibold text-gray-500 px-2 py-2 border border-gray-200 min-w-[90px] sticky left-0 bg-gray-50 z-30">
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
      ))}

      {showSummary && schedule && <SummaryTable weekScheduleId={schedule.id} />}

      {confirmClear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center">
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">¿Borrar semana completa?</h3>
            <p className="text-gray-500 text-sm mb-5">Se eliminarán todos los blosters de esta semana y quedará despublicada. No se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmClear(false)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleClearWeek}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
              >
                Sí, borrar todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Panel de debug */}
      {showDebug && (
        <div className="rounded-xl border border-yellow-300 bg-yellow-50 p-3 text-xs font-mono space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-yellow-800">🐛 Debug log</span>
            <button
              onClick={() => {
                const text = [
                  `=== ESTADO ===`,
                  `Usuario: ${session?.user?.name} (${session?.user?.role})`,
                  `Semana (local): ${currentWeek.toLocaleDateString('es-ES')}`,
                  `Semana (ISO): ${currentWeek.toISOString()}`,
                  `Schedule ID: ${schedule?.id ?? 'null'}`,
                  `isClosed: ${schedule?.isClosed}`,
                  `Shifts totales en schedule: ${schedule?.shifts?.length ?? 0}`,
                  `Users prop (${users.length}): ${users.map(u => `${u.name}(${u.id.slice(0,6)})`).join(', ')}`,
                  `Group activo: ${activeGroup}`,
                  `GroupUsers (${groupUsers.length}): ${groupUsers.map(u => u.name).join(', ')}`,
                  ``,
                  `=== LOG ===`,
                  ...debugLog,
                ].join('\n')
                navigator.clipboard.writeText(text).then(() => toast.success('Log copiado'))
              }}
              className="px-2 py-1 bg-yellow-700 text-white rounded text-xs"
            >
              📋 Copiar todo
            </button>
          </div>
          <div className="bg-white rounded p-2 border border-yellow-200 space-y-0.5">
            <p><span className="text-gray-500">Usuario:</span> {session?.user?.name} ({session?.user?.role})</p>
            <p><span className="text-gray-500">Semana ISO:</span> {currentWeek.toISOString()}</p>
            <p><span className="text-gray-500">Schedule ID:</span> {schedule?.id ?? 'null'}</p>
            <p><span className="text-gray-500">isClosed:</span> {String(schedule?.isClosed)}</p>
            <p><span className="text-gray-500">Shifts en memoria:</span> {schedule?.shifts?.length ?? 0}</p>
            <p><span className="text-gray-500">Users prop:</span> {users.length} ({users.map(u => u.name).join(', ')})</p>
          </div>
          <div className="bg-white rounded p-2 border border-yellow-200 max-h-48 overflow-y-auto space-y-0.5">
            {debugLog.length === 0
              ? <p className="text-gray-400">Sin entradas aún...</p>
              : debugLog.map((l, i) => <p key={i} className="text-gray-700 break-all">{l}</p>)
            }
          </div>
        </div>
      )}
    </div>
  )
}
