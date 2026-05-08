import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcHours } from '@/lib/utils'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const weekScheduleId = searchParams.get('weekScheduleId')
  if (!weekScheduleId) return NextResponse.json({ error: 'Missing weekScheduleId' }, { status: 400 })

  const [shifts, users, configs] = await Promise.all([
    prisma.shift.findMany({
      where: { weekScheduleId },
      include: { user: { select: { id: true, name: true, color: true } } },
    }),
    prisma.user.findMany({ where: { active: true, payrollOnly: false }, select: { id: true, name: true, color: true } }),
    prisma.config.findMany(),
  ])

  const endMorning = configs.find(c => c.key === 'shift_end_morning')?.value || '14:00'
  const endAfternoon = configs.find(c => c.key === 'shift_end_afternoon')?.value || '22:00'

  const summary = users.map(user => {
    const userShifts = shifts.filter(s => s.userId === user.id)
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

  return NextResponse.json(summary)
}
