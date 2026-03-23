# 🚨 APPLY THESE FIXES NOW 🚨

## Step 1: Fix Login (URGENT!)

**File**: `FIX_LOGIN_NOW.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `FIX_LOGIN_NOW.sql`
3. Click "Run"
4. You should see: 1 row returned with user info
5. Try logging in: gratasgedraitis@gmail.com / 123456

---

## Step 2: Fix Stock Display Issue (REQUIRED!)

**File**: `supabase/migrations/20260322000002_fix_batch_product_references.sql`

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of the migration file
3. Click "Run"
4. Check the output - it will show "Batches with warehouse products: 0" (after fix)
5. Refresh your browser

**This fixes**: Stock showing in "Atsargos" but displaying as 0.00 in treatment forms

---

## What's Fixed

### ✅ Login Issue
- 409 error resolved
- `verify_password` function now returns `user_farm_id`

### ✅ Treatment History Tab
- Renamed "Gydymas" → "Gydymų istorija"

### ✅ Course Planning - Bulk Entry Mode
- Enter ALL medication quantities upfront
- ALL visits auto-complete immediately
- Stock deducted for all days at once
- Perfect for historical data entry

### ✅ Stock Allocation
- Products auto-create in farm when allocated
- No manual product creation needed

### ✅ Stock Display
- Products filtered by farm_id
- Batches filtered by farm_id
- Correct quantities displayed everywhere

---

## Quick Test

After applying both SQL fixes:

1. **Login**: Should work without 409 error
2. **Open animal**: Click any animal
3. **Check stock**: Click "Vienkartinis gydymas" → select ENGEMYCIN
4. **Verify**: Should show "Likutis: 1000.00 ml" (not 0.00)
5. **Test course**: Click "Gydymo kurso planavimas"
   - Add 2-3 dates
   - Select ENGEMYCIN for each date
   - Enter quantities (e.g., 10 ml per day)
   - Click "Patvirtinti kursą"
   - All visits should be created as "Baigtas"
   - Stock should be deducted immediately

---

## Files Changed

- `src/components/AnimalDetailSidebar.tsx` - Tab rename, course logic, stock filters
- `src/components/CourseMedicationScheduler.tsx` - Bulk entry mode, farm filtering
- `src/components/StockAllocation.tsx` - Auto-create farm products
- `FIX_LOGIN_NOW.sql` - Login fix
- `supabase/migrations/20260322000002_fix_batch_product_references.sql` - Stock data fix

---

## Need Help?

See detailed documentation:
- `FIX_STOCK_DISPLAY_ISSUE.md` - Detailed explanation of stock issue
- `CHANGES_SUMMARY.md` - Complete technical summary

---

**IMPORTANT**: Apply both SQL files in order:
1. `FIX_LOGIN_NOW.sql` (so you can log in)
2. `20260322000002_fix_batch_product_references.sql` (so stock displays correctly)

Then refresh your browser and test!
