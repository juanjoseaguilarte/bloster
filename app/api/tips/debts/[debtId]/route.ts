import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { debtId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const data: { active?: boolean; description?: string; percentage?: number } = {}
  if (typeof body.active === 'boolean') data.active = body.active
  if (typeof body.description === 'string') data.description = body.description
  if (typeof body.percentage === 'number') data.percentage = body.percentage

  const debt = await prisma.tipDebt.update({
    where: { id: params.debtId },
    data,
  })

  return NextResponse.json(debt)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { debtId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const count = await prisma.tipDebtDeduction.count({ where: { tipDebtId: params.debtId } })
  if (count > 0) {
    return NextResponse.json({ error: 'Debt has deductions, cannot delete' }, { status: 409 })
  }

  await prisma.tipDebt.delete({ where: { id: params.debtId } })
  return NextResponse.json({ ok: true })
}
