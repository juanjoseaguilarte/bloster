import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Copiar nóminas de un mes a otro (solo ADMIN)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { fromYear, fromMonth, toYear, toMonth } = await req.json()
  if (!fromYear || !fromMonth || !toYear || !toMonth) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 })
  }

  // Obtener todas las nóminas del mes origen
  const source = await prisma.monthlyPayroll.findMany({
    where: { year: fromYear, month: fromMonth },
  })

  if (source.length === 0) {
    return NextResponse.json({ copied: 0 })
  }

  // Verificar qué usuarios ya tienen nómina en el mes destino
  const existing = await prisma.monthlyPayroll.findMany({
    where: { year: toYear, month: toMonth },
    select: { userId: true },
  })
  const existingIds = new Set(existing.map(e => e.userId))

  // Copiar solo los que no existen ya (sin sobrescribir)
  const toCreate = source.filter(p => !existingIds.has(p.userId))

  if (toCreate.length === 0) {
    return NextResponse.json({ copied: 0, skipped: source.length })
  }

  await prisma.monthlyPayroll.createMany({
    data: toCreate.map(p => ({
      userId: p.userId,
      year: toYear,
      month: toMonth,
      baseAmount: p.baseAmount,
      advances: p.advances,
      garnishments: p.garnishments,
      netAmount: p.netAmount,
      transferAmount: p.transferAmount,
      cashAmount: p.cashAmount,
      notes: p.notes,
      status: 'DRAFT',
    })),
  })

  return NextResponse.json({ copied: toCreate.length, skipped: existingIds.size })
}
