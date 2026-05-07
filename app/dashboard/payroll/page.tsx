import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PayrollClient from './PayrollClient'

export default async function PayrollPage() {
  const session = await getServerSession(authOptions)
  if (!session || !['ADMIN', 'GESTOR'].includes(session.user.role)) redirect('/dashboard')

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Sueldos</h1>
      <PayrollClient isAdmin={session.user.role === 'ADMIN'} />
    </div>
  )
}
