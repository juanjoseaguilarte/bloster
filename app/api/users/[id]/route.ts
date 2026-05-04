import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const isSelf = session.user.id === params.id
  const isAdmin = session.user.role === 'ADMIN'

  if (!isSelf && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data: any = {}

  if (body.password) {
    if (!body.currentPassword && !isAdmin) {
      return NextResponse.json({ error: 'Current password required' }, { status: 400 })
    }
    if (body.currentPassword) {
      const user = await prisma.user.findUnique({ where: { id: params.id } })
      const valid = user && await bcrypt.compare(body.currentPassword, user.passwordHash)
      if (!valid) return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 })
    }
    data.passwordHash = await bcrypt.hash(body.password, 10)
  }

  const isManagerOrAdmin = isAdmin || session.user.role === 'GESTOR'
  if (isManagerOrAdmin) {
    if (body.name) data.name = body.name
    if (body.email) data.email = body.email
    if (body.role) {
      if (body.role === 'ADMIN' && !isAdmin) {
        return NextResponse.json({ error: 'No puedes asignar el rol ADMIN' }, { status: 403 })
      }
      data.role = body.role
    }
    if (body.color) data.color = body.color
    if (body.group) data.group = body.group
    if (body.active !== undefined) data.active = body.active
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, name: true, email: true, role: true, color: true },
  })
  return NextResponse.json(updated)
}
