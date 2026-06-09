import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [debts, fondoConfig] = await Promise.all([
    prisma.tipDebt.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        deductions: {
          orderBy: { createdAt: 'desc' },
          include: {
            tipRecord: { select: { id: true, date: true, totalAmount: true } },
          },
        },
      },
    }),
    prisma.config.findUnique({ where: { key: 'tip_fondo' } }),
  ])

  const fondo = fondoConfig ? parseFloat(fondoConfig.value) : 0

  return NextResponse.json({ debts, fondo })
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { description, amount, percentage } = await req.json()

  if (!description || typeof amount !== 'number' || amount <= 0 || typeof percentage !== 'number' || percentage <= 0) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const result = await prisma.$transaction(async (tx) => {
    const fondoConfig = await tx.config.findUnique({ where: { key: 'tip_fondo' } })
    const currentFondo = fondoConfig ? parseFloat(fondoConfig.value) : 0

    const fondoApplied = Math.min(currentFondo, amount)
    const remainingAmount = amount - fondoApplied
    const newFondo = currentFondo - fondoApplied

    if (fondoApplied > 0) {
      await tx.config.upsert({
        where: { key: 'tip_fondo' },
        update: { value: String(newFondo) },
        create: { key: 'tip_fondo', value: String(newFondo) },
      })
    }

    const debt = await tx.tipDebt.create({
      data: {
        description,
        originalAmount: amount,
        remainingAmount,
        percentage,
        active: remainingAmount > 0,
        createdById: session.user.id,
      },
      include: { deductions: true },
    })

    return { debt, fondoApplied }
  })

  return NextResponse.json(result, { status: 201 })
}
