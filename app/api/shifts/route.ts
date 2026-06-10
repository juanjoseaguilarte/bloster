import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, weekScheduleId, day, period, type, startTime } = body

  if (!userId || !weekScheduleId || !day || !period || !type) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const weekSchedule = await prisma.weekSchedule.findUnique({
    where: { id: weekScheduleId },
    select: { isClosed: true },
  })

  if (!weekSchedule) {
    return NextResponse.json({ error: 'Semana no encontrada' }, { status: 404 })
  }

  if (weekSchedule.isClosed) {
    return NextResponse.json(
      { error: 'Esta semana está publicada. Reabre la semana para poder editar.' },
      { status: 403 }
    )
  }

  const existing = await prisma.shift.findUnique({
    where: { userId_weekScheduleId_day_period: { userId, weekScheduleId, day, period } },
  })

  const shift = await prisma.shift.upsert({
    where: { userId_weekScheduleId_day_period: { userId, weekScheduleId, day, period } },
    update: { type, startTime: type === 'TIME' ? startTime : null },
    create: { userId, weekScheduleId, day, period, type, startTime: type === 'TIME' ? startTime : null },
    include: { user: { select: { id: true, name: true, color: true } } },
  })

  await prisma.shiftLog.create({
    data: {
      weekScheduleId,
      changedById: session.user.id,
      action: 'shift',
      targetUserId: userId,
      day,
      period,
      oldType: existing?.type ?? null,
      newType: type,
      oldStartTime: existing?.startTime ?? null,
      newStartTime: type === 'TIME' ? (startTime ?? null) : null,
    },
  })

  return NextResponse.json(shift)
}
