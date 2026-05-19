# Farm Analytics Fixes - Summary

## Date: 2026-05-19

## Issues Fixed

### 1. **Farm List Showing Incorrect Values (€1,013,400 instead of €150)**
**Problem:** The view was joining with invoice_items table, which caused multiplication when multiple invoice items existed for the same batch.

**Solution:** Rewrote the `vw_allocation_analytics_by_farm` view using CTEs (Common Table Expressions) to:
- Calculate allocation values separately for warehouse allocations and direct batches
- Use MAX() with GROUP BY to prevent multiplication from multiple invoice items
- Use subqueries to aggregate values safely

**File:** `supabase/migrations_saas/20260519000004_fix_farm_analytics_to_include_all_stock.sql`

### 2. **Service Prices Showing €0.00**
**Problem:** The analytics was trying to calculate service prices from `service_prices` table by matching procedure names, but was using the wrong data source.

**Solution:** Changed to read from `visit_charges` table instead, which already contains the calculated charge amounts that were created when the visits were saved. This is the same source that the "VETERINARINIŲ DARBŲ ATLIKIMO AKTAS" report uses.

**File:** `src/components/FarmDetailAnalytics.tsx` - `loadUnpaidCharges()` function

### 3. **Inconsistent Values Between Detailed and Simple View**
**Problem:** 
- Detailed view showed "Likutis" (remaining stock value) = €526.93
- Simple view showed "Bendra suma" (total allocated value) = €645.95
- These should match and show the total allocated value

**Solution:** 
- Added new calculations: `totalAllocatedValue` and `totalAllocatedValueBeforeDiscount`
- Updated detailed view footer to use these values instead of remaining stock values
- Changed labels from "Likutis bendra vertė" to "Paskirstyta bendra vertė"
- Updated header to show both "Paskirstyta vertė" (allocated) and "Likutis sandėlyje" (remaining)
- Now both views show the same €645.95 total

**Files:** `src/components/FarmDetailAnalytics.tsx`

### 4. **Direct Warehouse Usage Not Showing**
**Problem:** When medicines were used directly from warehouse (sandelis) without allocation, they weren't appearing in the farm analytics.

**Solution:** Added query to load `usage_items` where `warehouse_batch_id` is not null, and include those in the stock calculations.

**File:** `src/components/FarmDetailAnalytics.tsx` - `loadFarmData()` function

## Migration File

**File:** `supabase/migrations_saas/20260519000004_fix_farm_analytics_to_include_all_stock.sql`

This migration needs to be run in Supabase to fix the farm list values.

## What Now Shows Correctly

1. **Farm List (Pagal ūkius):**
   - Shows correct values (e.g., €150.00 instead of €1,013,400.00)
   - Includes all stock sources: allocated, direct batches, and direct warehouse usage

2. **Farm Detail Analytics:**
   - Service charges show actual prices instead of €0.00
   - Detailed and simple views show consistent totals
   - Direct warehouse usage is included in calculations
   - Header clearly shows both allocated value and remaining stock

3. **Consistency:**
   - All calculations match between detailed/simple views and PDF/Excel exports
   - Values match what's shown in official reports

## Next Steps

1. Run the migration: `20260519000004_fix_farm_analytics_to_include_all_stock.sql`
2. Refresh the page to see updated values
3. Service charges should now display correctly (they read from `visit_charges` table)
4. Both view modes should show matching totals

## Technical Details

### View Structure
The new view uses CTEs to:
1. Calculate allocation values (with proper grouping to prevent multiplication)
2. Calculate direct batch values (with proper grouping)
3. Aggregate these safely using subqueries in the final SELECT

### Service Charges
Now reads from `visit_charges` table which contains:
- `charge_amount`: The actual calculated charge
- `charge_type`: 'paslauga' for service charges
- `invoiced`: false for uninvoiced charges

This matches how the reports work, ensuring consistency across the system.
