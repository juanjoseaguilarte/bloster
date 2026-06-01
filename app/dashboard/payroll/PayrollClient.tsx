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
  payrollOnly: boolean
  excluded: boolean
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
  value, isActive, editable, colorClass, onActivate, onChange, onBlur,
}: {
  value: number; isActive: boolean; editable: boolean; colorClass?: string
  onActivate: () => void; onChange: (n: number) => void; onBlur: () => void
}) {
  if (isActive) {
    return (
      <input
        type="number" value={value} step="0.01" autoFocus
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        onBlur={onBlur}
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

interface RowVals { base: number; advances: number; garnishments: number; transfer: number }

function EmployeeMenu({
  user, isAdmin, year, month, onRefresh, onOpenModal, onConfig, onPay, onUnpay, onExclude, onClose, paying,
}: {
  user: UserRow; isAdmin: boolean; year: number; month: number
  onRefresh: () => void; onOpenModal: (u: UserRow) => void; onConfig: (u: UserRow) => void
  onPay: (p: Payroll) => void; onUnpay: (p: Payroll) => void; onExclude: (u: UserRow) => void
  onClose: () => void; paying: string | null
}) {
  const p = user.payrolls[0]
  const isPaid = p?.status === 'PAID'
  const shiftTotal = user.breakdown
    ? user.breakdown.morningCount + user.breakdown.afternoonCount + user.breakdown.imaginaryCount
    : null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-lg pb-safe" onClick={e => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-gray-100">
          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: user.color }} />
          <span className="font-bold text-gray-800 text-base">{user.name}</span>
        </div>

        <div className="px-5 py-3 space-y-1">
          {/* Tipo */}
          <button
            onClick={() => { onClose(); onConfig(user) }}
            className="w-full flex items-center justify-between py-3 border-b border-gray-50"
          >
            <span className="text-sm text-gray-600">Tipo de kombat</span>
            <span className="text-sm font-semibold text-gray-800">
              {user.salaryConfig ? TYPE_LABELS[user.salaryConfig.type] : 'Sin configurar'}
            </span>
          </button>

          {/* Blosters */}
          {user.breakdown && (
            <div className="flex items-center justify-between py-3 border-b border-gray-50">
              <span className="text-sm text-gray-600">Blosters este mes</span>
              <span className="text-sm font-bold text-blue-700">
                {user.breakdown.morningCount + user.breakdown.afternoonCount + user.breakdown.imaginaryCount}
                <span className="text-xs font-normal text-gray-400 ml-1">
                  ({user.breakdown.morningCount}M · {user.breakdown.afternoonCount}T
                  {user.breakdown.imaginaryCount > 0 ? ` · ${user.breakdown.imaginaryCount}I` : ''})
                </span>
              </span>
            </div>
          )}

          {/* Estado */}
          <div className="flex items-center justify-between py-3 border-b border-gray-50">
            <span className="text-sm text-gray-600">Estado</span>
            {isPaid
              ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Pagado</span>
              : p
                ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Borrador</span>
                : <span className="text-xs text-gray-400">Sin nómina</span>
            }
          </div>
        </div>

        {/* Acciones */}
        <div className="px-5 pb-6 space-y-2">
          {!p && (
            <button onClick={() => { onClose(); onOpenModal(user) }}
              className="w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold">
              Crear nómina
            </button>
          )}
          {p && !isPaid && (
            <button onClick={() => { onClose(); onPay(p) }} disabled={paying === p.id}
              className="w-full py-3 rounded-xl bg-green-600 text-white text-sm font-semibold disabled:opacity-50">
              ✓ Marcar como pagado
            </button>
          )}
          {p && isPaid && isAdmin && (
            <button onClick={() => { onClose(); onUnpay(p) }} disabled={paying === p.id}
              className="w-full py-3 rounded-xl border-2 border-red-200 text-red-500 text-sm font-semibold disabled:opacity-50">
              Anular pago
            </button>
          )}
          <button onClick={() => { onClose(); onExclude(user) }}
            className="w-full py-3 rounded-xl border-2 border-gray-200 text-gray-500 text-sm font-medium">
            Excluir este mes
          </button>
        </div>
      </div>
    </div>
  )
}

