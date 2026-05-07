import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payroll = await prisma.monthlyPayroll.update({
    where: { id: params.id },
    data: { status: 'PAID', paidAt: new Date(), paidById: session.user.id },
  })

  return NextResponse.json(payroll)
}
