'use client'
import { useState } from 'react'
import WeekGrid from '@/components/schedule/WeekGrid'
import PayrollClient from '@/app/dashboard/payroll/PayrollClient'

interface User {
  id: string
  name: string
  color: string
  group: string
}

interface Props {
  simulatedRole: 'GESTOR' | 'ADMIN'
  gridUsers: User[]
}

export default function PreviewTabs({ simulatedRole, gridUsers }: Props) {
  const [tab, setTab] = useState<'cuadrante' | 'kombat'>('cuadrante')
  const isAdmin = simulatedRole === 'ADMIN'

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setTab('cuadrante')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'cuadrante' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Cuadrante
        </button>
        <button
          onClick={() => setTab('kombat')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'kombat' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Kombat
        </button>
      </div>

      {tab === 'cuadrante' && (
        <WeekGrid users={gridUsers} readOnly={false} simulatedRole={simulatedRole} />
      )}
      {tab === 'kombat' && (
        <PayrollClient isAdmin={isAdmin} />
      )}
    </div>
  )
}
