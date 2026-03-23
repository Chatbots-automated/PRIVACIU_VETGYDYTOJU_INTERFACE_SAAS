import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersAndFarms() {
  console.log('🔍 Checking database state...\n');

  try {
    // Check farms
    const { data: farms, error: farmsError } = await supabase
      .from('farms')
      .select('*')
      .order('name');

    if (farmsError) {
      console.error('❌ Error checking farms:', farmsError.message);
    } else {
      console.log(`📍 Farms found: ${farms?.length || 0}`);
      if (farms && farms.length > 0) {
        farms.forEach(farm => {
          console.log(`   - ${farm.name} (${farm.code}) - ID: ${farm.id}`);
        });
      } else {
        console.log('   ⚠️  No farms exist!');
      }
      console.log('');
    }

    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at');

    if (usersError) {
      console.error('❌ Error checking users:', usersError.message);
    } else {
      console.log(`👥 Users found: ${users?.length || 0}`);
      if (users && users.length > 0) {
        users.forEach(user => {
          console.log(`   - ${user.email} (${user.role}) - ${user.full_name || 'No name'}`);
        });
      } else {
        console.log('   ⚠️  No users exist!');
      }
      console.log('');
    }

    // Provide instructions
    if (!users || users.length === 0) {
      console.log('=' .repeat(70));
      console.log('🚨 NO USERS FOUND - CANNOT LOG IN!');
      console.log('=' .repeat(70));
      console.log('\n📋 TO FIX:\n');
      console.log('1. Open Supabase SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/oxzfztimfabzzqjmsihl/sql/new\n');
      console.log('2. Copy the file: add-users.sql\n');
      console.log('3. Paste into SQL Editor and click "Run"\n');
      console.log('4. Try logging in with:');
      console.log('   • gratasgedraitis@gmail.com / 123456');
      console.log('   • daumantas.jatautas@rvac.lt / Daumantas123-\n');
    } else {
      console.log('✅ Users exist! You should be able to log in.\n');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUsersAndFarms().catch(console.error);
