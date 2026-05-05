export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Devuelve "YYYY-MM-DD" del lunes en hora LOCAL del dispositivo.
// Usar siempre esto para comunicarse con la API (evita timezone mismatch).
export function getWeekKey(weekStart: Date): string {
  const y = weekStart.getFullYear()
  const m = String(weekStart.getMonth() + 1).padStart(2, '0')
  const d = String(weekStart.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// Parsea una weekKey "YYYY-MM-DD" a Date UTC midnight (igual para todos los timezones).
export function parseWeekKey(key: string): Date {
  return new Date(key + 'T00:00:00.000Z')
}

export function formatWeekLabel(weekStart: Date): string {
  const end = new Date(weekStart)
  end.setUTCDate(end.getUTCDate() + 6)
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
  return `${fmt(weekStart)} – ${fmt(end)}`
}

export function calcHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60)
}

export const DAYS = [
  { key: 'MONDAY', label: 'Lunes' },
  { key: 'TUESDAY', label: 'Martes' },
  { key: 'WEDNESDAY', label: 'Miércoles' },
  { key: 'THURSDAY', label: 'Jueves' },
  { key: 'FRIDAY', label: 'Viernes' },
  { key: 'SATURDAY', label: 'Sábado' },
  { key: 'SUNDAY', label: 'Domingo' },
] as const
