import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const debts = await prisma.tipDebt.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      deductions: {
        orderBy: { createdAt: 'desc' },
        include: {
          tipRecord: { select: { id: true, date: true, totalAmount: true } },
        },
      },
    },
  })

  return NextResponse.json(debts)
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

  const debt = await prisma.tipDebt.create({
    data: {
      description,
      originalAmount: amount,
      remainingAmount: amount,
      percentage,
      createdById: session.user.id,
    },
    include: { deductions: true },
  })

  return NextResponse.json(debt, { status: 201 })
}
