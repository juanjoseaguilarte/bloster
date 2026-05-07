'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

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
}

interface Props {
  payroll: Payroll
  userName: string
  onClose: () => void
  onSaved: (payroll: Payroll) => void
}

function fmt(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PayrollModal({ payroll, userName, onClose, onSaved }: Props) {
  const [base, setBase] = useState(String(payroll.baseAmount))
  const [advances, setAdvances] = useState(String(payroll.advances))
  const [garnishments, setGarnishments] = useState(String(payroll.garnishments))
  const [transfer, setTransfer] = useState(String(payroll.transferAmount))
  const [cash, setCash] = useState(String(payroll.cashAmount))
  const [notes, setNotes] = useState(payroll.notes ?? '')
  const [saving, setSaving] = useState(false)

  const baseN = parseFloat(base) || 0
  const advN = parseFloat(advances) || 0
  const garnN = parseFloat(garnishments) || 0
  const transferN = parseFloat(transfer) || 0
  const cashN = parseFloat(cash) || 0
  const net = +(baseN - advN - garnN).toFixed(2)
  const splitDiff = +(net - transferN - cashN).toFixed(2)

  // Recalcula efectivo cuando cambia el neto (manteniendo la transferencia fija)
  function handleNetChange(newBase: string, newAdv: string, newGarn: string) {
    const b = parseFloat(newBase) || 0
    const a = parseFloat(newAdv) || 0
    const g = parseFloat(newGarn) || 0
    const newNet = +(b - a - g).toFixed(2)
    const t = parseFloat(transfer) || 0
    setCash(String(+(newNet - t).toFixed(2)))
  }

  async function handleSave() {
    setSaving(true)
    try {
      const body = {
        baseAmount: baseN, advances: advN, garnishments: garnN,
        transferAmount: transferN, cashAmount: cashN, notes,
      }
      let res: Response
      if (payroll.id) {
        res = await fetch(`/api/salary/payroll/${payroll.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        })
      } else {
        res = await fetch('/api/salary/payroll', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, userId: payroll.userId, year: payroll.year, month: payroll.month }),
        })
      }
      if (res.ok) {
        const data = await res.json()
        toast.success('Guardado')
        onSaved(data)
        onClose()
      } else {
        toast.error('Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <h3 className="font-bold text-gray-800 text-lg mb-1">Editar nómina</h3>
        <p className="text-gray-500 text-sm mb-4">{userName}</p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Kombat pactado (€)</label>
            <input type="number" value={base} onChange={e => { setBase(e.target.value); handleNetChange(e.target.value, advances, garnishments) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Adelantos a descontar (€)</label>
            <input type="number" value={advances} onChange={e => { setAdvances(e.target.value); handleNetChange(base, e.target.value, garnishments) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Embargos (€)</label>
            <input type="number" value={garnishments} onChange={e => { setGarnishments(e.target.value); handleNetChange(base, advances, e.target.value) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          {/* Neto calculado */}
          <div className="bg-gray-50 rounded-xl px-3 py-2 flex justify-between items-center">
            <span className="text-xs font-medium text-gray-600">Neto a pagar</span>
            <span className={`font-bold text-sm ${net < 0 ? 'text-red-600' : 'text-gray-800'}`}>{fmt(net)} €</span>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">Reparto del pago</p>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Nómina transferencia (€)</label>
              <input
                type="number"
                value={transfer}
                onChange={e => {
                  setTransfer(e.target.value)
                  const t = parseFloat(e.target.value) || 0
                  setCash(String(+(net - t).toFixed(2)))
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-2">
              <label className="text-xs font-medium text-gray-600 mb-1 block">Pagar efectivo (€) <span className="text-gray-400 font-normal">— calculado automáticamente</span></label>
              <input
                type="number"
                value={cash}
                onChange={e => {
                  setCash(e.target.value)
                  const c = parseFloat(e.target.value) || 0
                  setTransfer(String(+(net - c).toFixed(2)))
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
              />
            </div>
            {Math.abs(splitDiff) > 0.01 && (
              <p className="text-xs text-amber-600 mt-1">
                Diferencia: {fmt(splitDiff)} € (transferencia + efectivo ≠ neto)
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notas</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Ej: 6x30=180€ turno extra..." />
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
