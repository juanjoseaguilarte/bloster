import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { baseAmount, advances, garnishments, transferAmount, cashAmount, notes } = await req.json()
  const netAmount = baseAmount - advances - garnishments

  const payroll = await prisma.monthlyPayroll.update({
    where: { id: params.id },
    data: { baseAmount, advances, garnishments, netAmount, transferAmount, cashAmount, notes },
  })

  return NextResponse.json(payroll)
}
