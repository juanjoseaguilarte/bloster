import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/Navbar'
import PwaTracker from '@/components/PwaTracker'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <PwaTracker />
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">{children}</main>
    </div>
  )
}
