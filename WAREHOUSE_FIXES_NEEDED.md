# Warehouse System - Remaining Fixes

## ✅ COMPLETED
1. **Fixed Course Planning Error** - Now correctly uses `warehouse_batch_id` for warehouse batches
2. **Fixed Stock Level Display** - Removed `qty_received` column from warehouse query
3. **Fixed Batch Auto-Selection** - Now selects from both farm and warehouse
4. **Fixed `AnimalDetailSidebar.tsx`** - All medication inserts now support warehouse batches
5. **Fixed `CourseMedicationScheduler.tsx`** - Now loads and displays warehouse products

## ⚠️ ISSUES REMAINING

### 1. Journals Not Showing Warehouse Stock

**Problem**: The journals query from `vw_vet_drug_journal` database view which only includes farm batches, not warehouse batches.

**Affected Journals**:
- VETERINARINIŲ VAISTŲ, BIOCIDŲ LIKUTIS (Stock Balance)
- SUNAUDOTŲ VETERINARINIŲ VAISTŲ, BIOCIDŲ NURAŠYMO AKTAS (Write-off Act)

**Solution Needed**:
Create a new database view or update existing view to include warehouse_batches:

```sql
CREATE OR REPLACE VIEW vw_vet_drug_journal_complete AS
SELECT 
  -- Farm batches
  b.id as batch_id,
  b.product_id,
  b.farm_id,
  b.client_id,
  p.name as product_name,
  p.registration_number,
  b.lot as batch_number,
  b.expiry_date,
  b.qty_received as quantity_received,
  b.qty_left as quantity_left,
  b.purchase_price,
  'farm' as source,
  -- Calculate usage from usage_items, biocide_usage, vaccinations
  COALESCE((SELECT SUM(quantity) FROM usage_items WHERE batch_id = b.id), 0) +
  COALESCE((SELECT SUM(quantity_used) FROM biocide_usage WHERE batch_id = b.id), 0) +
  COALESCE((SELECT SUM(dose_amount) FROM vaccinations WHERE batch_id = b.id), 0) as quantity_used
FROM batches b
JOIN products p ON b.product_id = p.id

UNION ALL

SELECT 
  -- Warehouse batches
  wb.id as batch_id,
  wb.product_id,
  NULL as farm_id,  -- Warehouse batches are client-wide
  wb.client_id,
  p.name as product_name,
  p.registration_number,
  wb.lot as batch_number,
  wb.expiry_date,
  wb.qty_received as quantity_received,
  wb.qty_left as quantity_left,
  wb.purchase_price,
  'warehouse' as source,
  -- Calculate usage from warehouse_batch_id columns
  COALESCE((SELECT SUM(quantity) FROM usage_items WHERE warehouse_batch_id = wb.id), 0) +
  COALESCE((SELECT SUM(quantity_used) FROM biocide_usage WHERE warehouse_batch_id = wb.id), 0) +
  COALESCE((SELECT SUM(dose_amount) FROM vaccinations WHERE warehouse_batch_id = wb.id), 0) as quantity_used
FROM warehouse_batches wb
JOIN products p ON wb.product_id = p.id;
```

Then update Reports.tsx to use this new view for both `stock_balance` and `write_off_act` cases.

### 2. Analytics Showing 0 Products

**Problem**: Analytics page "Analitika pagal ūkius" shows 0 products even when there is warehouse stock usage.

**Location**: `/src/components/FarmStockAnalytics.tsx` or similar

**Solution Needed**:
Update analytics queries to include:
- Warehouse batches (`warehouse_batches` table)
- Usage from warehouse (`usage_items.warehouse_batch_id`, `vaccinations.warehouse_batch_id`, `biocide_usage.warehouse_batch_id`)

### 3. Service Charges Showing €0.00

**Problem**: "Paslaugos mokesčiai" shows €0.00 even when a service price was entered.

**Location**: Likely in `PricingModal.tsx` or `visit_charges` table

**Debug Steps**:
1. Check if `visit_charges` record was created when pricing modal was completed
2. Verify the `total_price` or relevant price field is being saved
3. Check if the analytics query is reading from the correct table/columns

**Possible Solution**:
- The `PricingModal` might not be saving the service charge correctly
- The analytics might be reading from a different table than where charges are saved
- Need to check the `visit_charges` table structure and ensure data is being inserted

### 4. Database Triggers for Warehouse Usage

**Status**: ✅ Already created in migration `20260519000002_add_warehouse_batch_usage_support.sql`

The triggers automatically update `warehouse_batches.qty_left` when:
- `usage_items` with `warehouse_batch_id` are inserted/updated/deleted
- Similar for `biocide_usage` and `vaccinations`

## PRIORITY ORDER

1. **HIGH**: Fix journals (create/update database view) - Users need to see warehouse stock
2. **MEDIUM**: Fix analytics showing 0 - Important for reporting
3. **LOW**: Fix service charges €0.00 - Billing accuracy

## FILES TO UPDATE

### For Journals Fix:
1. Create new migration: `supabase/migrations_saas/YYYYMMDD_create_complete_drug_journal_view.sql`
2. Update `src/components/Reports.tsx` - Change queries for `stock_balance` and `write_off_act`

### For Analytics Fix:
1. Identify analytics file (likely `FarmStockAnalytics.tsx` or similar)
2. Update queries to include warehouse_batches
3. Update calculations to include warehouse usage

### For Service Charges Fix:
1. Check `PricingModal.tsx` - Ensure charges are saved
2. Check analytics query - Ensure it reads service charges correctly
3. Verify `visit_charges` table schema matches what code expects
