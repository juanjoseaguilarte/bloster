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

function PayrollRow({
  user, isAdmin, onRefresh, onOpenModal, onConfig, onPay, onUnpay, onExclude, paying,
}: {
  user: UserRow; isAdmin: boolean
  onRefresh: () => void; onOpenModal: (u: UserRow) => void; onConfig: (u: UserRow) => void
  onPay: (p: Payroll) => void; onUnpay: (p: Payroll) => void; onExclude: (u: UserRow) => void
  paying: string | null
}) {
  const p = user.payrolls[0]
  const isPaid = p?.status === 'PAID'
  const isSuggested = !p && user.suggested != null
  const editable = !!p && !isPaid

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
    if (res.ok) onRefresh()
    else toast.error('Error al guardar')
  }

  function update(field: keyof RowVals, n: number) { setVals(v => ({ ...v, [field]: n })) }

  return (
    <tr className={`border-t border-gray-100 ${isPaid ? 'bg-green-50/40' : ''}`}>
      <td className="px-4 py-3 sticky left-0 bg-white z-10 whitespace-nowrap" style={{ borderLeft: `3px solid ${user.color}` }}>
        <span className="font-medium text-gray-800">{user.name}</span>
        {user.breakdown && user.salaryConfig && ['PER_SHIFT', 'MIXED'].includes(user.salaryConfig.type) && (() => {
          const total = user.breakdown.morningCount + user.breakdown.afternoonCount + user.breakdown.imaginaryCount
          return <span className="ml-1.5 text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">{total} blosters</span>
        })()}
      </td>
      <td className="text-center px-3 py-3 whitespace-nowrap">
        <button onClick={() => onConfig(user)} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full hover:bg-blue-50 hover:text-blue-700 transition-colors">
          {user.salaryConfig ? TYPE_LABELS[user.salaryConfig.type] : '—'}
        </button>
      </td>
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell value={vals.base} isActive={active === 'base'} editable={editable}
            onActivate={() => setActive('base')} onChange={n => update('base', n)} onBlur={handleBlur} />
        ) : isSuggested ? (
          <span className="text-gray-400 italic whitespace-nowrap">{fmt(user.suggested!)} €</span>
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell value={vals.advances} isActive={active === 'advances'} editable={editable}
            colorClass={vals.advances > 0 ? 'text-orange-600 font-medium' : 'text-gray-400'}
            onActivate={() => setActive('advances')} onChange={n => update('advances', n)} onBlur={handleBlur} />
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell value={vals.garnishments} isActive={active === 'garnishments'} editable={editable}
            colorClass={vals.garnishments > 0 ? 'text-red-500 font-medium' : 'text-gray-400'}
            onActivate={() => setActive('garnishments')} onChange={n => update('garnishments', n)} onBlur={handleBlur} />
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="text-right px-3 py-3 whitespace-nowrap">
        {p ? <span className={`font-semibold ${net < 0 ? 'text-red-600' : 'text-gray-800'}`}>{fmt(net)} €</span>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="text-right px-3 py-3">
        {p ? (
          <EditableCell value={vals.transfer} isActive={active === 'transfer'} editable={editable}
            colorClass="text-blue-700 font-medium"
            onActivate={() => setActive('transfer')} onChange={n => update('transfer', n)} onBlur={handleBlur} />
        ) : <span className="text-gray-300">—</span>}
      </td>
      <td className="text-right px-3 py-3 whitespace-nowrap">
        {p ? <span className="text-gray-600 font-medium">{fmt(cash)} €</span>
          : <span className="text-gray-300">—</span>}
      </td>
      <td className="text-center px-3 py-3 whitespace-nowrap">
        {isPaid ? <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Pagado</span>
          : p ? <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Borrador</span>
          : <span className="text-xs text-gray-300">Sin nómina</span>}
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        {!p && <button onClick={() => onOpenModal(user)} className="text-xs text-blue-600 hover:text-blue-800 mr-2">Crear</button>}
        {p && !isPaid && (
          <button onClick={() => onPay(p)} disabled={paying === p.id} className="text-xs text-green-600 hover:text-green-800 disabled:opacity-50 mr-2">
            ✓ Pagar
          </button>
        )}
        {p && isPaid && isAdmin && (
          <button onClick={() => onUnpay(p)} disabled={paying === p.id} className="text-xs text-red-400 hover:text-red-600 disabled:opacity-50 mr-2">
            Anular
          </button>
        )}
        <button onClick={() => onExclude(user)} className="text-xs text-gray-300 hover:text-gray-500">
          Excluir
        </button>
      </td>
    </tr>
  )
}

