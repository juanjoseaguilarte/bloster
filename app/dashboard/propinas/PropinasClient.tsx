'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'

type Period = 'MORNING' | 'AFTERNOON'

interface Employee {
  id: string
  name: string
  hadShift: boolean
  selected: boolean
}

interface TipDebtDeduction {
  id: string
  amount: number
  createdAt: string
  tipRecord: {
    id: string
    date: string
    totalAmount: number
  }
}

interface TipDebt {
  id: string
  description: string
  originalAmount: number
  remainingAmount: number
  percentage: number
  active: boolean
  createdAt: string
  deductions: TipDebtDeduction[]
}

interface TipShare {
  id: string
  userId: string
  amount: number
  hadShift: boolean
  user: { id: string; name: string }
}

interface TipRecord {
  id: string
  date: string
  period: Period
  totalAmount: number
  netAmount: number
  notes: string | null
  createdAt: string
  shares: TipShare[]
  deductions: { id: string; amount: number; tipDebt: { id: string; description: string } }[]
}

interface SummaryItem {
  userId: string
  userName: string
  total: number
  count: number
}

interface Props {
  userId: string
}

const fmt = (n: number) => `${n < 0 ? '-' : ''}€${Math.abs(n).toFixed(2)}`

const fmtDate = (iso: string) => {
  const d = new Date(iso)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`
}

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function PropinasClient({ userId: _userId }: Props) {
  const [tab, setTab] = useState<'nuevo' | 'historial' | 'deudas' | 'resumen'>('nuevo')

  const todayStr = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(todayStr)
  const [period, setPeriod] = useState<Period>('MORNING')
  const [totalAmount, setTotalAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [debts, setDebts] = useState<TipDebt[]>([])
  const [loadingDebts, setLoadingDebts] = useState(false)

  const [records, setRecords] = useState<TipRecord[]>([])
  const [loadingRecords, setLoadingRecords] = useState(false)
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [historialPage, setHistorialPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)

  const [showAddDebt, setShowAddDebt] = useState(false)
  const [newDebtDesc, setNewDebtDesc] = useState('')
  const [newDebtAmount, setNewDebtAmount] = useState('')
  const [newDebtPct, setNewDebtPct] = useState('')
  const [addingDebt, setAddingDebt] = useState(false)
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null)

  const now = new Date()
  const [summaryYear, setSummaryYear] = useState(now.getFullYear())
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1)
  const [summary, setSummary] = useState<SummaryItem[]>([])
  const [loadingSummary, setLoadingSummary] = useState(false)

  const fetchDebts = useCallback(async () => {
    setLoadingDebts(true)
    try {
      const res = await fetch('/api/tips/debts')
      if (res.ok) setDebts(await res.json())
    } finally {
      setLoadingDebts(false)
    }
  }, [])

  useEffect(() => { fetchDebts() }, [fetchDebts])

  const fetchRecords = useCallback(async (page: number) => {
    setLoadingRecords(true)
    try {
      const res = await fetch(`/api/tips/records?page=${page}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setRecords(prev => page === 1 ? data.records : [...prev, ...data.records])
        setHasMore(data.hasMore)
        setHistorialPage(page)
      }
    } finally {
      setLoadingRecords(false)
    }
  }, [])

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true)
    try {
      const res = await fetch(`/api/tips/summary?year=${summaryYear}&month=${summaryMonth}`)
      if (res.ok) setSummary(await res.json())
    } finally {
      setLoadingSummary(false)
    }
  }, [summaryYear, summaryMonth])

  useEffect(() => {
    if (tab === 'historial') fetchRecords(1)
  }, [tab, fetchRecords])

  useEffect(() => {
    if (tab === 'resumen') fetchSummary()
  }, [tab, summaryYear, summaryMonth, fetchSummary])

  async function fetchEmployees() {
    if (!date) return
    setLoadingEmployees(true)
    setEmployees([])
    try {
      const res = await fetch(`/api/tips/shift-employees?date=${date}&period=${period}`)
      if (res.ok) {
        const data: { id: string; name: string; hadShift: boolean }[] = await res.json()
        setEmployees(data.map(e => ({ ...e, selected: e.hadShift })))
      }
    } finally {
      setLoadingEmployees(false)
    }
  }

  const totalAmountNum = parseFloat(totalAmount) || 0
  const activeDebts = debts.filter(d => d.active)
  const totalDeduction = activeDebts.reduce((sum, d) => sum + totalAmountNum * d.percentage / 100, 0)
  const netAmount = totalAmountNum - totalDeduction
  const selectedEmployees = employees.filter(e => e.selected)
  const perPerson = selectedEmployees.length > 0 ? netAmount / selectedEmployees.length : 0

  async function handleSubmit() {
    if (!date || !totalAmount || selectedEmployees.length === 0) {
      toast.error('Rellena todos los campos y selecciona al menos un empleado')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/tips/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date,
          period,
          totalAmount: totalAmountNum,
          employeeIds: selectedEmployees.map(e => e.id),
          notes: notes || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Reparto registrado')
        setTotalAmount('')
        setNotes('')
        setEmployees([])
        await fetchDebts()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Error al registrar')
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteRecord(recordId: string) {
    const res = await fetch(`/api/tips/records/${recordId}`, { method: 'DELETE' })
    if (res.ok) {
      setRecords(prev => prev.filter(r => r.id !== recordId))
      toast.success('Reparto eliminado')
    } else {
      toast.error('Error al eliminar')
    }
  }

  async function handleAddDebt() {
    const amount = parseFloat(newDebtAmount)
    const pct = parseFloat(newDebtPct)
    if (!newDebtDesc || isNaN(amount) || isNaN(pct) || amount <= 0 || pct <= 0 || pct > 100) {
      toast.error('Rellena todos los campos correctamente')
      return
    }
    setAddingDebt(true)
    try {
      const res = await fetch('/api/tips/debts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDebtDesc, amount, percentage: pct }),
      })
      if (res.ok) {
        const newDebt = await res.json()
        setDebts(prev => [newDebt, ...prev])
        setNewDebtDesc('')
        setNewDebtAmount('')
        setNewDebtPct('')
        setShowAddDebt(false)
        toast.success('Deuda añadida')
      } else {
        toast.error('Error al añadir deuda')
      }
    } finally {
      setAddingDebt(false)
    }
  }

  async function handleToggleDebt(debtId: string, currentActive: boolean) {
    const res = await fetch(`/api/tips/debts/${debtId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !currentActive }),
    })
    if (res.ok) {
      const updated = await res.json()
      setDebts(prev => prev.map(d => d.id === debtId ? { ...d, active: updated.active } : d))
    } else {
      toast.error('Error al actualizar deuda')
    }
  }

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {(['nuevo', 'historial', 'deudas', 'resumen'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
              tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'nuevo' ? 'Nuevo reparto' : t === 'historial' ? 'Historial' : t === 'deudas' ? 'Deudas' : 'Resumen mensual'}
          </button>
        ))}
      </div>

      {/* ═══ NUEVO REPARTO ═══ */}
      {tab === 'nuevo' && (
        <div className="space-y-5 max-w-lg">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Turno</label>
              <select
                value={period}
                onChange={e => setPeriod(e.target.value as Period)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="MORNING">Mañana</option>
                <option value="AFTERNOON">Tarde</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Importe total (€)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              placeholder="0.00"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notas (opcional)</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Mesa VIP, noche especial..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-medium text-gray-500">Empleados</label>
              <button
                onClick={fetchEmployees}
                disabled={loadingEmployees || !date}
                className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-semibold hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {loadingEmployees ? 'Cargando...' : 'Sugerir del turno'}
              </button>
            </div>

            {employees.length === 0 && !loadingEmployees && (
              <p className="text-xs text-gray-400 py-2">Pulsa &quot;Sugerir del turno&quot; para ver los empleados del bloster</p>
            )}

            {employees.length > 0 && (
              <div className="space-y-0.5 border border-gray-100 rounded-xl p-2">
                {employees.map(emp => (
                  <label key={emp.id} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emp.selected}
                      onChange={e => setEmployees(prev => prev.map(el =>
                        el.id === emp.id ? { ...el, selected: e.target.checked } : el
                      ))}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm font-medium text-gray-800 flex-1">{emp.name}</span>
                    {!emp.hadShift && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">⚠️ Sin turno</span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>

          {activeDebts.length > 0 && totalAmountNum > 0 && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-orange-700 mb-1">Descuentos por deudas activas</p>
              {activeDebts.map(d => (
                <div key={d.id} className="flex items-center justify-between text-xs text-orange-800">
                  <span className="font-medium">{d.description}</span>
                  <span>−{d.percentage}% → <strong>{fmt(totalAmountNum * d.percentage / 100)}</strong></span>
                </div>
              ))}
              <div className="border-t border-orange-200 pt-1.5 flex justify-between text-xs font-semibold text-orange-900">
                <span>Total descuento</span>
                <span>{fmt(totalDeduction)}</span>
              </div>
            </div>
          )}

          {totalAmountNum > 0 && selectedEmployees.length > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-3">
              <p className="text-xs font-semibold text-green-700 mb-2">Resumen del reparto</p>
              <div className="space-y-1 text-xs text-green-800">
                <div className="flex justify-between">
                  <span>Importe bruto</span>
                  <span>{fmt(totalAmountNum)}</span>
                </div>
                {totalDeduction > 0 && (
                  <div className="flex justify-between text-orange-700">
                    <span>Descuento deudas</span>
                    <span>−{fmt(totalDeduction)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-green-200 pt-1 mt-1">
                  <span>Neto a repartir</span>
                  <span className={netAmount < 0 ? 'text-red-600' : ''}>{fmt(netAmount)}</span>
                </div>
                <div className="flex justify-between mt-0.5">
                  <span>Por empleado ({selectedEmployees.length})</span>
                  <span className="font-bold text-green-900 text-sm">{fmt(perPerson)}</span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting || !date || !totalAmount || selectedEmployees.length === 0}
            className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Registrando...' : 'Registrar reparto'}
          </button>
        </div>
      )}

      {/* ═══ HISTORIAL ═══ */}
      {tab === 'historial' && (
        <div className="space-y-3 max-w-2xl">
          {loadingRecords && records.length === 0 && <p className="text-sm text-gray-400">Cargando...</p>}
          {!loadingRecords && records.length === 0 && (
            <p className="text-sm text-gray-400">No hay repartos registrados todavía.</p>
          )}

          {records.map(record => (
            <div key={record.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{fmtDate(record.date)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      record.period === 'MORNING' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {record.period === 'MORNING' ? 'Mañana' : 'Tarde'}
                    </span>
                    {record.notes && (
                      <span className="text-xs text-gray-400 italic truncate">{record.notes}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">Total: <strong className="text-gray-700">{fmt(record.totalAmount)}</strong></span>
                    {record.deductions.length > 0 && (
                      <span className="text-xs text-gray-500">Deuda: <strong className="text-orange-600">−{fmt(record.deductions.reduce((s, d) => s + d.amount, 0))}</strong></span>
                    )}
                    <span className="text-xs text-gray-500">Neto: <strong className="text-green-700">{fmt(record.netAmount)}</strong></span>
                    <span className="text-xs text-gray-400">{record.shares.length} empleados</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-gray-300 text-xs">{expandedRecord === record.id ? '▲' : '▼'}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteRecord(record.id) }}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {expandedRecord === record.id && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-3 bg-gray-50/50">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Por empleado</p>
                    <div className="space-y-1">
                      {record.shares.map(share => (
                        <div key={share.id} className="flex justify-between items-center text-sm">
                          <span className="font-medium text-gray-700">
                            {share.user.name}
                            {!share.hadShift && <span className="ml-1.5 text-xs text-amber-500">⚠️</span>}
                          </span>
                          <span className="font-semibold text-green-700">{fmt(share.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {record.deductions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Descuentos</p>
                      {record.deductions.map(d => (
                        <div key={d.id} className="flex justify-between text-xs text-orange-700">
                          <span>{d.tipDebt.description}</span>
                          <span className="font-semibold">−{fmt(d.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={() => fetchRecords(historialPage + 1)}
              disabled={loadingRecords}
              className="text-sm text-blue-600 hover:underline disabled:opacity-50"
            >
              {loadingRecords ? 'Cargando...' : 'Ver más'}
            </button>
          )}
        </div>
      )}

      {/* ═══ DEUDAS ═══ */}
      {tab === 'deudas' && (
        <div className="space-y-4 max-w-lg">
          {loadingDebts && debts.length === 0 && <p className="text-sm text-gray-400">Cargando...</p>}

          {!loadingDebts && debts.length === 0 && !showAddDebt && (
            <p className="text-sm text-gray-400">No hay deudas registradas.</p>
          )}

          {debts.map(debt => {
            const paidFraction = Math.min(1, Math.max(0, 1 - debt.remainingAmount / debt.originalAmount))
            const paidPct = Math.round(paidFraction * 100)
            return (
              <div key={debt.id} className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{debt.description}</span>
                        {!debt.active && (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">PAGADA</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Original: {fmt(debt.originalAmount)} · {debt.percentage}% por reparto
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggleDebt(debt.id, debt.active)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-colors shrink-0 ${
                        debt.active
                          ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {debt.active ? 'Desactivar' : 'Reactivar'}
                    </button>
                  </div>

                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>
                      Pendiente:{' '}
                      <strong className={debt.remainingAmount <= 0 ? 'text-green-600' : 'text-gray-800'}>
                        {fmt(debt.remainingAmount)}
                      </strong>
                    </span>
                    <span>{paidPct}% pagado</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${debt.remainingAmount <= 0 ? 'bg-green-500' : 'bg-orange-400'}`}
                      style={{ width: `${paidFraction * 100}%` }}
                    />
                  </div>

                  {debt.deductions.length > 0 && (
                    <button
                      onClick={() => setExpandedDebt(expandedDebt === debt.id ? null : debt.id)}
                      className="mt-2 text-xs text-blue-500 hover:underline"
                    >
                      {expandedDebt === debt.id ? 'Ocultar historial' : `Ver historial (${debt.deductions.length})`}
                    </button>
                  )}
                </div>

                {expandedDebt === debt.id && (
                  <div className="border-t border-gray-100 px-4 py-3 space-y-1.5 bg-gray-50/50">
                    {debt.deductions.map(d => (
                      <div key={d.id} className="flex justify-between text-xs text-gray-600">
                        <span>{fmtDate(d.tipRecord.date)} · {fmt(d.tipRecord.totalAmount)} total</span>
                        <span className="font-semibold text-orange-600">−{fmt(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {showAddDebt ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">Nueva deuda</p>
              <div>
                <label className="text-xs text-gray-500">Descripción</label>
                <input
                  type="text"
                  value={newDebtDesc}
                  onChange={e => setNewDebtDesc(e.target.value)}
                  placeholder="Material roto, adelanto..."
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Importe (€)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={newDebtAmount}
                    onChange={e => setNewDebtAmount(e.target.value)}
                    placeholder="500.00"
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">% por reparto</label>
                  <input
                    type="number" min="1" max="100" step="1"
                    value={newDebtPct}
                    onChange={e => setNewDebtPct(e.target.value)}
                    placeholder="10"
                    className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowAddDebt(false); setNewDebtDesc(''); setNewDebtAmount(''); setNewDebtPct('') }}
                  className="flex-1 bg-gray-100 text-gray-600 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddDebt}
                  disabled={addingDebt}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
                >
                  {addingDebt ? 'Añadiendo...' : 'Añadir'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddDebt(true)}
              className="text-sm text-blue-600 font-semibold hover:underline"
            >
              + Nueva deuda
            </button>
          )}
        </div>
      )}

      {/* ═══ RESUMEN MENSUAL ═══ */}
      {tab === 'resumen' && (
        <div className="space-y-4 max-w-md">
          <div className="flex gap-3 items-center flex-wrap">
            <select
              value={summaryMonth}
              onChange={e => setSummaryMonth(Number(e.target.value))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={i + 1} value={i + 1}>{name}</option>
              ))}
            </select>
            <input
              type="number"
              value={summaryYear}
              onChange={e => setSummaryYear(Number(e.target.value))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loadingSummary && <p className="text-sm text-gray-400">Cargando...</p>}

          {!loadingSummary && summary.length === 0 && (
            <p className="text-sm text-gray-400">No hay propinas registradas para este mes.</p>
          )}

          {summary.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="text-left px-4 py-2.5">Empleado</th>
                    <th className="text-right px-4 py-2.5">Repartos</th>
                    <th className="text-right px-4 py-2.5">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {summary.map((item, i) => (
                    <tr key={item.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        {i === 0 && <span className="mr-1">🥇</span>}
                        {i === 1 && <span className="mr-1">🥈</span>}
                        {i === 2 && <span className="mr-1">🥉</span>}
                        {item.userName}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{item.count}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-green-700">{fmt(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t border-gray-100">
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase">Total mes</td>
                    <td className="px-4 py-2.5 text-right text-xs text-gray-500">
                      {summary.reduce((s, i) => s + i.count, 0)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-800">
                      {fmt(summary.reduce((s, i) => s + i.total, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
