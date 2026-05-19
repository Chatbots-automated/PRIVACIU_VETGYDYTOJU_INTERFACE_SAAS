# Pricing Modal Cost Calculation Fix

## Problem

When completing a visit (vienkartinis gydymas or kurso planavimas) and using products from warehouse batches, the visit pricing modal ("vizito kainodara") was showing incorrect costs:

- **Expected**: Unit cost based on purchase price (e.g., EUR 17.88/vnt for 4 units at EUR 71.52 total)
- **Actual**: Showed €0.00/vnt with message "Produkto kaina jau įtraukta paskirstymo metu iš sandėlio"

## Root Cause

The issue was in the cost calculation logic in `AnimalDetailSidebar.tsx`. The code was attempting to calculate unit cost using:

```javascript
const batchUnitCost = batch && batch.purchase_price && batch.qty_received
  ? batch.purchase_price / batch.qty_received
  : 0;
```

**The problem**: Different batch types use different field names for quantity:
- **Farm batches** (from `batches` table): Use `qty_received`
- **Warehouse batches** (from `warehouse_batches` table): Use `received_qty`

When using warehouse batches, `batch.qty_received` was `undefined`, causing the calculation to default to 0.

## Solution

Created a helper function `calculateBatchUnitCost()` that correctly handles both batch types:

```javascript
const calculateBatchUnitCost = (batch: any): number => {
  if (!batch || !batch.purchase_price) return 0;
  
  // Warehouse batches use 'received_qty', farm batches use 'qty_received'
  const qtyReceived = batch.source === 'warehouse' 
    ? batch.received_qty 
    : batch.qty_received;
  
  if (!qtyReceived || qtyReceived <= 0) return 0;
  
  return batch.purchase_price / qtyReceived;
};
```

## Files Modified

### `src/components/AnimalDetailSidebar.tsx`

**Added**:
- New helper function `calculateBatchUnitCost()` (before `loadResources` function)

**Updated** (5 occurrences):
1. Treatment medications cost calculation (line ~3834)
2. Course medications cost calculation (line ~3868)
3. Vaccination products cost calculation (line ~3903)
4. Prevention products cost calculation (line ~3922)
5. Future visit medications cost calculation (line ~5639)

All manual cost calculations replaced with calls to `calculateBatchUnitCost(batch)`.

## Expected Behavior After Fix

When completing a visit with warehouse products:
1. The pricing modal will correctly show the unit cost based on the warehouse batch purchase price
2. Example: If 4 units were purchased for EUR 71.52, using 1 unit will show EUR 17.88/vnt
3. The cost is displayed for reference (products are already paid for via warehouse allocation)

## Testing Recommendations

1. Create a warehouse batch with known purchase price and quantity
2. Complete a visit using products from that warehouse batch
3. Verify the pricing modal shows the correct unit cost calculated as: `purchase_price / received_qty`
4. Also test with farm batches to ensure backward compatibility

## Database Schema Reference

**Farm batches** (`batches` table):
- Quantity field: `qty_received`

**Warehouse batches** (`warehouse_batches` table):
- Quantity field: `received_qty`

Both tables have:
- `purchase_price`: Total price paid for the batch
- `unit_price`: Price per unit (optional)
