import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWeekStart } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { toWeekStart } = await req.json()
  if (!toWeekStart) return NextResponse.json({ error: 'Missing toWeekStart' }, { status: 400 })

  const toDate = new Date(toWeekStart)
  const fromDate = new Date(toDate)
  fromDate.setDate(fromDate.getDate() - 7)

  const fromSchedule = await prisma.weekSchedule.findUnique({
    where: { weekStart: fromDate },
    include: { shifts: true },
  })

  if (!fromSchedule || fromSchedule.shifts.length === 0) {
    return NextResponse.json({ error: 'No hay turnos en la semana anterior' }, { status: 404 })
  }

  // Get or create destination week
  let toSchedule = await prisma.weekSchedule.findUnique({ where: { weekStart: toDate } })
  if (!toSchedule) {
    toSchedule = await prisma.weekSchedule.create({ data: { weekStart: toDate } })
  }

  // Upsert each shift from previous week into current week
  await Promise.all(
    fromSchedule.shifts.map(shift =>
      prisma.shift.upsert({
        where: {
          userId_weekScheduleId_day_period: {
            userId: shift.userId,
            weekScheduleId: toSchedule!.id,
            day: shift.day,
            period: shift.period,
          },
        },
        update: { type: shift.type, startTime: shift.startTime },
        create: {
          userId: shift.userId,
          weekScheduleId: toSchedule!.id,
          day: shift.day,
          period: shift.period,
          type: shift.type,
          startTime: shift.startTime,
        },
      })
    )
  )

  return NextResponse.json({ ok: true, copied: fromSchedule.shifts.length })
}
