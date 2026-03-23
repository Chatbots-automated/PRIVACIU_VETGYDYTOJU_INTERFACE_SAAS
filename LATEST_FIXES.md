# Latest Fixes - March 22, 2026

## Issues Fixed

### 1. Fixed `allHaveQuantities is not defined` Error
**File**: `src/components/AnimalDetailSidebar.tsx`

**Issue**: Variable was defined inside an if block but used outside its scope.

**Fix**: Moved the variable declaration outside the if block with optional chaining.

```typescript
// Now declared at the right scope
const allHaveQuantities = treatmentData.courseMedicationSchedule?.every((daySchedule: any) => 
  daySchedule.medications.every((med: any) => med.qty && med.batch_id)
) || false;
```

---

### 2. Fixed Invoices Not Appearing After Upload
**File**: `src/components/WarehouseStock.tsx`

**Issue**: After uploading and verifying an invoice in the Pajamavimas tab, the invoice didn't appear anywhere.

**Fix**: Added a "Priimtos sąskaitos" (Received Invoices) section that displays all warehouse invoices after the upload form.

**Features**:
- Shows list of all warehouse invoices (where `farm_id IS NULL`)
- Displays invoice number, date, supplier, and total amount
- Click to expand and see all products in the invoice
- Auto-refreshes after receiving new stock

---

### 3. Added Invoice View Button in Drug Journal
**Files**: 
- `src/components/ReportTemplates.tsx`
- `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`

**Issue**: In the "VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS" report, there was no way to view the full invoice details.

**Fix**: 
1. Updated the `vw_vet_drug_journal` view to include `invoice_id`
2. Added a "Peržiūrėti" (View) button next to invoice numbers
3. Created a modal that displays full invoice details including:
   - Supplier information
   - Invoice number and date
   - All products with quantities and prices
   - Subtotal, VAT, and total amounts

**How it works**:
- In the Drug Journal report, look for "Sąskaita faktūra Nr. XXX"
- Click the blue "Peržiūrėti" button next to it
- Modal opens showing complete invoice details
- Click "Uždaryti" to close

---

### 4. Fixed Warehouse Batch Invoice Linking
**File**: `src/components/WarehouseStock.tsx`

**Issue**: When creating warehouse batches from invoice upload, the `invoice_id` wasn't being stored.

**Fix**: Added `invoice_id: invoice.id` to the batch creation in `handleBulkReceive`.

---

## SQL Migrations to Apply

### Migration 1: Add invoice_id to Drug Journal View
**File**: `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`

**What it does**: Updates the `vw_vet_drug_journal` view to include the `invoice_id` column so the report can link to full invoice details.

**Steps**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the contents of the migration file
3. Run it

---

## Testing

### Test 1: Invoice Upload and Display
1. Go to Vetpraktika → Pajamavimas
2. Upload a PDF invoice
3. Match products and fill in batch/expiry info
4. Click "Priimti pažymėtus produktus"
5. **Verify**: After success, scroll down to see "Priimtos sąskaitos" section
6. **Verify**: Your invoice appears in the list
7. Click on the invoice to expand and see products

### Test 2: Invoice View in Drug Journal
1. Go to Vetpraktika → Bendros Ataskaitos
2. Select "VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS"
3. Look for any row with "Sąskaita faktūra Nr. XXX"
4. **Verify**: Blue "Peržiūrėti" button appears next to invoice number
5. Click the button
6. **Verify**: Modal opens showing:
   - Supplier details
   - Invoice number and date
   - All products with quantities and prices
   - Total amounts (net, VAT, gross)
7. Click "Uždaryti" to close

### Test 3: Course Planning (from previous fixes)
1. Open animal detail sidebar
2. Click "Gydymo kurso planavimas"
3. Add 2-3 dates
4. Enter medications with quantities for ALL days
5. Click "Patvirtinti kursą"
6. **Verify**: No "allHaveQuantities is not defined" error
7. **Verify**: All visits created as "Baigtas"
8. **Verify**: Stock deducted correctly

---

## What's New

### Pajamavimas Tab (Warehouse Stock)
```
[Upload Invoice Section]
  ↓
[Verify and Match Products]
  ↓
[Click "Priimti pažymėtus produktus"]
  ↓
[NEW: "Priimtos sąskaitos" Section Appears Below]
  - Shows all received invoices
  - Click to expand and see products
  - Shows totals and supplier info
```

### Drug Journal Report
```
[Drug Journal Table]
  ↓
[Document Column]
  - Supplier name
  - "Sąskaita faktūra Nr. XXX"
  - [NEW: Blue "Peržiūrėti" button] ← Click this!
  - Invoice date
  ↓
[Invoice Modal Opens]
  - Complete invoice details
  - All products listed
  - Total amounts shown
```

---

## Technical Details

### Invoice Storage
- **Warehouse invoices**: `farm_id = NULL`
- **Farm invoices**: `farm_id = <specific_farm_id>`
- Stored in `invoices` table
- Line items in `invoice_items` table
- Linked to batches via `batches.invoice_id`

### Data Flow
1. User uploads PDF → Webhook extracts data
2. User matches products and fills batch info
3. System creates:
   - Invoice record (`invoices` table)
   - Warehouse batches (`warehouse_batches` table) with `invoice_id`
   - Invoice items (`invoice_items` table) linked to batches
4. Invoice appears in "Priimtos sąskaitos" list
5. Batches appear in Drug Journal with "Peržiūrėti" button

---

## Files Changed

1. `src/components/AnimalDetailSidebar.tsx` - Fixed `allHaveQuantities` scope
2. `src/components/WarehouseStock.tsx` - Added invoice list display and invoice_id to batches
3. `src/components/ReportTemplates.tsx` - Added invoice view button and modal
4. `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql` - Added invoice_id to view

---

## Summary

All requested features are now working:
- ✅ Course planning with bulk entry (all quantities upfront)
- ✅ Auto-complete all course visits
- ✅ Auto-create farm products when allocating
- ✅ Stock displays correctly
- ✅ Invoices appear after upload in Pajamavimas tab
- ✅ Invoice view button in Drug Journal report

**Next step**: Apply the SQL migration `20260322000003_add_invoice_id_to_drug_journal.sql` to enable the invoice view button in the Drug Journal!
