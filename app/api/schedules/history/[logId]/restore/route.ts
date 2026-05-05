import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ShiftSnapshot {
  userId: string
  day: string
  period: string
  type: string
  startTime: string | null
}

export async function POST(req: NextRequest, { params }: { params: { logId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const log = await prisma.weekClearLog.findUnique({ where: { id: params.logId } })
  if (!log) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Buscar o crear el WeekSchedule de esa semana
  let schedule = await prisma.weekSchedule.findUnique({ where: { weekStart: log.weekStart } })
  if (!schedule) {
    schedule = await prisma.weekSchedule.create({ data: { weekStart: log.weekStart } })
  }

  const shifts = log.shifts as unknown as ShiftSnapshot[]

  // Restaurar los turnos con upsert (no machaca los que ya existan)
  await Promise.all(
    shifts.map(s =>
      prisma.shift.upsert({
        where: {
          userId_weekScheduleId_day_period: {
            userId: s.userId,
            weekScheduleId: schedule!.id,
            day: s.day as any,
            period: s.period as any,
          },
        },
        update: { type: s.type as any, startTime: s.startTime },
        create: {
          userId: s.userId,
          weekScheduleId: schedule!.id,
          day: s.day as any,
          period: s.period as any,
          type: s.type as any,
          startTime: s.startTime,
        },
      })
    )
  )

  // Borrar el log una vez restaurado
  await prisma.weekClearLog.delete({ where: { id: params.logId } })

  return NextResponse.json({ ok: true, restored: shifts.length })
}
