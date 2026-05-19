-- =====================================================================
-- DEBUG: Find the multiplication source for KRISTINA - ALL IN ONE
-- =====================================================================

SELECT 
    '=== DIRECT BATCHES ===' as debug_info
UNION ALL
SELECT 
    'Batch ID: ' || b.id || 
    ' | Product: ' || p.name || 
    ' | Qty: ' || b.qty_received || 
    ' | Price: €' || b.purchase_price || 
    ' | Value: €' || (b.qty_received * b.purchase_price)::numeric(10,2)
FROM batches b
JOIN farms f ON b.farm_id = f.id
JOIN products p ON b.product_id = p.id
WHERE f.name LIKE 'KRISTINA%' 
AND b.invoice_id IS NOT NULL

UNION ALL
SELECT '=== INVOICE ITEMS PER BATCH ==='

UNION ALL
SELECT 
    'Batch ID: ' || b.id || 
    ' | Invoice Item ID: ' || COALESCE(ii.id::text, 'NULL') ||
    ' | Unit Price: €' || COALESCE(ii.unit_price::text, 'NULL') || 
    ' | Qty: ' || COALESCE(ii.quantity::text, 'NULL') ||
    ' | Items Count: ' || COUNT(*) OVER (PARTITION BY b.id)
FROM batches b
JOIN farms f ON b.farm_id = f.id
LEFT JOIN invoice_items ii ON ii.batch_id = b.id
WHERE f.name LIKE 'KRISTINA%' 
AND b.invoice_id IS NOT NULL
ORDER BY 1;

-- Separate simple query for view result
SELECT 
    'VIEW RESULT: ' ||
    'Allocations=' || total_allocations || 
    ' | Products=' || unique_products ||
    ' | Value Before Discount=€' || total_value_allocated_before_discount ||
    ' | Value After Discount=€' || total_value_allocated
FROM vw_allocation_analytics_by_farm 
WHERE farm_name LIKE 'KRISTINA%';

