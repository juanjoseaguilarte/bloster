'use client'
import { useState } from 'react'

type ShiftType = 'TIME' | 'LIBRE' | 'OFF' | 'IMAGINARY'

interface Shift {
  type: ShiftType
  startTime?: string | null
  user: { id: string; name: string; color: string }
}

interface Props {
  shift?: Shift
  userColor: string
  editable: boolean
  onSave: (type: ShiftType, startTime?: string) => void
}

export default function ShiftCell({ shift, userColor, editable, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ShiftType>(shift?.type || 'OFF')
  const [time, setTime] = useState(shift?.startTime || '')

  const bgColor = () => {
    if (!shift || shift.type === 'OFF') return 'bg-white'
    if (shift.type === 'LIBRE') return ''
    if (shift.type === 'IMAGINARY') return 'bg-gray-300'
    return 'bg-white'
  }

  const cellStyle = () => {
    if (shift?.type === 'LIBRE') return { backgroundColor: userColor }
    return {}
  }

  const label = () => {
    if (!shift || shift.type === 'OFF') return '--'
    if (shift.type === 'LIBRE') return 'Libre'
    if (shift.type === 'IMAGINARY') return 'Imaginária'
    return shift.startTime || '--'
  }

  const textColor = shift?.type === 'LIBRE' ? 'text-white font-semibold' : shift?.type === 'IMAGINARY' ? 'text-gray-700' : 'text-gray-800'

  function handleSave() {
    onSave(type, type === 'TIME' ? time : undefined)
    setOpen(false)
  }

  return (
    <td
      className={`text-center text-sm py-2 px-1 border border-gray-200 min-w-[80px] ${bgColor()} ${editable ? 'cursor-pointer hover:opacity-80' : ''} ${textColor}`}
      style={cellStyle()}
      onClick={() => editable && setOpen(true)}
    >
      {label()}
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => { e.stopPropagation(); setOpen(false) }}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-72" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold mb-4 text-gray-800">Editar turno</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {(['OFF', 'TIME', 'LIBRE', 'IMAGINARY'] as ShiftType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                    type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {t === 'OFF' ? 'No trabaja (--)' : t === 'TIME' ? 'Hora entrada' : t === 'LIBRE' ? 'Libre' : 'Imaginária'}
                </button>
              ))}
            </div>
            {type === 'TIME' && (
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-sm"
              />
            )}
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </td>
  )
}
