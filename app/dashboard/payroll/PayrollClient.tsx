'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import PayrollModal from '@/components/salary/PayrollModal'
import SalaryConfigModal from '@/components/salary/SalaryConfigModal'

interface SalaryConfig {
  type: 'FIXED' | 'PER_SHIFT' | 'MIXED'
  fixedAmount?: number | null
  morningRate?: number | null
  afternoonRate?: number | null
  imaginaryRate?: number | null
}

interface Payroll {
  id?: string
  userId: string
  year: number
  month: number
  baseAmount: number
  advances: number
  garnishments: number
  netAmount: number
  transferAmount: number
  cashAmount: number
  notes?: string | null
  status?: 'DRAFT' | 'PAID'
  paidAt?: string | null
}

interface UserRow {
  id: string
  name: string
  color: string
  group: string
  active: boolean
  salaryConfig: SalaryConfig | null
  payrolls: Payroll[]
  suggested?: number | null
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TYPE_LABELS: Record<string, string> = { FIXED: 'Fijo', PER_SHIFT: 'Por bloster', MIXED: 'Mixto' }

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PayrollClient({ isAdmin }: { isAdmin: boolean }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [editPayroll, setEditPayroll] = useState<{ user: UserRow; payroll: Payroll } | null>(null)
  const [configUser, setConfigUser] = useState<UserRow | null>(null)
  const [paying, setPayingId] = useState<string | null>(null)

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/salary/payroll?year=${year}&month=${month}`)
      const users: UserRow[] = await res.json()

      // Para los sin nómina y con config, obtener sugerencia
      const withSuggestions = await Promise.all(
        users.map(async u => {
          if (u.payrolls.length > 0 || !u.salaryConfig) return u
          const sug = await fetch(`/api/salary/suggest?year=${year}&month=${month}&userId=${u.id}`)
          const data = await sug.json()
          return { ...u, suggested: data.amount ?? null }
        })
      )
      setRows(withSuggestions)
    } finally {
      setLoading(false)
    }
  }, [year, month])

  useEffect(() => { fetchData() }, [fetchData])

  async function handlePay(payroll: Payroll) {
    if (!payroll.id) return
    setPayingId(payroll.id)
    try {
      const res = await fetch(`/api/salary/payroll/${payroll.id}/pay`, { method: 'POST' })
      if (res.ok) { toast.success('Marcado como pagado'); fetchData() }
      else toast.error('Error')
    } finally {
      setPayingId(null)
    }
  }

  function openEdit(user: UserRow) {
    const existing = user.payrolls[0]
    const suggested = user.suggested ?? 0
    const payroll: Payroll = existing ?? {
      userId: user.id, year, month,
      baseAmount: suggested, advances: 0, garnishments: 0,
      netAmount: suggested, transferAmount: 0, cashAmount: 0,
    }
    setEditPayroll({ user, payroll })
  }

  // Totales
  const paid = rows.filter(u => u.payrolls[0])
  const totalBase = paid.reduce((a, u) => a + u.payrolls[0].baseAmount, 0)
  const totalAdv = paid.reduce((a, u) => a + u.payrolls[0].advances, 0)
  const totalGarn = paid.reduce((a, u) => a + u.payrolls[0].garnishments, 0)
  const totalNet = paid.reduce((a, u) => a + u.payrolls[0].netAmount, 0)
  const totalTransfer = paid.reduce((a, u) => a + u.payrolls[0].transferAmount, 0)
  const totalCash = paid.reduce((a, u) => a + u.payrolls[0].cashAmount, 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">‹</button>
          <span className="font-bold text-gray-800 text-lg">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">›</button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>}

      {!loading && (
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-50 z-10">Empleado</th>
                  <th className="text-center px-3 py-3 font-semibold">Tipo</th>
                  <th className="text-right px-3 py-3 font-semibold">Pactado</th>
                  <th className="text-right px-3 py-3 font-semibold">Adelantos</th>
                  <th className="text-right px-3 py-3 font-semibold">Embargos</th>
                  <th className="text-right px-3 py-3 font-semibold">Neto</th>
                  <th className="text-right px-3 py-3 font-semibold">Transf.</th>
                  <th className="text-right px-3 py-3 font-semibold">Efectivo</th>
                  <th className="text-center px-3 py-3 font-semibold">Estado</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {rows.map(user => {
                  const p = user.payrolls[0]
                  const isSuggested = !p && user.suggested != null
                  const isPaid = p?.status === 'PAID'

                  return (
                    <tr key={user.id} className={`border-t border-gray-100 ${isPaid ? 'bg-green-50/40' : ''}`}>
                      {/* Nombre */}
                      <td className="px-4 py-3 sticky left-0 bg-white z-10" style={{ borderLeft: `3px solid ${user.color}` }}>
                        <span className="font-medium text-gray-800">{user.name}</span>
                        {!user.active && <span className="ml-1.5 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactivo</span>}
                      </td>
                      {/* Tipo */}
                      <td className="text-center px-3 py-3">
                        <button
                          onClick={() => setConfigUser(user)}
                          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >
                          {user.salaryConfig ? TYPE_LABELS[user.salaryConfig.type] : '—'}
                        </button>
                      </td>
                      {/* Importes */}
                      <td className={`text-right px-3 py-3 font-medium ${isSuggested ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                        {p ? fmt(p.baseAmount) : isSuggested ? fmt(user.suggested!) : '—'} €
                      </td>
                      <td className="text-right px-3 py-3 text-orange-600">
                        {p?.advances ? fmt(p.advances) : '—'} {p?.advances ? '€' : ''}
                      </td>
                      <td className="text-right px-3 py-3 text-red-500">
                        {p?.garnishments ? fmt(p.garnishments) : '—'} {p?.garnishments ? '€' : ''}
                      </td>
                      <td className="text-right px-3 py-3 font-semibold text-gray-800">
                        {p ? fmt(p.netAmount) + ' €' : '—'}
                      </td>
                      <td className="text-right px-3 py-3 text-blue-700">
                        {p?.transferAmount ? fmt(p.transferAmount) + ' €' : '—'}
                      </td>
                      <td className="text-right px-3 py-3 text-gray-600">
                        {p?.cashAmount ? fmt(p.cashAmount) + ' €' : '—'}
                      </td>
                      {/* Estado */}
                      <td className="text-center px-3 py-3">
                        {isPaid ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Pagado</span>
                        ) : p ? (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Borrador</span>
                        ) : (
                          <span className="text-xs text-gray-300">Sin nómina</span>
                        )}
                      </td>
                      {/* Acciones */}
                      <td className="px-3 py-3 text-right whitespace-nowrap">
                        {!isPaid && (
                          <button
                            onClick={() => openEdit(user)}
                            className="text-xs text-blue-600 hover:text-blue-800 mr-2"
                          >
                            {p ? 'Editar' : 'Crear'}
                          </button>
                        )}
                        {p && !isPaid && (
                          <button
                            onClick={() => handlePay(p)}
                            disabled={paying === p.id}
                            className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
                          >
                            ✓ Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}

                {/* Fila de totales */}
                {paid.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                    <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-50">TOTALES</td>
                    <td />
                    <td className="text-right px-3 py-3 text-gray-800">{fmt(totalBase)} €</td>
                    <td className="text-right px-3 py-3 text-orange-600">{fmt(totalAdv)} €</td>
                    <td className="text-right px-3 py-3 text-red-500">{fmt(totalGarn)} €</td>
                    <td className="text-right px-3 py-3 text-gray-800">{fmt(totalNet)} €</td>
                    <td className="text-right px-3 py-3 text-blue-700">{fmt(totalTransfer)} €</td>
                    <td className="text-right px-3 py-3 text-gray-600">{fmt(totalCash)} €</td>
                    <td /><td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modales */}
      {editPayroll && (
        <PayrollModal
          payroll={editPayroll.payroll}
          userName={editPayroll.user.name}
          onClose={() => setEditPayroll(null)}
          onSaved={() => { setEditPayroll(null); fetchData() }}
        />
      )}
      {configUser && (
        <SalaryConfigModal
          userId={configUser.id}
          userName={configUser.name}
          current={configUser.salaryConfig}
          onClose={() => setConfigUser(null)}
          onSaved={() => { setConfigUser(null); fetchData() }}
        />
      )}
    </div>
  )
}
