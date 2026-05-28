import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import EmployeeScheduleView from '@/components/schedule/EmployeeScheduleView'
import PreviewTabs from './PreviewTabs'
import Link from 'next/link'

export default async function PreviewPage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, name: true, role: true },
  })
  if (!user) redirect('/dashboard/users')

  const gridUsers = ['GESTOR', 'ADMIN'].includes(user.role)
    ? await prisma.user.findMany({
        where: { active: true, role: 'EMPLEADO' },
        select: { id: true, name: true, color: true, group: true },
        orderBy: { name: 'asc' },
      })
    : []

  const roleLabel: Record<string, string> = { ADMIN: 'Admin', GESTOR: 'Gestor', EMPLEADO: 'Empleado' }

  return (
    <div>
      {/* Banner de vista previa */}
      <div className="sticky top-0 z-50 bg-amber-400 border-b border-amber-500 px-4 py-2 flex items-center justify-between text-sm text-amber-900">
        <span>
          👁 Vista previa como <strong>{user.name}</strong>
          <span className="ml-2 bg-amber-300 px-2 py-0.5 rounded-full text-xs font-semibold">
            {roleLabel[user.role] ?? user.role}
          </span>
        </span>
        <Link
          href="/dashboard/users"
          className="bg-amber-900 text-amber-50 px-3 py-1 rounded-lg text-xs font-semibold hover:bg-amber-800"
        >
          ✕ Cerrar vista previa
        </Link>
      </div>

      <div className="p-4 sm:p-6">
        {user.role === 'EMPLEADO' ? (
          <EmployeeScheduleView userId={user.id} />
        ) : (
          <PreviewTabs
            simulatedRole={user.role as 'GESTOR' | 'ADMIN'}
            gridUsers={gridUsers}
          />
        )}
      </div>
    </div>
  )
}
