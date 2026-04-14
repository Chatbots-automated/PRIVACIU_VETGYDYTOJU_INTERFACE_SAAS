-- =====================================================================
-- Diagnostic Query: Check PENSTREP-JECT Stock Flow (Single Output)
-- =====================================================================
-- Purpose: Investigate why invoice shows 300ml but farm has only 38.89ml
-- =====================================================================

WITH 
-- 1. Product Info
product_info AS (
    SELECT 
        '1. PRODUCT INFO' as section,
        1 as sort_order,
        p.name as detail,
        p.category::text as value1,
        NULL::text as value2,
        NULL::text as value3,
        NULL::text as value4
    FROM products p
    WHERE p.name LIKE '%PENSTREP%'
    LIMIT 1
),

-- 2. Invoice Items
invoice_items_data AS (
    SELECT 
        '2. INVOICE ITEMS' as section,
        2 as sort_order,
        CONCAT(i.invoice_number, ' (', i.invoice_date::text, ')') as detail,
        CONCAT(ii.quantity::text, ' @ ', ii.unit_price::text) as value1,
        CONCAT('Total: ', ii.total_price::text) as value2,
        f.name as value3,
        NULL as value4
    FROM invoice_items ii
    JOIN invoices i ON i.id = ii.invoice_id
    LEFT JOIN batches b ON b.id = ii.batch_id
    LEFT JOIN farms f ON f.id = b.farm_id
    JOIN products p ON p.id = ii.product_id
    WHERE p.name LIKE '%PENSTREP%'
    ORDER BY i.invoice_date DESC
    LIMIT 10
),

-- 3. Farm Batches
farm_batches_data AS (
    SELECT 
        '3. FARM BATCHES' as section,
        3 as sort_order,
        CONCAT(f.name, ' - ', b.batch_number) as detail,
        CONCAT('Received: ', b.received_qty::text) as value1,
        CONCAT('Left: ', b.qty_left::text) as value2,
        CONCAT('Used: ', (b.received_qty - b.qty_left)::text) as value3,
        b.created_at::text as value4
    FROM batches b
    JOIN farms f ON f.id = b.farm_id
    JOIN products p ON p.id = b.product_id
    WHERE p.name LIKE '%PENSTREP%'
    ORDER BY b.created_at DESC
),

-- 4. Usage Items
usage_items_data AS (
    SELECT 
        '4. USAGE ITEMS' as section,
        4 as sort_order,
        CONCAT(f.name, ' - ', ui.administered_date::text) as detail,
        CONCAT('Qty: ', ui.qty::text, ' ', ui.unit) as value1,
        ui.purpose as value2,
        CASE 
            WHEN ui.treatment_id IS NOT NULL THEN 'Treatment'
            WHEN ui.vaccination_id IS NOT NULL THEN 'Vaccination'
            WHEN ui.purpose = 'biocide' THEN 'Biocide'
            ELSE 'Other'
        END as value3,
        NULL as value4
    FROM usage_items ui
    JOIN batches b ON b.id = ui.batch_id
    JOIN farms f ON f.id = b.farm_id
    JOIN products p ON p.id = b.product_id
    WHERE p.name LIKE '%PENSTREP%'
    ORDER BY ui.administered_date DESC
    LIMIT 20
),

-- 5. Summary
summary_data AS (
    SELECT 
        '5. SUMMARY' as section,
        5 as sort_order,
        f.name as detail,
        CONCAT('Total Received: ', SUM(b.received_qty)::text, ' ml') as value1,
        CONCAT('Used: ', SUM(b.received_qty - b.qty_left)::text, ' ml') as value2,
        CONCAT('Remaining: ', SUM(b.qty_left)::text, ' ml') as value3,
        CONCAT('Usage: ', ROUND((SUM(b.received_qty - b.qty_left) / NULLIF(SUM(b.received_qty), 0) * 100)::numeric, 2)::text, '%') as value4
    FROM batches b
    JOIN farms f ON f.id = b.farm_id
    JOIN products p ON p.id = b.product_id
    WHERE p.name LIKE '%PENSTREP%'
    GROUP BY f.name
)

-- Combine all results
SELECT * FROM product_info
UNION ALL
SELECT * FROM invoice_items_data
UNION ALL
SELECT * FROM farm_batches_data
UNION ALL
SELECT * FROM usage_items_data
UNION ALL
SELECT * FROM summary_data
ORDER BY sort_order, detail;
