import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const section = searchParams.get('section') as 'BARRA' | 'COCINA' | null

  if (!section || !['BARRA', 'COCINA'].includes(section)) {
    return NextResponse.json({ error: 'Missing section' }, { status: 400 })
  }

  const users = await prisma.user.findMany({
    where: {
      active: true,
      group: section,
      role: { in: ['EMPLEADO', 'GESTOR'] },
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(users)
}