function GroupSection({
  title, rows, isAdmin, onRefresh, onOpenModal, onConfig, onPay, onUnpay, onExclude, paying,
}: {
  title: string; rows: UserRow[]; isAdmin: boolean
  onRefresh: () => void; onOpenModal: (u: UserRow) => void; onConfig: (u: UserRow) => void
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
        <td colSpan={10} className="px-4 py-1.5 text-xs font-bold text-gray-500 uppercase tracking-wider sticky left-0">{title}</td>
      </tr>
      {rows.map(user => (
        <PayrollRow key={user.id} user={user} isAdmin={isAdmin}
          onRefresh={onRefresh} onOpenModal={onOpenModal} onConfig={onConfig}
          onPay={onPay} onUnpay={onUnpay} onExclude={onExclude} paying={paying} />
      ))}
      {withP.length > 0 && (
        <tr className="bg-gray-50 text-xs text-gray-500 font-semibold">
          <td className="px-4 py-1.5 sticky left-0 bg-gray-50">Subtotal {title}</td>
          <td /><td className="text-right px-3 py-1.5">{fmt(subBase)} €</td>
          <td /><td /><td className="text-right px-3 py-1.5 text-gray-700">{fmt(subNet)} €</td>
          <td className="text-right px-3 py-1.5 text-blue-600">{fmt(subTransfer)} €</td>
          <td className="text-right px-3 py-1.5">{fmt(subCash)} €</td>
          <td /><td />
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
          return { ...u, suggested: u.payrolls.length === 0 ? (data.amount ?? null) : u.suggested, breakdown: data.breakdown ?? null }
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

  async function handleDeleteMonth() {
    if (!confirm(`¿Borrar TODAS las nóminas de ${MONTH_NAMES[month - 1]} ${year}? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/salary/payroll/month?year=${year}&month=${month}`, { method: 'DELETE' })
      if (res.ok) { const d = await res.json(); toast.success(`${d.deleted} nóminas eliminadas`); fetchData() }
      else toast.error('Error al borrar')
    } finally { setDeleting(false) }
  }

  function targetMonth(direction: 'prev' | 'next') {
    if (direction === 'prev') {
      return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 }
    }
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 }
  }

  async function handleCopy(direction: 'prev' | 'next') {
    setShowCopyMenu(false)
    const to = targetMonth(direction)
    const label = `${MONTH_NAMES[to.month - 1]} ${to.year}`
    if (!confirm(`¿Copiar nóminas de ${MONTH_NAMES[month - 1]} ${year} a ${label}?\nLos adelantos no se copian. Las nóminas ya existentes en ${label} no se sobreescriben.`)) return
    setCopying(true)
    try {
      const res = await fetch('/api/salary/payroll/copy', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromYear: year, fromMonth: month, toYear: to.year, toMonth: to.month }),
      })
      if (res.ok) {
        const d = await res.json()
        toast.success(`${d.copied} nóminas copiadas a ${label}${d.skipped ? ` (${d.skipped} ya existían)` : ''}`)
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
  const totalBase = withPayroll.reduce((a, u) => a + u.payrolls[0].baseAmount, 0)
  const totalAdv = withPayroll.reduce((a, u) => a + u.payrolls[0].advances, 0)
  const totalGarn = withPayroll.reduce((a, u) => a + u.payrolls[0].garnishments, 0)
  const totalNet = withPayroll.reduce((a, u) => a + u.payrolls[0].netAmount, 0)
  const totalTransfer = withPayroll.reduce((a, u) => a + u.payrolls[0].transferAmount, 0)
  const totalCash = withPayroll.reduce((a, u) => a + u.payrolls[0].cashAmount, 0)

  const commonProps = { isAdmin, onRefresh: fetchData, onOpenModal: openModal, onConfig: (u: UserRow) => setConfigUser(u), onPay: handlePay, onUnpay: handleUnpay, onExclude: handleExclude, paying }

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
                  <button onClick={() => handleCopy('prev')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-xl">
                    ← {prevLabel}
                  </button>
                  <button onClick={() => handleCopy('next')} className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100 rounded-b-xl">
                    → {nextLabel}
                  </button>
                </div>
              )}
            </div>
          )}
          {isAdmin && (
            <button onClick={handleDeleteMonth} disabled={deleting} className="text-sm px-3 py-1.5 border border-red-200 text-red-500 rounded-lg font-medium hover:bg-red-50 disabled:opacity-50">
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
                  <th className="text-center px-3 py-3 font-semibold whitespace-nowrap">Tipo</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Kombat</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Adelantos</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Embargos</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Neto</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Transf.</th>
                  <th className="text-right px-3 py-3 font-semibold whitespace-nowrap w-[110px]">Efectivo</th>
                  <th className="text-center px-3 py-3 font-semibold whitespace-nowrap">Estado</th>
                  <th className="px-3 py-3 w-28" />
                </tr>
              </thead>
              <tbody>
                {groups.map(g => (
                  <GroupSection key={g.key} title={g.label} rows={g.rows} {...commonProps} />
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

                {/* Excluidos */}
                {excluded.length > 0 && (
                  <>
                    <tr
                      className="border-t border-gray-200 bg-gray-50 cursor-pointer hover:bg-gray-100"
                      onClick={() => setShowExcluded(v => !v)}
                    >
                      <td colSpan={10} className="px-4 py-2 text-xs text-gray-400 font-semibold sticky left-0">
                        {showExcluded ? '▾' : '▸'} Excluidos este mes ({excluded.length})
                      </td>
                    </tr>
                    {showExcluded && excluded.map(user => (
                      <tr key={user.id} className="border-t border-gray-100 bg-gray-50/50 opacity-60">
                        <td className="px-4 py-2 sticky left-0 bg-gray-50 whitespace-nowrap" style={{ borderLeft: `3px solid ${user.color}` }}>
                          <span className="text-sm text-gray-500">{user.name}</span>
                        </td>
                        <td colSpan={8} className="px-3 py-2 text-xs text-gray-400 italic">Excluido este mes</td>
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
    </div>
  )
}