function PayrollRow({
  user, isAdmin, year, month, onRefresh, onUpdatePayroll, onOpenModal, onConfig, onPay, onUnpay, onExclude, paying,
}: {
  user: UserRow; isAdmin: boolean; year: number; month: number
  onRefresh: () => void; onUpdatePayroll: (userId: string, updated: Payroll) => void
  onOpenModal: (u: UserRow) => void; onConfig: (u: UserRow) => void
  onPay: (p: Payroll) => void; onUnpay: (p: Payroll) => void; onExclude: (u: UserRow) => void
  paying: string | null
}) {
  const p = user.payrolls[0]
  const isPaid = p?.status === 'PAID'
  const isSuggested = !p && user.suggested != null
  const editable = !!p && !isPaid
  const [showMenu, setShowMenu] = useState(false)

  const [vals, setVals] = useState<RowVals>({
    base: p?.baseAmount ?? 0, advances: p?.advances ?? 0,
    garnishments: p?.garnishments ?? 0, transfer: p?.transferAmount ?? 0,
  })
  const [active, setActive] = useState<keyof RowVals | null>(null)
  const valsRef = useRef(vals)
  useEffect(() => { valsRef.current = vals }, [vals])

  useEffect(() => {
    if (p) setVals({ base: p.baseAmount, advances: p.advances, garnishments: p.garnishments, transfer: p.transferAmount })
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
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseAmount: v.base, advances: v.advances, garnishments: v.garnishments, transferAmount: v.transfer, cashAmount }),
    })
    if (res.ok) onUpdatePayroll(user.id, await res.json())
    else toast.error('Error al guardar')
  }

  function update(field: keyof RowVals, n: number) { setVals(v => ({ ...v, [field]: n })) }

  return (
    <>
      <tr className={`border-t border-gray-100 ${isPaid ? 'bg-green-50/40' : ''}`}>
        {/* Nombre — tap abre menú */}
        <td className="px-4 py-3 sticky left-0 bg-white z-10 whitespace-nowrap" style={{ borderLeft: `3px solid ${user.color}` }}>
          <button onClick={() => setShowMenu(true)} className="text-left">
            <span className="font-medium text-gray-800 hover:text-blue-600 transition-colors">{user.name}</span>
            {isPaid && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-green-500 align-middle" />}
            {p && !isPaid && <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400 align-middle" />}
          </button>
        </td>
        {/* Kombat */}
        <td className="text-right px-3 py-3">
          {p ? (
            <EditableCell value={vals.base} isActive={active === 'base'} editable={editable}
              onActivate={() => setActive('base')} onChange={n => update('base', n)} onBlur={handleBlur} />
          ) : isSuggested ? (
            <span onClick={() => onOpenModal(user)} className="text-gray-400 italic whitespace-nowrap cursor-pointer hover:text-blue-500 transition-colors">{fmt(user.suggested!)} €</span>
          ) : <span onClick={() => onOpenModal(user)} className="text-gray-300 cursor-pointer hover:text-blue-400 transition-colors">—</span>}
        </td>
        {/* Adelantos */}
        <td className="text-right px-3 py-3">
          {p ? (
            <EditableCell value={vals.advances} isActive={active === 'advances'} editable={editable}
              colorClass={vals.advances > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}
              onActivate={() => setActive('advances')} onChange={n => update('advances', n)} onBlur={handleBlur} />
          ) : <span onClick={() => onOpenModal(user)} className="text-gray-300 cursor-pointer hover:text-blue-400 transition-colors">—</span>}
        </td>
        {/* Embargos */}
        <td className="text-right px-3 py-3">
          {p ? (
            <EditableCell value={vals.garnishments} isActive={active === 'garnishments'} editable={editable}
              colorClass={vals.garnishments > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}
              onActivate={() => setActive('garnishments')} onChange={n => update('garnishments', n)} onBlur={handleBlur} />
          ) : <span onClick={() => onOpenModal(user)} className="text-gray-300 cursor-pointer hover:text-blue-400 transition-colors">—</span>}
        </td>
        {/* Neto */}
        <td className="text-right px-3 py-3 whitespace-nowrap">
          {p ? <span className={`font-semibold ${net < 0 ? 'text-red-600' : 'text-gray-800'}`}>{fmt(net)} €</span>
            : <span className="text-gray-300">—</span>}
        </td>
        {/* Transferencia */}
        <td className="text-right px-3 py-3">
          {p ? (
            <EditableCell value={vals.transfer} isActive={active === 'transfer'} editable={editable}
              colorClass="text-blue-700 font-medium"
              onActivate={() => setActive('transfer')} onChange={n => update('transfer', n)} onBlur={handleBlur} />
          ) : <span className="text-gray-300">—</span>}
        </td>
        {/* Efectivo */}
        <td className="text-right px-3 py-3 whitespace-nowrap">
          {p ? <span className="text-gray-600 font-medium">{fmt(cash)} €</span>
            : <span className="text-gray-300">—</span>}
        </td>
      </tr>

      {showMenu && (
        <EmployeeMenu
          user={user} isAdmin={isAdmin} year={year} month={month}
          onRefresh={onRefresh} onOpenModal={onOpenModal} onConfig={onConfig}
          onPay={onPay} onUnpay={onUnpay} onExclude={onExclude}
          onClose={() => setShowMenu(false)} paying={paying}
        />
      )}
    </>
  )
}

function GroupSection({
  title, rows, isAdmin, year, month, onRefresh, onUpdatePayroll, onOpenModal, onConfig, onPay, onUnpay, onExclude, paying,
}: {
  title: string; rows: UserRow[]; isAdmin: boolean; year: number; month: number
  onRefresh: () => void; onUpdatePayroll: (userId: string, updated: Payroll) => void
  onOpenModal: (u: UserRow) => void; onConfig: (u: UserRow) => void
  onPay: (p: Payroll) => void; onUnpay: (p: Payroll) => void; onExclude: (u: UserRow) => void
  paying: string | null
}) {
  if (rows.length === 0) return null
  const withP = rows.filter(u => u.payrolls[0])
  const subBase = withP.reduce((a, u) => a + u.payrolls[0].baseAmount, 0)
  const subNet = withP.reduce((a, u) => a + u.payrolls[0].netAmount, 0)
  const subTransfer = withP.reduce((a, u) => a + u.payrolls[0].transferAmount, 0)
  const subCash = withP.reduce((a, u) => a + u.payrolls[0].cashAmount, 0)

  return (
    <>
      <tr className="bg-gray-100">
        <td colSpan={7} className="px-4 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0">{title}</td>
      </tr>
      {rows.map(user => (
        <PayrollRow key={user.id} user={user} isAdmin={isAdmin} year={year} month={month}
          onRefresh={onRefresh} onUpdatePayroll={onUpdatePayroll} onOpenModal={onOpenModal} onConfig={onConfig}
          onPay={onPay} onUnpay={onUnpay} onExclude={onExclude} paying={paying} />
      ))}
      {withP.length > 0 && (
        <tr className="bg-gray-50 text-xs text-gray-500 font-semibold">
          <td className="px-4 py-1.5 sticky left-0 bg-gray-50">Subtotal {title}</td>
          <td className="text-right px-3 py-1.5">{fmt(subBase)} €</td>
          <td /><td />
          <td className="text-right px-3 py-1.5 text-gray-700">{fmt(subNet)} €</td>
          <td className="text-right px-3 py-1.5 text-blue-600">{fmt(subTransfer)} €</td>
          <td className="text-right px-3 py-1.5">{fmt(subCash)} €</td>
        </tr>
      )}
    </>
  )
}

function AddKombatUserModal({ year, month, onClose, onSaved }: { year: number; month: number; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [baseAmount, setBaseAmount] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) return toast.error('Introduce un nombre')
    setSaving(true)
    try {
      // Crear usuario inactivo solo para Kombat (grupo BARRA por defecto, va a "Otros")
      const userRes = await fetch('/api/users', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), payrollOnly: true, active: false }),
      })
      if (!userRes.ok) { toast.error('Error al crear'); return }
      const user = await userRes.json()

      // Crear nómina para este mes directamente
      const amount = parseFloat(baseAmount) || 0
      await fetch('/api/salary/payroll', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id, year, month,
          baseAmount: amount, advances: 0, garnishments: 0,
          transferAmount: 0, cashAmount: amount, notes: null,
        }),
      })

      toast.success('Empleado añadido')
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 text-lg mb-1">Añadir a Kombat</h3>
        <p className="text-gray-400 text-xs mb-4">Solo para este mes · Aparece en sección Otros</p>
        <div className="space-y-3">
          <input
            type="text" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} autoFocus
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Kombat (€) — opcional</label>
            <input
              type="number" placeholder="0,00" value={baseAmount} onChange={e => setBaseAmount(e.target.value)} step="0.01"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? '...' : 'Añadir'}
          </button>
        </div>
      </div>
    </div>
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
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExcluded, setShowExcluded] = useState(false)
  const [showCopyMenu, setShowCopyMenu] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [copying, setCopying] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmCopyDir, setConfirmCopyDir] = useState<'prev' | 'next' | null>(null)
  const [socialSecurity, setSocialSecurity] = useState(0)
  const [ssEditing, setSsEditing] = useState(false)
  const [ssValue, setSsValue] = useState(0)

  function prevMonth() { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [res, ssRes] = await Promise.all([
        fetch(`/api/salary/payroll?year=${year}&month=${month}`),
        fetch(`/api/salary/social-security?year=${year}&month=${month}`),
      ])
      const users: UserRow[] = await res.json()
      const ssData = await ssRes.json()
      const withSuggestions = await Promise.all(
        users.map(async u => {
          const sug = await fetch(`/api/salary/suggest?year=${year}&month=${month}&userId=${u.id}`)
          const data = await sug.json()
          const needsAmount = !u.salaryConfig ? false :
            u.payrolls.length === 0 || ['PER_SHIFT', 'MIXED'].includes(u.salaryConfig.type)
          return {
            ...u,
            suggested: needsAmount ? (data.amount ?? null) : u.suggested,
            breakdown: data.breakdown ?? null,
          }
        })
      )
      setRows(withSuggestions)
      setSocialSecurity(ssData.amount ?? 0)
      setSsValue(ssData.amount ?? 0)
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
    } finally { setPayingId(null) }
  }

  async function handleUnpay(payroll: Payroll) {
    if (!payroll.id) return
    setPayingId(payroll.id)
    try {
      const res = await fetch(`/api/salary/payroll/${payroll.id}/pay`, { method: 'DELETE' })
      if (res.ok) { toast.success('Pago anulado'); fetchData() }
      else toast.error('Error')
    } finally { setPayingId(null) }
  }

  async function doDeleteMonth() {
    setConfirmDelete(false)
    setDeleting(true)
    try {
      const res = await fetch(`/api/salary/payroll/month?year=${year}&month=${month}`, { method: 'DELETE' })
      if (res.ok) { const d = await res.json(); toast.success(`${d.deleted} nóminas eliminadas`); fetchData() }
      else toast.error('Error al borrar')
    } finally { setDeleting(false) }
  }

  function targetMonth(direction: 'prev' | 'next') {
    if (direction === 'prev') return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  }

  async function doCopy(direction: 'prev' | 'next') {
    setConfirmCopyDir(null)
    const to = targetMonth(direction)
    const label = `${MONTH_NAMES[to.month - 1]} ${to.year}`
    setCopying(true)
    try {
      const res = await fetch('/api/salary/payroll/copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromYear: year, fromMonth: month, toYear: to.year, toMonth: to.month }),
      })
      if (res.ok) {
        const d = await res.json()
        toast.success(`${d.copied} nóminas copiadas a ${label}${d.skipped ? ` · ${d.skipped} ya existían` : ''}`)
      } else toast.error('Error al copiar')
    } finally { setCopying(false) }
  }

  async function handleExclude(user: UserRow) {
    const res = await fetch('/api/salary/payroll/exclude', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, year, month }),
    })
    if (res.ok) { toast.success(`${user.name} excluido este mes`); fetchData() }
    else toast.error('Error')
  }

  async function handleInclude(user: UserRow) {
    const res = await fetch('/api/salary/payroll/exclude', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, year, month }),
    })
    if (res.ok) { toast.success(`${user.name} incluido`); fetchData() }
    else toast.error('Error')
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

  const included = rows.filter(u => !u.excluded)
  const excluded = rows.filter(u => u.excluded)

  const groups = [
    { key: 'COCINA', label: 'Cocina', rows: included.filter(u => u.group === 'COCINA' && !u.payrollOnly) },
    { key: 'BARRA', label: 'Barra', rows: included.filter(u => u.group === 'BARRA' && !u.payrollOnly) },
    { key: 'OTROS', label: 'Otros', rows: included.filter(u => u.payrollOnly || (u.group !== 'COCINA' && u.group !== 'BARRA')) },
  ]

  const withPayroll = included.filter(u => u.payrolls[0])
  const totalBase = withPayroll.reduce((a, u) => a + u.payrolls[0].baseAmount, 0) + socialSecurity
  const totalAdv = withPayroll.reduce((a, u) => a + u.payrolls[0].advances, 0)
  const totalGarn = withPayroll.reduce((a, u) => a + u.payrolls[0].garnishments, 0)
  const totalNet = withPayroll.reduce((a, u) => a + u.payrolls[0].netAmount, 0) + socialSecurity
  const totalTransfer = withPayroll.reduce((a, u) => a + u.payrolls[0].transferAmount, 0)
  const totalCash = withPayroll.reduce((a, u) => a + u.payrolls[0].cashAmount, 0)

  async function saveSocialSecurity(value: number) {
    setSsEditing(false)
    setSocialSecurity(value)
    await fetch('/api/salary/social-security', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, amount: value }),
    })
  }

  function handleUpdatePayroll(userId: string, updated: Payroll) {
    setRows(prev => prev.map(r =>
      r.id === userId ? { ...r, payrolls: [updated] } : r
    ))
  }

  const commonProps = { isAdmin, year, month, onRefresh: fetchData, onUpdatePayroll: handleUpdatePayroll, onOpenModal: openModal, onConfig: (u: UserRow) => setConfigUser(u), onPay: handlePay, onUnpay: handleUnpay, onExclude: handleExclude, paying }

  const prevLabel = (() => { const t = targetMonth('prev'); return `${MONTH_NAMES[t.month - 1]} ${t.year}` })()
  const nextLabel = (() => { const t = targetMonth('next'); return `${MONTH_NAMES[t.month - 1]} ${t.year}` })()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">‹</button>
          <span className="font-bold text-gray-800 text-lg">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-600 text-xl font-light">›</button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <div className="relative">
              <button
                onClick={() => setShowCopyMenu(v => !v)}
                disabled={copying}
                className="text-sm px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                {copying ? 'Copiando...' : 'Copiar a ▾'}
              </button>
              {showCopyMenu && (
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-20 min-w-[180px]">
                  <button onClick={() => { setShowCopyMenu(false); setConfirmCopyDir('prev') }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl">
                    ← {prevLabel}
                  </button>
                  <button onClick={() => { setShowCopyMenu(false); setConfirmCopyDir('next') }} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 rounded-b-xl">
                    → {nextLabel}
                  </button>
                </div>
              )}
            </div>
          )}
          {isAdmin && (
            <button onClick={() => setConfirmDelete(true)} disabled={deleting} className="text-sm px-3 py-1.5 border border-red-200 text-red-500 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50">
              {deleting ? '...' : 'Borrar mes'}
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            + Empleado
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-12 text-gray-400 text-sm">Cargando...</div>}

      {!loading && (
        <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-semibold sticky left-0 bg-gray-50 z-10 whitespace-nowrap">Empleado</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Kombat</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Adelantos</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Embargos</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Neto</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Transf.</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Efectivo</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <GroupSection key={g.key} title={g.label} rows={g.rows} {...commonProps} />
                ))}

                {/* Seguridad Social */}
                <tr className="border-t border-gray-200 bg-purple-50/40">
                  <td className="px-4 py-2.5 sticky left-0 bg-purple-50/40 whitespace-nowrap">
                    <span className="text-sm font-medium text-purple-800">Seguridad Social</span>
                  </td>
                  <td className="text-right px-3 py-2.5">
                    {ssEditing ? (
                      <input
                        type="number" value={ssValue} step="0.01" autoFocus
                        onChange={e => setSsValue(parseFloat(e.target.value) || 0)}
                        onBlur={() => saveSocialSecurity(ssValue)}
                        onKeyDown={e => { if (e.key === 'Enter') saveSocialSecurity(ssValue) }}
                        className="w-[78px] text-right border border-purple-400 rounded px-1.5 py-0.5 text-sm focus:outline-none bg-white"
                      />
                    ) : (
                      <span
                        onClick={() => { setSsValue(socialSecurity); setSsEditing(true) }}
                        className="inline-block whitespace-nowrap rounded px-1 font-medium text-purple-800 cursor-pointer hover:bg-purple-100"
                      >
                        {fmt(socialSecurity)} €
                      </span>
                    )}
                  </td>
                  <td /><td />
                  <td className="text-right px-3 py-2.5 whitespace-nowrap font-medium text-purple-800">{fmt(socialSecurity)} €</td>
                  <td /><td />
                </tr>

                {withPayroll.length > 0 && (
                  <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold text-sm">
                    <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-50 whitespace-nowrap">TOTALES</td>
                    <td className="text-right px-3 py-3 text-gray-800 whitespace-nowrap">{fmt(totalBase)} €</td>
                    <td className="text-right px-3 py-3 text-orange-600 whitespace-nowrap">{fmt(totalAdv)} €</td>
                    <td className="text-right px-3 py-3 text-red-500 whitespace-nowrap">{fmt(totalGarn)} €</td>
                    <td className="text-right px-3 py-3 text-gray-800 whitespace-nowrap">{fmt(totalNet)} €</td>
                    <td className="text-right px-3 py-3 text-blue-700 whitespace-nowrap">{fmt(totalTransfer)} €</td>
                    <td className="text-right px-3 py-3 text-gray-600 whitespace-nowrap">{fmt(totalCash)} €</td>
                  </tr>
                )}

                {/* Excluidos */}
                {excluded.length > 0 && (
                  <>
                    <tr
                      className="border-t border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => setShowExcluded(v => !v)}
                    >
                      <td colSpan={7} className="px-4 py-2 text-xs text-gray-400 font-semibold sticky left-0">
                        {showExcluded ? '▾' : '▸'} Excluidos este mes ({excluded.length})
                      </td>
                    </tr>
                    {showExcluded && excluded.map(user => (
                      <tr key={user.id} className="border-t border-gray-100 bg-gray-50/50 opacity-60">
                        <td className="px-4 py-2 sticky left-0 bg-gray-50 whitespace-nowrap" style={{ borderLeft: `3px solid ${user.color}` }}>
                          <span className="text-sm text-gray-500">{user.name}</span>
                        </td>
                        <td colSpan={5} className="px-3 py-2 text-xs text-gray-400 italic">Excluido este mes</td>
                        <td className="px-3 py-2 text-right">
                          <button onClick={() => handleInclude(user)} className="text-xs text-blue-600 hover:text-blue-800">Incluir</button>
                        </td>
                      </tr>
                    ))}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editPayroll && (
        <PayrollModal payroll={editPayroll.payroll} userName={editPayroll.user.name}
          onClose={() => setEditPayroll(null)} onSaved={() => { setEditPayroll(null); fetchData() }} />
      )}
      {configUser && (
        <SalaryConfigModal userId={configUser.id} userName={configUser.name} current={configUser.salaryConfig}
          onClose={() => setConfigUser(null)} onSaved={() => { setConfigUser(null); fetchData() }} />
      )}
      {showAddModal && (
        <AddKombatUserModal year={year} month={month} onClose={() => setShowAddModal(false)} onSaved={() => { setShowAddModal(false); fetchData() }} />
      )}

      {/* Modal confirmar borrar mes */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-bold text-gray-800 text-lg mb-2">Borrar mes</h3>
            <p className="text-gray-600 text-sm mb-5">
              ¿Eliminar <strong>todas</strong> las nóminas de <strong>{MONTH_NAMES[month - 1]} {year}</strong>?<br />
              <span className="text-red-500 text-xs">Esta acción no se puede deshacer.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium">Cancelar</button>
              <button onClick={doDeleteMonth} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700">Borrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar copiar mes */}
      {confirmCopyDir && (() => {
        const to = targetMonth(confirmCopyDir)
        const toLabel = `${MONTH_NAMES[to.month - 1]} ${to.year}`
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
              <h3 className="font-bold text-gray-800 text-lg mb-2">Copiar a {toLabel}</h3>
              <p className="text-gray-600 text-sm mb-1">Se copiará una copia exacta de todas las nóminas de <strong>{MONTH_NAMES[month - 1]} {year}</strong> a <strong>{toLabel}</strong>.</p>
              <p className="text-gray-400 text-xs mb-5">Las nóminas ya existentes en {toLabel} no se sobreescriben.</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmCopyDir(null)} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium">Cancelar</button>
                <button onClick={() => doCopy(confirmCopyDir)} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700">Copiar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
