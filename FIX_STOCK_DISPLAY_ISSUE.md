# Fix Stock Display Issue - Complete Guide

## The Problem

You're seeing stock in the "Atsargos" tab (1000 ml of ENGEMYCIN), but when you try to use it in "Vienkartinis gydymas", it shows 0.00 ml.

## Root Cause

When stock was allocated from the warehouse BEFORE the fix, the batches were created with the **warehouse product ID** (where `farm_id = NULL`) instead of the **farm-specific product ID**.

Now the treatment forms filter products by `farm_id`, so they can't find the batches because the product IDs don't match.

## The Fix

I've created two solutions:

### Solution 1: Run Migration (Recommended)

This will automatically fix ALL existing batches in your database.

**File**: `supabase/migrations/20260322000002_fix_batch_product_references.sql`

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Copy the entire contents of the migration file
3. Paste and run it
4. Check the output - it will show how many batches were fixed

**What it does**:
- Finds all batches that reference warehouse products
- Creates farm-specific products if they don't exist
- Updates batches to reference the correct farm product
- Preserves all product properties (withdrawal days, category, etc.)

### Solution 2: Manual Re-allocation (Alternative)

If you prefer, you can:
1. Delete the problematic batches from the farm
2. Re-allocate the stock from the warehouse using the "Paskirstymas" tab
3. The new allocation will automatically create the farm product correctly

## Code Changes Made

### 1. `CourseMedicationScheduler.tsx`
- Now requires `farmId` prop
- Filters products by `farm_id`
- Filters batches by `farm_id`
- Shows correct stock levels

### 2. `AnimalDetailSidebar.tsx`
- Passes `farmId` to `CourseMedicationScheduler`
- Added `farm_id` filter to `fetchStockLevel()`
- Added `farm_id` filter to `getOldestBatchWithStock()`
- Removed invalid `use_date` field from `usage_items` inserts

### 3. `StockAllocation.tsx`
- Auto-creates farm-specific products when allocating
- Uses farm product ID for new batches

## Testing After Fix

1. **Run the migration** (`20260322000002_fix_batch_product_references.sql`)

2. **Test stock display**:
   - Open an animal detail sidebar
   - Click "Vienkartinis gydymas"
   - Select ENGEMYCIN
   - Should now show: "Likutis: 1000.00 ml" (not 0.00)
   - Batch dropdown should show: "25EY004/1 (Likutis: 1000)"

3. **Test course planning**:
   - Click "Gydymo kurso planavimas"
   - Add dates
   - Select ENGEMYCIN for each day
   - Batches should appear in dropdown
   - Enter quantities
   - Complete the course
   - Check that stock is deducted correctly

## Why This Happened

The original `StockAllocation.tsx` code created batches like this:

```typescript
// OLD CODE (before fix)
await supabase.from('batches').insert({
  farm_id: allocationForm.farm_id,
  product_id: product.product_id,  // ❌ This was the WAREHOUSE product ID
  // ...
});
```

But the treatment forms load products like this:

```typescript
// Treatment form
supabase.from('products')
  .select('*')
  .eq('farm_id', selectedFarm.id)  // ✅ Only farm products
```

So the batch's `product_id` didn't match any product in the farm's product list!

## The Solution

Now `StockAllocation.tsx` does this:

```typescript
// NEW CODE (after fix)
// 1. Check if farm product exists
const { data: existingFarmProduct } = await supabase
  .from('products')
  .select('id')
  .eq('farm_id', allocationForm.farm_id)
  .eq('name', product.product_name)
  .maybeSingle();

// 2. Create farm product if it doesn't exist
if (!existingFarmProduct) {
  // Create farm-specific product...
  farmProductId = newFarmProduct.id;
}

// 3. Create batch with farm product ID
await supabase.from('batches').insert({
  farm_id: allocationForm.farm_id,
  product_id: farmProductId,  // ✅ Farm-specific product ID
  // ...
});
```

## Summary

- **Immediate action**: Run `20260322000002_fix_batch_product_references.sql` in Supabase SQL Editor
- **Future allocations**: Will work correctly automatically
- **Stock display**: Will show correct quantities after migration
- **Course planning**: Will show available batches correctly

---

**Note**: After running the migration, refresh your browser to see the updated stock levels!
