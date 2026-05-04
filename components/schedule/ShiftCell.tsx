'use client'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

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
  const [type, setType] = useState<ShiftType>('OFF')
  const [time, setTime] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Sync modal state with current shift whenever it opens
  useEffect(() => {
    if (open) {
      setType(shift?.type || 'OFF')
      setTime(shift?.startTime || '')
    }
  }, [open, shift])

  const openModal = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (editable) setOpen(true)
  }, [editable])

  function handleSave() {
    onSave(type, type === 'TIME' ? time : undefined)
    setOpen(false)
  }

  const bgStyle = shift?.type === 'LIBRE'
    ? { backgroundColor: userColor }
    : {}

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
        {type === 'TIME' && (
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 mb-4 text-sm text-center focus:border-blue-500 outline-none"
          />
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
            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold"
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
      className={`text-center text-sm py-2 px-1 border border-gray-200 min-w-[80px] select-none ${bgClass} ${textClass} ${editable ? 'cursor-pointer active:opacity-60' : ''}`}
      style={bgStyle}
      onClick={openModal}
    >
      {label}
      {modal}
    </td>
  )
}
