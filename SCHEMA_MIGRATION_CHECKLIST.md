# Schema Migration Checklist

## Overview

This checklist guides you through applying the new RVAC baseline schema (`20260312000001_rvac_baseline_schema.sql`).

## Pre-Migration

### 1. Backup Current Database

```bash
# Full database backup
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Or use Supabase dashboard to create a backup
```

### 2. Review Current State

```sql
-- Check existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check row counts
SELECT 
    schemaname,
    tablename,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### 3. Document Current Data

- [ ] List all farms/tenants
- [ ] Count users per farm
- [ ] Count animals per farm
- [ ] Count active treatments
- [ ] Note any custom modifications

## Migration Options

### Option A: Fresh Installation (Recommended for New Systems)

**Use this if:** Starting from scratch or can afford to lose existing data.

```bash
# Reset database and apply all migrations
supabase db reset

# Verify schema
supabase db diff
```

**Steps:**
1. [ ] Run `supabase db reset`
2. [ ] Verify all tables created
3. [ ] Seed initial data (see Seeding section)
4. [ ] Test application

### Option B: Incremental Migration (For Existing Systems)

**Use this if:** You have existing data that must be preserved.

#### Step 1: Apply Cleanup Migration

```bash
# This removes GEA and unwanted modules
supabase migration up --include-all
```

Applies: `20260312000000_remove_gea_and_unwanted_modules.sql`

#### Step 2: Create Data Migration Script

Create `supabase/migrations/20260312000002_migrate_data_to_new_schema.sql`:

```sql
-- 1. Create farms table (from new baseline)
-- Already exists from baseline

-- 2. Populate farms (example - adjust for your data)
INSERT INTO public.farms (id, name, code, is_active)
VALUES 
    (gen_random_uuid(), 'Farm 1', 'F001', true),
    (gen_random_uuid(), 'Farm 2', 'F002', true);
-- Add all 60+ farms

-- 3. Update users with farm_id
-- If users table exists, add farm_id column and populate
ALTER TABLE public.users_old ADD COLUMN farm_id uuid;
UPDATE public.users_old SET farm_id = (SELECT id FROM public.farms WHERE code = 'F001');

-- 4. Migrate animals
INSERT INTO public.animals (farm_id, tag_no, species, sex, ...)
SELECT 
    (SELECT id FROM public.farms WHERE code = 'F001'), -- Map to correct farm
    tag_no,
    species,
    sex,
    ...
FROM public.animals_old;

-- 5. Repeat for all tables
-- ...

-- 6. Verify counts match
SELECT 'animals_old' as table, COUNT(*) FROM public.animals_old
UNION ALL
SELECT 'animals_new' as table, COUNT(*) FROM public.animals;
```

#### Step 3: Apply New Baseline

```bash
supabase migration up
```

#### Step 4: Verify Migration

```sql
-- Check all tables exist
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';
-- Should be 31

-- Check RLS enabled
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND rowsecurity = true;
-- Should be 31

-- Check policies exist
SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
-- Should be 61

-- Verify data
SELECT 
    (SELECT COUNT(*) FROM public.farms) as farms,
    (SELECT COUNT(*) FROM public.users) as users,
    (SELECT COUNT(*) FROM public.animals) as animals,
    (SELECT COUNT(*) FROM public.treatments) as treatments,
    (SELECT COUNT(*) FROM public.products) as products,
    (SELECT COUNT(*) FROM public.batches) as batches;
```

## Post-Migration

### 1. Seed Reference Data

```sql
-- Hoof condition codes (international standard)
INSERT INTO public.hoof_condition_codes (code, name_lt, name_en, description, is_active)
VALUES
    ('M1', 'Paprastasis skausmingas nagų uždegimas', 'Digital Dermatitis', 'Common infectious hoof disease', true),
    ('M2', 'Tarpupirščio dermatitas', 'Interdigital Dermatitis', 'Inflammation between claws', true),
    ('M3', 'Nagų erozija', 'Heel Erosion', 'Erosion of the heel', true),
    ('M4', 'Baltoji linija', 'White Line Disease', 'Separation of hoof wall', true),
    ('M5', 'Pado opa', 'Sole Ulcer', 'Ulceration of the sole', true);
-- Add more codes as needed
```

### 2. Create Initial Farms

```sql
-- Example: Create your farms
INSERT INTO public.farms (name, code, address, contact_person, contact_phone, is_active)
VALUES
    ('Pieno Ūkis #1', 'PU001', 'Vilnius g. 1, Kaunas', 'Jonas Jonaitis', '+370 600 00001', true),
    ('Pieno Ūkis #2', 'PU002', 'Klaipėdos g. 2, Vilnius', 'Petras Petraitis', '+370 600 00002', true);
