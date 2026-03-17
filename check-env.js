#!/usr/bin/env node

/**
 * Environment Variables Check Script
 * Run this before deploying to verify all required variables are set
 */

const requiredVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY'
];

console.log('\n🔍 Checking environment variables...\n');

let allPresent = true;
const results = [];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const isPresent = !!value;
  
  results.push({
    name: varName,
    present: isPresent,
    value: isPresent ? `${value.substring(0, 20)}...` : 'NOT SET'
  });
  
  if (!isPresent) {
    allPresent = false;
  }
});

// Display results
results.forEach(({ name, present, value }) => {
  const icon = present ? '✅' : '❌';
  const status = present ? 'SET' : 'MISSING';
  console.log(`${icon} ${name}: ${status}`);
  if (present) {
    console.log(`   Preview: ${value}\n`);
  }
});

console.log('\n' + '='.repeat(60) + '\n');

if (allPresent) {
  console.log('✅ All environment variables are set!\n');
  console.log('You can proceed with deployment.\n');
  process.exit(0);
} else {
  console.log('❌ Some environment variables are missing!\n');
  console.log('For local development:');
  console.log('  - Ensure .env.local file exists with all variables\n');
  console.log('For Netlify deployment:');
  console.log('  1. Go to Netlify Dashboard');
  console.log('  2. Select your site');
  console.log('  3. Go to: Site settings → Environment variables');
  console.log('  4. Add each missing variable');
  console.log('  5. Trigger a new deploy\n');
  console.log('See QUICK_DEPLOY.md for detailed instructions.\n');
  process.exit(1);
}
