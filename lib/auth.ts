import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any).role
        token.color = (user as any).color
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.color = token.color as string
      }
      return session
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email, active: true },
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!valid) return null
        await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
        return { id: user.id, name: user.name, email: user.email, role: user.role, color: user.color }
      },
    }),
  ],
}
