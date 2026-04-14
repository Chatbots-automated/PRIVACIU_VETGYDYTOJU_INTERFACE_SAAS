-- =====================================================================
-- Delete Specific Invoice and All Associated Data
-- =====================================================================
-- WARNING: This will permanently delete:
-- - The invoice
-- - All invoice items
-- - All batches created from this invoice
-- - All usage records from those batches
-- - Stock will be returned if applicable
-- =====================================================================

DO $$
DECLARE
    v_invoice_id uuid;
    v_invoice_number text;
    v_batch_record record;
    v_deleted_batches int := 0;
    v_deleted_usage_items int := 0;
    v_deleted_invoice_items int := 0;
BEGIN
    -- =====================================================================
    -- STEP 1: Find the invoice (PENSTREP invoice)
    -- =====================================================================
    SELECT i.id, i.invoice_number
    INTO v_invoice_id, v_invoice_number
    FROM invoices i
    WHERE EXISTS (
        SELECT 1 FROM invoice_items ii
        JOIN products p ON p.id = ii.product_id
        WHERE ii.invoice_id = i.id
        AND p.name LIKE '%PENSTREP%'
    )
    ORDER BY i.invoice_date DESC
    LIMIT 1;

    IF v_invoice_id IS NULL THEN
        RAISE NOTICE 'No invoice found with PENSTREP product';
        RETURN;
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Found Invoice: % (ID: %)', v_invoice_number, v_invoice_id;
    RAISE NOTICE '========================================';

    -- =====================================================================
    -- STEP 2: Delete usage_items from batches created by this invoice
    -- =====================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 1: Deleting usage items...';
    
    FOR v_batch_record IN 
        SELECT DISTINCT b.id as batch_id, b.batch_number, p.name as product_name
        FROM batches b
        JOIN invoice_items ii ON ii.batch_id = b.id
        JOIN products p ON p.id = b.product_id
        WHERE ii.invoice_id = v_invoice_id
    LOOP
        -- Return stock from usage_items before deleting
        UPDATE batches
        SET 
            qty_left = qty_left + (
                SELECT COALESCE(SUM(ui.qty), 0)
                FROM usage_items ui
                WHERE ui.batch_id = v_batch_record.batch_id
            ),
            status = 'active'
        WHERE id = v_batch_record.batch_id;
        
        -- Delete usage items
        WITH deleted AS (
            DELETE FROM usage_items
            WHERE batch_id = v_batch_record.batch_id
            RETURNING *
        )
        SELECT COUNT(*) INTO v_deleted_usage_items FROM deleted;
        
        RAISE NOTICE '  ✓ Batch %: Returned stock and deleted % usage items for %',
            v_batch_record.batch_number, v_deleted_usage_items, v_batch_record.product_name;
    END LOOP;

    -- =====================================================================
    -- STEP 3: Delete batches
    -- =====================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 2: Deleting batches...';
    
    WITH deleted_batches AS (
        DELETE FROM batches
        WHERE id IN (
            SELECT b.id
            FROM batches b
            JOIN invoice_items ii ON ii.batch_id = b.id
            WHERE ii.invoice_id = v_invoice_id
        )
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_batches FROM deleted_batches;
    
    RAISE NOTICE '  ✓ Deleted % batches', v_deleted_batches;

    -- =====================================================================
    -- STEP 4: Delete invoice items
    -- =====================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 3: Deleting invoice items...';
    
    WITH deleted_items AS (
        DELETE FROM invoice_items
        WHERE invoice_id = v_invoice_id
        RETURNING *
    )
    SELECT COUNT(*) INTO v_deleted_invoice_items FROM deleted_items;
    
    RAISE NOTICE '  ✓ Deleted % invoice items', v_deleted_invoice_items;

    -- =====================================================================
    -- STEP 5: Delete the invoice
    -- =====================================================================
    RAISE NOTICE '';
    RAISE NOTICE 'STEP 4: Deleting invoice...';
    
    DELETE FROM invoices
    WHERE id = v_invoice_id;
    
    RAISE NOTICE '  ✓ Deleted invoice %', v_invoice_number;

    -- =====================================================================
    -- SUMMARY
    -- =====================================================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DELETION COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Invoice: %', v_invoice_number;
    RAISE NOTICE 'Batches deleted: %', v_deleted_batches;
    RAISE NOTICE 'Invoice items deleted: %', v_deleted_invoice_items;
    RAISE NOTICE '========================================';

END $$;

-- Verify deletion
SELECT 
    'Verification: Remaining invoices with PENSTREP' as check_type,
    COUNT(*) as count
FROM invoices i
WHERE EXISTS (
    SELECT 1 FROM invoice_items ii
    JOIN products p ON p.id = ii.product_id
    WHERE ii.invoice_id = i.id
    AND p.name LIKE '%PENSTREP%'
);

-- Check remaining PENSTREP batches
SELECT 
    'Verification: Remaining PENSTREP batches' as check_type,
    COUNT(*) as count
FROM batches b
JOIN products p ON p.id = b.product_id
WHERE p.name LIKE '%PENSTREP%';
