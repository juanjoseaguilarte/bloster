import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseWeekKey } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { fromWeekKey, toWeekKey, section } = await req.json()
  if (!fromWeekKey || !toWeekKey) {
    return NextResponse.json({ error: 'Missing weekKeys' }, { status: 400 })
  }

  const fromWeekStart = parseWeekKey(fromWeekKey)
  const toWeekStart = parseWeekKey(toWeekKey)

  // Obtener urgentes de la semana origen
  const source = await prisma.limpiezaUrgent.findMany({
    where: {
      weekStart: fromWeekStart,
      task: { section, active: true },
    },
    select: { taskId: true, dayOfWeek: true },
  })

  if (source.length === 0) {
    return NextResponse.json({ copied: 0 })
  }

  // Crear en la semana destino ignorando duplicados
  let copied = 0
  for (const { taskId, dayOfWeek } of source) {
    try {
      await prisma.limpiezaUrgent.create({ data: { taskId, weekStart: toWeekStart, dayOfWeek } })
      copied++
    } catch {
      // P2002 unique constraint → ya existe, ignorar
    }
  }

  // Devolver los nuevos urgentes creados
  const newUrgents = await prisma.limpiezaUrgent.findMany({
    where: { weekStart: toWeekStart, task: { section } },
    select: { id: true, taskId: true, dayOfWeek: true, weekStart: true },
  })

  return NextResponse.json({ copied, urgents: newUrgents })
}
