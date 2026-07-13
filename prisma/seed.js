import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@reportage.ae';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) {
    console.log('Admin user already exists');
    return;
  }

  await prisma.user.create({
    data: {
      name: 'Admin',
      email: adminEmail,
      passwordHash: await bcrypt.hash('admin123', 12),
      role: 'admin',
      status: 'ACTIVE',
    },
  });

  console.log('Admin user created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
