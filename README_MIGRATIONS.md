# Apply Database Migrations

## Problems Fixed

Three new migrations have been created to fix the issues where:
1. Products don't load in "Masinis gydymas ir vakcinacijos" (Bulk Treatment)
2. Treatment History ("Gydymų istorija") doesn't load
3. Automatic batch selection (FIFO) doesn't work

## Migrations

Located in `supabase/migrations_saas/`:

1. **`20260426000007_create_treatment_history_view.sql`**
   - Creates the `treatment_history_view` view
   - Fixes: 404 error when loading treatment history

2. **`20260426000008_add_ovules_to_product_category.sql`**
   - Adds `'ovules'` to the `product_category` ENUM
   - Fixes: 400 Bad Request when filtering products by category

3. **`20260426000009_create_fn_fifo_batch.sql`**
   - Creates the `fn_fifo_batch` function for automatic batch selection
   - Fixes: 404 error when selecting a product (automatic batch selection)

## How to Apply

### Option 1: Run the Batch Script (Easiest)

```bash
cd supabase
apply_new_migrations.bat
```

### Option 2: Use Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/vlfjmffbwrmblvlsbsnz/sql
2. Click "New query"
3. Copy and paste the contents of each migration file
4. Run them in order (008, then 007, then 009)

### Option 3: Manual Command Line

```bash
cd supabase

# Migration 1: Add ovules to enum
npx supabase db execute --file migrations_saas/20260426000008_add_ovules_to_product_category.sql --db-url "postgresql://postgres.vlfjmffbwrmblvlsbsnz:Obelis2018!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Migration 2: Create view
npx supabase db execute --file migrations_saas/20260426000007_create_treatment_history_view.sql --db-url "postgresql://postgres.vlfjmffbwrmblvlsbsnz:Obelis2018!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Migration 3: Create FIFO function
npx supabase db execute --file migrations_saas/20260426000009_create_fn_fifo_batch.sql --db-url "postgresql://postgres.vlfjmffbwrmblvlsbsnz:Obelis2018!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

## After Applying

1. **Refresh your browser**
2. Navigate to "Masinis gydymas ir vakcinacijos" - products should load
3. Select a product - batch should be auto-selected (FIFO logic)
4. Navigate to "Gydymų istorija" - treatment history should display
5. Console errors should be gone

## Verification

To verify the migrations were applied successfully, run in Supabase SQL Editor:

```sql
-- Check if 'ovules' is in the enum
SELECT unnest(enum_range(NULL::public.product_category)) AS category_value;

-- Check if the view exists
SELECT COUNT(*) as view_exists 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'treatment_history_view';

-- Check if the function exists
SELECT COUNT(*) as function_exists
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'fn_fifo_batch';
```

Expected results:
- First query should include `'ovules'` in the list
- Second query should return `1` (view exists)
- Third query should return `1` (function exists)
