import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

  const startDate = new Date(Date.UTC(year, month - 1, 1))
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  const shares = await prisma.tipShare.findMany({
    where: {
      tipRecord: { date: { gte: startDate, lte: endDate } },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  })

  const map: Record<string, { userId: string; userName: string; total: number; count: number }> = {}
  for (const share of shares) {
    if (!map[share.userId]) {
      map[share.userId] = { userId: share.userId, userName: share.user.name, total: 0, count: 0 }
    }
    map[share.userId].total += share.amount
    map[share.userId].count += 1
  }

  const result = Object.values(map).sort((a, b) => b.total - a.total)
  return NextResponse.json(result)
}
