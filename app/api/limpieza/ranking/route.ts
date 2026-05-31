import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parseWeekKey } from '@/lib/utils'

export const dynamic = 'force-dynamic'

async function getSectionRanking(section: 'BARRA' | 'COCINA', weekStart: Date) {
  const results = await prisma.limpiezaCompletion.groupBy({
    by: ['userId'],
    where: { weekStart, task: { section, active: true } },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  })

  if (results.length === 0) return []

  const users = await prisma.user.findMany({
    where: { id: { in: results.map(r => r.userId) } },
    select: { id: true, name: true },
  })

  return results.map(r => ({
    userId: r.userId,
    userName: users.find(u => u.id === r.userId)?.name ?? 'Desconocido',
    count: r._count.id,
  }))
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekKey = searchParams.get('weekKey')
  if (!weekKey) return NextResponse.json({ error: 'Missing weekKey' }, { status: 400 })

  const weekStart = parseWeekKey(weekKey)

  const [barra, cocina] = await Promise.all([
    getSectionRanking('BARRA', weekStart),
    getSectionRanking('COCINA', weekStart),
  ])

  return NextResponse.json({ barra, cocina })
}
