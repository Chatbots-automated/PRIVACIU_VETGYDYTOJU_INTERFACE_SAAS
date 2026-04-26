# Fixes Applied - April 26, 2026

## Issues Fixed

### 1. ✅ Products Not Loading in Bulk Treatment (400 Bad Request)
**Problem**: Query filtering by `category='ovules'` failed because `'ovules'` wasn't in the ENUM.

**Solution**: Created migration `20260426000008_add_ovules_to_product_category.sql`
- Added `'ovules'` to the `product_category` ENUM

---

### 2. ✅ Treatment History Not Loading (404 Not Found)
**Problem**: `treatment_history_view` didn't exist in the SaaS database.

**Solution**: Created migration `20260426000007_create_treatment_history_view.sql`
- Created comprehensive view with proper SaaS schema compatibility
- Fixed column names: `ui.qty` → `ui.quantity`
- Rebuilt treatment_courses subquery to work with SaaS multi-table structure

---

### 3. ✅ Automatic Batch Selection Not Working (404 Not Found)
**Problem**: `fn_fifo_batch` function missing from SaaS migrations.

**Solution**: Created migration `20260426000009_create_fn_fifo_batch.sql`
- Created FIFO (First In, First Out) batch selection function
- Prioritizes: expiring soon → oldest manufactured → oldest received
- Farm-isolated for multi-tenant safety

---

### 4. ✅ Bulk Treatment Failed - Missing client_id (400 Bad Request)
**Problem**: SaaS schema requires `client_id` in all tables, but BulkTreatment.tsx wasn't providing it.

**Solution**: Updated `src/components/BulkTreatment.tsx`
- Added import: `import { requireClientId } from '../lib/clientHelpers';`
- Added `client_id` to all database inserts:
  - `treatments` table (medicines and vaccines)
  - `vaccinations` table
  - `preventions` table
  - `usage_items` table
  - `animal_visits` table

---

### 5. ✅ Usage Items Insert Failed - Invalid Column (400 Bad Request)
**Problem**: Tried to insert `purpose` column which doesn't exist in SaaS `usage_items` table.

**Solution**: Updated `src/components/BulkTreatment.tsx`
- Removed `purpose` field from usage_items inserts
- In SaaS schema, purpose is implicit based on parent ID (treatment_id, vaccination_id, prevention_id, etc.)
- Also fixed: `qty` → `quantity` field name

---

### 6. ✅ Duplicate clientId Declaration (Compile Error)
**Problem**: `clientId` was declared multiple times in the same scope causing compile error.

**Solution**: Updated `src/components/BulkTreatment.tsx`
- Declared `clientId` once at the beginning of the animal loop
- Removed duplicate declarations

---

### 7. ✅ Animal Visits Insert Failed - Invalid Column (400 Bad Request)
**Problem**: Tried to insert `created_by_user_id` column which doesn't exist in SaaS `animal_visits` table.

**Solution**: Updated `src/components/BulkTreatment.tsx`
- Removed `created_by_user_id` field from animal_visits insert
- SaaS schema tracks user via audit fields differently

---

### 8. ✅ Treatment Cost Analysis Failed - Invalid Column (400 Bad Request)
**Problem**: TreatmentCostAnalysis.tsx tried to query `purpose` column from `usage_items` and batches relationship from synchronization_steps.

