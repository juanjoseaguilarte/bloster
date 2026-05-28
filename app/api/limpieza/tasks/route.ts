import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section') as 'BARRA' | 'COCINA' | null

  const tasks = await prisma.limpiezaTask.findMany({
    where: {
      active: true,
      ...(section ? { section } : {}),
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
  })

  return NextResponse.json(tasks)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { name, section } = await req.json()
  if (!name?.trim() || !['BARRA', 'COCINA'].includes(section)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const maxOrder = await prisma.limpiezaTask.aggregate({
    where: { section, active: true },
    _max: { order: true },
  })
  const order = (maxOrder._max.order ?? -1) + 1

  const task = await prisma.limpiezaTask.create({
    data: { name: name.trim(), section, order },
  })

  return NextResponse.json(task, { status: 201 })
}
