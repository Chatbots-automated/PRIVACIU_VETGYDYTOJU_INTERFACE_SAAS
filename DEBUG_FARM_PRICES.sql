-- =====================================================================
-- DEBUG: Check what prices we're getting
-- =====================================================================

-- Check 1: See the raw allocations and their warehouse batch data
SELECT 
    f.name as farm_name,
    fsa.id as allocation_id,
    fsa.allocated_qty,
    wb.id as warehouse_batch_id,
    wb.purchase_price,
    wb.received_qty,
    (wb.purchase_price / NULLIF(wb.received_qty, 0)) as calculated_unit_price,
    fsa.allocated_qty * (wb.purchase_price / NULLIF(wb.received_qty, 0)) as calculated_value
FROM farm_stock_allocations fsa
JOIN farms f ON fsa.farm_id = f.id
LEFT JOIN warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
WHERE f.name LIKE 'KRISTINA%'
ORDER BY fsa.created_at DESC;

-- Check 2: See if there are invoice items
SELECT 
    f.name as farm_name,
    fsa.id as allocation_id,
    fsa.allocated_qty,
    ii.unit_price as invoice_unit_price,
    ii.quantity as invoice_qty,
    ii.total_price as invoice_total
FROM farm_stock_allocations fsa
JOIN farms f ON fsa.farm_id = f.id
LEFT JOIN warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
LEFT JOIN invoice_items ii ON ii.warehouse_batch_id = wb.id AND ii.product_id = fsa.product_id
WHERE f.name LIKE 'KRISTINA%'
ORDER BY fsa.created_at DESC;

-- Check 3: What does the view currently return
SELECT * FROM vw_allocation_analytics_by_farm WHERE farm_name LIKE 'KRISTINA%';
