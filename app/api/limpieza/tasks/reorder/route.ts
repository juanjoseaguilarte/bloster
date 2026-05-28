import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { tasks } = await req.json()
  if (!Array.isArray(tasks)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
  }

  await prisma.$transaction(
    tasks.map(({ id, order }: { id: string; order: number }) =>
      prisma.limpiezaTask.update({ where: { id }, data: { order } })
    )
  )

  return NextResponse.json({ ok: true })
}
