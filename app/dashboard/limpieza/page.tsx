import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LimpiezaClient from './LimpiezaClient'

export default async function LimpiezaPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const isStaff = ['ADMIN', 'GESTOR'].includes(session.user.role)
  const isAdmin = session.user.role === 'ADMIN'

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Limpieza</h1>
      <LimpiezaClient
        isStaff={isStaff}
        isAdmin={isAdmin}
        userId={session.user.id}
        userName={session.user.name ?? ''}
      />
    </div>
  )
}
