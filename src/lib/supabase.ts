import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Environment variables check:', {
    VITE_SUPABASE_URL: supabaseUrl ? '✓ Set' : '✗ Missing',
    VITE_SUPABASE_ANON_KEY: supabaseAnonKey ? '✓ Set' : '✗ Missing',
    allEnvVars: import.meta.env
  });
  
  throw new Error(
    'Missing Supabase environment variables. ' +
    'Please ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in Netlify dashboard. ' +
    'Go to: Site settings → Environment variables'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
