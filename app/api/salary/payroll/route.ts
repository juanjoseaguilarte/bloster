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

  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  // Include the week before month start to catch shifts in weeks that overlap
  const rangeStart = new Date(monthStart)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 6)

  const [users, exclusions] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { not: 'LIMPIEZA' },
        OR: [
          { active: true },
          // Inactive users: only show if they have a payroll this month
          { active: false, payrolls: { some: { year, month } } },
          // ...or if they have shifts that fall in this month
          { active: false, shifts: { some: { weekSchedule: { weekStart: { gte: rangeStart, lte: monthEnd } } } } },
        ],
      },
      select: {
        id: true, name: true, color: true, group: true, active: true, payrollOnly: true,
        salaryConfig: true,
        payrolls: { where: { year, month } },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.payrollExclusion.findMany({ where: { year, month }, select: { userId: true } }),
  ])

  const excludedIds = new Set(exclusions.map(e => e.userId))
  const result = users.map(u => ({ ...u, excluded: excludedIds.has(u.id) }))

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId, year, month, baseAmount, advances, garnishments, transferAmount, cashAmount, notes } = await req.json()
  const net = baseAmount - advances - garnishments

  const payroll = await prisma.monthlyPayroll.create({
    data: {
      userId, year, month,
      baseAmount, advances, garnishments,
      netAmount: net,
      transferAmount, cashAmount, notes,
    },
  })

  return NextResponse.json(payroll, { status: 201 })
}
