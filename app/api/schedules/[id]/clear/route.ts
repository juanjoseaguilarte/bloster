import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const schedule = await prisma.weekSchedule.findUnique({
    where: { id: params.id },
    include: { shifts: true },
  })
  if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Guardar snapshot antes de borrar para poder restaurar después
  if (schedule.shifts.length > 0) {
    await prisma.weekClearLog.create({
      data: {
        weekStart: schedule.weekStart,
        clearedById: session.user.id,
        shifts: schedule.shifts.map(s => ({
          userId: s.userId,
          day: s.day,
          period: s.period,
          type: s.type,
          startTime: s.startTime ?? null,
        })),
      },
    })
  }

  const { count } = await prisma.shift.deleteMany({
    where: { weekScheduleId: params.id },
  })

  await prisma.weekSchedule.update({
    where: { id: params.id },
    data: { isClosed: false, closedAt: null, closedById: null },
  })

  return NextResponse.json({ ok: true, deleted: count })
}
