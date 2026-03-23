# Changes Summary - March 22, 2026

## 1. Login Fix (URGENT - Apply First!)

**File**: `FIX_LOGIN_NOW.sql`

**Issue**: 409 error when logging in - "Invalid email or password"

**Fix**: The `verify_password` function was missing the `user_farm_id` return column.

**Action Required**: 
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `FIX_LOGIN_NOW.sql`
3. Run the SQL
4. Test login with: gratasgedraitis@gmail.com / 123456

---

## 2. Animal Detail Sidebar - Treatment History Rename

**File**: `src/components/AnimalDetailSidebar.tsx`

**Change**: Renamed the "Gydymas" tab to "Gydymų istorija" (Treatment History)

**Impact**: More descriptive tab name that clearly indicates it shows historical treatment records.

---

## 3. Course Planning - Bulk Entry Mode

**Files**: 
- `src/components/CourseMedicationScheduler.tsx`
- `src/components/AnimalDetailSidebar.tsx`

**Changes**:
1. **CourseMedicationScheduler** now requires batch and quantity for ALL days (not just the first day)
2. When all quantities are entered upfront, ALL visits are automatically created as "Baigtas" (Completed)
3. Stock is automatically deducted for ALL visits immediately
4. Updated UI messages to reflect the new behavior

**Benefits**:
- Perfect for entering historical treatment data
- No need to manually complete each visit
- All stock is deducted at once
- Withdrawal periods calculated automatically for all days

**How it works**:
1. User clicks "Gydymo kurso planavimas"
2. Selects all treatment dates
3. For EACH date, enters:
   - Product
   - Batch (serija)
   - Quantity (kiekis)
   - Optional: teat position, purpose
4. Clicks "Patvirtinti kursą"
5. System automatically:
   - Creates all visits as "Baigtas"
   - Deducts stock for all days
   - Calculates withdrawal periods
   - Links all visits together

---

## 4. Stock Allocation - Auto-Create Farm Products

**File**: `src/components/StockAllocation.tsx`

**Change**: When allocating warehouse stock to a farm, if the product doesn't exist in that farm's product catalog, it's automatically created.

**How it works**:
1. User allocates warehouse stock to a farm
2. System checks if product exists for that farm
3. If not, creates a farm-specific product with all the same properties as the warehouse product
4. Creates batch with the allocated quantity

**Benefits**:
- No manual product creation needed
- Seamless stock allocation workflow
- Products automatically appear in farm's "Produktai" tab

---

## 5. Stock Display Fix - Show Correct Quantities

**File**: `src/components/AnimalDetailSidebar.tsx`

**Issue**: When using treatments or vaccination forms, stock quantities showed 0 even though batches existed in the farm.

**Fix**: Added `farm_id` filter to batch queries in:
- `fetchStockLevel()` - now filters batches by farm_id
- `getOldestBatchWithStock()` - now filters batches by farm_id

**Impact**: 
- Stock levels now display correctly
- Batch dropdowns show correct quantities
- "Likutis" (remaining stock) displays accurate values

---

## Critical Fixes to Apply

### Step 1: Fix Login (URGENT!)
Run `FIX_LOGIN_NOW.sql` in Supabase SQL Editor

### Step 2: Fix Existing Stock Data (REQUIRED!)
Run `supabase/migrations/20260322000002_fix_batch_product_references.sql` in Supabase SQL Editor

This fixes the issue where stock shows in "Atsargos" but displays as 0 in treatment forms.

---

## Testing Checklist

### 1. Login Test
- [ ] Run `FIX_LOGIN_NOW.sql` in Supabase SQL Editor
- [ ] Login with gratasgedraitis@gmail.com / 123456
- [ ] Verify no 409 error

### 2. Stock Display Fix
- [ ] Run `20260322000002_fix_batch_product_references.sql` in Supabase SQL Editor
- [ ] Refresh browser
- [ ] Open animal detail sidebar
- [ ] Click "Vienkartinis gydymas"
- [ ] Select ENGEMYCIN (or any allocated product)
- [ ] Verify "Likutis" shows correct quantity (e.g., 1000 ml, not 0.00)

### 3. Treatment History Tab
- [ ] Open any animal detail sidebar
- [ ] Verify tab is now labeled "Gydymų istorija" instead of "Gydymas"

### 4. Course Planning - Bulk Entry
- [ ] Open animal detail sidebar
- [ ] Click "Gydymo kurso planavimas"
- [ ] Add 3-4 dates
- [ ] For each date, add a medication with batch and quantity
- [ ] Verify all fields are required (not just first day)
- [ ] Click "Patvirtinti kursą"
- [ ] Verify all visits are created as "Baigtas"
- [ ] Check "Gydymų istorija" tab - all treatments should appear
- [ ] Check stock levels - should be deducted for all days

### 5. Stock Allocation - Auto-Create Products
- [ ] Go to Vetpraktika → Paskirstymas
- [ ] Select a warehouse product that doesn't exist in target farm
- [ ] Allocate to farm
- [ ] Go to that farm's Produktai tab
- [ ] Verify product now appears in the list

### 6. Course Planning with Stock Deduction
- [ ] Open animal detail sidebar
- [ ] Click "Gydymo kurso planavimas"
- [ ] Add 3 dates (e.g., today, tomorrow, day after)
- [ ] For each date, select ENGEMYCIN and enter quantities (e.g., 10 ml each day)
- [ ] Click "Patvirtinti kursą"
- [ ] Verify all 3 visits are created as "Baigtas"
- [ ] Check "Atsargos" tab - stock should be reduced by 30 ml total
- [ ] Check "Gydymų istorija" - all 3 treatments should appear

---

## Technical Notes

### Products Architecture
- **Warehouse Products**: `farm_id = NULL` (shared across all farms)
- **Farm Products**: `farm_id = <specific_farm_id>` (farm-specific)
- When allocating, system creates farm-specific product if needed

### Course Completion Logic
- If `courseMedicationSchedule` has quantities for all days:
  - All visits created with `status = 'Baigtas'`
  - All visits get `medications_processed = true`
  - Stock deducted immediately via `usage_items` for each visit
  - Each usage_item includes `use_date` matching the visit date

### Stock Queries
- All batch queries now include `farm_id` filter
- Ensures correct stock levels per farm
- Prevents cross-farm stock visibility issues
