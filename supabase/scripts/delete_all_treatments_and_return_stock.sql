-- =====================================================================
-- Delete All Treatments, Visits, and Return Stock to Farm Batches
-- =====================================================================
-- DANGER: This script deletes ALL treatment records and ALL visits across ALL farms
-- and returns all used stock back to farm-level batches (atsargos).
--
-- WHAT THIS SCRIPT DOES:
-- 1. Returns ALL stock from ALL usage_items back to farm batches (treatments, vaccinations, biocides, etc.)
-- 2. Deletes ALL usage_items (from all sources)
-- 3. Deletes all course_doses (multi-day treatment doses)
-- 4. Deletes all treatment_courses (multi-day treatments)
-- 5. Deletes all treatment records
-- 6. Deletes ALL animal visits
-- 7. Resets the "GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS" (treated animals journal)
--
-- WHAT IS PRESERVED:
-- - Animals (gyvūnai)
-- - Products (produktai)
-- - Farm batches/stock (atsargos)
-- - Invoices and warehouse stock
-- - Farms and users
--
-- USE WITH CAUTION: This cannot be undone!
-- =====================================================================

BEGIN;

-- Step 1: Return ALL stock from ALL usage_items back to farm batches
-- This updates the qty_left in batches table
DO $$
DECLARE
    v_usage_record RECORD;
    v_returned_count INTEGER := 0;
    v_initial_treatment_count INTEGER;
    v_initial_usage_count INTEGER;
    v_initial_visits_count INTEGER;
BEGIN
    -- Count initial records
    SELECT COUNT(*) INTO v_initial_treatment_count FROM treatments;
    SELECT COUNT(*) INTO v_initial_usage_count FROM usage_items;
    SELECT COUNT(*) INTO v_initial_visits_count FROM animal_visits;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 STARTING DELETION PROCESS';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Initial treatments: %', v_initial_treatment_count;
    RAISE NOTICE 'Initial usage_items (ALL): %', v_initial_usage_count;
    RAISE NOTICE 'Initial visits: %', v_initial_visits_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '🔄 Returning ALL stock to farm batches...';
    
    -- Return stock from ALL usage_items (treatments, vaccinations, biocides, everything!)
    FOR v_usage_record IN 
        SELECT ui.batch_id, ui.qty, ui.id
        FROM usage_items ui
        WHERE ui.batch_id IS NOT NULL
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
    
    RAISE NOTICE '✅ Returned stock from % usage items (ALL sources)', v_returned_count;
END $$;

-- Step 2: Delete ALL usage_items (already returned stock in Step 1)
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️  Deleting ALL usage_items...';
    DELETE FROM public.usage_items;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % usage_items (ALL sources)', v_deleted_count;
END $$;

-- Step 3: Delete course_doses (must be before treatment_courses if there's a FK)
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️  Deleting course_doses...';
    DELETE FROM public.course_doses;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % course_doses', v_deleted_count;
END $$;

-- Step 4: Delete treatment_courses (must be before treatments if there's a FK)
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️  Deleting treatment_courses...';
    DELETE FROM public.treatment_courses;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % treatment_courses', v_deleted_count;
END $$;

-- Step 5: Delete all treatments
-- This will SET NULL on animal_visits.related_treatment_id
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️  Deleting treatments...';
    DELETE FROM public.treatments;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % treatments', v_deleted_count;
END $$;

-- Step 6: Delete ALL visits
DO $$
DECLARE
    v_deleted_count INTEGER;
BEGIN
    RAISE NOTICE '🗑️  Deleting ALL visits...';
    
    DELETE FROM public.animal_visits;
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % visits', v_deleted_count;
END $$;

-- Verification queries
DO $$
DECLARE
    v_remaining_treatments INTEGER;
    v_remaining_usage_items INTEGER;
    v_remaining_courses INTEGER;
    v_visits_with_gydymas INTEGER;
    v_total_visits INTEGER;
    v_total_batches INTEGER;
    v_depleted_batches INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_remaining_treatments FROM treatments;
    SELECT COUNT(*) INTO v_remaining_usage_items FROM usage_items;
    SELECT COUNT(*) INTO v_remaining_courses FROM treatment_courses;
    SELECT COUNT(*) INTO v_visits_with_gydymas FROM animal_visits WHERE 'Gydymas' = ANY(procedures) OR course_id IS NOT NULL;
    SELECT COUNT(*) INTO v_total_visits FROM animal_visits;
    SELECT COUNT(*) INTO v_total_batches FROM batches;
    SELECT COUNT(*) INTO v_depleted_batches FROM batches WHERE status = 'depleted';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ CLEANUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Remaining treatments: %', v_remaining_treatments;
    RAISE NOTICE 'Remaining usage_items (ALL): %', v_remaining_usage_items;
    RAISE NOTICE 'Remaining treatment_courses: %', v_remaining_courses;
    RAISE NOTICE 'Visits with Gydymas/course: %', v_visits_with_gydymas;
    RAISE NOTICE 'Total remaining visits: %', v_total_visits;
    RAISE NOTICE '========================================';
    RAISE NOTICE '📦 Stock status:';
    RAISE NOTICE 'Total batches: %', v_total_batches;
    RAISE NOTICE 'Depleted batches: %', v_depleted_batches;
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 What remains intact:';
    RAISE NOTICE '  - Animals (gyvūnai)';
    RAISE NOTICE '  - Products (produktai)';
    RAISE NOTICE '  - Farm batches (atsargos) - with stock RETURNED';
    RAISE NOTICE '  - Invoices and warehouse stock';
    RAISE NOTICE '========================================';
    
    IF v_remaining_treatments > 0 OR v_remaining_usage_items > 0 OR v_remaining_courses > 0 OR v_total_visits > 0 THEN
        RAISE WARNING '⚠️  Some records remain! Check foreign key constraints.';
    ELSE
        RAISE NOTICE '✅ All treatment data successfully deleted!';
        RAISE NOTICE '✅ ALL visits deleted!';
        RAISE NOTICE '✅ ALL usage_items deleted!';
        RAISE NOTICE '✅ ALL stock returned to farm batches!';
        RAISE NOTICE '✅ GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS is now empty!';
    END IF;
END $$;

COMMIT;
