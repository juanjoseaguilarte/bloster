export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/dashboard/:path*', '/api/users/:path*', '/api/schedules/:path*', '/api/shifts/:path*', '/api/limpieza/:path*'],
}
