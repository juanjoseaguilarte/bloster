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
    const record = await tx.tipRecord.findUnique({
      where: { id: params.recordId },
      include: { deductions: true },
    })
    if (!record) return

    // Restore each debt's remaining amount
    for (const ded of record.deductions) {
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

    // Restore any surplus that went to fondo
    const totalDeductedFromDebts = record.deductions.reduce((sum, d) => sum + d.amount, 0)
    const totalCalculatedDeduction = record.totalAmount - record.netAmount
    const surplusToRestore = totalCalculatedDeduction - totalDeductedFromDebts

    if (surplusToRestore > 0.001) {
      const fondoConfig = await tx.config.findUnique({ where: { key: 'tip_fondo' } })
      const currentFondo = fondoConfig ? parseFloat(fondoConfig.value) : 0
      const newFondo = Math.max(0, currentFondo - surplusToRestore)
      await tx.config.upsert({
        where: { key: 'tip_fondo' },
        update: { value: String(newFondo) },
        create: { key: 'tip_fondo', value: String(newFondo) },
      })
    }

    await tx.tipRecord.delete({ where: { id: params.recordId } })
  })

  return NextResponse.json({ ok: true })
}
