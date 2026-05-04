import { PrismaClient, Role } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10)

  await prisma.user.upsert({
    where: { email: 'admin@bloster.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@bloster.com',
      passwordHash: adminPassword,
      role: Role.ADMIN,
      color: '#EF4444',
    },
  })

  await prisma.config.upsert({
    where: { key: 'shift_end_morning' },
    update: {},
    create: { key: 'shift_end_morning', value: '14:00' },
  })

  await prisma.config.upsert({
    where: { key: 'shift_end_afternoon' },
    update: {},
    create: { key: 'shift_end_afternoon', value: '22:00' },
  })

  console.log('Seed completed. Admin: admin@bloster.com / admin123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
