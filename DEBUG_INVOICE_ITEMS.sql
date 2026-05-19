-- Check invoice items for KRISTINA's batches
SELECT 
    'Batch ID: ' || b.id || 
    ' | Product: ' || p.name ||
    ' | Batch Purchase Price: €' || b.purchase_price ||
    ' | Batch Qty: ' || b.qty_received ||
    ' | Invoice Item Unit Price: €' || COALESCE(ii.unit_price::text, 'NULL') ||
    ' | Invoice Item Qty: ' || COALESCE(ii.quantity::text, 'NULL') ||
    ' | Calculated Before Discount: €' || (COALESCE(ii.unit_price * b.qty_received, b.purchase_price))::numeric(10,2)
FROM batches b
JOIN farms f ON b.farm_id = f.id
JOIN products p ON b.product_id = p.id
LEFT JOIN invoice_items ii ON ii.batch_id = b.id AND ii.product_id = b.product_id
WHERE f.name LIKE 'KRISTINA%' 
AND b.invoice_id IS NOT NULL
ORDER BY b.id;