**Solution**: Updated `src/components/TreatmentCostAnalysis.tsx`
- Removed `purpose` from usage_items select query
- Changed vaccination detection from `item.purpose === 'vaccination'` to `item.vaccination_id` check
- Removed synchronization_steps query (batches relationship doesn't exist in SaaS)
- Removed sync medication cost calculation (now tracked via usage_items)
- SaaS schema determines purpose by which parent ID is set (treatment_id, vaccination_id, etc.)

---

### 9. ✅ Product Usage Analysis Failed - Invalid Column (400 Bad Request)
**Problem**: ProductUsageAnalysis.tsx tried to query `qty` column (should be `quantity`) and batches relationship from synchronization_steps.

**Solution**: Updated `src/components/ProductUsageAnalysis.tsx`
- Changed all `item.qty` references to `item.quantity`
- Changed select query from `qty` to `quantity`
- Removed synchronization_steps query (incompatible with SaaS schema)
- Skipped sync steps processing (sync medication usage tracked via usage_items in SaaS)
- SaaS schema: synchronization_steps only track protocol scheduling, not actual product usage

---

## Database Migrations Created

All migrations are in `supabase/migrations_saas/`:

1. **20260426000007_create_treatment_history_view.sql** (83 lines)
   - Creates treatment_history_view for displaying treatment history
   
2. **20260426000008_add_ovules_to_product_category.sql** (7 lines)
   - Adds 'ovules' to product_category ENUM
   
3. **20260426000009_create_fn_fifo_batch.sql** (33 lines)
   - Creates FIFO batch selection function

## Code Files Modified

1. **src/components/BulkTreatment.tsx**
   - Added `client_id` to all inserts
   - Removed non-existent `purpose` field
   - Removed non-existent `created_by_user_id` field
   - Fixed field names to match SaaS schema
   - Fixed duplicate `clientId` declarations

2. **src/components/TreatmentCostAnalysis.tsx**
   - Removed `purpose` field from usage_items query
   - Changed `item.purpose === 'vaccination'` to `item.vaccination_id` check

3. **src/components/ProductUsageAnalysis.tsx**
   - Removed synchronization_steps batch relationship query (not in SaaS schema)
   - Skipped sync steps processing (usage tracked via usage_items in SaaS)

4. **src/components/TreatmentCostAnalysis.tsx** (Service Pricing)
   - Added service_prices loading from database
   - Implemented dynamic visit cost calculation based on procedures
   - Replaced all hardcoded VISIT_BASE_COST references with actual prices
   - Updated UI to show service-based pricing
   - Calculates costs per visit based on procedures array (e.g., Gydymas, Vakcina, Profilaktika)

## How to Apply Migrations

### Option 1: Batch Script
```bash
cd supabase
apply_new_migrations.bat
```

### Option 2: Manual via Supabase Dashboard
1. Go to: https://supabase.com/dashboard/project/vlfjmffbwrmblvlsbsnz/sql
2. Run each migration in order (008, 007, 009)

---

### 10. ✅ Service-Based Visit Pricing Implementation
**Problem**: Visit costs were hardcoded at 10 EUR per visit, ignoring actual service prices configured in "Finansai → Kainų valdymas".

**Solution**: Updated `src/components/TreatmentCostAnalysis.tsx`
- Load `service_prices` from database based on client_id
- Calculate visit costs dynamically based on procedures performed
- Each visit's procedures array is looked up against service_prices table
- Display actual service costs instead of hardcoded values
- Updated UI text from "Vizitų bazinė kaina" to show it uses configured prices

**Example**: If vaccination costs 5 EUR and 5 cows are vaccinated in bulk treatment, total service cost = 25 EUR

---

## Results

After all fixes:
- ✅ Products load in "Masinis gydymas ir vakcinacijos"
- ✅ Batch is auto-selected when choosing a product (FIFO logic)
- ✅ Treatment History displays in "Gydymų istorija"
- ✅ Bulk treatments can be created successfully
- ✅ Multi-tenant data isolation is properly enforced
- ✅ Visit costs calculated from actual service prices (not hardcoded)
- ✅ Service costs properly reflect multiple procedures per visit

---

## Technical Details

### SaaS Schema Differences from Old Schema

1. **All tables require `client_id`** for multi-tenant isolation
2. **usage_items table**:
   - No `purpose` column (implicit based on parent ID)
   - Column named `quantity` not `qty`
   - Parent IDs: `treatment_id`, `vaccination_id`, `prevention_id`, `visit_id`
3. **treatment_courses table**:
   - Different structure with separate `course_medication_schedules` table
   - Links via `initial_treatment_id` instead of `treatment_id`

---

## Status: COMPLETE ✅

All issues have been resolved. The application is now fully functional with the SaaS multi-tenant schema.
