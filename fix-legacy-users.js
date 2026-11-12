require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixLegacyUsers() {
  // 1. Get all real emails from your Residents table (that don't have @athi-soko.com)
  const { data: residents } = await supabase
    .from('Residents')
    .select('id, email, full_name')
    .not('email', 'is', null)
    .not('email', 'like', '%@athi-soko.com%');

  if (!residents) return;

  console.log(`Found ${residents.length} legacy users to fix.`);

  for (const user of residents) {
    console.log(`Fixing: ${user.email}`);
    
    // 2. Delete the broken auth user if they exist
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existingUser = listData.users.find(u => u.email === user.email);
    
    if (existingUser) {
      await supabase.auth.admin.deleteUser(existingUser.id);
    }

    // 3. Create them FRESH using the official API (creates identities properly)
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: 'Password123!', // Force a default password for now
      email_confirm: true,
      user_metadata: { full_name: user.full_name, role: 'resident', legacy_id: user.id }
    });

    if (error) {
      console.error(`❌ Failed: ${error.message}`);
    } else {
      // 4. Update the Residents table with the new auth_id
      await supabase.from('Residents').update({ auth_id: authData.user.id }).eq('id', user.id);
      console.log(`✅ Success: ${user.email} now has an identity record.`);
    }
  }
}

fixLegacyUsers();