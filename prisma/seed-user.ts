import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const connectionString = "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=10&connect_timeout=0&max_idle_connection_lifetime=0&pool_timeout=0&socket_timeout=0";
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding admin user...');

  const passwordHash = await bcrypt.hash('password', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@vaira.app' },
    update: {},
    create: {
      email: 'admin@vaira.app',
      name: 'Vaira Admin',
      role: 'ADMIN',
      passwordHash,
    },
  });

  console.log(`Created admin user: ${admin.email}`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
