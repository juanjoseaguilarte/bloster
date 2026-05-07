'use client'
import { useState, useEffect } from 'react'

interface SummaryRow {
  user: { id: string; name: string; color: string }
  morningShifts: number
  afternoonShifts: number
  totalShifts: number
  totalHours: number
  libres: number
  imaginary: number
}

export default function SummaryTable({ weekScheduleId }: { weekScheduleId: string }) {
  const [data, setData] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/summary?weekScheduleId=${weekScheduleId}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [weekScheduleId])

  if (loading) return <div className="text-center py-4 text-gray-400 text-sm">Cargando resumen...</div>

  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
        <h3 className="font-semibold text-gray-700 text-sm">Resumen de horas y blosters</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-xs">
              <th className="text-left px-4 py-2 font-semibold">Empleado</th>
              <th className="text-center px-3 py-2 font-semibold">T. Mañana</th>
              <th className="text-center px-3 py-2 font-semibold">T. Tarde</th>
              <th className="text-center px-3 py-2 font-semibold">Total blosters</th>
              <th className="text-center px-3 py-2 font-semibold">Horas est.</th>
              <th className="text-center px-3 py-2 font-semibold">Libres</th>
              <th className="text-center px-3 py-2 font-semibold">Imaginária</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.user.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 font-medium flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: row.user.color }} />
                  {row.user.name}
                </td>
                <td className="text-center px-3 py-2">{row.morningShifts}</td>
                <td className="text-center px-3 py-2">{row.afternoonShifts}</td>
                <td className="text-center px-3 py-2 font-semibold">{row.totalShifts}</td>
                <td className="text-center px-3 py-2 font-semibold text-blue-600">{row.totalHours}h</td>
                <td className="text-center px-3 py-2 text-orange-600">{row.libres}</td>
                <td className="text-center px-3 py-2 text-gray-500">{row.imaginary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
