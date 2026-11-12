require('dotenv').config({ path: './.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function forceResetPasswords() {
  console.log("Fetching all users...");
  
  // Fetch up to 1000 users to ensure we don't miss anyone
  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }

  // The specific emails you are trying to log in with
  const targetEmails = [
    'beulahbev2005@gmail.com',
    'beverly.kongani@gmail.com',
    'bnasimiyu63092@anu.ac.ke'
  ];

  for (const email of targetEmails) {
    const user = users.find(u => u.email === email);
    
    if (user) {
      console.log(`Found ${email}. Resetting password...`);
      
      // Force update the password using the Admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: 'Password123!',
        email_confirm: true
      });

      if (updateError) {
        console.error(`❌ Failed to reset ${email}:`, updateError.message);
      } else {
        console.log(`✅ Success! ${email} password is now Password123!`);
      }
    } else {
      console.log(`⚠️ Could not find ${email} in the Auth database.`);
    }
  }
  console.log("Done!");
}

forceResetPasswords();