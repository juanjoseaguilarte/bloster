'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const COLORS = ['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F59E0B','#14B8A6','#F43F5E']

interface User {
  id: string; name: string; email: string; role: string; color: string; group: string; active: boolean
}

const EMPTY_FORM = { name: '', email: '', password: '', role: 'EMPLEADO', color: '#3B82F6', group: 'BARRA' }

export default function UsersClient({ isAdmin }: { isAdmin: boolean }) {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, color: u.color, group: u.group })
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = editing
      ? await fetch(`/api/users/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      : await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    if (res.ok) {
      toast.success(editing ? 'Empleado actualizado' : 'Empleado creado')
      setShowForm(false)
      fetchUsers()
    } else {
      const err = await res.json()
      toast.error(err.error || 'Error')
    }
  }

  async function toggleActive(u: User) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !u.active }),
    })
    if (res.ok) { toast.success(u.active ? 'Desactivado' : 'Activado'); fetchUsers() }
  }

  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active')

  const activeUsers = users.filter(u => u.active)
  const inactiveUsers = users.filter(u => !u.active)
  const barraUsers = activeUsers.filter(u => u.group === 'BARRA')
  const cocinaUsers = activeUsers.filter(u => u.group === 'COCINA')

  const UserRow = ({ u }: { u: User }) => (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-3 py-3 font-medium flex items-center gap-2">
        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: u.color }} />
        {u.name}
      </td>
      <td className="px-3 py-3 text-gray-500 text-xs hidden sm:table-cell">{u.email}</td>
      <td className="px-3 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{u.role}</span></td>
      <td className="px-3 py-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {u.active ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        {isAdmin && (
          <a
            href={`/dashboard/preview/${u.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-600 text-xs mr-3"
          >
            👁 Ver como
          </a>
        )}
        <button onClick={() => openEdit(u)} className="text-blue-600 text-xs mr-3">Editar</button>
        <button onClick={() => toggleActive(u)} className="text-gray-400 text-xs">{u.active ? 'Desactivar' : 'Activar'}</button>
      </td>
    </tr>
  )

  const GroupTable = ({ title, list }: { title: string; list: User[] }) => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-4">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 text-sm">{title}</h2>
        <span className="text-xs text-gray-400">{list.length} empleados</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-gray-500 font-semibold text-xs">Nombre</th>
              <th className="text-left px-3 py-2 text-gray-500 font-semibold text-xs hidden sm:table-cell">Email</th>
              <th className="text-left px-3 py-2 text-gray-500 font-semibold text-xs">Rol</th>
              <th className="text-left px-3 py-2 text-gray-500 font-semibold text-xs">Estado</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {list.length === 0
              ? <tr><td colSpan={5} className="text-center py-4 text-gray-400 text-xs">Sin empleados en este grupo</td></tr>
              : list.map(u => <UserRow key={u.id} u={u} />)
            }
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-800">Empleados</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Nuevo</button>
      </div>

      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-4">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all ${activeTab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Activos
        </button>
        <button
          onClick={() => setActiveTab('inactive')}
          className={`px-5 py-1.5 rounded-lg text-sm font-semibold transition-all relative ${activeTab === 'inactive' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Inactivos
          {inactiveUsers.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">{inactiveUsers.length}</span>
          )}
        </button>
      </div>

      {activeTab === 'active' ? (
        <>
          <GroupTable title="Barra" list={barraUsers} />
          <GroupTable title="Cocina" list={cocinaUsers} />
        </>
      ) : (
        <GroupTable title="Inactivos" list={inactiveUsers} />
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Editar empleado' : 'Nuevo empleado'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm" />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required={!editing} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm" />
              <input placeholder={editing ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña'} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm" />
              <div className="flex gap-2">
                <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                  <option value="EMPLEADO">Empleado</option>
                  <option value="GESTOR">Gestor</option>
                  {isAdmin && <option value="ADMIN">Admin</option>}
                </select>
                <select value={form.group} onChange={e => setForm({...form, group: e.target.value})} className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                  <option value="BARRA">Barra</option>
                  <option value="COCINA">Cocina</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setForm({...form, color: c})}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2.5 rounded-xl border border-gray-300 text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
