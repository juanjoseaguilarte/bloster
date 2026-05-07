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
  const userId = searchParams.get('userId')

  if (!userId || isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  const config = await prisma.salaryConfig.findUnique({ where: { userId } })
  if (!config) return NextResponse.json({ amount: 0, breakdown: null })

  // Semanas que solapan con el mes
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))
  const rangeStart = new Date(monthStart)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 6)

  const shifts = await prisma.shift.findMany({
    where: {
      userId,
      type: { in: ['TIME', 'IMAGINARY'] },
      weekSchedule: { weekStart: { gte: rangeStart, lte: monthEnd } },
    },
    include: { weekSchedule: { select: { weekStart: true } } },
  })

  // Filtrar solo días que caigan dentro del mes
  const DAYS = ['MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY','SUNDAY']
  const shiftsInMonth = shifts.filter(s => {
    const weekStart = new Date(s.weekSchedule.weekStart)
    const dayOffset = DAYS.indexOf(s.day)
    const shiftDate = new Date(weekStart)
    shiftDate.setUTCDate(shiftDate.getUTCDate() + dayOffset)
    return shiftDate >= monthStart && shiftDate <= monthEnd
  })

  const morningCount = shiftsInMonth.filter(s => s.period === 'MORNING' && s.type === 'TIME').length
  const afternoonCount = shiftsInMonth.filter(s => s.period === 'AFTERNOON' && s.type === 'TIME').length
  const imaginaryCount = shiftsInMonth.filter(s => s.type === 'IMAGINARY').length

  let amount = 0
  if (config.type === 'FIXED') {
    amount = config.fixedAmount ?? 0
  } else if (config.type === 'PER_SHIFT') {
    amount =
      morningCount * (config.morningRate ?? 0) +
      afternoonCount * (config.afternoonRate ?? 0) +
      imaginaryCount * (config.imaginaryRate ?? 0)
  } else {
    // MIXED
    amount =
      (config.fixedAmount ?? 0) +
      morningCount * (config.morningRate ?? 0) +
      afternoonCount * (config.afternoonRate ?? 0) +
      imaginaryCount * (config.imaginaryRate ?? 0)
  }

  return NextResponse.json({
    amount: +amount.toFixed(2),
    breakdown: { morningCount, afternoonCount, imaginaryCount },
    config: { type: config.type, fixedAmount: config.fixedAmount, morningRate: config.morningRate, afternoonRate: config.afternoonRate },
  })
}
