-- =====================================================================
-- Delete All Treatments and Return Stock to Farm Batches
-- =====================================================================
-- DANGER: This script deletes ALL treatment records across ALL farms
-- and returns all used stock back to farm-level batches (atsargos).
--
-- WHAT THIS SCRIPT DOES:
-- 1. Returns all stock from usage_items back to farm batches
-- 2. Deletes all usage_items linked to treatments
-- 3. Deletes all course_doses (multi-day treatment doses)
-- 4. Deletes all treatment_courses (multi-day treatments)
-- 5. Deletes all treatment records
-- 6. Resets the "GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS" (treated animals journal)
--
-- WHAT IS PRESERVED:
-- - Animals (gyvūnai)
-- - Animal visits (vizitai)
-- - Products (produktai)
-- - Farm batches/stock (atsargos)
-- - Invoices and warehouse stock
-- - Farms and users
--
-- USE WITH CAUTION: This cannot be undone!
-- =====================================================================

BEGIN;

-- Step 1: Return all stock from treatments back to farm batches
-- This updates the qty_left in batches table
DO $$
DECLARE
    v_usage_record RECORD;
    v_returned_count INTEGER := 0;
BEGIN
    RAISE NOTICE '🔄 Starting stock return process...';
    
    FOR v_usage_record IN 
        SELECT ui.batch_id, ui.qty, ui.treatment_id
        FROM usage_items ui
        WHERE ui.treatment_id IS NOT NULL
          AND ui.batch_id IS NOT NULL
    LOOP
        -- Add the quantity back to the batch
        UPDATE batches
        SET 
            qty_left = qty_left + v_usage_record.qty,
            status = CASE 
                WHEN status = 'depleted' AND (qty_left + v_usage_record.qty) > 0 THEN 'active'
                ELSE status
            END,
            updated_at = now()
        WHERE id = v_usage_record.batch_id;
        
        v_returned_count := v_returned_count + 1;
    END LOOP;
    
    RAISE NOTICE '✅ Returned stock from % usage items', v_returned_count;
END $$;

-- Step 2: Delete all usage_items linked to treatments
DELETE FROM public.usage_items 
WHERE treatment_id IS NOT NULL;

-- Step 3: Delete all course_doses (linked to treatment_courses)
DELETE FROM public.course_doses;

-- Step 4: Delete all treatment_courses
DELETE FROM public.treatment_courses;

-- Step 5: Delete all treatments
DELETE FROM public.treatments;

-- Verification queries
DO $$
DECLARE
    v_remaining_treatments INTEGER;
    v_remaining_usage_items INTEGER;
    v_remaining_courses INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_remaining_treatments FROM treatments;
    SELECT COUNT(*) INTO v_remaining_usage_items FROM usage_items WHERE treatment_id IS NOT NULL;
    SELECT COUNT(*) INTO v_remaining_courses FROM treatment_courses;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CLEANUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining treatments: %', v_remaining_treatments;
    RAISE NOTICE 'Remaining treatment usage_items: %', v_remaining_usage_items;
    RAISE NOTICE 'Remaining treatment_courses: %', v_remaining_courses;
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 What remains intact:';
    RAISE NOTICE '  - Animals (gyvūnai)';
    RAISE NOTICE '  - Animal visits (vizitai)';
    RAISE NOTICE '  - Products (produktai)';
    RAISE NOTICE '  - Farm batches (atsargos)';
    RAISE NOTICE '  - Invoices and warehouse stock';
    RAISE NOTICE '========================================';
    
    IF v_remaining_treatments > 0 OR v_remaining_usage_items > 0 OR v_remaining_courses > 0 THEN
        RAISE WARNING '⚠️  Some records remain! Check foreign key constraints.';
    ELSE
        RAISE NOTICE '✅ All treatment data successfully deleted!';
        RAISE NOTICE '✅ Stock returned to farm batches!';
        RAISE NOTICE '✅ GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS is now empty!';
    END IF;
END $$;

COMMIT;
