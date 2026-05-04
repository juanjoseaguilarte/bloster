import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { count } = await prisma.shift.deleteMany({
    where: { weekScheduleId: params.id },
  })

  // Also reopen the week if it was closed
  await prisma.weekSchedule.update({
    where: { id: params.id },
    data: { isClosed: false, closedAt: null, closedById: null },
  })

  return NextResponse.json({ ok: true, deleted: count })
}
