const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.local' });

// Use the exact same connection logic as your app!
const connectionString = process.env.DATABASE_URL ?? process.env.DIRECT_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const updated = await prisma.user.update({
    where: { phone: '0700000001' },
    data: { password: hashedPassword }
  });
  
  console.log("✅ Password forcefully reset to 'password123' for:", updated.phone);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());