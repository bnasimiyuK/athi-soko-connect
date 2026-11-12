require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestUsers() {
  const users = [
    { email: '254711111111@athi-soko.com', password: 'Password123!', role: 'resident', name: 'Test Resident' },
    { email: '254722222222@athi-soko.com', password: 'Password123!', role: 'provider', name: 'Test Vendor' },
    { email: '254733333333@athi-soko.com', password: 'Password123!', role: 'security', name: 'Test Guard' },
    { email: 'testadmin@athi.com', password: 'Password123!', role: 'admin', name: 'Test Admin' }
  ];

  for (const user of users) {
    console.log(`Creating ${user.role}...`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { role: user.role, full_name: user.name }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`✅ ${user.email} already exists. Updating password...`);
        // If they exist, let's force update their password to be safe
        const { data: listData } = await supabase.auth.admin.listUsers();
        const existingUser = listData.users.find(u => u.email === user.email);
        if (existingUser) {
          await supabase.auth.admin.updateUserById(existingUser.id, { password: user.password });
        }
      } else {
        console.error(`❌ Failed for ${user.email}:`, error.message);
      }
    } else {
      console.log(`✅ Created ${user.email}`);
    }
  }
  console.log("Done!");
}

createTestUsers();