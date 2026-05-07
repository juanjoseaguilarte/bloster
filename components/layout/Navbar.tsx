'use client'
import { useSession, signOut } from 'next-auth/react'
import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import VersionChecker from '@/components/VersionChecker'
import QRModal from '@/components/QRModal'

export default function Navbar() {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user?.id) {
      fetch('/api/ping', { method: 'POST' })
    }
  }, [session?.user?.id])

  const pathname = usePathname()
  const role = session?.user?.role
  const isStaff = ['ADMIN', 'GESTOR'].includes(role || '')

  const links = isStaff
    ? [
        { href: '/dashboard', label: 'Blosters' },
        { href: '/dashboard/users', label: 'Empleados' },
        { href: '/dashboard/profile', label: 'Mi perfil' },
      ]
    : [
        { href: '/dashboard', label: 'Mi Bloster' },
        { href: '/dashboard/profile', label: 'Mi perfil' },
      ]

  return (
    <>
      <nav className="bg-white border-b border-gray-200">
        {/* Fila superior: logo + usuario */}
        <div className="px-4 sm:px-6 h-12 flex items-center justify-between">
          <span className="font-bold text-blue-600 text-lg">Bloster</span>
          <div className="flex items-center gap-2 sm:gap-3">
            {role === 'ADMIN' && (
              <span className="text-xs text-gray-400 font-mono hidden sm:inline">
                v{process.env.NEXT_PUBLIC_APP_VERSION || 'dev'}
              </span>
            )}
            {isStaff && <QRModal />}
            <span className="text-sm text-gray-600 font-medium">{session?.user?.name}</span>
            {role !== 'EMPLEADO' && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full hidden sm:inline">{role}</span>
            )}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-sm text-gray-400 hover:text-red-600 transition-colors"
            >
              Salir
            </button>
          </div>
        </div>

        {/* Fila inferior: links de navegación */}
        <div className="px-4 sm:px-6 flex gap-1 border-t border-gray-100">
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                pathname === l.href
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
      </nav>
      <VersionChecker />
    </>
  )
}
