import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import PropinasClient from './PropinasClient'

export const dynamic = 'force-dynamic'

export default async function PropinasPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard')
  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-xl font-bold text-gray-800 mb-4">Propinas</h1>
      <PropinasClient userId={session.user.id} />
    </div>
  )
}
