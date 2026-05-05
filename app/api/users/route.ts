import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const isAdmin = session.user.role === 'ADMIN'
  const users = await prisma.user.findMany({
    where: isAdmin ? undefined : { role: { not: 'ADMIN' } },
    select: { id: true, name: true, email: true, role: true, color: true, group: true, active: true },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(users)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await req.json()
  const { name, email, password, color, group } = body
  let { role } = body
  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }
  if (session.user.role !== 'ADMIN' && role === 'ADMIN') {
    return NextResponse.json({ error: 'No puedes asignar el rol ADMIN' }, { status: 403 })
  }
  role = role || 'EMPLEADO'
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, color: color || '#3B82F6', group: group || 'BARRA' },
    select: { id: true, name: true, email: true, role: true, color: true, group: true },
  })
  return NextResponse.json(user, { status: 201 })
}
