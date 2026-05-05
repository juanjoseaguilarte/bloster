import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcHours } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Returns summary for all weeks in a given month (year + month as params)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || '')
  const month = parseInt(searchParams.get('month') || '') // 1-12

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Invalid year/month' }, { status: 400 })
  }

  // Find all weekStarts that overlap with this month
  // A week belongs to the month if any of its 7 days falls in that month
  const monthStart = new Date(Date.UTC(year, month - 1, 1))
  const monthEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999))

  // Get schedules whose weekStart falls within [monthStart - 6 days, monthEnd]
  const rangeStart = new Date(monthStart)
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 6)

  const schedules = await prisma.weekSchedule.findMany({
    where: {
      weekStart: { gte: rangeStart, lte: monthEnd },
    },
    include: {
      shifts: {
        include: { user: { select: { id: true, name: true, color: true, group: true } } },
      },
    },
    orderBy: { weekStart: 'asc' },
  })

  const [users, configs] = await Promise.all([
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, color: true, group: true } }),
    prisma.config.findMany(),
  ])

  const endMorning = configs.find(c => c.key === 'shift_end_morning')?.value || '14:00'
  const endAfternoon = configs.find(c => c.key === 'shift_end_afternoon')?.value || '22:00'

  // Build week summaries
  const weeks = schedules.map(sched => {
    const weekLabel = sched.weekStart.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    const weekEnd = new Date(sched.weekStart)
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
    const weekEndLabel = weekEnd.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })

    const rows = users.map(user => {
      const userShifts = sched.shifts.filter(s => s.userId === user.id)
      const morningShifts = userShifts.filter(s => s.period === 'MORNING' && s.type === 'TIME')
      const afternoonShifts = userShifts.filter(s => s.period === 'AFTERNOON' && s.type === 'TIME')
      const libres = userShifts.filter(s => s.type === 'LIBRE').length
      const imaginary = userShifts.filter(s => s.type === 'IMAGINARY').length
      const morningHours = morningShifts.reduce((acc, s) => acc + (s.startTime ? calcHours(s.startTime, endMorning) : 0), 0)
      const afternoonHours = afternoonShifts.reduce((acc, s) => acc + (s.startTime ? calcHours(s.startTime, endAfternoon) : 0), 0)

      return {
        user,
        morningShifts: morningShifts.length,
        afternoonShifts: afternoonShifts.length,
        totalShifts: morningShifts.length + afternoonShifts.length,
        totalHours: +(morningHours + afternoonHours).toFixed(1),
        libres,
        imaginary,
      }
    })

    return {
      weekStart: sched.weekStart.toISOString(),
      label: `${weekLabel} – ${weekEndLabel}`,
      isClosed: sched.isClosed,
      rows,
    }
  })

  // Totals per user across all weeks
  const totals = users.map(user => {
    const allRows = weeks.flatMap(w => w.rows.filter(r => r.user.id === user.id))
    return {
      user,
      totalShifts: allRows.reduce((a, r) => a + r.totalShifts, 0),
      totalHours: +allRows.reduce((a, r) => a + r.totalHours, 0).toFixed(1),
      libres: allRows.reduce((a, r) => a + r.libres, 0),
      imaginary: allRows.reduce((a, r) => a + r.imaginary, 0),
    }
  })

  return NextResponse.json({ weeks, totals, users })
}
