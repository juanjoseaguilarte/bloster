import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const logs = await prisma.shiftLog.findMany({
    where: { weekScheduleId: params.id },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      changedBy: { select: { id: true, name: true } },
      targetUser: { select: { id: true, name: true } },
    },
  })

  return NextResponse.json(logs)
}