-- Add all 60+ farms
```

### 3. Create Admin Users

```sql
-- Create admin for each farm
INSERT INTO public.users (farm_id, email, password_hash, role, full_name)
VALUES
    ((SELECT id FROM public.farms WHERE code = 'PU001'), 'admin@farm1.lt', 'hashed-password', 'admin', 'Admin Vienas'),
    ((SELECT id FROM public.farms WHERE code = 'PU002'), 'admin@farm2.lt', 'hashed-password', 'admin', 'Admin Du');
```

### 4. Verify RLS Working

```sql
-- Test as specific user
SET request.jwt.claims.sub = 'user-uuid';

-- Should only see that user's farm data
SELECT * FROM public.animals;
SELECT * FROM public.treatments;
SELECT * FROM public.products;
```

### 5. Test Core Workflows

- [ ] Create animal
- [ ] Record treatment
- [ ] Use medication (check FIFO)
- [ ] Verify withdrawal dates calculated
- [ ] Create treatment course
- [ ] Record vaccination
- [ ] Start synchronization protocol
- [ ] Record insemination
- [ ] Track hoof health
- [ ] Create invoice
- [ ] View stock levels
- [ ] Check medical waste generation

### 6. Update Application Code

#### Required Changes:

1. **Add farm_id to all queries:**

```typescript
// Before
const animals = await supabase.from('animals').select('*');

// After (RLS handles this automatically, but explicit is clearer)
const animals = await supabase
  .from('animals')
  .select('*')
  .eq('farm_id', userFarmId);
```

2. **Update insert statements:**

```typescript
// Before
await supabase.from('animals').insert({ tag_no: 'LT001', ... });

// After
await supabase.from('animals').insert({ 
  farm_id: userFarmId,
  tag_no: 'LT001',
  ...
});
```

3. **Update TypeScript types:**

```typescript
// Add farm_id to all interfaces
export interface Animal {
  id: string;
  farm_id: string;  // ADD THIS
  tag_no?: string;
  // ... rest of fields
}
```

4. **Update function calls:**

```typescript
// Before
const batch = await supabase.rpc('fn_fifo_batch', { p_product_id: productId });

// After
const batch = await supabase.rpc('fn_fifo_batch', { 
  p_product_id: productId,
  p_farm_id: farmId 
});
```

### 7. Test Multi-Tenancy

Create test data for 2+ farms and verify:

- [ ] Farm A users can't see Farm B data
- [ ] Farm B users can't see Farm A data
- [ ] Admin users can only manage their own farm
- [ ] Stock operations respect farm boundaries
- [ ] FIFO only selects batches from same farm
- [ ] Views filter by farm_id correctly

### 8. Performance Testing

```sql
-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM public.animals WHERE farm_id = 'farm-uuid';

-- Verify indexes are used
EXPLAIN ANALYZE
SELECT * FROM public.treatments 
WHERE farm_id = 'farm-uuid' 
  AND reg_date >= '2026-01-01';

-- Check view performance
EXPLAIN ANALYZE
SELECT * FROM public.treatment_history_view 
WHERE farm_id = 'farm-uuid';
```

### 9. Verify Triggers Working

```sql
-- Test batch qty_left update
INSERT INTO public.usage_items (farm_id, treatment_id, product_id, batch_id, qty, unit)
VALUES ('farm-uuid', 'treatment-uuid', 'product-uuid', 'batch-uuid', 10, 'ml');

-- Check batch updated
SELECT qty_left FROM public.batches WHERE id = 'batch-uuid';

-- Test withdrawal calculation
-- Should auto-calculate after usage_items insert
SELECT withdrawal_until_milk, withdrawal_until_meat 
FROM public.treatments 
WHERE id = 'treatment-uuid';

-- Test course dose creation
INSERT INTO public.treatment_courses (farm_id, treatment_id, product_id, days, unit, start_date, daily_dose)
VALUES ('farm-uuid', 'treatment-uuid', 'product-uuid', 5, 'ml', CURRENT_DATE, 10);

-- Check doses created
SELECT COUNT(*) FROM public.course_doses WHERE course_id = 'course-uuid';
-- Should be 5
```

## Rollback Plan

### If Migration Fails

1. **Restore from backup:**

```bash
# Stop current database
supabase stop

# Restore backup
psql -h localhost -U postgres -d postgres -f backup_YYYYMMDD_HHMMSS.sql

# Restart
supabase start
```

2. **Or reset to previous migration:**

```bash
# Roll back to specific migration
supabase migration down --version 20260312000001
```

### If Issues Found Post-Migration

1. **Document the issue**
2. **Create hotfix migration**
3. **Test in development first**
4. **Apply to production**

## Validation Queries

### Check Schema Completeness

```sql
-- Verify all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
-- Should return 31 tables

