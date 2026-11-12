const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

const connectionString = process.env.DIRECT_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    { name: 'Test Resident', phone: '0700000001', role: 'RESIDENT' },
    { name: 'Test Vendor', phone: '0700000002', role: 'VENDOR' },
    { name: 'System Admin', phone: '0700000003', role: 'ADMIN' },
    { name: 'Security Guard', phone: '0700000004', role: 'SECURITY' },
    { name: 'Super Admin', phone: '0700000005', role: 'SUPER_ADMIN' },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { phone: u.phone },
      // Overwrite the password and role so reseeding always resets them
      update: { password: hashedPassword, role: u.role, name: u.name },
      create: { ...u, password: hashedPassword },
    });
  }

  console.log('All test users created/updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());