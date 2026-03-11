# RVAC Veterinarija - Database Migrations

## Migration Files

### 1. `20240101000000_baseline_public_schema.sql` (DEPRECATED)
**Status:** ⚠️ OLD BASELINE - DO NOT USE  
**Size:** 15,241 lines  
**Description:** Original single-tenant schema with GEA, milk, equipment, and vehicle modules.

**Why deprecated:**
- No multi-tenancy support
- Includes removed modules (GEA, milk, equipment, vehicles)
- Overly complex (80+ tables)
- Not farm-isolated

### 2. `20260312000000_remove_gea_and_unwanted_modules.sql`
**Status:** ✅ CLEANUP MIGRATION  
**Size:** 146 lines  
**Description:** Removes GEA integration and unwanted modules from old schema.

**Removes:**
- GEA daily import tables and functions
- Milk production module
- Equipment management module
- Vehicle management module
- Worker portal module
- Cost accumulation module

**Apply when:** Migrating from old baseline to new baseline.

### 3. `20260312000001_rvac_baseline_schema.sql` ⭐
**Status:** ✅ NEW BASELINE - USE THIS  
**Size:** 2,584 lines  
**Description:** Complete multi-tenant baseline schema for RVAC system.

**Includes:**
- 31 tables with farm_id isolation
- 9 views for reporting
- 22 functions for business logic
- 43 triggers for automation
- 61 RLS policies for security
- 60+ indexes for performance

**Features:**
- ✅ Multi-tenancy (60+ farms)
- ✅ Complete farm isolation
- ✅ FIFO inventory management
- ✅ Withdrawal period tracking
- ✅ Medical waste auto-generation
- ✅ Treatment courses
- ✅ Synchronization protocols
- ✅ Regulatory compliance

### 4. `20260312000002_add_custom_auth.sql`
**Status:** ✅ CUSTOM AUTH  
**Description:** Adds custom authentication functions for user management.

**Includes:**
- `create_user()` function for creating users with farm assignment
- Password hashing and validation
- User role assignment

### 5. `20260312000003_add_vic_credentials_to_farms.sql`
**Status:** ✅ VIC INTEGRATION  
**Description:** Adds VIC (Veterinary Information Center) credentials to farms table.

**Adds:**
- `vic_username` column to farms
- `vic_password` column to farms (encrypted)
- Support for VIC API integration

### 6. `20260312000004_update_report_views.sql`
**Status:** ✅ REPORTING VIEWS  
**Description:** Updates reporting views for multi-tenancy and correct data types.

**Updates:**
- `vw_vet_drug_journal` - Veterinary drug journal
- `vw_biocide_journal` - Biocide usage journal
- `vw_medical_waste` - Medical waste tracking
- `vw_treated_animals_detailed` - Detailed treatment records

### 7. `20260312000005_add_user_tracking.sql` ⭐
**Status:** ✅ USER TRACKING - APPLY THIS  
**Description:** Adds user tracking to treatments, visits, and vaccinations.

**Adds:**
- `created_by_user_id` to `treatments` table
- `created_by_user_id` to `vaccinations` table
- `created_by_user_id` to `animal_visits` table
- Updates `vw_treated_animals_detailed` to show user's full name
- Updates `process_visit_medications()` function

**Fixes:** "Veterinarijos gydytojas" field showing "Nenurodyta" in reports

## Migration Sequence

### Option A: Fresh Installation (Recommended)

Apply all migrations at once:

```bash
supabase db reset
```

**Result:**
1. ✅ Creates new baseline schema (20260312000001)
2. ✅ Adds custom auth (20260312000002)
3. ✅ Adds VIC credentials (20260312000003)
4. ✅ Updates report views (20260312000004)
5. ✅ Adds user tracking (20260312000005)
6. ✅ Ready to use

**Time:** ~30 seconds

### Option B: Apply Single Migration to Remote Database

If you already have the baseline schema but need to add user tracking:

**Via Supabase Dashboard:**
1. Open **Supabase Dashboard** → Your Project → **SQL Editor**
2. Copy the contents of `supabase/migrations/20260312000005_add_user_tracking.sql`
3. Paste into SQL Editor
4. Click **Run**

**Via CLI:**
```bash
supabase migration up --include-name 20260312000005_add_user_tracking
```

**Time:** ~5 seconds

## Verification

After applying migrations, verify:

```sql
-- 1. Check table count
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- Expected: 31

-- 2. Check views
SELECT COUNT(*) FROM information_schema.views 
WHERE table_schema = 'public';
-- Expected: 9

-- 3. Check functions
SELECT COUNT(*) FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';
-- Expected: 22+

-- 4. Check created_by_user_id columns exist
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'created_by_user_id'
ORDER BY table_name;
-- Expected: animal_visits, treatments, vaccinations

-- 5. Test user tracking in reports
SELECT 
  t.id,
  u.full_name AS created_by,
  t.created_at
FROM treatments t
LEFT JOIN users u ON t.created_by_user_id = u.id
ORDER BY t.created_at DESC
LIMIT 5;
-- Should show user names for new treatments
```

## Documentation

Comprehensive documentation available:

1. **`BASELINE_SCHEMA_SUMMARY.md`** - Complete overview
2. **`DEVELOPER_SCHEMA_GUIDE.md`** - Developer guide with examples
3. **`SCHEMA_MIGRATION_CHECKLIST.md`** - Migration procedures
4. **`SCHEMA_CHANGES_SUMMARY.md`** - Old vs new comparison
5. **`QUICK_REFERENCE.md`** - Quick lookup guide

## Common Issues

### Issue: Migration fails with "relation already exists"

**Cause:** Old tables still present.

**Solution:**
```bash
# Full reset (WARNING: deletes all data)
supabase db reset

# Or manually drop conflicting tables
DROP TABLE IF EXISTS public.animals CASCADE;
# ... repeat for all tables
```

### Issue: RLS blocks all queries

**Cause:** Users don't have farm_id set.

**Solution:**
```sql
-- Check user's farm_id
SELECT id, email, farm_id FROM public.users WHERE id = auth.uid();

-- If NULL, assign a farm
UPDATE public.users SET farm_id = 'farm-uuid' WHERE id = 'user-uuid';
```

### Issue: "function fn_fifo_batch(uuid) does not exist"

**Cause:** Old function signature (missing farm_id parameter).

**Solution:**
```sql
-- Old (won't work)
SELECT fn_fifo_batch('product-uuid');

-- New (correct)
SELECT fn_fifo_batch('product-uuid', 'farm-uuid');
```

## Rollback

### To rollback the new baseline:

```bash
# Rollback to previous state
supabase migration down --version 20260312000002
supabase migration down --version 20260312000001
```

### To restore old baseline:

```bash
# Full reset and restore from backup
supabase db reset
psql -f backup_original.sql
```

## Support

For help:
1. Check documentation files
2. Review validation queries
3. Test in development environment first
4. Check PostgreSQL logs for errors

## Schema Version

**Current:** 20260312000001  
**Previous:** 20240101000000 (deprecated)  
**Status:** ✅ Production Ready

---

**Last Updated:** 2026-03-12  
**Maintained By:** RVAC Development Team
