import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import WeekGrid from '@/components/schedule/WeekGrid'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const isEmployee = session?.user?.role === 'EMPLEADO'

  let users: { id: string; name: string; color: string; group: 'BARRA' | 'COCINA' }[] = []

  if (!isEmployee) {
    users = await prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, color: true, group: true },
      orderBy: { name: 'asc' },
    })
  } else {
    const dbUser = await prisma.user.findUnique({
      where: { id: session!.user.id },
      select: { id: true, name: true, color: true, group: true },
    })
    users = dbUser ? [dbUser] : []
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
