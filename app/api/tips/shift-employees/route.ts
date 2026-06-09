import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DAYS_MAP: Record<number, string> = {
  0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY',
  4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const period = searchParams.get('period') as 'MORNING' | 'AFTERNOON' | null

  if (!date || !period) {
    return NextResponse.json({ error: 'Missing date or period' }, { status: 400 })
  }

  const [y, m, d] = date.split('-').map(Number)
  const dateUTC = new Date(Date.UTC(y, m - 1, d))
  const dayIndex = dateUTC.getUTCDay()
  const dayOfWeek = DAYS_MAP[dayIndex]
  const daysFromMonday = dayIndex === 0 ? 6 : dayIndex - 1
  const weekStart = new Date(dateUTC)
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday)

  const [allEmployees, schedule] = await Promise.all([
    prisma.user.findMany({
      where: { active: true, role: 'EMPLEADO' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.weekSchedule.findUnique({
      where: { weekStart },
      include: {
        shifts: {
          where: {
            day: dayOfWeek as never,
            period: period as never,
            type: { in: ['TIME', 'IMAGINARY'] },
          },
          select: { userId: true },
        },
      },
    }),
  ])

  const shiftUserIds = new Set(schedule?.shifts.map(s => s.userId) ?? [])

  return NextResponse.json(
    allEmployees.map(emp => ({
      id: emp.id,
      name: emp.name,
      hadShift: shiftUserIds.has(emp.id),
    }))
  )
}
