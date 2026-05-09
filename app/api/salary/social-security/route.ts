import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || '')
  const month = parseInt(searchParams.get('month') || '')
  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: 'Missing year/month' }, { status: 400 })
  }

  const record = await prisma.monthSocialSecurity.findUnique({ where: { year_month: { year, month } } })
  return NextResponse.json({ amount: record?.amount ?? 0 })
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { year, month, amount } = await req.json()
  if (isNaN(year) || isNaN(month) || typeof amount !== 'number') {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  const record = await prisma.monthSocialSecurity.upsert({
    where: { year_month: { year, month } },
    update: { amount },
    create: { year, month, amount },
  })
  return NextResponse.json(record)
}
