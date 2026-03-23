# Final Invoice and Module Changes

## Summary of All Changes

### 1. Removed Išlaidos Module ✓
The standalone "Išlaidos" module has been completely removed from the application:
- No longer appears in the main module selector
- Removed from App.tsx routing
- Functionality moved to Bendros Ataskaitos

### 2. Added "Sąskaitos" Report to Bendros Ataskaitos ✓
A comprehensive new report type showing all invoices with detailed product tracking:

**Key Features**:
- Shows ALL invoices (warehouse + all farms)
- Expandable invoice cards
- **Product allocation tracking** - see exactly where each product went
- Batch/LOT number tracking
- Price breakdown per product
- Summary cards with totals
- Excel export capability

### 3. Enhanced Module Cards ✓
Since there are now only 3 modules, the cards are:
- **Bigger and more prominent** (3-column grid instead of 4)
- **Larger icons** (w-20 h-20 instead of w-16 h-16)
- **Bigger text** (text-3xl instead of text-2xl)
- **Enhanced hover effects** (scale-105, shadow-2xl)
- **More padding** (p-8 instead of p-6)

### 4. Fixed Invoice Display Errors ✓
Added safety checks for undefined values:
- `total_gross`, `total_net`, `total_vat` now default to 0
- `unit_price`, `total_price` for items default to 0
- `vat_rate` defaults to 0

## What You'll See in Sąskaitos Report

### Invoice List View
Each invoice card shows:
- **Invoice number** (e.g., #141990)
- **Date** in Lithuanian format
- **Badge**: "Sandėlis" (purple) or Farm name (green)
- **Supplier** name and code
- **Total amount** with currency
- **Product count**

### Expanded Invoice View
When you click an invoice, you see:
- **All products** from that invoice
- For each product:
  - Line number
  - Product name and category
  - SKU (if available)
  - **Quantity** purchased
  - **Unit price**
  - **Serija** (Batch LOT number)
  - **Paskirstyta** (Which farm it was allocated to) - shown in green
  - **Total price** for that line
- **Invoice totals** at the bottom:
  - Sum without VAT
  - VAT amount and rate
  - Total sum with VAT

### Summary Cards (Top of Report)
- **Sąskaitų skaičius**: Total number of invoices
- **Suma be PVM**: Total net amount
- **PVM suma**: Total VAT
- **Suma su PVM**: Total gross amount

## How to Access

1. Go to **Vetpraktika UAB** module (from main menu)
2. Click **Bendros Ataskaitos** in the sidebar
3. Click the **Sąskaitos** button (4th button, next to Karencijos žurnalas)
4. Use filters:
   - Date range (from/to)
   - Specific farm (optional)
5. Click any invoice to expand and see products
6. Click "Eksportuoti į Excel" to export

## Product Tracking Example

When you view an invoice, you'll see something like:

```
#1 METRICURE, 500 mg gimd. susp.
   Kiekis: 1000 ml
   Vnt. kaina: €45.00
   Serija: A238A01
   Paskirstyta: Ūkis "Žalgirio" (if allocated)
   €45,000.00
```

This tells you:
- What was purchased
- How much
- What batch/LOT
- **Which farm received it**
- Total cost

## Database Migration Still Required

To fix the duplicate entries and enable invoice view buttons in Drug Journal:

**File**: `supabase/migrations/20260322000003_add_invoice_id_to_drug_journal.sql`

Apply this in Supabase Dashboard SQL Editor.

## Files Modified

### Removed/Updated
- `src/App.tsx` - Removed Išlaidos module, removed Euro import
- `src/components/ModuleSelector.tsx` - Removed Išlaidos card, made modules bigger

### Enhanced
- `src/components/AllFarmsReports.tsx` - Added 'invoices' report type
- `src/components/ReportTemplates.tsx` - Added InvoicesReport component
- `src/lib/reportExport.ts` - Added invoice export columns

### Fixed
- `src/components/ReportTemplates.tsx` - Added safety checks for undefined values
- `src/components/InvoiceViewer.tsx` - Enhanced for all-invoice view

## Testing Checklist

- [ ] Only 3 modules appear in main menu (Veterinarija, Klientai, Vetpraktika)
- [ ] Module cards are bigger and more prominent
- [ ] Bendros Ataskaitos has "Sąskaitos" button
- [ ] Clicking "Sąskaitos" loads all invoices
- [ ] Warehouse invoices show "Sandėlis" badge
- [ ] Farm invoices show farm name badge
- [ ] Expanding invoice shows all products
- [ ] Products show "Paskirstyta: [Farm Name]" when allocated
- [ ] Products show "Serija: [LOT]" batch number
- [ ] Summary cards show correct totals
- [ ] Can export to Excel
- [ ] No errors in console

## Benefits

1. **Unified Interface**: All reports in one place
2. **Better Tracking**: See exactly where products went
3. **Cleaner UI**: 3 larger, more prominent modules
4. **Comprehensive View**: All invoice data in one report
5. **Easy Export**: Excel export for accounting
