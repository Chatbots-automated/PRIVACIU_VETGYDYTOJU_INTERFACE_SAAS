# Invoice and Drug Journal Fixes - Summary

## Quick Overview

Fixed 3 critical issues with invoice display and drug journal reporting:

1. **Duplicate entries** when allocating warehouse stock to farms
2. **Missing invoice view button** in Bendros Ataskaitos
3. **Warehouse invoices not appearing** in Išlaidos tab

## What Was Changed

### Database Changes (Requires Migration)

**Migration File**: `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`

Changes:
- Added `invoice_id` column to `vw_vet_drug_journal` view
- Added `invoice_id` column to `vw_vet_drug_journal_all_farms` view
- Modified warehouse batch query to only show batches with `qty_left > 0` (prevents duplicates)

### Frontend Changes (Already Applied)

**File**: `src/components/InvoiceViewer.tsx`
- Modified `loadInvoices()` to show warehouse invoices when no farm is selected
- Updated UI text to clarify warehouse vs. farm invoice context

**File**: `src/components/ReportTemplates.tsx`
- Already has the "Peržiūrėti" button implementation (from previous fix)
- Will work once migration is applied

## How to Apply

### Option 1: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Open `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`
3. Copy and paste the entire SQL content
4. Click "Run" to execute
5. Refresh your app

### Option 2: Supabase CLI
```bash
supabase db push
```

## Testing Checklist

After applying the migration:

- [ ] **Drug Journal**: No duplicate entries when allocating stock
- [ ] **Drug Journal**: "Peržiūrėti" button appears next to invoice numbers
- [ ] **Drug Journal**: Clicking button opens invoice modal with full details
- [ ] **Išlaidos Tab**: Warehouse invoices appear after upload via Pajamavimas
- [ ] **Išlaidos Tab**: Can expand invoices to see items and totals

## Technical Details

### Why Duplicates Occurred
When you allocate warehouse stock to a farm:
1. A `warehouse_batches` record exists with the invoice
2. A `batches` (farm) record is created from the allocation
3. Both appeared in the drug journal view

**Fix**: Only show warehouse batches that still have stock (`qty_left > 0`). Once fully allocated, only the farm batch appears.

### Why Invoices Weren't Appearing
The `InvoiceViewer` component was filtering by `farm_id = selectedFarm.id`, which excluded warehouse invoices (where `farm_id IS NULL`).

**Fix**: When no farm is selected, query for `farm_id IS NULL` to show warehouse invoices.

### Why Button Wasn't Appearing
The `invoice_id` column wasn't included in the drug journal views, so `batch.invoice_id` was always undefined.

**Fix**: Added `invoice_id` to both views so the button's conditional check works.

## Files Modified

### Database Migrations
- `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql` (updated)
- `supabase/migrations/20260322000004_fix_drug_journal_duplicates.sql` (created, but merged into 003)

### Frontend Components
- `src/components/InvoiceViewer.tsx` (updated)
- `src/components/ReportTemplates.tsx` (already had button, no changes needed)

## Next Steps

1. Apply the migration via Supabase Dashboard
2. Test all three scenarios above
3. If any issues persist, check:
   - Migration was applied successfully
   - Browser cache is cleared
   - Data exists in the database (invoices, batches, invoice_items)
