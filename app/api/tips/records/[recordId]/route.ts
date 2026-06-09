import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { recordId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.$transaction(async (tx) => {
    const deductions = await tx.tipDebtDeduction.findMany({
      where: { tipRecordId: params.recordId },
    })

    for (const ded of deductions) {
      const debt = await tx.tipDebt.findUnique({ where: { id: ded.tipDebtId } })
      if (!debt) continue
      const newRemaining = debt.remainingAmount + ded.amount
      await tx.tipDebt.update({
        where: { id: ded.tipDebtId },
        data: {
          remainingAmount: newRemaining,
          ...(debt.remainingAmount <= 0 && newRemaining > 0 ? { active: true } : {}),
        },
      })
    }

    await tx.tipRecord.delete({ where: { id: params.recordId } })
  })

  return NextResponse.json({ ok: true })
}
