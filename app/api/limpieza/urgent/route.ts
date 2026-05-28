import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseWeekKey } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekKey = searchParams.get('weekKey')
  const section = searchParams.get('section') as 'BARRA' | 'COCINA' | null

  if (!weekKey) return NextResponse.json({ error: 'Missing weekKey' }, { status: 400 })

  const weekStart = parseWeekKey(weekKey)

  const urgents = await prisma.limpiezaUrgent.findMany({
    where: {
      weekStart,
      ...(section ? { task: { section } } : {}),
    },
    select: { id: true, taskId: true, dayOfWeek: true, weekStart: true, markedAt: true },
  })

  return NextResponse.json(urgents)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { taskId, weekKey, dayOfWeek } = await req.json()
  const weekStart = parseWeekKey(weekKey)

  const existing = await prisma.limpiezaUrgent.findUnique({
    where: { taskId_weekStart_dayOfWeek: { taskId, weekStart, dayOfWeek } },
  })

  if (existing) {
    await prisma.limpiezaUrgent.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: 'unmarked' })
  }

  try {
    const urgent = await prisma.limpiezaUrgent.create({
      data: { taskId, weekStart, dayOfWeek },
    })
    return NextResponse.json({ action: 'marked', urgent }, { status: 201 })
  } catch (e: unknown) {
    if ((e as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Conflict' }, { status: 409 })
    }
    throw e
  }
}
