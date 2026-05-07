'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'

interface SalaryConfig {
  type: 'FIXED' | 'PER_SHIFT' | 'MIXED'
  fixedAmount?: number | null
  morningRate?: number | null
  afternoonRate?: number | null
  imaginaryRate?: number | null
}

interface Props {
  userId: string
  userName: string
  current?: SalaryConfig | null
  onClose: () => void
  onSaved: (config: SalaryConfig) => void
}

const TYPE_LABELS: Record<string, string> = { FIXED: 'Fijo', PER_SHIFT: 'Por bloster', MIXED: 'Mixto' }

export default function SalaryConfigModal({ userId, userName, current, onClose, onSaved }: Props) {
  const [type, setType] = useState<'FIXED' | 'PER_SHIFT' | 'MIXED'>(current?.type ?? 'FIXED')
  const [fixedAmount, setFixedAmount] = useState(String(current?.fixedAmount ?? ''))
  const [morningRate, setMorningRate] = useState(String(current?.morningRate ?? ''))
  const [afternoonRate, setAfternoonRate] = useState(String(current?.afternoonRate ?? ''))
  const [imaginaryRate, setImageinaryRate] = useState(String(current?.imaginaryRate ?? ''))
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/salary/config/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          fixedAmount: fixedAmount ? parseFloat(fixedAmount) : null,
          morningRate: morningRate ? parseFloat(morningRate) : null,
          afternoonRate: afternoonRate ? parseFloat(afternoonRate) : null,
          imaginaryRate: imaginaryRate ? parseFloat(imaginaryRate) : null,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        toast.success('Configuración guardada')
        onSaved(data)
        onClose()
      } else {
        toast.error('Error al guardar')
      }
    } finally {
      setSaving(false)
    }
  }

  const showFixed = type === 'FIXED' || type === 'MIXED'
  const showRates = type === 'PER_SHIFT' || type === 'MIXED'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <h3 className="font-bold text-gray-800 text-lg mb-1">Configurar kombat</h3>
        <p className="text-gray-500 text-sm mb-4">{userName}</p>

        {/* Tipo */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-4">
          {(['FIXED', 'PER_SHIFT', 'MIXED'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                type === t ? 'bg-white shadow text-gray-900' : 'text-gray-500'
              }`}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {showFixed && (
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Kombat fijo mensual (€)</label>
              <input
                type="number"
                value={fixedAmount}
                onChange={e => setFixedAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1300"
              />
            </div>
          )}
          {showRates && (
            <>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tarifa bloster mañana (€)</label>
                <input
                  type="number"
                  value={morningRate}
                  onChange={e => setMorningRate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tarifa bloster tarde (€)</label>
                <input
                  type="number"
                  value={afternoonRate}
                  onChange={e => setAfternoonRate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tarifa bloster imaginario (€) <span className="text-gray-400">— opcional</span></label>
                <input
                  type="number"
                  value={imaginaryRate}
                  onChange={e => setImageinaryRate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? '...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
