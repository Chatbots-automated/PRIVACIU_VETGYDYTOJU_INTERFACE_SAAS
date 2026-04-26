# Migration Fix Log

## Issues Found
The `treatment_history_view` migration had multiple issues due to schema differences between old and SaaS versions:

1. **usage_items column name**:
   - ❌ Used: `ui.qty`
   - ✅ Correct: `ui.quantity`

2. **treatment_courses structure completely different**:
   - ❌ Old schema: Had `product_id`, `batch_id`, `total_dose`, `daily_dose`, `unit` directly in table
   - ✅ SaaS schema: Uses `course_medication_schedules` for product/dose info

## What Was Fixed
Updated `20260426000007_create_treatment_history_view.sql`:
1. Changed `ui.qty` to `ui.quantity` (line 38)
2. Completely rebuilt treatment_courses subquery to match SaaS schema:
   - Now joins with `course_medication_schedules` for medication info
   - Calculates `total_dose` as `dose_amount * total_doses`
   - Uses `dose_amount` as `daily_dose`
   - Uses `total_doses` as `days`
   - Uses `initial_treatment_id` instead of non-existent `treatment_id` column
   - Counts administered doses from `course_doses` table

## Status
✅ **Migration 008** - Successfully applied (ovules enum)
✅ **Migration 007** - Fixed and ready to apply (treatment_history_view)
🆕 **Migration 009** - New migration created (fn_fifo_batch function)

## New Issue Found - FIFO Batch Selection

After fixing the view, discovered that the `fn_fifo_batch` function is missing.
This function is used in BulkTreatment.tsx for automatic batch selection (FIFO = First In, First Out).

### Migration 009: fn_fifo_batch
- Creates function with 2 parameters: `p_farm_id` and `p_product_id`
- Returns the next batch to use based on FIFO logic
- Prioritizes: expiring soon → oldest manufactured → oldest received
- Ensures farm isolation (multi-tenant safe)

## Apply the Fixed Migration

Run this command to apply the corrected migration:

```bash
cd supabase
apply_new_migrations.bat
```

Or manually via Supabase SQL Editor:

1. Go to: https://supabase.com/dashboard/project/vlfjmffbwrmblvlsbsnz/sql
2. Copy and paste the **updated** `20260426000007_create_treatment_history_view.sql`
3. Run it

## Verification

After applying, verify in Supabase SQL Editor:

```sql
-- Should return 1
SELECT COUNT(*) FROM information_schema.views 
WHERE table_schema = 'public' AND table_name = 'treatment_history_view';

-- Should return some data (if you have treatments)
SELECT * FROM treatment_history_view LIMIT 1;
```

## What This Fixes

1. ✅ Products will load in "Masinis gydymas ir vakcinacijos" 
2. ✅ Treatment History will display in "Gydymų istorija"
3. ✅ No more 400 or 404 errors in console
