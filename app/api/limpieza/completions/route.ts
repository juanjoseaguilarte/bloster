import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseWeekKey } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const weekKey = searchParams.get('weekKey')
  const section = searchParams.get('section') as 'BARRA' | 'COCINA' | null

  if (!weekKey) return NextResponse.json({ error: 'Missing weekKey' }, { status: 400 })

  const weekStart = parseWeekKey(weekKey)

  const completions = await prisma.limpiezaCompletion.findMany({
    where: {
      weekStart,
      task: {
        active: true,
        ...(section ? { section } : {}),
      },
    },
    include: { user: { select: { id: true, name: true } } },
  })

  return NextResponse.json(completions)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { taskId, weekKey, dayOfWeek } = await req.json()
  if (!taskId || !weekKey || !dayOfWeek) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const weekStart = parseWeekKey(weekKey)

  const existing = await prisma.limpiezaCompletion.findUnique({
    where: { taskId_weekStart_dayOfWeek: { taskId, weekStart, dayOfWeek } },
  })

  if (existing) {
    await prisma.limpiezaCompletion.delete({ where: { id: existing.id } })
    return NextResponse.json({ action: 'unmarked', completion: null })
  }

  try {
    const completion = await prisma.limpiezaCompletion.create({
      data: { taskId, weekStart, dayOfWeek, userId: session.user.id },
      include: { user: { select: { id: true, name: true } } },
    })
    return NextResponse.json({ action: 'marked', completion })
  } catch (err: unknown) {
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'Conflict' }, { status: 409 })
    }
    throw err
  }
}
