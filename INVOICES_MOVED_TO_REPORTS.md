# Sąskaitos (Invoices) Moved to Bendros Ataskaitos

## What Changed

### 1. Removed Išlaidos Module
- Removed the standalone "Išlaidos" module from the main menu
- The module selector no longer shows the Išlaidos card
- All invoice functionality has been moved to "Bendros Ataskaitos" in Vetpraktika module

### 2. Added "Sąskaitos" Report to Bendros Ataskaitos
A new report type has been added to the Bendros Ataskaitos section with comprehensive invoice details:

**Features**:
- View all invoices (warehouse + all farms)
- See invoice totals (net, VAT, gross)
- Expand each invoice to see all products
- For each product, see:
  - Product name and category
  - Quantity and prices
  - Batch/LOT number
  - **Which farm it was allocated to** (if applicable)
  - Total price per line item

**Summary Cards**:
- Total number of invoices
- Total sum without VAT
- Total VAT amount
- Total sum with VAT

### 3. Enhanced Product Tracking
Each invoice item now shows:
- **Serija** (Batch LOT number)
- **Paskirstyta** (Allocated to which farm)
- This allows you to track exactly where each product went

## How to Access

1. Go to **Vetpraktika UAB** module
2. Click **Bendros Ataskaitos** in the sidebar
3. Click the **Sąskaitos** button (new button next to other report types)
4. Use date filters to narrow down results
5. Click on any invoice to expand and see all products
6. Export to Excel if needed

## Visual Indicators

- **Purple "Sandėlis" badge**: Warehouse invoices (not yet allocated)
- **Green farm name badge**: Farm invoices (allocated to specific farm)
- **"Paskirstyta: [Farm Name]"**: Shows which farm received each product

## Files Modified

### Frontend Changes (Already Applied)
1. **`src/App.tsx`**
   - Removed Išlaidos module section
   - Removed InvoiceViewer import
   - Updated Module type

2. **`src/components/ModuleSelector.tsx`**
   - Removed Išlaidos module card
   - Updated interface to remove 'islaidos' from module types

3. **`src/components/AllFarmsReports.tsx`**
   - Added 'invoices' to ReportType
   - Added "Sąskaitos" button
   - Added invoice data fetching with full product details
   - Imports InvoicesReport component

4. **`src/components/ReportTemplates.tsx`**
   - Added new `InvoicesReport` component
   - Shows expandable invoice list
   - Displays product allocations and batch tracking
   - Added ChevronDown/ChevronUp icons

5. **`src/lib/reportExport.ts`**
   - Added INVOICES_COLUMNS for Excel export
   - Updated getColumnsForReportType to handle 'invoices'
   - Updated getReportTitle to return 'Sąskaitos'

6. **`src/components/InvoiceViewer.tsx`**
   - Added `showAllInvoices` prop (for potential future use)
   - Enhanced to support both warehouse and farm contexts

### Database Migration (Still Needs to be Applied)
**File**: `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`

This migration:
- Adds `invoice_id` to drug journal views
- Fixes duplicate entries
- Enables invoice view buttons

## Benefits

1. **Centralized Reporting**: All reports in one place
2. **Better Product Tracking**: See exactly where each product went
3. **Comprehensive View**: Both warehouse and farm invoices together
4. **Easy Navigation**: No need to switch between modules
5. **Export Capability**: Export invoice data to Excel

## Testing Checklist

After the app reloads:

- [ ] Išlaidos module no longer appears in main menu
- [ ] Bendros Ataskaitos has new "Sąskaitos" button
- [ ] Clicking "Sąskaitos" shows all invoices
- [ ] Warehouse invoices show "Sandėlis" badge
- [ ] Farm invoices show farm name badge
- [ ] Expanding invoice shows all products
- [ ] Products show which farm they were allocated to
- [ ] Can export invoices to Excel
- [ ] Summary cards show correct totals

## Next Steps

1. The app should reload automatically with these changes
2. Apply the database migration for the invoice view button fix
3. Test the new Sąskaitos report in Bendros Ataskaitos
4. Verify product allocation tracking works correctly
