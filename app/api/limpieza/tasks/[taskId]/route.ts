import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { countsForRanking } = await req.json()
  const task = await prisma.limpiezaTask.update({
    where: { id: params.taskId },
    data: { countsForRanking },
  })

  return NextResponse.json(task)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { taskId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.limpiezaTask.update({
    where: { id: params.taskId },
    data: { active: false },
  })

  return NextResponse.json({ ok: true })
}
