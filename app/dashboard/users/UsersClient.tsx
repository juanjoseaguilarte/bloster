'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

const COLORS = ['#EF4444','#F97316','#EAB308','#22C55E','#3B82F6','#8B5CF6','#EC4899','#06B6D4','#84CC16','#F59E0B']

interface User {
  id: string; name: string; email: string; role: string; color: string; active: boolean
}

export default function UsersClient() {
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'EMPLEADO', color: '#3B82F6' })

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
    const res = await fetch('/api/users')
    if (res.ok) setUsers(await res.json())
  }

  function openCreate() {
    setEditing(null)
    setForm({ name: '', email: '', password: '', role: 'EMPLEADO', color: '#3B82F6' })
    setShowForm(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, password: '', role: u.role, color: u.color })
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
    if (res.ok) { toast.success(u.active ? 'Empleado desactivado' : 'Empleado activado'); fetchUsers() }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-800">Empleados</h1>
        <button onClick={openCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">+ Nuevo empleado</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Nombre</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Email</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Rol</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Color</th>
              <th className="text-left px-4 py-3 text-gray-500 font-semibold text-xs">Estado</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{u.role}</span></td>
                <td className="px-4 py-3"><span className="w-5 h-5 rounded-full inline-block" style={{ backgroundColor: u.color }} /></td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline text-xs mr-3">Editar</button>
                  <button onClick={() => toggleActive(u)} className="text-gray-500 hover:underline text-xs">{u.active ? 'Desactivar' : 'Activar'}</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="font-semibold text-gray-800 mb-4">{editing ? 'Editar empleado' : 'Nuevo empleado'}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input placeholder="Nombre" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <input placeholder={editing ? "Nueva contraseña (dejar vacío para no cambiar)" : "Contraseña"} type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="EMPLEADO">Empleado</option>
                <option value="GESTOR">Gestor</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map(c => (
                    <button type="button" key={c} onClick={() => setForm({...form, color: c})}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600">Cancelar</button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
