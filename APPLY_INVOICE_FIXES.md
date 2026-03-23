# Apply Invoice and Drug Journal Fixes

## Issues Fixed

### 1. Duplicate Entries in Drug Journal
**Problem**: When warehouse stock is allocated to farms, entries appear twice in the drug journal:
- Once as warehouse batch (with invoice details)
- Once as farm batch (with "Warehouse Allocation")

**Solution**: Modified the `vw_vet_drug_journal_all_farms` view to only show warehouse batches that have remaining stock (`qty_left > 0`). Once fully allocated, only the farm batch appears.

### 2. Invoice View Button Not Appearing
**Problem**: The "Peržiūrėti" (View) button doesn't appear next to invoice numbers in the Drug Journal report.

**Solution**: Added `invoice_id` column to both `vw_vet_drug_journal` and `vw_vet_drug_journal_all_farms` views. The button checks for `batch.invoice_id` and will now display correctly.

### 3. Warehouse Invoices Not Appearing in Išlaidos Tab
**Problem**: Invoices uploaded via Pajamavimas (warehouse receiving) don't appear in the Išlaidos module.

**Solution**: Updated `InvoiceViewer` component to accept a `showAllInvoices` prop. When `true`, it shows ALL invoices (both warehouse and farm). The Išlaidos module now passes `showAllInvoices={true}`.

## How to Apply

### Step 1: Apply Database Migration
Run this migration in the Supabase Dashboard SQL Editor:

**File**: `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`

This migration:
- Adds `invoice_id` column to both drug journal views
- Fixes warehouse batch duplication by filtering `qty_left > 0`
- Enables the invoice view button functionality

### Step 2: Verify Frontend Changes
The following files have been updated (no action needed, changes are already in place):

1. **`src/components/InvoiceViewer.tsx`**
   - Added `showAllInvoices` prop (defaults to `false`)
   - When `true`, shows all invoices without farm filtering
   - When `false`, shows warehouse invoices if no farm selected, or farm invoices if farm selected
   - Displays farm/warehouse badge when showing all invoices
   - Updated UI text to clarify context

2. **`src/App.tsx`**
   - Passes `showAllInvoices={true}` to `InvoiceViewer` in Išlaidos module
   - This ensures all invoices (warehouse + farms) appear in Išlaidos

3. **`src/components/ReportTemplates.tsx`**
   - Already has the "Peržiūrėti" button that checks for `invoice_id`
   - Will work once migration is applied

### Step 3: Test the Fixes

1. **Test Drug Journal Duplicates**:
   - Go to Bendros Ataskaitos → Drug Journal
   - Verify that allocated products only appear once (as farm batch, not warehouse batch)

2. **Test Invoice View Button**:
   - In the Drug Journal report, look for entries with invoice numbers
   - Click the "Peržiūrėti" button next to invoice numbers
   - Verify the invoice modal opens with full details

3. **Test Warehouse Invoices in Išlaidos**:
   - Upload an invoice via Pajamavimas tab
   - Go to the Išlaidos module (from main menu)
   - Verify the invoice appears with a "Sandėlis" (Warehouse) badge
   - Click to expand and see invoice items
   - Verify both warehouse and farm invoices appear together

## Expected Behavior After Fix

### Drug Journal
- Farm batches show with full invoice details (if linked to invoice)
- Warehouse batches only show if they still have stock available
- No duplicate entries for allocated products

### Invoice View Button
- Appears next to any invoice number that has a linked `invoice_id`
- Opens a modal showing:
  - Invoice header (number, date, supplier, totals)
  - All invoice items with products and prices

### Išlaidos Tab
- Shows ALL invoices (warehouse + all farms)
- Each invoice has a badge: "Sandėlis" (purple) or farm name (green)
- All invoices are expandable to view items
- Clear distinction between warehouse and farm invoices

## Notes

- The migration must be applied for the invoice view button to work
- Frontend changes are already in place and will work immediately after migration
- Warehouse invoices have `farm_id = NULL` in the database
- Farm invoices have a specific `farm_id` value
- The Išlaidos module now shows a unified view of all invoices across the system