-- Verify all views exist
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
ORDER BY table_name;
-- Should return 9 views

-- Verify all functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
-- Should return 22 functions

-- Verify all triggers exist
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
-- Should return 43 triggers

-- Verify RLS policies
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
-- Should return 61 policies
```

### Check Foreign Keys

```sql
-- Verify all farm_id foreign keys
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'farm_id'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
-- Should return 29 rows (all tables except farms and hoof_condition_codes)
```

### Check Indexes

```sql
-- Verify farm_id indexes exist
SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%farm_id%'
ORDER BY tablename;
-- Should return 29+ indexes
```

## Success Criteria

✅ All 31 tables created  
✅ All 9 views created  
✅ All 22 functions created  
✅ All 43 triggers created  
✅ All 61 RLS policies created  
✅ All 60+ indexes created  
✅ All foreign keys established  
✅ RLS working (farm isolation verified)  
✅ FIFO inventory working  
✅ Withdrawal calculation working  
✅ Medical waste auto-generation working  
✅ Treatment courses working  
✅ Synchronization protocols working  
✅ Application code updated  
✅ Multi-tenancy tested  
✅ Performance acceptable  

## Timeline Estimate

- **Fresh installation:** 30 minutes
- **Migration with data:** 2-4 hours (depends on data volume)
- **Application code updates:** 4-8 hours
- **Testing:** 2-4 hours
- **Production deployment:** 1 hour

**Total:** 1-2 days for complete migration

## Post-Migration Monitoring

### First 24 Hours

Monitor:
- [ ] Query performance (should be fast with indexes)
- [ ] RLS policy effectiveness (no cross-farm data leaks)
- [ ] Trigger execution (no errors in logs)
- [ ] Stock deductions (accurate qty_left)
- [ ] Withdrawal calculations (correct dates)
- [ ] Medical waste generation (when batches depleted)

### First Week

Verify:
- [ ] All workflows functioning
- [ ] No RLS permission errors
- [ ] No foreign key violations
- [ ] Audit logs capturing actions
- [ ] Reports generating correctly
- [ ] Multi-farm isolation working

### Performance Metrics

Track:
- Average query response time
- Slow queries (> 1 second)
- Index usage statistics
- Table sizes
- Lock contention

## Troubleshooting Guide

### Issue: RLS Blocking All Queries

**Symptoms:** All queries return empty results or permission denied.

**Diagnosis:**
```sql
-- Check if user has farm_id
SELECT id, email, farm_id FROM public.users WHERE id = auth.uid();

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

**Solutions:**
1. Ensure user has `farm_id` set
2. Verify `get_user_farm_id()` function exists
3. Check RLS policies are created
4. Test with service_role (bypasses RLS) to isolate issue

### Issue: Foreign Key Violations

**Symptoms:** Insert/update fails with FK constraint error.

**Diagnosis:**
```sql
-- Check if referenced record exists
SELECT id FROM public.farms WHERE id = 'farm-uuid';
SELECT id FROM public.products WHERE id = 'product-uuid';
```

**Solutions:**
1. Ensure parent records exist first
2. Verify farm_id matches across related tables
3. Check cascade rules are appropriate

### Issue: Triggers Not Firing

**Symptoms:** qty_left not updating, withdrawal dates not calculating.

**Diagnosis:**
```sql
-- Check triggers exist
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND event_object_table = 'usage_items';
```

**Solutions:**
1. Verify trigger functions exist
2. Check trigger conditions (WHEN clauses)
3. Review function logic for errors
4. Check PostgreSQL logs for errors

### Issue: FIFO Not Working

**Symptoms:** Wrong batch selected or "insufficient stock" errors.

**Diagnosis:**
```sql
-- Check available batches
SELECT id, lot, qty_left, expiry_date, status
FROM public.batches
WHERE product_id = 'product-uuid'
  AND farm_id = 'farm-uuid'
  AND qty_left > 0
ORDER BY expiry_date NULLS LAST, created_at ASC;

-- Test FIFO function
SELECT public.fn_fifo_batch('product-uuid', 'farm-uuid');
```

**Solutions:**
1. Verify batches have qty_left > 0
2. Check batch status is 'active'
3. Verify expiry_date is future or NULL
4. Ensure farm_id matches

## Emergency Contacts

- Database Admin: [Your DBA]
- Application Lead: [Your Lead Dev]
- Supabase Support: support@supabase.com

## Sign-Off

- [ ] Migration completed by: _________________ Date: _________
- [ ] Verified by: _________________ Date: _________
- [ ] Production approved by: _________________ Date: _________

## Notes

Use this space to document any issues, workarounds, or custom modifications:

---

---

---
