import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Providers from './providers'
import PushManager from '@/components/PushManager'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Bloster',
  description: 'Gestión de turnos',
  manifest: '/manifest.json',
  themeColor: '#2563EB',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Bloster' },
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1 },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <PushManager />
        </Providers>
      </body>
    </html>
  )
}
