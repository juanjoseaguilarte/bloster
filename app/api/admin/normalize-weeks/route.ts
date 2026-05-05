import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Normaliza weekStart de todos los WeekSchedule y WeekClearLog a UTC midnight del lunes.
// Si hay colisión (ya existe un schedule normalizado), fusiona los shifts y elimina el duplicado.
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  function toMondayUTCMidnight(date: Date): Date {
    const d = new Date(date)
    d.setUTCHours(0, 0, 0, 0)
    const day = d.getUTCDay() // 0=Sun, 1=Mon, ...
    if (day === 0) d.setUTCDate(d.getUTCDate() + 1)       // domingo → lunes
    else if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1)) // otro → lunes anterior
    return d
  }

  const schedules = await prisma.weekSchedule.findMany({ include: { shifts: true } })
  let updated = 0

  for (const sched of schedules) {
    const normalized = toMondayUTCMidnight(sched.weekStart)
    if (normalized.getTime() === sched.weekStart.getTime()) continue // ya correcto

    const existing = await prisma.weekSchedule.findUnique({ where: { weekStart: normalized } })

    if (!existing) {
      await prisma.weekSchedule.update({ where: { id: sched.id }, data: { weekStart: normalized } })
    } else {
      // Fusionar: upsert shift a shift para respetar unique constraint, luego borrar el duplicado
      for (const shift of sched.shifts) {
        await prisma.shift.upsert({
          where: {
            userId_weekScheduleId_day_period: {
              userId: shift.userId,
              weekScheduleId: existing.id,
              day: shift.day,
              period: shift.period,
            },
          },
          update: { type: shift.type, startTime: shift.startTime },
          create: {
            userId: shift.userId,
            weekScheduleId: existing.id,
            day: shift.day,
            period: shift.period,
            type: shift.type,
            startTime: shift.startTime,
          },
        })
      }
      await prisma.shift.deleteMany({ where: { weekScheduleId: sched.id } })
      await prisma.weekSchedule.delete({ where: { id: sched.id } })
    }
    updated++
  }

  // Normalizar WeekClearLog también
  const logs = await prisma.weekClearLog.findMany()
  let logsUpdated = 0
  for (const log of logs) {
    const normalized = toMondayUTCMidnight(log.weekStart)
    if (normalized.getTime() !== log.weekStart.getTime()) {
      await prisma.weekClearLog.update({ where: { id: log.id }, data: { weekStart: normalized } })
      logsUpdated++
    }
  }

  return NextResponse.json({ ok: true, schedulesNormalized: updated, logsNormalized: logsUpdated })
}
