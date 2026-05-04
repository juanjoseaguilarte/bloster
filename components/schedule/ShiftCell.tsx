'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

type ShiftType = 'TIME' | 'LIBRE' | 'OFF' | 'IMAGINARY'
type Period = 'MORNING' | 'AFTERNOON'

interface Shift {
  type: ShiftType
  startTime?: string | null
  user: { id: string; name: string; color: string }
}

interface Props {
  shift?: Shift
  userColor: string
  editable: boolean
  period: Period
  onSave: (type: ShiftType, startTime?: string) => void
}

const QUICK_TIMES: Record<Period, string[]> = {
  MORNING:   ['12:00', '12:30', '13:00', '13:30', '14:00'],
  AFTERNOON: ['19:30', '20:00', '20:30', '21:00'],
}

export default function ShiftCell({ shift, userColor, editable, period, onSave }: Props) {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<ShiftType>('OFF')
  const [time, setTime] = useState('')
  const [manual, setManual] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (open) {
      setType(shift?.type || 'OFF')
      const t = shift?.startTime || ''
      setTime(t)
      // If saved time is not in quick list, open manual mode
      setManual(t !== '' && !QUICK_TIMES[period].includes(t))
    }
  }, [open, shift, period])

  const openModal = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (editable) setOpen(true)
  }, [editable])

  function handleSave() {
    onSave(type, type === 'TIME' ? time : undefined)
    setOpen(false)
  }

  function selectQuickTime(t: string) {
    setTime(t)
    setManual(false)
  }

  const bgStyle = shift?.type === 'LIBRE' ? { backgroundColor: userColor } : {}
  const bgClass = shift?.type === 'IMAGINARY' ? 'bg-gray-300' : 'bg-white'
  const textClass = shift?.type === 'LIBRE'
    ? 'text-white font-semibold'
    : shift?.type === 'IMAGINARY' ? 'text-gray-700' : 'text-gray-800'

  const label = !shift || shift.type === 'OFF' ? '--'
    : shift.type === 'LIBRE' ? 'Libre'
    : shift.type === 'IMAGINARY' ? 'Imaginária'
    : shift.startTime || '--'

  const modal = mounted && open ? createPortal(
    <div
      className="fixed inset-0 bg-black/50 z-[9999]"
      onPointerDown={e => { e.stopPropagation(); setOpen(false) }}
    >
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl px-5 pt-4 pb-10"
        onPointerDown={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
        <h3 className="font-semibold mb-4 text-gray-800 text-center text-base">Editar turno</h3>

        {/* Shift type selector */}
        <div className="flex gap-2 mb-4">
          {(['OFF', 'TIME', 'LIBRE', 'IMAGINARY'] as ShiftType[]).map(t => (
            <button
              key={t}
              type="button"
              onPointerDown={e => { e.stopPropagation(); setType(t) }}
              className={`flex-1 py-3 rounded-xl text-xs font-semibold border-2 transition-all ${
                type === t
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-500 bg-white'
              }`}
            >
              {t === 'OFF' ? '--' : t === 'TIME' ? 'Hora' : t === 'LIBRE' ? 'Libre' : 'Imag.'}
            </button>
          ))}
        </div>

        {/* Time picker — only when type is TIME */}
        {type === 'TIME' && (
          <div className="mb-4">
            {/* Quick time buttons */}
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_TIMES[period].map(qt => (
                <button
                  key={qt}
                  type="button"
                  onPointerDown={e => { e.stopPropagation(); selectQuickTime(qt) }}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                    time === qt && !manual
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 bg-white'
                  }`}
                >
                  {qt}
                </button>
              ))}
              <button
                type="button"
                onPointerDown={e => { e.stopPropagation(); setManual(true); if (!manual) setTime('') }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all ${
                  manual
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 bg-white'
                }`}
              >
                Manual
              </button>
            </div>

            {/* Manual input */}
            {manual && (
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                className="w-full border-2 border-blue-300 rounded-xl px-3 py-3 text-sm text-center focus:border-blue-500 outline-none"
                autoFocus
              />
            )}

            {/* Selected time preview */}
            {time && !manual && (
              <p className="text-center text-blue-600 font-bold text-lg mt-1">{time}</p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onPointerDown={e => { e.stopPropagation(); setOpen(false) }}
            className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm text-gray-600 font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onPointerDown={e => { e.stopPropagation(); handleSave() }}
            disabled={type === 'TIME' && !time}
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <td
      className={`text-center text-sm py-2 px-1 border border-gray-200 min-w-[72px] select-none ${bgClass} ${textClass} ${editable ? 'cursor-pointer active:opacity-60' : ''}`}
      style={bgStyle}
      onClick={openModal}
    >
      {label}
      {modal}
    </td>
  )
}
