-- =====================================================================
-- Investigate PENSTREP Allocation Issue
-- =====================================================================
-- Invoice shows 300ml, but farm only has 38.89ml
-- Something went wrong during allocation!
-- =====================================================================

-- Find the specific invoice item for PENSTREP
SELECT 
    '=== INVOICE ITEM DETAILS ===' as section,
    ii.id as invoice_item_id,
    i.invoice_number,
    i.invoice_date,
    p.name as product_name,
    ii.quantity as invoice_quantity,
    ii.batch_id,
    ii.warehouse_batch_id
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
JOIN products p ON p.id = ii.product_id
WHERE p.name LIKE '%PENSTREP%'
ORDER BY i.invoice_date DESC
LIMIT 1;

-- Check the batch that was created from this invoice
SELECT 
    '=== BATCH CREATED FROM INVOICE ===' as section,
    b.id as batch_id,
    b.batch_number,
    b.received_qty,
    b.qty_left,
    f.name as farm_name,
    b.doc_title,
    b.doc_number,
    b.created_at
FROM batches b
JOIN farms f ON f.id = b.farm_id
JOIN products p ON p.id = b.product_id
WHERE p.name LIKE '%PENSTREP%'
ORDER BY b.created_at DESC;

-- Check if there's a warehouse batch
SELECT 
    '=== WAREHOUSE BATCH (if exists) ===' as section,
    wb.id as warehouse_batch_id,
    wb.batch_number,
    wb.received_qty,
    wb.qty_left,
    wb.qty_allocated,
    wb.status
FROM warehouse_batches wb
JOIN products p ON p.id = wb.product_id
WHERE p.name LIKE '%PENSTREP%';

-- Check the invoice_items table structure for this product
SELECT 
    '=== DETAILED INVOICE ITEM INFO ===' as section,
    ii.*
FROM invoice_items ii
JOIN products p ON p.id = ii.product_id
WHERE p.name LIKE '%PENSTREP%'
ORDER BY ii.created_at DESC
LIMIT 1;

-- Check if batch quantity was calculated from package_size and package_count
SELECT 
    '=== BATCH CALCULATION CHECK ===' as section,
    b.id,
    b.package_size,
    b.package_count,
    b.package_size * b.package_count as calculated_qty,
    b.received_qty as actual_received_qty,
    b.qty_left,
    CASE 
        WHEN b.package_size IS NOT NULL AND b.package_count IS NOT NULL 
        THEN 'Calculated from packages'
        ELSE 'Direct qty'
    END as source
FROM batches b
JOIN products p ON p.id = b.product_id
WHERE p.name LIKE '%PENSTREP%';
