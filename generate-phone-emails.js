require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function standardizeToPhoneLogins() {
  console.log("Standardizing Residents and Providers to use Phone Logins...");

  // 1. Update Residents
  const { data: residents } = await supabase.from('Residents').select('id, phone, email');
  for (const res of residents) {
    if (!res.phone) continue;
    let cleanPhone = res.phone.replace(/\s+/g, '').replace('+', '');
    if (cleanPhone.startsWith('0')) cleanPhone = `254${cleanPhone.slice(1)}`;
    
    const pseudoEmail = `${cleanPhone}@athi-soko.com`;

    // Update the email in auth.users (requires Service Role key)
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.email === res.email || u.user_metadata?.legacy_id === res.id);

    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, { email: pseudoEmail });
      console.log(`Updated Resident ${res.phone} -> ${pseudoEmail}`);
    }
  }

  // 2. Update Providers
  const { data: providers } = await supabase.from('Providers').select('id, phone');
  for (const prov of providers) {
    if (!prov.phone) continue;
    let cleanPhone = prov.phone.replace(/\s+/g, '').replace('+', '');
    if (cleanPhone.startsWith('0')) cleanPhone = `254${cleanPhone.slice(1)}`;

    const pseudoEmail = `${cleanPhone}@athi-soko.com`;

    // Since providers didn't have emails, we need to check if they have an auth account
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const authUser = authUsers.users.find(u => u.user_metadata?.legacy_id === prov.id);

    if (authUser) {
      await supabase.auth.admin.updateUserById(authUser.id, { email: pseudoEmail });
      console.log(`Updated Provider ${prov.phone} -> ${pseudoEmail}`);
    } else {
      // If the provider doesn't have an auth account, create one with the default password
      await supabase.auth.admin.createUser({
        email: pseudoEmail,
        password: 'Password123!',
        email_confirm: true,
        user_metadata: { role: 'provider', legacy_id: prov.id }
      });
      console.log(`Created Auth for Provider ${prov.phone} -> ${pseudoEmail}`);
    }
  }
  console.log("Done!");
}

standardizeToPhoneLogins();