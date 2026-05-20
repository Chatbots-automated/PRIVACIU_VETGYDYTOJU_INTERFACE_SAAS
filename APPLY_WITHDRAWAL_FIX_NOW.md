# How to Apply the Withdrawal Days Fix

## Quick Summary
I fixed the issue where products with 0 withdrawal days were showing "1 day" in the reports. Now you need to apply one migration to fix all existing data.

## Option 1: Using Supabase CLI (Recommended)

1. **Login to Supabase** (if not already logged in):
   ```bash
   supabase login
   ```

2. **Link your project** (if not already linked):
   ```bash
   cd c:\Projects\PRIVACIU_VETGYDYTOJU_INTERFACE_SAAS
   supabase link --project-ref vlfjmffbwrmblvlsbsnz
   ```

3. **Push the migration**:
   ```bash
   supabase db push
   ```

This will apply the new migration: `20260520000008_recalculate_all_withdrawal_dates.sql`

## Option 2: Using Supabase Dashboard (If CLI doesn't work)

1. **Go to your Supabase Dashboard**: https://supabase.com/dashboard/project/vlfjmffbwrmblvlsbsnz

2. **Navigate to**: SQL Editor

3. **Open the migration file**: 
   `c:\Projects\PRIVACIU_VETGYDYTOJU_INTERFACE_SAAS\supabase\migrations_saas\20260520000008_recalculate_all_withdrawal_dates.sql`

4. **Copy the entire SQL content** from that file

5. **Paste it into the SQL Editor** in Supabase Dashboard

6. **Click "Run"** to execute the migration

7. **Wait for completion** - it will show progress messages like:
   - "Starting withdrawal date recalculation for X treatments..."
   - "Processed 100 of X treatments..."
   - "Completed! Recalculated withdrawal dates for X treatments."

## What This Migration Does

The migration will:
- ✅ Recalculate withdrawal dates for ALL existing treatments
- ✅ Fix any treatments that incorrectly show "1 day" for products with 0 withdrawal days
- ✅ Show progress messages so you can monitor the process
- ✅ Display a final count of treatments that now correctly have NULL dates

## After Applying the Migration

### Test the Fix:

1. **Create a new treatment**:
   - Go to **Gydymai** (Treatments)
   - Create a treatment using a product with 0 withdrawal days (e.g., Rivanolo 0.1%)
   - Click Save

2. **Check IŠLAUKŲ ATASKAITA**:
   - Go to **Ataskaitos** → **IŠLAUKŲ ATASKAITA**
   - Find your new treatment
   - Verify it shows **"Nėra"** (not "1 day") for both meat and milk withdrawal

3. **Check GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS**:
   - Go to **Ataskaitos** → **GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS**
   - Find your new treatment
   - Verify the "Išlauka" column shows **"🥩 Nėra"** and **"🥛 Nėra"**

4. **Check existing treatments**:
   - Look at a few old treatments that used products with 0 withdrawal days
   - They should now also show "Nėra" instead of "1 day"

## What Was Fixed in the Code

### 1. `Treatment.tsx` - Single treatments now calculate withdrawal dates correctly
### 2. `BulkTreatment.tsx` - Bulk treatments now calculate withdrawal dates correctly
### 3. Migration recalculates ALL existing treatments to fix old data

## If You See Any Issues

If after applying the migration you still see "1 day" for products with 0 withdrawal days:

1. Check that the migration completed successfully
2. Verify the product actually has 0 withdrawal days:
   - Go to **Produktai** (Products)
   - Find the product
   - Check "Karencija mėsai (dienomis)" and "Karencija pienui (dienomis)"
   - Both should be 0

3. If the product has withdrawal days but it's incorrect, update the product

4. If the problem persists, let me know and I'll investigate further

## Need Help?

If you encounter any issues applying the migration or the fix doesn't work as expected, just ask and I'll help troubleshoot!
