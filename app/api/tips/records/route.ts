import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const DAYS_MAP: Record<number, string> = {
  0: 'SUNDAY', 1: 'MONDAY', 2: 'TUESDAY', 3: 'WEDNESDAY',
  4: 'THURSDAY', 5: 'FRIDAY', 6: 'SATURDAY',
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const userId = searchParams.get('userId')
  const skip = (page - 1) * limit

  const where = userId
    ? { shares: { some: { userId } } }
    : {}

  const raw = await prisma.tipRecord.findMany({
    where,
    orderBy: { date: 'desc' },
    skip,
    take: limit + 1,
    include: {
      shares: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
      deductions: {
        include: { tipDebt: { select: { id: true, description: true } } },
      },
    },
  })

  const hasMore = raw.length > limit
  const records = hasMore ? raw.slice(0, limit) : raw

  return NextResponse.json({ records, hasMore })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { date, period, totalAmount, employeeIds, notes } = await req.json()

  if (!date || !period || typeof totalAmount !== 'number' || !Array.isArray(employeeIds) || employeeIds.length === 0) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Determine hadShift for each employee
  const [y, m, d] = (date as string).split('-').map(Number)
  const dateUTC = new Date(Date.UTC(y, m - 1, d))
  const dayIndex = dateUTC.getUTCDay()
  const dayOfWeek = DAYS_MAP[dayIndex]
  const daysFromMonday = dayIndex === 0 ? 6 : dayIndex - 1
  const weekStart = new Date(dateUTC)
  weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday)

  const schedule = await prisma.weekSchedule.findUnique({
    where: { weekStart },
    include: {
      shifts: {
        where: {
          day: dayOfWeek as never,
          period: period as never,
          type: { in: ['TIME', 'IMAGINARY'] },
          userId: { in: employeeIds },
        },
        select: { userId: true },
      },
    },
  })

  const shiftUserIds = new Set(schedule?.shifts.map(s => s.userId) ?? [])

  const record = await prisma.$transaction(async (tx) => {
    const activeDebts = await tx.tipDebt.findMany({ where: { active: true } })

    let totalDeduction = 0
    const deductionItems: { debtId: string; amount: number; newRemaining: number }[] = []

    for (const debt of activeDebts) {
      const deduction = totalAmount * (debt.percentage / 100)
      const newRemaining = debt.remainingAmount - deduction
      deductionItems.push({ debtId: debt.id, amount: deduction, newRemaining })
      totalDeduction += deduction
    }

    const netAmount = totalAmount - totalDeduction
    const perPerson = netAmount / employeeIds.length

    // Update debts
    for (const item of deductionItems) {
      await tx.tipDebt.update({
        where: { id: item.debtId },
        data: {
          remainingAmount: item.newRemaining,
          ...(item.newRemaining <= 0 ? { active: false } : {}),
        },
      })
    }

    return tx.tipRecord.create({
      data: {
        date: dateUTC,
        period: period as never,
        totalAmount,
        netAmount,
        notes: notes || null,
        createdById: session.user.id,
        shares: {
          create: (employeeIds as string[]).map(uid => ({
            userId: uid,
            amount: perPerson,
            hadShift: shiftUserIds.has(uid),
          })),
        },
        deductions: {
          create: deductionItems.map(item => ({
            tipDebtId: item.debtId,
            amount: item.amount,
          })),
        },
      },
      include: {
        shares: { include: { user: { select: { id: true, name: true } } } },
        deductions: { include: { tipDebt: { select: { id: true, description: true } } } },
      },
    })
  })

  return NextResponse.json(record, { status: 201 })
}
