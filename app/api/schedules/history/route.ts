import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const logs = await prisma.weekClearLog.findMany({
    orderBy: { clearedAt: 'desc' },
    include: { clearedBy: { select: { name: true } } },
  })

  return NextResponse.json(logs)
}
