import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getSectionRanking(section: 'BARRA' | 'COCINA') {
  const results = await prisma.limpiezaCompletion.groupBy({
    by: ['userId'],
    where: { task: { section, active: true } },
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

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [barra, cocina] = await Promise.all([
    getSectionRanking('BARRA'),
    getSectionRanking('COCINA'),
  ])

  return NextResponse.json({ barra, cocina })
}
