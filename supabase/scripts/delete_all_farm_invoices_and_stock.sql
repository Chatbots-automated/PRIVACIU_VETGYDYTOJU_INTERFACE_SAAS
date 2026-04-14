-- =====================================================================
-- Delete ALL Invoices and Stock for Specific Farm
-- =====================================================================
-- Farm ID: 18fb9bad-97f4-46f0-af8f-8056fc6816bb
-- WARNING: This will permanently delete ALL:
-- - Invoices assigned to this farm
-- - All invoice items
-- - All batches (stock)
-- - All usage records
-- - All treatments (if any stock was used)
-- =====================================================================

DO $$
DECLARE
    v_farm_id uuid := '18fb9bad-97f4-46f0-af8f-8056fc6816bb';
    v_farm_name text;
    v_deleted_usage_items int := 0;
    v_deleted_treatments int := 0;
    v_deleted_batches int := 0;
    v_deleted_invoice_items int := 0;
    v_deleted_invoices int := 0;
    v_batch_record record;
BEGIN
    -- Get farm name
    SELECT name INTO v_farm_name FROM farms WHERE id = v_farm_id;
    
    IF v_farm_name IS NULL THEN
        RAISE NOTICE 'Farm not found!';
        RETURN;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETING ALL INVOICES AND STOCK';
    RAISE NOTICE 'Farm: % (ID: %)', v_farm_name, v_farm_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- =====================================================================
    -- STEP 1: Delete all usage_items and return stock
    -- =====================================================================
    RAISE NOTICE 'STEP 1: Deleting usage items and returning stock...';
    
    -- First, return stock to batches
    FOR v_batch_record IN 
        SELECT b.id as batch_id, b.batch_number, p.name as product_name,
               COALESCE(SUM(ui.qty), 0) as used_qty
        FROM batches b
        JOIN products p ON p.id = b.product_id
        LEFT JOIN usage_items ui ON ui.batch_id = b.id
        WHERE b.farm_id = v_farm_id
        GROUP BY b.id, b.batch_number, p.name
    LOOP
        IF v_batch_record.used_qty > 0 THEN
            UPDATE batches
            SET 
                qty_left = qty_left + v_batch_record.used_qty,
                status = 'active'
            WHERE id = v_batch_record.batch_id;
            
            RAISE NOTICE '  ✓ Returned % to batch % (%)',
                v_batch_record.used_qty, v_batch_record.batch_number, v_batch_record.product_name;
        END IF;
    END LOOP;

    -- Delete all usage_items
    WITH deleted AS (
        DELETE FROM usage_items
        WHERE farm_id = v_farm_id
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_usage_items FROM deleted;
    
    RAISE NOTICE '  ✓ Deleted % usage items', v_deleted_usage_items;
    RAISE NOTICE '';

    -- =====================================================================
    -- STEP 2: Delete treatments (optional - treatments reference usage_items)
    -- =====================================================================
    RAISE NOTICE 'STEP 2: Deleting treatments...';
    
    WITH deleted AS (
        DELETE FROM treatments
        WHERE farm_id = v_farm_id
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_treatments FROM deleted;
    
    RAISE NOTICE '  ✓ Deleted % treatments', v_deleted_treatments;
    RAISE NOTICE '';

    -- =====================================================================
    -- STEP 3: Delete all batches
    -- =====================================================================
    RAISE NOTICE 'STEP 3: Deleting all batches (stock)...';
    
    WITH deleted AS (
        DELETE FROM batches
        WHERE farm_id = v_farm_id
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_batches FROM deleted;
    
    RAISE NOTICE '  ✓ Deleted % batches', v_deleted_batches;
    RAISE NOTICE '';

    -- =====================================================================
    -- STEP 4: Delete invoice items (linked to this farm's batches)
    -- =====================================================================
    RAISE NOTICE 'STEP 4: Deleting invoice items...';
    
    -- Note: invoice_items might not have direct farm_id, 
    -- but they're linked through batches that we just deleted
    -- The CASCADE should handle this, but let's be explicit
    WITH deleted AS (
        DELETE FROM invoice_items ii
        USING invoices i
        WHERE ii.invoice_id = i.id
        AND i.farm_id = v_farm_id
        RETURNING ii.*
    )
    SELECT COUNT(*) INTO v_deleted_invoice_items FROM deleted;
    
    RAISE NOTICE '  ✓ Deleted % invoice items', v_deleted_invoice_items;
    RAISE NOTICE '';

    -- =====================================================================
    -- STEP 5: Delete all invoices
    -- =====================================================================
    RAISE NOTICE 'STEP 5: Deleting all invoices...';
    
    WITH deleted AS (
        DELETE FROM invoices
        WHERE farm_id = v_farm_id
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_invoices FROM deleted;
    
    RAISE NOTICE '  ✓ Deleted % invoices', v_deleted_invoices;
    RAISE NOTICE '';

    -- =====================================================================
    -- SUMMARY
    -- =====================================================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Farm: %', v_farm_name;
    RAISE NOTICE 'Usage items deleted: %', v_deleted_usage_items;
    RAISE NOTICE 'Treatments deleted: %', v_deleted_treatments;
    RAISE NOTICE 'Batches deleted: %', v_deleted_batches;
    RAISE NOTICE 'Invoice items deleted: %', v_deleted_invoice_items;
    RAISE NOTICE 'Invoices deleted: %', v_deleted_invoices;
    RAISE NOTICE '========================================';

END $$;

-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

SELECT 'Verification: Remaining invoices' as check_type, COUNT(*) as count
FROM invoices
WHERE farm_id = '18fb9bad-97f4-46f0-af8f-8056fc6816bb';

SELECT 'Verification: Remaining invoice items' as check_type, COUNT(*) as count
FROM invoice_items ii
JOIN invoices i ON i.id = ii.invoice_id
WHERE i.farm_id = '18fb9bad-97f4-46f0-af8f-8056fc6816bb';

SELECT 'Verification: Remaining batches' as check_type, COUNT(*) as count
FROM batches
WHERE farm_id = '18fb9bad-97f4-46f0-af8f-8056fc6816bb';

SELECT 'Verification: Remaining usage items' as check_type, COUNT(*) as count
FROM usage_items
WHERE farm_id = '18fb9bad-97f4-46f0-af8f-8056fc6816bb';

SELECT 'Verification: Remaining treatments' as check_type, COUNT(*) as count
FROM treatments
WHERE farm_id = '18fb9bad-97f4-46f0-af8f-8056fc6816bb';
