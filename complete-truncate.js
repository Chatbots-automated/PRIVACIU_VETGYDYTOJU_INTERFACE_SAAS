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

async function deleteAllFromTable(tableName, pkColumn = 'id') {
  try {
    const { count: beforeCount, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      return { success: false, error: countError.message, before: 0, after: 0 };
    }
    
    if (beforeCount === 0) {
      return { success: true, before: 0, after: 0, skipped: true };
    }
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq(pkColumn, '00000000-0000-0000-0000-000000000000');
    
    if (error) {
      return { success: false, error: error.message, before: beforeCount, after: beforeCount };
    }
    
    return { success: true, before: beforeCount, after: 0 };
  } catch (err) {
    return { success: false, error: err.message, before: 0, after: 0 };
  }
}

async function truncateAllTables() {
  console.log('⚠️  WARNING: This will DELETE ALL DATA from your database!');
  console.log('Press Ctrl+C within 3 seconds to cancel...\n');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  console.log('🗑️  Starting complete database truncation...\n');

  // Tables that exist and were successfully truncated before
  const mainTables = [
    'course_doses',
    'course_medication_schedules',
    'treatment_courses',
    'teat_status',
    'hoof_records',
    'vaccinations',
    'treatments',
    'usage_items',
    'animal_synchronizations',
    'synchronization_steps',
    'synchronization_protocols',
    'animal_visits',
    'medical_waste',
    'biocide_usage',
    'invoice_items',
    'invoices',
    'insemination_records',
    'insemination_inventory',
    'user_audit_logs',
    'batches',
    'products',
    'animals',
    'diseases',
    'insemination_products',
    'suppliers',
    'shared_notepad',
    'system_settings',
    'users'
  ];

  // Tables that might exist with different primary keys
  const specialTables = [
    { name: 'batch_waste_tracking', pk: 'batch_id' },
    { name: 'hoof_condition_codes', pk: 'code' }
  ];

  let totalDeleted = 0;
  let successCount = 0;
  let errorCount = 0;
  const errors = [];

  // Process main tables
  for (const table of mainTables) {
    process.stdout.write(`Truncating ${table}...`);
    
    const result = await deleteAllFromTable(table);
    
    if (result.success) {
      if (result.skipped) {
        console.log(` ⊘ Already empty`);
      } else {
        console.log(` ✓ Deleted ${result.before} rows`);
        totalDeleted += result.before;
      }
      successCount++;
    } else {
      console.log(` ✗ Error: ${result.error}`);
      errorCount++;
      errors.push({ table, error: result.error });
    }
  }

  // Process special tables with different PKs
  for (const { name, pk } of specialTables) {
    process.stdout.write(`Truncating ${name}...`);
    
    const result = await deleteAllFromTable(name, pk);
    
    if (result.success) {
      if (result.skipped) {
        console.log(` ⊘ Already empty`);
      } else {
        console.log(` ✓ Deleted ${result.before} rows`);
        totalDeleted += result.before;
      }
      successCount++;
    } else {
      console.log(` ✗ Error: ${result.error}`);
      errorCount++;
      errors.push({ table: name, error: result.error });
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`  ✓ Successfully truncated: ${successCount} tables`);
  console.log(`  🗑️  Total rows deleted: ${totalDeleted}`);
  console.log(`  ✗ Errors: ${errorCount} tables`);
  
  if (errors.length > 0) {
    console.log('\n❌ Failed tables:');
    errors.forEach(({ table, error }) => {
      console.log(`  - ${table}: ${error}`);
    });
  }
  
  console.log('\n✅ Database truncation complete!');
  console.log('📊 Your database is now clean and ready for fresh data.\n');
}

truncateAllTables().catch(console.error);
