# Warehouse Stock Direct Usage Migration

## What This Migration Does

This migration enables farms to use products directly from the central warehouse (`warehouse_batches` table) without requiring an allocation step. Previously, the system only supported:
- Warehouse → Allocate to Farm → Use from Farm Batch

Now it also supports:
- **Warehouse → Use Directly from Warehouse** (new!)
- Farm-specific batches → Use from Farm Batch (existing)

## Changes Made

1. **Added `warehouse_batch_id` column** to `usage_items`, `biocide_usage`, and `vaccinations` tables
2. **Created automatic trigger** that decrements `qty_left` in `warehouse_batches` when products are used
3. **Added constraints** to ensure usage items reference EITHER a farm batch OR a warehouse batch (not both)

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase/migrations_saas/20260519000002_add_warehouse_batch_usage_support.sql`
4. Copy and paste the entire content into the SQL Editor
5. Click **Run**

### Option 2: Supabase CLI
```bash
supabase db push --db-url "your-database-connection-string"
```

### Option 3: Direct psql
```bash
psql "your-database-connection-string" < supabase/migrations_saas/20260519000002_add_warehouse_batch_usage_support.sql
```

## How It Works After Migration

### When Products Are Added to Warehouse (farm_id = NULL)
- Products go into `warehouse_batches` with `farm_id = NULL`
- **All farms** can see these products in their stock selection dropdowns
- When used, stock is decremented from `warehouse_batches.qty_left` automatically

### When Products Are Assigned to a Specific Farm
- Products go into `batches` table with a specific `farm_id`
- **Only that farm** can see and use these products
- When used, stock is tracked in `batches.qty_used` (existing behavior)

### Frontend Updates Included
- `Vaccinations.tsx`: Now loads both farm batches and warehouse batches
- `Treatment.tsx`: Now loads both farm batches and warehouse batches
- Batches from warehouse are labeled with `source: 'warehouse'`
- Batches from farm are labeled with `source: 'farm'`

## Analytics and Journals
The system will now correctly track:
- Usage from warehouse batches (via `usage_items.warehouse_batch_id`)
- Usage from farm batches (via `usage_items.batch_id`)
- All existing journal reports will include both sources

## Verification

After running the migration, verify:
1. `\d usage_items` should show `warehouse_batch_id` column
2. Check trigger exists: `\df update_warehouse_batch_qty_on_usage`
3. Test by:
   - Adding products to warehouse (sandelis)
   - Going to any farm
   - Using those products in treatments/vaccinations
   - Confirming warehouse stock decrements correctly
