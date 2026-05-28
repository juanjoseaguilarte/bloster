import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import WeekGrid from '@/components/schedule/WeekGrid'
import EmployeeScheduleView from '@/components/schedule/EmployeeScheduleView'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const role = session?.user?.role

  if (role === 'LIMPIEZA') redirect('/dashboard/limpieza')

  const isEmployee = role === 'EMPLEADO'

  if (isEmployee) {
    return <EmployeeScheduleView userId={session!.user.id} />
  }

  const users = await prisma.user.findMany({
    where: { active: true, role: 'EMPLEADO' },
    select: { id: true, name: true, color: true, group: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-4">Cuadrante semanal</h1>
      <WeekGrid users={users} />
    </div>
  )
}
