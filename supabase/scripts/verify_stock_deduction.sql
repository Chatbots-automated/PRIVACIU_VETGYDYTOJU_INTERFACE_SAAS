-- =====================================================================
-- Verify Stock Deduction Logic
-- =====================================================================
-- This script helps verify that stock is being deducted correctly
-- Run this to check for any discrepancies
-- =====================================================================

-- 1. Check batches with negative qty_left (SHOULD BE EMPTY!)
SELECT 
    'CRITICAL: Negative Stock' AS issue_type,
    b.id AS batch_id,
    b.batch_number,
    p.name AS product_name,
    f.name AS farm_name,
    b.received_qty,
    b.qty_left,
    (SELECT COALESCE(SUM(ui.qty), 0) FROM usage_items ui WHERE ui.batch_id = b.id) AS total_used
FROM batches b
JOIN products p ON b.product_id = p.id
JOIN farms f ON b.farm_id = f.id
WHERE b.qty_left < 0
ORDER BY b.qty_left ASC;

-- 2. Check batches where calculated qty_left doesn't match actual qty_left
SELECT 
    'WARNING: Stock Mismatch' AS issue_type,
    b.id AS batch_id,
    b.batch_number,
    p.name AS product_name,
    f.name AS farm_name,
    b.received_qty,
    b.qty_left AS current_qty_left,
    (b.received_qty - COALESCE(SUM(ui.qty), 0)) AS calculated_qty_left,
    (b.qty_left - (b.received_qty - COALESCE(SUM(ui.qty), 0))) AS difference
FROM batches b
JOIN products p ON b.product_id = p.id
JOIN farms f ON b.farm_id = f.id
LEFT JOIN usage_items ui ON ui.batch_id = b.id
GROUP BY b.id, b.batch_number, p.name, f.name, b.received_qty, b.qty_left
HAVING ABS(b.qty_left - (b.received_qty - COALESCE(SUM(ui.qty), 0))) > 0.01
ORDER BY ABS(b.qty_left - (b.received_qty - COALESCE(SUM(ui.qty), 0))) DESC;

-- 3. Check usage_items without batch_id (orphaned usage)
SELECT 
    'INFO: Orphaned Usage' AS issue_type,
    ui.id AS usage_item_id,
    p.name AS product_name,
    f.name AS farm_name,
    ui.qty,
    ui.purpose,
    ui.created_at
FROM usage_items ui
JOIN products p ON ui.product_id = p.id
JOIN farms f ON ui.farm_id = f.id
WHERE ui.batch_id IS NULL
ORDER BY ui.created_at DESC
LIMIT 20;

-- 4. Summary by farm
SELECT 
    f.name AS farm_name,
    COUNT(DISTINCT b.id) AS total_batches,
    COUNT(DISTINCT CASE WHEN b.qty_left > 0 THEN b.id END) AS active_batches,
    COUNT(DISTINCT CASE WHEN b.qty_left = 0 THEN b.id END) AS depleted_batches,
    COUNT(DISTINCT CASE WHEN b.qty_left < 0 THEN b.id END) AS negative_batches,
    ROUND(SUM(b.received_qty)::numeric, 2) AS total_received,
    ROUND(SUM(b.qty_left)::numeric, 2) AS total_remaining,
    ROUND((SELECT COALESCE(SUM(ui.qty), 0) FROM usage_items ui WHERE ui.farm_id = f.id AND ui.batch_id IS NOT NULL)::numeric, 2) AS total_used
FROM farms f
LEFT JOIN batches b ON b.farm_id = f.id
GROUP BY f.id, f.name
ORDER BY f.name;

-- 5. Recent stock movements (last 50)
SELECT 
    ui.created_at,
    f.name AS farm_name,
    p.name AS product_name,
    b.batch_number,
    ui.qty AS qty_used,
    b.qty_left AS remaining_after,
    ui.purpose,
    CASE 
        WHEN ui.treatment_id IS NOT NULL THEN 'Treatment'
        WHEN ui.vaccination_id IS NOT NULL THEN 'Vaccination'
        WHEN ui.biocide_usage_id IS NOT NULL THEN 'Biocide'
        ELSE 'Other'
    END AS usage_type
FROM usage_items ui
JOIN batches b ON ui.batch_id = b.id
JOIN products p ON ui.product_id = p.id
JOIN farms f ON ui.farm_id = f.id
ORDER BY ui.created_at DESC
LIMIT 50;

-- 6. Products with stock issues
SELECT 
    p.name AS product_name,
    p.category,
    COUNT(DISTINCT b.id) AS batch_count,
    SUM(b.received_qty) AS total_received,
    SUM(b.qty_left) AS total_remaining,
    (SELECT COALESCE(SUM(ui.qty), 0) FROM usage_items ui WHERE ui.product_id = p.id AND ui.batch_id IS NOT NULL) AS total_used,
    (SUM(b.received_qty) - (SELECT COALESCE(SUM(ui.qty), 0) FROM usage_items ui WHERE ui.product_id = p.id AND ui.batch_id IS NOT NULL)) AS calculated_remaining,
    ABS(SUM(b.qty_left) - (SUM(b.received_qty) - (SELECT COALESCE(SUM(ui.qty), 0) FROM usage_items ui WHERE ui.product_id = p.id AND ui.batch_id IS NOT NULL))) AS discrepancy
FROM products p
LEFT JOIN batches b ON b.product_id = p.id
GROUP BY p.id, p.name, p.category
HAVING ABS(SUM(b.qty_left) - (SUM(b.received_qty) - (SELECT COALESCE(SUM(ui.qty), 0) FROM usage_items ui WHERE ui.product_id = p.id AND ui.batch_id IS NOT NULL))) > 0.01
ORDER BY discrepancy DESC;

-- 7. Enable stock deduction logging (uncomment to enable)
/*
DROP TRIGGER IF EXISTS log_stock_deduction_trigger ON public.usage_items;
CREATE TRIGGER log_stock_deduction_trigger 
    BEFORE INSERT ON public.usage_items
    FOR EACH ROW WHEN (NEW.batch_id IS NOT NULL) 
    EXECUTE FUNCTION public.log_stock_deduction();
    
SELECT 'Stock deduction logging ENABLED. Check Supabase logs for detailed deduction info.' AS status;
*/

-- 8. Disable stock deduction logging (uncomment to disable)
/*
DROP TRIGGER IF EXISTS log_stock_deduction_trigger ON public.usage_items;
SELECT 'Stock deduction logging DISABLED.' AS status;
*/
