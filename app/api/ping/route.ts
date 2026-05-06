import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ ok: false })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { lastLoginAt: true },
  })

  // Solo actualizar si han pasado más de 5 minutos desde el último registro
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  if (!user?.lastLoginAt || user.lastLoginAt < fiveMinutesAgo) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLoginAt: new Date() },
    })
  }

  return NextResponse.json({ ok: true })
}
