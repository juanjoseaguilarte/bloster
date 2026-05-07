'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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

interface ShiftBreakdown {
  morningCount: number
  afternoonCount: number
  imaginaryCount: number
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
  breakdown?: ShiftBreakdown | null
}

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TYPE_LABELS: Record<string, string> = { FIXED: 'Fijo', PER_SHIFT: 'Por bloster', MIXED: 'Mixto' }

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EditableCell({
  value,
  isActive,
  editable,
  colorClass,
  onActivate,
  onChange,
  onBlur,
}: {
  value: number
  isActive: boolean
  editable: boolean
  colorClass?: string
  onActivate: () => void
  onChange: (n: number) => void
  onBlur: () => void
}) {
  if (isActive) {
    return (
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        onBlur={onBlur}
        autoFocus
        step="0.01"
        className="w-[78px] text-right border border-blue-400 rounded px-1.5 py-0.5 text-sm focus:outline-none bg-white"
      />
    )
  }
  return (
    <span
      onClick={editable ? onActivate : undefined}
      className={`inline-block whitespace-nowrap rounded px-1 transition-colors ${editable ? 'cursor-pointer hover:bg-blue-50' : ''} ${colorClass ?? 'text-gray-800 font-medium'}`}
    >
      {fmt(value)} €
    </span>
  )
}

interface RowVals {
  base: number
  advances: number
  garnishments: number
  transfer: number
}

