import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import UsersClient from './UsersClient'

export default async function UsersPage() {
  const session = await getServerSession(authOptions)
  if (!['ADMIN', 'GESTOR'].includes(session?.user?.role || '')) redirect('/dashboard')
  return <UsersClient isAdmin={session?.user?.role === 'ADMIN'} />
}
