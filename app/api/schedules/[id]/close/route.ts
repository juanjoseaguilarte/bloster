import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendPushToAll } from '@/lib/push'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const reopen = body.reopen === true

  const updated = await prisma.weekSchedule.update({
    where: { id: params.id },
    data: reopen
      ? { isClosed: false, closedAt: null, closedById: null }
      : { isClosed: true, closedAt: new Date(), closedById: session.user.id },
  })

  if (!reopen) {
    sendPushToAll({ title: 'Bloster', body: '¡Tienes un bloster! 🗓️', url: '/dashboard' }).catch(() => {})
  }

  return NextResponse.json(updated)
}
