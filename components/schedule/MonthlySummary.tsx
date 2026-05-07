'use client'
import { useState, useEffect } from 'react'

interface UserInfo { id: string; name: string; color: string; group: string }
interface WeekRow {
  user: UserInfo
  morningShifts: number
  afternoonShifts: number
  totalShifts: number
  totalHours: number
  libres: number
  imaginary: number
}
interface Week {
  weekStart: string
  label: string
  isClosed: boolean
  rows: WeekRow[]
}
interface TotalRow {
  user: UserInfo
  totalShifts: number
  totalHours: number
  libres: number
  imaginary: number
}
interface MonthlyData {
  weeks: Week[]
  totals: TotalRow[]
  users: UserInfo[]
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function MonthlySummary() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<MonthlyData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeGroup, setActiveGroup] = useState<'BARRA' | 'COCINA'>('BARRA')

  useEffect(() => {
    setLoading(true)
    setData(null)
    fetch(`/api/summary/monthly?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [year, month])

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const filteredUsers = data?.users.filter(u => (u.group ?? 'BARRA') === activeGroup) ?? []
  const filteredWeeks = data?.weeks.map(w => ({
    ...w,
    rows: w.rows.filter(r => (r.user.group ?? 'BARRA') === activeGroup),
  })) ?? []
  const filteredTotals = data?.totals.filter(t => (t.user.group ?? 'BARRA') === activeGroup) ?? []

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">‹</button>
          <span className="font-semibold text-gray-800">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">›</button>
        </div>
        {/* Group filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
          {(['BARRA', 'COCINA'] as const).map(g => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeGroup === g ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {g.charAt(0) + g.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>}

      {!loading && data && filteredWeeks.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No hay semanas para este mes.</div>
      )}

      {!loading && data && filteredWeeks.length > 0 && (
        <>
          {/* Week-by-week tables */}
          {filteredWeeks.map(week => (
            <div key={week.weekStart} className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex items-center gap-2">
                <span className="font-semibold text-gray-700 text-sm">{week.label}</span>
                {week.isClosed && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Publicada</span>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs">
                      <th className="text-left px-4 py-2 font-semibold">Empleado</th>
                      <th className="text-center px-3 py-2 font-semibold">T. Mañana</th>
                      <th className="text-center px-3 py-2 font-semibold">T. Tarde</th>
                      <th className="text-center px-3 py-2 font-semibold">Total</th>
                      <th className="text-center px-3 py-2 font-semibold">Horas</th>
                      <th className="text-center px-3 py-2 font-semibold">Libres</th>
                    </tr>
                  </thead>
                  <tbody>
                    {week.rows.filter(r => filteredUsers.some(u => u.id === r.user.id)).map(row => (
                      <tr key={row.user.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium">
                          <span className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.user.color }} />
                            {row.user.name}
                          </span>
                        </td>
                        <td className="text-center px-3 py-2">{row.morningShifts || '—'}</td>
                        <td className="text-center px-3 py-2">{row.afternoonShifts || '—'}</td>
                        <td className="text-center px-3 py-2 font-semibold">{row.totalShifts || '—'}</td>
                        <td className="text-center px-3 py-2 font-semibold text-blue-600">{row.totalHours > 0 ? `${row.totalHours}h` : '—'}</td>
                        <td className="text-center px-3 py-2 text-orange-600">{row.libres || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {/* Monthly totals */}
          <div className="rounded-xl border-2 border-blue-200 shadow-sm overflow-hidden">
            <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
              <span className="font-bold text-blue-800 text-sm">Total {MONTH_NAMES[month - 1]}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-blue-50 text-blue-700 text-xs">
                    <th className="text-left px-4 py-2 font-semibold">Empleado</th>
                    <th className="text-center px-3 py-2 font-semibold">Total blosters</th>
                    <th className="text-center px-3 py-2 font-semibold">Horas est.</th>
                    <th className="text-center px-3 py-2 font-semibold">Libres</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTotals.map(row => (
                    <tr key={row.user.id} className="border-t border-blue-100 hover:bg-blue-50">
                      <td className="px-4 py-2 font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: row.user.color }} />
                          {row.user.name}
                        </span>
                      </td>
                      <td className="text-center px-3 py-2 font-bold">{row.totalShifts}</td>
                      <td className="text-center px-3 py-2 font-bold text-blue-700">{row.totalHours}h</td>
                      <td className="text-center px-3 py-2 text-orange-600">{row.libres}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
