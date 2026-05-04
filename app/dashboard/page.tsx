import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import WeekGrid from '@/components/schedule/WeekGrid'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const isEmployee = session?.user?.role === 'EMPLEADO'

  let users: { id: string; name: string; color: string }[] = []

  if (!isEmployee) {
    users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, color: true },
      orderBy: { name: 'asc' },
    })
  } else {
    users = [{ id: session!.user.id, name: session!.user.name!, color: session!.user.color }]
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">
        {isEmployee ? 'Mi turno semanal' : 'Cuadrante semanal'}
      </h1>
      <WeekGrid users={users} readOnly={isEmployee} />
    </div>
  )
}
