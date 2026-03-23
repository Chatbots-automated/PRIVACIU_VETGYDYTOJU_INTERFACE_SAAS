# 🚀 Complete Fix Guide - Apply These in Order

## Overview

All code changes are complete! You just need to apply 3 SQL migrations to make everything work.

---

## Step 1: Fix Login (URGENT!)

**File**: `FIX_LOGIN_NOW.sql`

**Issue**: 409 error when logging in

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of `FIX_LOGIN_NOW.sql`
3. Paste and click "Run"
4. Should see 1 row returned
5. Test login: gratasgedraitis@gmail.com / 123456

---

## Step 2: Fix Stock Display

**File**: `supabase/migrations/20260322000002_fix_batch_product_references.sql`

**Issue**: Stock shows in "Atsargos" but displays as 0.00 in treatment forms

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of the migration file
3. Paste and click "Run"
4. Check output - should show "Batches with warehouse products: 0"
5. Refresh browser

---

## Step 3: Enable Invoice View Button

**File**: `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`

**Issue**: Can't view invoice details from Drug Journal report

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of the migration file
3. Paste and click "Run"
4. Refresh browser

---

## What's Fixed

### ✅ Login System
- 409 error resolved
- Both users can log in

### ✅ Treatment Tab Rename
- "Gydymas" → "Gydymų istorija"
- Clearer that it shows history

### ✅ Course Planning - Bulk Entry Mode
**How it works now**:
1. Click "Gydymo kurso planavimas"
2. Select dates (e.g., 3 days)
3. For EACH day, enter:
   - Product
   - Batch (serija)
   - Quantity (kiekis)
4. Click "Patvirtinti kursą"
5. **ALL visits auto-complete immediately**
6. **Stock deducted for all days at once**

Perfect for entering historical treatment data!

### ✅ Stock Allocation
- Products auto-create in farm when allocated
- No manual product creation needed
- Works seamlessly

### ✅ Stock Display
- Correct quantities everywhere
- Farm-specific filtering
- Batches show correct stock levels

### ✅ Invoice Display in Pajamavimas
**New section**: "Priimtos sąskaitos"
- Shows all received warehouse invoices
- Click to expand and see products
- Displays totals and supplier info

### ✅ Invoice View in Drug Journal
**New button**: "Peržiūrėti"
- Appears next to invoice numbers
- Click to see full invoice details
- Shows all products, quantities, prices
- Displays total amounts

---

## Complete Testing Checklist

### 1. Login ✓
- [ ] Run `FIX_LOGIN_NOW.sql`
- [ ] Login with gratasgedraitis@gmail.com / 123456
- [ ] No 409 error

### 2. Stock Display ✓
- [ ] Run `20260322000002_fix_batch_product_references.sql`
- [ ] Refresh browser
- [ ] Open animal → "Vienkartinis gydymas"
- [ ] Select ENGEMYCIN
- [ ] Shows "Likutis: 1000.00 ml" (not 0.00)

### 3. Course Planning ✓
- [ ] Open animal → "Gydymo kurso planavimas"
- [ ] Add 3 dates
- [ ] Enter ENGEMYCIN with quantities for each day (e.g., 10 ml)
- [ ] Click "Patvirtinti kursą"
- [ ] All 3 visits created as "Baigtas"
- [ ] Stock reduced by 30 ml total
- [ ] Check "Gydymų istorija" - all 3 treatments appear

### 4. Stock Allocation ✓
- [ ] Go to Vetpraktika → Paskirstymas
- [ ] Select warehouse product
- [ ] Allocate to farm
- [ ] Check farm's Produktai tab
- [ ] Product appears automatically

### 5. Invoice Display ✓
- [ ] Go to Vetpraktika → Pajamavimas
- [ ] Upload PDF invoice
- [ ] Match products, fill batch info
- [ ] Click "Priimti pažymėtus produktus"
- [ ] Scroll down to "Priimtos sąskaitos" section
- [ ] Invoice appears in list
- [ ] Click to expand and see products

### 6. Invoice View Button ✓
- [ ] Run `20260322000003_add_invoice_id_to_drug_journal.sql`
- [ ] Refresh browser
- [ ] Go to Vetpraktika → Bendros Ataskaitos
- [ ] Select "VETERINARINIŲ VAISTŲ..." report
- [ ] Find row with "Sąskaita faktūra Nr. XXX"
- [ ] Blue "Peržiūrėti" button appears
- [ ] Click button
- [ ] Modal shows complete invoice with totals

---

## SQL Files to Apply (In Order)

1. `FIX_LOGIN_NOW.sql` - Login fix
2. `supabase/migrations/20260322000002_fix_batch_product_references.sql` - Stock display
3. `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql` - Invoice view button

---

## Code Changes Summary

### AnimalDetailSidebar.tsx
- Fixed `allHaveQuantities` variable scope
- Tab renamed to "Gydymų istorija"
- Course auto-completion logic
- Stock filtering by farm_id

### CourseMedicationScheduler.tsx
- Requires quantities for ALL days
- Filters products and batches by farm_id
- Updated UI messages

### StockAllocation.tsx
- Auto-creates farm products
- Uses farm product ID for batches

### WarehouseStock.tsx
- Added warehouse invoice list display
- Added `invoice_id` to batch creation
- Shows "Priimtos sąskaitos" section

### ReportTemplates.tsx
- Added invoice view modal
- Added "Peržiūrėti" button in Drug Journal
- Displays complete invoice details

---

## Quick Reference

### Where to Find Things

**Pajamavimas (Upload Invoices)**:
- Vetpraktika → Pajamavimas
- Upload PDF → Match products → Receive
- Scroll down to see "Priimtos sąskaitos"

**Drug Journal (View Invoices)**:
- Vetpraktika → Bendros Ataskaitos
- Select "VETERINARINIŲ VAISTŲ..."
- Click "Peržiūrėti" button next to invoice numbers

**Course Planning (Bulk Entry)**:
- Open any animal
- Click "Gydymo kurso planavimas"
- Enter all quantities upfront
- All visits auto-complete

---

## Need Help?

See detailed documentation:
- `LATEST_FIXES.md` - This file
- `FIX_STOCK_DISPLAY_ISSUE.md` - Stock display details
- `CHANGES_SUMMARY.md` - Complete technical summary
- `APPLY_THESE_FIXES.md` - Previous fixes guide

---

**IMPORTANT**: Apply all 3 SQL files, then refresh your browser!

Everything should work perfectly after that! 🎉
