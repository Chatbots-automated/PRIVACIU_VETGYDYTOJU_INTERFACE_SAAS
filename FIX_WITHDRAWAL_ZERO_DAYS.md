# Fix: Karencines Dienos Showing 1 Day for Products with 0 Withdrawal Period

## Problem
Products with 0 withdrawal days (karencines dienos = 0) were incorrectly showing as 1 day in:
- **IŠLAUKŲ ATASKAITA** (Withdrawal Report)
- **GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS** (Treated Animals Registration Journal)

## Root Cause
The `Treatment.tsx` and `BulkTreatment.tsx` components were **not calling** the `calculate_withdrawal_dates()` function after creating treatments. This function is responsible for:
1. Calculating withdrawal dates based on products used
2. Ensuring products with 0 withdrawal days get NULL dates (not tomorrow's date)
3. Adding the +1 safety day only when withdrawal period > 0

## Files Fixed

### 1. `src/components/Treatment.tsx`
**What was changed:**
- Added call to `supabase.rpc('calculate_withdrawal_dates')` after creating treatment and usage items
- This ensures withdrawal dates are properly calculated for all new treatments

### 2. `src/components/BulkTreatment.tsx`
**What was changed:**
- Added call to `supabase.rpc('calculate_withdrawal_dates')` after creating treatment and usage items
- This ensures withdrawal dates are properly calculated for bulk treatments

### 3. NEW Migration: `supabase/migrations_saas/20260520000008_recalculate_all_withdrawal_dates.sql`
**What it does:**
- Recalculates withdrawal dates for ALL existing treatments
- Fixes any old data that was created before this fix
- Shows progress every 100 records
- Displays a summary of treatments with NULL dates (correct behavior for 0-day products)

## How the Fix Works

### Before the fix:
1. Treatment created with product that has 0 withdrawal days
2. `calculate_withdrawal_dates()` was never called
3. Withdrawal dates remained NULL OR were set to wrong values
4. Reports showed incorrect "1 day" or inconsistent values

### After the fix:
1. Treatment created with product that has 0 withdrawal days
2. `calculate_withdrawal_dates()` is automatically called
3. Function checks: `IF withdrawal_days > 0 THEN set date ELSE set NULL`
4. Products with 0 days → NULL dates → Reports show "Nėra"
5. Products with actual days → Correct date → Reports show correct days

## What You Need to Do

### Step 1: Apply the migration to Supabase
```bash
cd c:\Projects\PRIVACIU_VETGYDYTOJU_INTERFACE_SAAS
supabase db push
```

This will apply the new migration `20260520000008_recalculate_all_withdrawal_dates.sql` which recalculates all existing treatments.

### Step 2: Verify the fix
1. Go to **Gydymai** (Treatments) and create a new treatment using a product with 0 withdrawal days
2. Go to **Ataskaitos** → **IŠLAUKŲ ATASKAITA**
3. Verify that the treatment shows "Nėra" (not "1 day") for both meat and milk withdrawal
4. Go to **Ataskaitos** → **GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS**
5. Verify that the same treatment shows "Nėra" in the "Išlauka" column

### Step 3: Check existing treatments
After applying the migration, all existing treatments should be automatically fixed. Check a few old treatments to verify they now show correct withdrawal periods.

## Technical Details

### The `calculate_withdrawal_dates()` Function Logic:
```sql
-- For meat withdrawal:
IF v_max_meat_days IS NOT NULL AND v_max_meat_days > 0 THEN
    v_meat_until := v_reg_date + v_max_meat_days + 1;  -- +1 safety day
ELSE
    v_meat_until := NULL;  -- No withdrawal period required
END IF;

-- For milk withdrawal:
IF v_max_milk_days IS NOT NULL AND v_max_milk_days > 0 THEN
    v_milk_until := v_reg_date + v_max_milk_days + 1;  -- +1 safety day
ELSE
    v_milk_until := NULL;  -- No withdrawal period required
END IF;
```

### View Logic in `vw_treated_animals_detailed`:
```sql
-- Days until meat withdrawal ok:
CASE
    WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE
    THEN (t.withdrawal_until_meat - CURRENT_DATE)  -- Shows days remaining
    ELSE 0  -- Withdrawal period has ended
END AS withdrawal_days_meat
```

### Frontend Display Logic in Reports:
```typescript
// IŠLAUKŲ ATASKAITA (Withdrawal Report)
{row.withdrawal_until_meat ? (
    <div>{row.days_until_meat_ok} d. iki {formatDateLT(row.withdrawal_until_meat)}</div>
) : (
    <span>Nėra</span>  // Shows "Nėra" when date is NULL
)}

// GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS
{row.withdrawal_until_meat ? (
    <div>🥩 {formatDateLT(row.withdrawal_until_meat)}</div>
) : (
    <div>🥩 Nėra</div>  // Shows "Nėra" when date is NULL
)}
```

## Migration Files Applied (in order):
1. ✅ `20260520000003_fix_zero_withdrawal_dates.sql` - Fixed existing data
2. ✅ `20260520000004_fix_withdrawal_zero_days_calculation.sql` - Updated function logic
3. 🆕 `20260520000008_recalculate_all_withdrawal_dates.sql` - Recalculate all treatments (APPLY THIS NOW)

## Summary
The issue is now fixed! Products with 0 withdrawal days will correctly show "Nėra" in both reports instead of "1 day". The fix applies to:
- ✅ All new treatments created from now on
- ✅ All existing treatments (after running the migration)
- ✅ Both single treatments (Treatment.tsx) and bulk treatments (BulkTreatment.tsx)
- ✅ Both reports (IŠLAUKŲ ATASKAITA and GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS)
