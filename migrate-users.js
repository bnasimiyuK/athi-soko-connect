require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const connectionString = process.env.DIRECT_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Must match a value in the Role enum in prisma/schema.prisma
const ADMIN_ROLE = 'ADMIN';

async function migrateUsers() {
  console.log(`\n🚀 Starting User Migration to Prisma...\n`);

  const defaultPassword = await bcrypt.hash('password123', 10);

  // --- 1. MIGRATE RESIDENTS ---
  console.log(`⏳ Fetching Residents...`);
  const { data: residents, error: resError } = await supabase
    .from('Residents')
    .select('id, email, phone, full_name');

  if (resError) {
    console.error("❌ Error fetching Residents:", resError.message);
  } else {
    for (const user of residents) {
      const identifier = (user.phone || user.email || '').trim();
      if (!identifier) continue;

      process.stdout.write(`Migrating Resident ${identifier}... `);
      try {
        const existing = await prisma.user.findUnique({ where: { phone: identifier } });
        if (existing && existing.role !== 'RESIDENT') {
          console.log(`⏭️ Skipped - already exists as ${existing.role}`);
          continue;
        }

        await prisma.user.upsert({
          where: { phone: identifier },
          update: { name: user.full_name, password: defaultPassword, role: 'RESIDENT' },
          create: {
            phone: identifier,
            name: user.full_name || 'Resident',
            password: defaultPassword,
            role: 'RESIDENT',
          },
        });
        console.log(`✅ Success`);
      } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
      }
    }
  }

  // --- 2. MIGRATE ADMINS (using email as the login identifier) ---
  console.log(`\n⏳ Fetching Super Admins...`);
  // select('*') avoids errors when a column such as "name" or "full_name" doesn't exist
  const { data: admins, error: admError } = await supabase
    .from('SuperAdmins')
    .select('*');

  if (admError) {
    console.error("❌ Error fetching SuperAdmins:", admError.message);
  } else {
    for (const user of admins) {
      const identifier = (user.email || '').trim();
      if (!identifier) continue;

      const adminName = user.name || user.full_name || 'Admin';

      process.stdout.write(`Migrating Admin ${identifier}... `);
      try {
        const existing = await prisma.user.findUnique({ where: { phone: identifier } });
        if (existing && existing.role !== ADMIN_ROLE) {
          console.log(`⏭️ Skipped - already exists as ${existing.role}`);
          continue;
        }

        await prisma.user.upsert({
          where: { phone: identifier }, // email stored in the "phone" column so NextAuth can find it
          update: { name: adminName, password: defaultPassword, role: ADMIN_ROLE },
          create: {
            phone: identifier,
            name: adminName,
            password: defaultPassword,
            role: ADMIN_ROLE,
          },
        });
        console.log(`✅ Success`);
      } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
      }
    }
  }

  // --- 3. MIGRATE PROVIDERS (Safely) ---
  console.log(`\n⏳ Fetching Providers...`);
  const { data: providers, error: provError } = await supabase
    .from('Providers')
    .select('id, name, phone');

  if (provError) {
    console.error("❌ Error fetching Providers:", provError.message);
  } else {
    for (const user of providers) {
      if (!user.phone) continue;

      // Skip anyone who already exists (e.g. as a Resident or Admin)
      const existingUser = await prisma.user.findUnique({
        where: { phone: user.phone },
      });

      if (existingUser) {
        console.log(`⏭️ Skipped Provider ${user.name} (${user.phone}) - Already exists as ${existingUser.role}`);
        continue;
      }

      process.stdout.write(`Migrating Provider ${user.name} (${user.phone})... `);
      try {
        await prisma.user.create({
          data: {
            phone: user.phone,
            name: user.name,
            password: defaultPassword,
            role: 'VENDOR',
          },
        });
        console.log(`✅ Success`);
      } catch (err) {
        console.log(`❌ Failed: ${err.message}`);
      }
    }
  }

  console.log(`\n🎉 Migration Complete! Migrated users can log in with password123.\n`);
}

migrateUsers()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());