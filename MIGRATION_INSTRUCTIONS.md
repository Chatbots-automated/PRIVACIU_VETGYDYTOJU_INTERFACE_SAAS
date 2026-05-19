# How to Run the Client Fix Migration

## What This Migration Does

This migration (`20260519000001_fix_missing_client_records.sql`) will:

1. **Find orphaned client_ids** - Identifies users/farms/products with client_ids that don't exist in the `clients` table
2. **Create missing client records** - Automatically creates client records with reasonable defaults
3. **Add validation triggers** - Prevents future orphaned client_ids from being created
4. **Report results** - Shows you exactly what was fixed

## How to Run

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy and paste the contents of `supabase/migrations_saas/20260519000001_fix_missing_client_records.sql`
6. Click **Run** (or press Ctrl+Enter)
7. Check the **Results** tab for success messages

### Option 2: Via Supabase CLI

```bash
cd supabase
npx supabase db push
```

This will apply all pending migrations.

### Option 3: Via psql (if you have direct database access)

```bash
psql "your-connection-string" -f supabase/migrations_saas/20260519000001_fix_missing_client_records.sql
```

## What to Expect

You should see output like this:

```
NOTICE:  Found 1 orphaned client_ids in users table
NOTICE:  === Migration Results ===
NOTICE:  Total clients: 2
NOTICE:  Total users: 3
NOTICE:  Remaining orphaned client_ids: 0
NOTICE:  SUCCESS: All client_ids are now valid!
```

## After Running

1. **Refresh your application** - The errors should be gone
2. **Update client info** - Go to your profile/subscription page to update the auto-generated client information
3. **Test** - Try creating a new farm or product to verify everything works

## What Gets Created

For each orphaned client_id, a new client record is created with:

- **Name**: "Organizacija [client-id-prefix]" (you can update this later)
- **Email**: First user's email or generated email
- **Subscription Plan**: Professional (15 farms, 5 users)
- **Status**: Active
- **VAT**: Not registered (you can update this later)

## Prevention

The migration adds database triggers that will:
- Validate client_id exists before creating users
- Validate client_id exists before creating farms  
- Validate client_id exists before creating products
- Show helpful error messages if validation fails

This ensures you'll never have this problem again!

## Need Help?

If you encounter any errors:
1. Check the error message in the SQL Editor
2. Copy the error and share it
3. Check that your database user has the necessary permissions

## Rollback (if needed)

If something goes wrong, you can remove the triggers with:

```sql
DROP TRIGGER IF EXISTS validate_user_client_id_trigger ON public.users;
DROP TRIGGER IF EXISTS validate_farm_client_id_trigger ON public.farms;
DROP TRIGGER IF EXISTS validate_product_client_id_trigger ON public.products;

DROP FUNCTION IF EXISTS public.validate_user_client_id();
DROP FUNCTION IF EXISTS public.validate_farm_client_id();
DROP FUNCTION IF EXISTS public.validate_product_client_id();
```

**Note**: This only removes the validation triggers, not the created client records.
