import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { type, fixedAmount, morningRate, afternoonRate, imaginaryRate } = await req.json()

  const config = await prisma.salaryConfig.upsert({
    where: { userId: params.userId },
    update: { type, fixedAmount, morningRate, afternoonRate, imaginaryRate },
    create: { userId: params.userId, type, fixedAmount, morningRate, afternoonRate, imaginaryRate },
  })

  return NextResponse.json(config)
}
