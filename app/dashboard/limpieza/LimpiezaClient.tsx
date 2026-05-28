'use client'
import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { getWeekStart, getWeekKey, formatWeekLabel, parseWeekKey, DAYS } from '@/lib/utils'

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

interface SectionUser {
  id: string
  name: string
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
  const [sectionUsers, setSectionUsers] = useState<SectionUser[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [dropdownCell, setDropdownCell] = useState<{ taskId: string; dayOfWeek: string } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTaskName, setNewTaskName] = useState('')
  const [addingTask, setAddingTask] = useState(false)
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  // Leer sección guardada en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('limpieza-section') as 'BARRA' | 'COCINA' | null
    if (saved === 'BARRA' || saved === 'COCINA') setActiveSection(saved)
    setSectionLoaded(true)
  }, [])

  // Cargar usuarios de la sección activa
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
      const [tasksRes, completionsRes] = await Promise.all([
        fetch(`/api/limpieza/tasks?section=${activeSection}`),
        fetch(`/api/limpieza/completions?weekKey=${weekKey}&section=${activeSection}`),
      ])
      const [tasksData, completionsData] = await Promise.all([tasksRes.json(), completionsRes.json()])
      setTasks(Array.isArray(tasksData) ? tasksData : [])
      setCompletions(Array.isArray(completionsData) ? completionsData : [])
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

  function handleCellClick(taskId: string, dayOfWeek: string) {
    const completion = getCompletion(taskId, dayOfWeek)
    if (completion) {
      // Ya marcada → desmarcar directamente
      handleToggle(taskId, dayOfWeek, null)
    } else {
      // Vacía → abrir dropdown de usuarios
      setDropdownCell({ taskId, dayOfWeek })
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
                  <th key={d.key} className="px-2 py-3 text-center font-semibold text-gray-500 min-w-[72px]">
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
                      <div className="flex items-center gap-1.5">
                        {isStaff && (
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
                        )}
                        <span className="text-gray-800 font-medium text-sm leading-tight">{task.name}</span>
                      </div>
                    </td>
                    {DAYS.map(d => {
                      const completion = getCompletion(task.id, d.key)
                      const toggleKey = `${task.id}-${d.key}`
                      const isToggling = toggling === toggleKey
                      return (
                        <td
                          key={d.key}
                          onClick={isToggling ? undefined : () => handleCellClick(task.id, d.key)}
                          className={`text-center px-1 py-2 border border-gray-100 min-w-[72px] cursor-pointer transition-colors select-none ${
                            isToggling ? 'opacity-50' : ''
                          } ${completion ? 'bg-green-50 hover:bg-green-100' : 'bg-white hover:bg-gray-50'}`}
                        >
                          {isToggling ? (
                            <span className="text-gray-300 text-xs">...</span>
                          ) : completion ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="text-green-600 text-sm font-bold leading-none">✓</span>
                              <span className="text-xs text-green-700 font-medium leading-tight max-w-[60px] truncate">
                                {completion.user.name.split(' ')[0]}
                              </span>
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
            <button
              onClick={() => { setShowAddForm(true); setConfirmDelete(null) }}
              className="flex items-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-sm font-semibold transition-colors"
            >
              <span className="text-base leading-none">+</span> Añadir tarea
            </button>
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
