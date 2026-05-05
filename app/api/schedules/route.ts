import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getWeekStart } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const weekParam = searchParams.get('week')
  const weekStart = weekParam ? new Date(weekParam) : getWeekStart(new Date())

  const isEmployee = session.user.role === 'EMPLEADO'

  // Employees can only see closed weeks — no past/future restriction
  // (timezone differences between client and server make timestamp comparison unreliable)

  let schedule = await prisma.weekSchedule.findUnique({
    where: { weekStart },
    include: {
      shifts: {
        include: { user: { select: { id: true, name: true, color: true } } },
      },
    },
  })

  if (!schedule) {
    schedule = await prisma.weekSchedule.create({
      data: { weekStart },
      include: {
        shifts: {
          include: { user: { select: { id: true, name: true, color: true } } },
        },
      },
    })
  }

  if (isEmployee && !schedule.isClosed) {
    return NextResponse.json({ error: 'Week not published' }, { status: 403 })
  }

  return NextResponse.json(schedule, {
    headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