function PayrollRow({
  user,
  onRefresh,
  onOpenModal,
  onConfig,
  onPay,
  paying,
}: {
  user: UserRow
  onRefresh: () => void
  onOpenModal: (user: UserRow) => void
  onConfig: (user: UserRow) => void
  onPay: (p: Payroll) => void
  paying: string | null
}) {
  const p = user.payrolls[0]
  const isPaid = p?.status === 'PAID'
  const isSuggested = !p && user.suggested != null
  const editable = !!p && !isPaid

  const [vals, setVals] = useState<RowVals>({
    base: p?.baseAmount ?? 0,
    advances: p?.advances ?? 0,
    garnishments: p?.garnishments ?? 0,
    transfer: p?.transferAmount ?? 0,
  })
  const [active, setActive] = useState<keyof RowVals | null>(null)
  const valsRef = useRef(vals)
  useEffect(() => { valsRef.current = vals }, [vals])

  useEffect(() => {
    if (p) {
      setVals({ base: p.baseAmount, advances: p.advances, garnishments: p.garnishments, transfer: p.transferAmount })
    }
  }, [p?.id, p?.baseAmount, p?.advances, p?.garnishments, p?.transferAmount])

  const net = +(vals.base - vals.advances - vals.garnishments).toFixed(2)
  const cash = +(net - vals.transfer).toFixed(2)

  async function handleBlur() {
    setActive(null)
    if (!p?.id) return
    const v = valsRef.current
    const netAmount = +(v.base - v.advances - v.garnishments).toFixed(2)
    const cashAmount = +(netAmount - v.transfer).toFixed(2)
    const res = await fetch(`/api/salary/payroll/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        baseAmount: v.base,
        advances: v.advances,
        garnishments: v.garnishments,
        transferAmount: v.transfer,
        cashAmount,
      }),
    })
    if (res.ok) onRefresh()
    else toast.error('Error al guardar')
  }

  function update(field: keyof RowVals, n: number) {
    setVals(v => ({ ...v, [field]: n }))
  }

  return (
    <tr className={`border-t border-gray-100 ${isPaid ? 'bg-green-50/40' : ''}`}>
      {/* Nombre */}
      <td className="px-4 py-3 sticky left-0 bg-white z-10 whitespace-nowrap" style={{ borderLeft: `3px solid ${user.color}` }}>
        <span className="font-medium text-gray-800">{user.name}</span>
        {!user.active && <span className="ml-1.5 text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">Inactivo</span>}
        {user.breakdown && user.salaryConfig && ['PER_SHIFT', 'MIXED'].includes(user.salaryConfig.type) && (() => {
          const total = user.breakdown.morningCount + user.breakdown.afternoonCount + user.breakdown.imaginaryCount
          return (
            <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">
              {total} blosters
            </span>
          )
        })()}
      </td>
      {/* Tipo */}
      <td className="text-center px-3 py-3 whitespace-nowrap">
        <button
          onClick={() => onConfig(user)}
          className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors"
        >
          {user.salaryConfig ? TYPE_LABELS[user.salaryConfig.type] : '—'}
        </button>
      </td>
      {/* Kombat */}
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell
            value={vals.base}
            isActive={active === 'base'}
            editable={editable}
            onActivate={() => setActive('base')}
            onChange={n => update('base', n)}
            onBlur={handleBlur}
          />
        ) : isSuggested ? (
          <span className="text-gray-400 italic whitespace-nowrap">{fmt(user.suggested!)} €</span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      {/* Adelantos */}
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell
            value={vals.advances}
            isActive={active === 'advances'}
            editable={editable}
            colorClass={vals.advances > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}
            onActivate={() => setActive('advances')}
            onChange={n => update('advances', n)}
            onBlur={handleBlur}
          />
        ) : <span className="text-gray-300">—</span>}
      </td>
      {/* Embargos */}
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell
            value={vals.garnishments}
            isActive={active === 'garnishments'}
            editable={editable}
            colorClass={vals.garnishments > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}
            onActivate={() => setActive('garnishments')}
            onChange={n => update('garnishments', n)}
            onBlur={handleBlur}
          />
        ) : <span className="text-gray-300">—</span>}
      </td>
      {/* Neto (calculado) */}
      <td className="text-right px-3 py-3 whitespace-nowrap">
        {p ? (
          <span className={`font-semibold ${net < 0 ? 'text-red-600' : 'text-gray-800'}`}>
            {fmt(net)} €
          </span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      {/* Transferencia */}
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell
            value={vals.transfer}
            isActive={active === 'transfer'}
            editable={editable}
            colorClass="text-blue-700 font-medium"
            onActivate={() => setActive('transfer')}
            onChange={n => update('transfer', n)}
            onBlur={handleBlur}
          />
        ) : <span className="text-gray-300">—</span>}
      </td>
      {/* Efectivo (calculado automáticamente) */}
      <td className="text-right px-3 py-3 whitespace-nowrap">
        {p ? (
          <span className="text-gray-600 font-medium">{fmt(cash)} €</span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      {/* Estado */}
      <td className="text-center px-3 py-3 whitespace-nowrap">
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
        {!p && (
          <button
            onClick={() => onOpenModal(user)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            Crear
          </button>
        )}
        {p && !isPaid && (
          <button
            onClick={() => onPay(p)}
            disabled={paying === p.id}
            className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50"
          >
            ✓ Pagar
          </button>
        )}
      </td>
    </tr>
  )
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
      const withSuggestions = await Promise.all(
        users.map(async u => {
          const needsSuggest = !u.salaryConfig ? false :
            u.payrolls.length === 0 || ['PER_SHIFT', 'MIXED'].includes(u.salaryConfig.type)
          if (!needsSuggest) return u
          const sug = await fetch(`/api/salary/suggest?year=${year}&month=${month}&userId=${u.id}`)
          const data = await sug.json()
          return {
            ...u,
            suggested: u.payrolls.length === 0 ? (data.amount ?? null) : u.suggested,
            breakdown: data.breakdown ?? null,
          }
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

  function openModal(user: UserRow) {
    const suggested = user.suggested ?? 0
    const payroll: Payroll = {
      userId: user.id, year, month,
      baseAmount: suggested, advances: 0, garnishments: 0,
      netAmount: suggested, transferAmount: 0, cashAmount: 0,
    }
    setEditPayroll({ user, payroll })
  }

  const withPayroll = rows.filter(u => u.payrolls[0])
  const totalBase = withPayroll.reduce((a, u) => a + u.payrolls[0].baseAmount, 0)
  const totalAdv = withPayroll.reduce((a, u) => a + u.payrolls[0].advances, 0)
  const totalGarn = withPayroll.reduce((a, u) => a + u.payrolls[0].garnishments, 0)
  const totalNet = withPayroll.reduce((a, u) => a + u.payrolls[0].netAmount, 0)
  const totalTransfer = withPayroll.reduce((a, u) => a + u.payrolls[0].transferAmount, 0)
  const totalCash = withPayroll.reduce((a, u) => a + u.payrolls[0].cashAmount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">‹</button>
        <span className="font-bold text-gray-800 text-lg">{MONTH_NAMES[month - 1]} {year}</span>
        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">›</button>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>}

      {!loading && (
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-50 z-10 whitespace-nowrap">Empleado</th>
                  <th className="text-center px-3 py-3 font-semibold whitespace-nowrap">Tipo</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Kombat</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Adelantos</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Embargos</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Neto</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Transf.</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Efectivo</th>
                  <th className="text-center px-3 py-3 font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-3 py-3 w-16" />
                </tr>
              </thead>
              <tbody>
                {rows.map(user => (
                  <PayrollRow
                    key={user.id}
                    user={user}
                    onRefresh={fetchData}
                    onOpenModal={openModal}
                    onConfig={u => setConfigUser(u)}
                    onPay={handlePay}
                    paying={paying}
                  />
                ))}

                {withPayroll.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                    <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-50 whitespace-nowrap">TOTALES</td>
                    <td />
                    <td className="text-right px-3 py-3 text-gray-800 whitespace-nowrap">{fmt(totalBase)} €</td>
                    <td className="text-right px-3 py-3 text-orange-600 whitespace-nowrap">{fmt(totalAdv)} €</td>
                    <td className="text-right px-3 py-3 text-red-500 whitespace-nowrap">{fmt(totalGarn)} €</td>
                    <td className="text-right px-3 py-3 text-gray-800 whitespace-nowrap">{fmt(totalNet)} €</td>
                    <td className="text-right px-3 py-3 text-blue-700 whitespace-nowrap">{fmt(totalTransfer)} €</td>
                    <td className="text-right px-3 py-3 text-gray-600 whitespace-nowrap">{fmt(totalCash)} €</td>
                    <td /><td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
