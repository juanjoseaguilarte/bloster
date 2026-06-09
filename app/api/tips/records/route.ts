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
  const dateStr = searchParams.get('date')
  const periodFilter = searchParams.get('period')
  const skip = (page - 1) * limit

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {}
  if (userId) where.shares = { some: { userId } }
  if (dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number)
    where.date = new Date(Date.UTC(y, m - 1, d))
  }
  if (periodFilter) where.period = periodFilter

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
    const activeDebts = await tx.tipDebt.findMany({
      where: { active: true },
      orderBy: { createdAt: 'asc' },
    })

    // netAmount is based on the sum of calculated percentages (not actual applied amounts)
    const totalCalculatedDeduction = activeDebts.reduce(
      (sum, debt) => sum + totalAmount * debt.percentage / 100, 0
    )
    const netAmount = totalAmount - totalCalculatedDeduction
    const perPerson = netAmount / employeeIds.length

    // Apply deductions with surplus carry-over between debts
    let carriedSurplus = 0
    const deductionItems: { debtId: string; amount: number }[] = []

    for (const debt of activeDebts) {
      const baseDeduction = totalAmount * debt.percentage / 100
      const toApply = baseDeduction + carriedSurplus

      if (debt.remainingAmount <= toApply) {
        const actualApplied = debt.remainingAmount
        carriedSurplus = toApply - debt.remainingAmount
        await tx.tipDebt.update({
          where: { id: debt.id },
          data: { remainingAmount: 0, active: false },
        })
        if (actualApplied > 0.001) {
          deductionItems.push({ debtId: debt.id, amount: actualApplied })
        }
      } else {
        await tx.tipDebt.update({
          where: { id: debt.id },
          data: { remainingAmount: { decrement: toApply } },
        })
        deductionItems.push({ debtId: debt.id, amount: toApply })
        carriedSurplus = 0
      }
    }

    // Remaining surplus goes to fondo
    if (carriedSurplus > 0.001) {
      const fondoConfig = await tx.config.findUnique({ where: { key: 'tip_fondo' } })
      const currentFondo = fondoConfig ? parseFloat(fondoConfig.value) : 0
      await tx.config.upsert({
        where: { key: 'tip_fondo' },
        update: { value: String(currentFondo + carriedSurplus) },
        create: { key: 'tip_fondo', value: String(currentFondo + carriedSurplus) },
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
