'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getWeekStart, getWeekKey, formatWeekLabel, parseWeekKey, DAYS } from '@/lib/utils'

const DAY_OFFSETS: Record<string, number> = {
  MONDAY: 0, TUESDAY: 1, WEDNESDAY: 2, THURSDAY: 3,
  FRIDAY: 4, SATURDAY: 5, SUNDAY: 6,
}

interface LimpiezaTask {
  id: string
  name: string
  section: 'BARRA' | 'COCINA'
  order: number
  active: boolean
}

interface LimpiezaCompletion {
  id: string
  taskId: string
  dayOfWeek: string
  weekStart: string
  userId: string
  user: { id: string; name: string }
}

interface LimpiezaUrgent {
  id: string
  taskId: string
  dayOfWeek: string
  weekStart: string
}

interface SectionUser {
  id: string
  name: string
}

interface RankingEntry {
  userId: string
  userName: string
  count: number
}

interface Ranking {
  barra: RankingEntry[]
  cocina: RankingEntry[]
}

interface Props {
  isStaff: boolean
  userId: string
  userName: string
}

export default function LimpiezaClient({ isStaff }: Props) {
  const [activeSection, setActiveSection] = useState<'BARRA' | 'COCINA'>('BARRA')
  const [sectionLoaded, setSectionLoaded] = useState(false)
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()))
  const [tasks, setTasks] = useState<LimpiezaTask[]>([])
  const [completions, setCompletions] = useState<LimpiezaCompletion[]>([])
  const [urgents, setUrgents] = useState<LimpiezaUrgent[]>([])
  const [sectionUsers, setSectionUsers] = useState<SectionUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [urgentToggling, setUrgentToggling] = useState<string | null>(null)
  const [dropdownCell, setDropdownCell] = useState<{ taskId: string; dayOfWeek: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [copying, setCopying] = useState(false)
  const [showRanking, setShowRanking] = useState(false)
  const [ranking, setRanking] = useState<Ranking>({ barra: [], cocina: [] })
  const [loadingRanking, setLoadingRanking] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('limpieza-section') as 'BARRA' | 'COCINA' | null
    if (saved === 'BARRA' || saved === 'COCINA') setActiveSection(saved)
    setSectionLoaded(true)
  }, [])

  useEffect(() => {
    if (!sectionLoaded) return
    fetch(`/api/limpieza/users?section=${activeSection}`)
      .then(r => r.json())
      .then(data => setSectionUsers(Array.isArray(data) ? data : []))
      .catch(() => setSectionUsers([]))
  }, [activeSection, sectionLoaded])

  const fetchData = useCallback(async (silent = false) => {
    if (!sectionLoaded) return
    if (!silent) setLoading(true)
    const weekKey = getWeekKey(currentWeek)
    try {
      const [tasksRes, completionsRes, urgentsRes] = await Promise.all([
        fetch(`/api/limpieza/tasks?section=${activeSection}`),
        fetch(`/api/limpieza/completions?weekKey=${weekKey}&section=${activeSection}`),
        fetch(`/api/limpieza/urgent?weekKey=${weekKey}&section=${activeSection}`),
      ])
      const [tasksData, completionsData, urgentsData] = await Promise.all([
        tasksRes.json(), completionsRes.json(), urgentsRes.json(),
      ])
      setTasks(Array.isArray(tasksData) ? tasksData : [])
      setCompletions(Array.isArray(completionsData) ? completionsData : [])
      setUrgents(Array.isArray(urgentsData) ? urgentsData : [])
    } catch {
      if (!silent) toast.error('Error al cargar datos')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [currentWeek, activeSection, sectionLoaded])

  useEffect(() => { fetchData() }, [fetchData])

  useEffect(() => {
    const interval = setInterval(() => fetchData(true), 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  function getCompletion(taskId: string, dayOfWeek: string): LimpiezaCompletion | null {
    return completions.find(c => c.taskId === taskId && c.dayOfWeek === dayOfWeek) ?? null
  }

  function getUrgent(taskId: string, dayOfWeek: string): LimpiezaUrgent | null {
    return urgents.find(u => u.taskId === taskId && u.dayOfWeek === dayOfWeek) ?? null
  }

  function isDayPast(dayKey: string): boolean {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dayDate = new Date(currentWeek)
    dayDate.setDate(dayDate.getDate() + (DAY_OFFSETS[dayKey] ?? 0))
    dayDate.setHours(0, 0, 0, 0)
    return dayDate < today
  }

  function hasCompletionAfter(taskId: string, dayKey: string): boolean {
    const offset = DAY_OFFSETS[dayKey]
    return DAYS.some(d => DAY_OFFSETS[d.key] > offset && !!getCompletion(taskId, d.key))
  }

  function getCellUrgency(taskId: string, dayKey: string): 'overdue' | 'urgent' | 'inherited' | null {
    if (getUrgent(taskId, dayKey)) {
      if (isDayPast(dayKey) && !hasCompletionAfter(taskId, dayKey)) return 'overdue'
      return 'urgent'
    }
    const dayOffset = DAY_OFFSETS[dayKey]
    const inherited = DAYS.some(prev => {
      const prevOffset = DAY_OFFSETS[prev.key]
      if (prevOffset >= dayOffset) return false
      if (!getUrgent(taskId, prev.key)) return false
      if (!isDayPast(prev.key)) return false
      if (getCompletion(taskId, prev.key)) return false
      return !DAYS.some(mid => {
        const midOffset = DAY_OFFSETS[mid.key]
        return midOffset > prevOffset && midOffset < dayOffset && !!getCompletion(taskId, mid.key)
      })
    })
    return inherited ? 'inherited' : null
  }

  async function saveOrder(newTasks: LimpiezaTask[]) {
    try {
      await fetch('/api/limpieza/tasks/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks: newTasks.map((t, i) => ({ id: t.id, order: i })) }),
      })
    } catch {
      toast.error('Error al guardar el orden')
    }
  }

  function moveTask(taskId: string, direction: 'up' | 'down') {
    const idx = tasks.findIndex(t => t.id === taskId)
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === tasks.length - 1) return
    const newTasks = [...tasks]
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    ;[newTasks[idx], newTasks[swapIdx]] = [newTasks[swapIdx], newTasks[idx]]
    setTasks(newTasks)
    saveOrder(newTasks)
  }

  function sortAlphabetically() {
    const sorted = [...tasks].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
    setTasks(sorted)
    saveOrder(sorted)
  }

  async function handleCopyFromPrevWeek() {
    const prevWeek = new Date(currentWeek)
    prevWeek.setDate(prevWeek.getDate() - 7)
    const fromWeekKey = getWeekKey(prevWeek)
    const toWeekKey = getWeekKey(currentWeek)
    setCopying(true)
    try {
      const res = await fetch('/api/limpieza/urgent/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromWeekKey, toWeekKey, section: activeSection }),
      })
      if (res.ok) {
        const { copied, urgents: newUrgents } = await res.json()
        if (copied === 0) {
          toast('La semana anterior no tiene urgentes', { icon: 'ℹ️' })
        } else {
          setUrgents(Array.isArray(newUrgents) ? newUrgents : [])
          toast.success(`${copied} urgente${copied !== 1 ? 's' : ''} copiado${copied !== 1 ? 's' : ''}`)
        }
      } else {
        toast.error('Error al copiar')
      }
    } catch {
      toast.error('Error al copiar')
    } finally {
      setCopying(false)
    }
  }

  function handleCellClick(taskId: string, dayOfWeek: string) {
    if (isStaff) {
      handleToggleUrgent(taskId, dayOfWeek)
      return
    }
    const completion = getCompletion(taskId, dayOfWeek)
    if (completion) {
      handleToggle(taskId, dayOfWeek, null)
    } else {
      setDropdownCell({ taskId, dayOfWeek })
    }
  }

  async function handleToggleUrgent(taskId: string, dayOfWeek: string) {
    const key = `${taskId}-${dayOfWeek}`
    if (urgentToggling === key) return
    setUrgentToggling(key)
    const weekKey = getWeekKey(currentWeek)
    try {
      const res = await fetch('/api/limpieza/urgent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, weekKey, dayOfWeek }),
      })
      if (res.ok) {
        const { action, urgent } = await res.json()
        if (action === 'marked') {
          setUrgents(prev => [...prev, urgent])
        } else {
          setUrgents(prev => prev.filter(u => !(u.taskId === taskId && u.dayOfWeek === dayOfWeek)))
        }
      } else if (res.status !== 409) {
        toast.error('Error al actualizar')
      }
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setUrgentToggling(null)
    }
  }

  async function handleToggle(taskId: string, dayOfWeek: string, userId: string | null) {
    const key = `${taskId}-${dayOfWeek}`
    if (toggling === key) return
    setToggling(key)
    const weekKey = getWeekKey(currentWeek)
    try {
      const body: Record<string, string> = { taskId, weekKey, dayOfWeek }
      if (userId) body.userId = userId
      const res = await fetch('/api/limpieza/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const { action, completion } = await res.json()
        if (action === 'marked') {
          setCompletions(prev => [...prev, completion])
        } else {
          setCompletions(prev => prev.filter(c => !(c.taskId === taskId && c.dayOfWeek === dayOfWeek)))
        }
      } else if (res.status !== 409) {
        toast.error('Error al actualizar')
      }
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setToggling(null)
    }
  }

  function handleUserSelect(userId: string) {
    if (!dropdownCell) return
    handleToggle(dropdownCell.taskId, dropdownCell.dayOfWeek, userId)
    setDropdownCell(null)
  }

  function handleSectionChange(section: 'BARRA' | 'COCINA') {
    setActiveSection(section)
    localStorage.setItem('limpieza-section', section)
    setConfirmDelete(null)
    setShowAddForm(false)
    setDropdownCell(null)
  }

  async function handleAddTask() {
    if (!newTaskName.trim()) return toast.error('Escribe el nombre de la tarea')
    setAddingTask(true)
    try {
      const res = await fetch('/api/limpieza/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTaskName.trim(), section: activeSection }),
      })
      if (res.ok) {
        const task = await res.json()
        setTasks(prev => [...prev, task])
        setNewTaskName('')
        setShowAddForm(false)
        toast.success('Tarea añadida')
      } else {
        toast.error('Error al añadir tarea')
      }
    } catch {
      toast.error('Error al añadir tarea')
    } finally {
      setAddingTask(false)
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (confirmDelete !== taskId) {
      setConfirmDelete(taskId)
      return
    }
    setDeletingTaskId(taskId)
    setConfirmDelete(null)
    try {
      const res = await fetch(`/api/limpieza/tasks/${taskId}`, { method: 'DELETE' })
      if (res.ok) {
        setTasks(prev => prev.filter(t => t.id !== taskId))
        setCompletions(prev => prev.filter(c => c.taskId !== taskId))
        setUrgents(prev => prev.filter(u => u.taskId !== taskId))
        toast.success('Tarea eliminada')
      } else {
        toast.error('Error al eliminar')
      }
    } catch {
      toast.error('Error al eliminar')
    } finally {
      setDeletingTaskId(null)
    }
  }

  const fetchRanking = useCallback(async () => {
    setLoadingRanking(true)
    try {
      const res = await fetch(`/api/limpieza/ranking?weekKey=${getWeekKey(currentWeek)}`)
      if (res.ok) setRanking(await res.json())
    } catch {
      toast.error('Error al cargar el ranking')
    } finally {
      setLoadingRanking(false)
    }
  }, [currentWeek])

  useEffect(() => {
    if (showRanking) fetchRanking()
  }, [showRanking, fetchRanking])

  function toggleRanking() {
    setShowRanking(v => !v)
  }

  const topPerformer = (() => {
    if (completions.length === 0) return null
    const counts: Record<string, { name: string; count: number }> = {}
    for (const c of completions) {
      if (!counts[c.userId]) counts[c.userId] = { name: c.user.name, count: 0 }
      counts[c.userId].count++
    }
    return Object.values(counts).sort((a, b) => b.count - a.count)[0] ?? null
  })()

  function goToPrevWeek() {
    setCurrentWeek(w => { const d = new Date(w); d.setDate(d.getDate() - 7); return d })
    setConfirmDelete(null)
  }
  function goToNextWeek() {
    setCurrentWeek(w => { const d = new Date(w); d.setDate(d.getDate() + 7); return d })
    setConfirmDelete(null)
  }
  function goToCurrentWeek() {
    setCurrentWeek(getWeekStart(new Date()))
    setConfirmDelete(null)
  }

  const isCurrentWeek = getWeekKey(currentWeek) === getWeekKey(getWeekStart(new Date()))

  const todayKey = (['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'])[new Date().getDay()]
  const highlightDay = isCurrentWeek ? todayKey : null

  return (
    <div className="space-y-4">
      {/* Navegación semanal */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={goToPrevWeek}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          ‹
        </button>
        <span className="text-sm font-semibold text-gray-700 min-w-[130px] text-center">
          {formatWeekLabel(parseWeekKey(getWeekKey(currentWeek)))}
        </span>
        <button
          onClick={goToNextWeek}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
        >
          ›
        </button>
        {!isCurrentWeek && (
          <button
            onClick={goToCurrentWeek}
            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
          >
            Actual
          </button>
        )}
        {isStaff && (
          <button
            onClick={handleCopyFromPrevWeek}
            disabled={copying}
            className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold transition-colors disabled:opacity-50"
            title="Copiar urgentes de la semana anterior a esta semana"
          >
            {copying ? '...' : 'Copiar sem. ant.'}
          </button>
        )}
      </div>

      {/* Tabs Barra / Cocina */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['BARRA', 'COCINA'] as const).map(section => (
          <button
            key={section}
            onClick={() => handleSectionChange(section)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSection === section
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {section === 'BARRA' ? 'Barra' : 'Cocina'}
          </button>
        ))}
      </div>

      {!loading && topPerformer && (
        <div className="flex items-center gap-2 text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          <span className="text-base">🌟</span>
          <span className="text-yellow-800">
            El compañero que más tareas ha realizado esta semana es{' '}
            <strong>{topPerformer.name.split(' ')[0]}</strong> con{' '}
            <strong>{topPerformer.count}</strong> {topPerformer.count === 1 ? 'tarea' : 'tareas'}
          </span>
        </div>
      )}

      {isStaff && (
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          Pulsa en una celda para marcarla como <strong>urgente</strong> (naranja). Los empleados de limpieza verán el aviso.
        </p>
      )}

      {/* Grid */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Cargando...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 min-w-[160px] border-r border-gray-200">
                  Tarea
                </th>
                {DAYS.map(d => (
                  <th key={d.key} className={`px-2 py-3 text-center font-semibold min-w-[72px] ${
                    d.key === highlightDay
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-500'
                  }`}>
                    <span className="hidden sm:inline">{d.label}</span>
                    <span className="sm:hidden">{d.label.slice(0, 3)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400 text-sm">
                    {isStaff ? 'No hay tareas. Añade una con el botón de abajo.' : 'No hay tareas configuradas.'}
                  </td>
                </tr>
              ) : (
                tasks.map(task => (
                  <tr key={task.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <td className="sticky left-0 bg-white px-3 py-2 border-r border-gray-100">
                      <div className="flex items-center gap-1">
                        {isStaff && (
                          <>
                            <div className="flex flex-col flex-shrink-0">
                              <button
                                onClick={() => moveTask(task.id, 'up')}
                                disabled={tasks.indexOf(task) === 0}
                                className="text-gray-300 hover:text-blue-500 disabled:opacity-20 disabled:cursor-not-allowed leading-none text-[10px] px-0.5"
                                title="Subir"
                              >▲</button>
                              <button
                                onClick={() => moveTask(task.id, 'down')}
                                disabled={tasks.indexOf(task) === tasks.length - 1}
                                className="text-gray-300 hover:text-blue-500 disabled:opacity-20 disabled:cursor-not-allowed leading-none text-[10px] px-0.5"
                                title="Bajar"
                              >▼</button>
                            </div>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              disabled={deletingTaskId === task.id}
                              className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-semibold transition-colors disabled:opacity-40 ${
                                confirmDelete === task.id
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'text-gray-300 hover:text-red-400 hover:bg-red-50'
                              }`}
                              title={confirmDelete === task.id ? 'Confirmar eliminación' : 'Eliminar tarea'}
                            >
                              {deletingTaskId === task.id ? '...' : confirmDelete === task.id ? '¿Seguro?' : '✕'}
                            </button>
                          </>
                        )}
                        <span className="text-gray-800 font-medium text-sm leading-tight">{task.name}</span>
                      </div>
                    </td>
                    {DAYS.map(d => {
                      const completion = getCompletion(task.id, d.key)
                      const urgency = completion ? null : getCellUrgency(task.id, d.key)
                      const toggleKey = `${task.id}-${d.key}`
                      const isTogglingCell = toggling === toggleKey || urgentToggling === toggleKey

                      let cellBg = 'bg-white hover:bg-gray-50'
                      if (completion) {
                        cellBg = 'bg-green-50 hover:bg-green-100'
                      } else if (urgency === 'overdue') {
                        cellBg = 'bg-red-100 hover:bg-red-200 animate-pulse'
                      } else if (urgency === 'urgent' || urgency === 'inherited') {
                        cellBg = 'bg-amber-50 hover:bg-amber-100'
                      } else if (d.key === highlightDay) {
                        cellBg = 'bg-blue-50 hover:bg-blue-100'
                      }

                      return (
                        <td
                          key={d.key}
                          onClick={isTogglingCell ? undefined : () => handleCellClick(task.id, d.key)}
                          className={`text-center px-1 py-2 border border-gray-100 min-w-[72px] cursor-pointer transition-colors select-none ${
                            isTogglingCell ? 'opacity-50' : ''
                          } ${cellBg}`}
                        >
                          {isTogglingCell ? (
                            <span className="text-gray-300 text-xs">...</span>
                          ) : completion ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-green-600 text-sm font-bold leading-none">✓</span>
                              <span className="text-xs text-green-700 font-medium leading-tight max-w-[60px] truncate">
                                {completion.user.name.split(' ')[0]}
                              </span>
                            </div>
                          ) : urgency === 'overdue' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-red-600 text-base font-bold leading-none">!</span>
                              <span className="text-xs text-red-600 font-semibold leading-tight">No se hizo</span>
                            </div>
                          ) : urgency === 'urgent' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-amber-500 text-base font-bold leading-none">!</span>
                              <span className="text-xs text-amber-600 font-semibold leading-tight">Hacerlo hoy</span>
                            </div>
                          ) : urgency === 'inherited' ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-amber-500 text-base font-bold leading-none">!</span>
                              <span className="text-xs text-amber-600 font-semibold leading-tight">Pendiente</span>
                            </div>
                          ) : (
                            <span className="text-gray-200 text-lg leading-none">+</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Añadir tarea (solo staff) */}
      {isStaff && (
        <div className="space-y-2">
          {!showAddForm ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => { setShowAddForm(true); setConfirmDelete(null) }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition-colors"
              >
                <span className="text-base leading-none">+</span> Añadir tarea
              </button>
              {tasks.length > 1 && (
                <button
                  onClick={sortAlphabetically}
                  className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition-colors"
                  title="Ordenar alfabéticamente"
                >
                  A-Z
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="text"
                value={newTaskName}
                onChange={e => setNewTaskName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                placeholder="Nombre de la tarea..."
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 w-56"
                autoFocus
              />
              <button
                onClick={handleAddTask}
                disabled={addingTask}
                className="px-4 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {addingTask ? 'Añadiendo...' : 'Añadir'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setNewTaskName('') }}
                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Ranking */}
      <div>
        <button
          onClick={toggleRanking}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition-colors"
        >
          <span>🏆</span>
          {showRanking ? 'Ocultar ranking' : 'Ver ranking'}
        </button>

        {showRanking && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['barra', 'cocina'] as const).map(sec => (
              <div key={sec} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wide mb-3">
                  {sec === 'barra' ? 'Barra' : 'Cocina'}
                </h3>
                {loadingRanking ? (
                  <p className="text-sm text-gray-400">Cargando...</p>
                ) : ranking[sec].length === 0 ? (
                  <p className="text-sm text-gray-400">Sin datos todavía</p>
                ) : (
                  <ol className="space-y-1.5">
                    {ranking[sec].map((entry, i) => (
                      <li key={entry.userId} className="flex items-center gap-2">
                        <span className="w-6 text-center text-base leading-none flex-shrink-0">
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                            <span className="text-xs text-gray-400 font-semibold">{i + 1}</span>
                          )}
                        </span>
                        <span className="flex-1 text-sm text-gray-800 font-medium truncate">
                          {entry.userName.split(' ')[0]}
                        </span>
                        <span className="text-sm font-bold text-blue-600 flex-shrink-0">
                          {entry.count} {entry.count === 1 ? 'tarea' : 'tareas'}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dropdown: seleccionar quién hizo la tarea */}
      {dropdownCell && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/25"
          onClick={() => setDropdownCell(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl p-5 w-64 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              ¿Quién lo hizo?
            </p>
            {sectionUsers.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-2">
                No hay empleados en esta sección
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {sectionUsers.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleUserSelect(u.id)}
                    className="text-left px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setDropdownCell(null)}
              className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
