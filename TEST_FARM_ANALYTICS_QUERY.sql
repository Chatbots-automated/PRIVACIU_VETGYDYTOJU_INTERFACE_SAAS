-- =====================================================================
-- TEST QUERY - Run this in Supabase SQL Editor to see what's happening
-- =====================================================================

-- Test 1: Check farm_stock_allocations with prices
SELECT 
    fsa.farm_id,
    f.name as farm_name,
    COUNT(*) as allocation_count,
    SUM(fsa.allocated_qty) as total_qty,
    -- Check if there are multiple invoice items per allocation
    COUNT(ii.id) as invoice_item_count,
    SUM(fsa.allocated_qty * COALESCE(wb.purchase_price / NULLIF(wb.received_qty, 0), 0)) as calculated_value
FROM farm_stock_allocations fsa
LEFT JOIN farms f ON fsa.farm_id = f.id
LEFT JOIN warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
LEFT JOIN invoice_items ii ON ii.warehouse_batch_id = fsa.warehouse_batch_id
GROUP BY fsa.farm_id, f.name
ORDER BY farm_name;

-- Test 2: Check if DISTINCT ON works correctly
WITH allocation_prices AS (
    SELECT DISTINCT ON (fsa.id)
        fsa.id AS allocation_id,
        fsa.farm_id,
        fsa.allocated_qty,
        COALESCE(wb.purchase_price / NULLIF(wb.received_qty, 0), 0) AS unit_price
    FROM farm_stock_allocations fsa
    LEFT JOIN warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
    LEFT JOIN invoice_items ii ON ii.warehouse_batch_id = fsa.warehouse_batch_id
    ORDER BY fsa.id, ii.created_at DESC NULLS LAST
)
SELECT 
    f.name as farm_name,
    COUNT(*) as allocation_count,
    SUM(ap.allocated_qty) as total_qty,
    SUM(ap.allocated_qty * ap.unit_price) as total_value
FROM farms f
LEFT JOIN allocation_prices ap ON f.id = ap.farm_id
GROUP BY f.name
ORDER BY f.name;

-- Test 3: Check the current view
SELECT * FROM vw_allocation_analytics_by_farm ORDER BY farm_name;
