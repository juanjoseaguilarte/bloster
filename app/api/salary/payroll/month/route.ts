import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Borrar todas las nóminas de un mes (solo ADMIN)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || '')
  const month = parseInt(searchParams.get('month') || '')
  if (isNaN(year) || isNaN(month)) {
    return NextResponse.json({ error: 'Missing year/month' }, { status: 400 })
  }

  const { count } = await prisma.monthlyPayroll.deleteMany({ where: { year, month } })

  return NextResponse.json({ deleted: count })
}
