-- =====================================================================
-- Delete Treatments, Visits, and Return Stock
-- =====================================================================
-- Works with actual database schema
-- Deletes treatments, animal_visits, and returns stock to batches
-- =====================================================================

-- STEP 1: Preview what will be deleted
SELECT 
    'Treatment' AS type,
    t.id,
    t.reg_date AS date,
    a.tag_no,
    t.clinical_diagnosis AS description,
    t.vet_name,
    t.created_at
FROM treatments t
LEFT JOIN animals a ON a.id = t.animal_id
WHERE t.reg_date >= '2026-04-09'  -- Change this date

UNION ALL

SELECT 
    'Visit' AS type,
    av.id,
    av.visit_datetime::date AS date,
    a.tag_no,
    av.notes AS description,
    av.vet_name,
    av.created_at
FROM animal_visits av
LEFT JOIN animals a ON a.id = av.animal_id
WHERE av.visit_datetime >= '2026-04-09'  -- Change this date

ORDER BY created_at DESC;

-- STEP 2: Preview stock that will be returned
SELECT 
    'usage_items' AS source,
    t.id AS treatment_id,
    p.name AS product_name,
    ui.qty AS qty_to_return,
    b.qty_left AS current_qty,
    (b.qty_left + ui.qty) AS new_qty
FROM treatments t
JOIN usage_items ui ON ui.treatment_id = t.id
JOIN products p ON p.id = ui.product_id
JOIN batches b ON b.id = ui.batch_id
WHERE t.reg_date >= '2026-04-09'

UNION ALL

SELECT 
    'treatment_courses' AS source,
    t.id AS treatment_id,
    p.name AS product_name,
    tc.total_dose AS qty_to_return,
    b.qty_left AS current_qty,
    (b.qty_left + tc.total_dose) AS new_qty
FROM treatments t
JOIN treatment_courses tc ON tc.treatment_id = t.id
JOIN products p ON p.id = tc.product_id
LEFT JOIN batches b ON b.id = tc.batch_id
WHERE t.reg_date >= '2026-04-09'
AND tc.batch_id IS NOT NULL;

-- STEP 3: DELETE AND RETURN STOCK (RUN THIS)
DO $$
DECLARE
    v_treatment_id UUID;
    v_visit_id UUID;
    v_deleted_treatments INTEGER := 0;
    v_deleted_visits INTEGER := 0;
BEGIN
    RAISE NOTICE 'Starting deletion process...';
    
    -- ========================================
    -- PART 1: Delete Treatments and Return Stock
    -- ========================================
    RAISE NOTICE 'Processing treatments...';
    
    FOR v_treatment_id IN 
        SELECT id FROM treatments WHERE reg_date >= '2026-04-09'
    LOOP
        -- Return stock from usage_items
        UPDATE batches b
        SET 
            qty_left = b.qty_left + ui.qty,
            status = CASE 
                WHEN b.status = 'depleted' AND (b.qty_left + ui.qty) > 0 
                THEN 'active' 
                ELSE b.status 
            END,
            updated_at = NOW()
        FROM usage_items ui
        WHERE ui.batch_id = b.id
        AND ui.treatment_id = v_treatment_id;
        
        -- Return stock from treatment_courses
        UPDATE batches b
        SET 
            qty_left = b.qty_left + tc.total_dose,
            status = CASE 
                WHEN b.status = 'depleted' AND (b.qty_left + tc.total_dose) > 0 
                THEN 'active' 
                ELSE b.status 
            END,
            updated_at = NOW()
        FROM treatment_courses tc
        WHERE tc.batch_id = b.id
        AND tc.treatment_id = v_treatment_id
        AND tc.batch_id IS NOT NULL;
        
        -- Delete related records
        DELETE FROM course_doses 
        WHERE course_id IN (
            SELECT id FROM treatment_courses WHERE treatment_id = v_treatment_id
        );
        
        DELETE FROM course_medication_schedules
        WHERE course_id IN (
            SELECT id FROM treatment_courses WHERE treatment_id = v_treatment_id
        );
        
        DELETE FROM treatment_courses WHERE treatment_id = v_treatment_id;
        DELETE FROM usage_items WHERE treatment_id = v_treatment_id;
        
        -- Delete animal_visits linked to this treatment
        DELETE FROM animal_visits WHERE related_treatment_id = v_treatment_id;
        
        -- Delete the treatment itself
        DELETE FROM treatments WHERE id = v_treatment_id;
        
        v_deleted_treatments := v_deleted_treatments + 1;
    END LOOP;
    
    RAISE NOTICE 'Deleted % treatments and returned stock', v_deleted_treatments;
    
    -- ========================================
    -- PART 2: Delete Visits (not linked to treatments)
    -- ========================================
    RAISE NOTICE 'Processing visits...';
    
    FOR v_visit_id IN 
        SELECT id FROM animal_visits 
        WHERE visit_datetime >= '2026-04-09'
        AND related_treatment_id IS NULL  -- Only delete visits not already deleted above
    LOOP
        -- Return stock from planned_medications (if any were processed)
        -- Check if medications_processed flag is true
        UPDATE batches b
        SET 
            qty_left = b.qty_left + (pm->>'quantity')::numeric,
            status = CASE 
                WHEN b.status = 'depleted' AND (b.qty_left + (pm->>'quantity')::numeric) > 0 
                THEN 'active' 
                ELSE b.status 
            END,
            updated_at = NOW()
        FROM animal_visits av
        CROSS JOIN LATERAL jsonb_array_elements(av.planned_medications) AS pm
        WHERE av.id = v_visit_id
        AND av.medications_processed = true
        AND b.id::text = pm->>'batch_id';
        
        -- Delete the visit
        DELETE FROM animal_visits WHERE id = v_visit_id;
        
        v_deleted_visits := v_deleted_visits + 1;
    END LOOP;
    
    RAISE NOTICE 'Deleted % visits and returned stock', v_deleted_visits;
    RAISE NOTICE 'Total: % treatments + % visits = % records deleted', 
        v_deleted_treatments, v_deleted_visits, (v_deleted_treatments + v_deleted_visits);
END $$;

-- STEP 4: Verify
SELECT 
    'Treatments remaining' AS check_type, 
    COUNT(*) AS count
FROM treatments 
WHERE reg_date >= '2026-04-09'

UNION ALL

SELECT 
    'Visits remaining' AS check_type, 
    COUNT(*) AS count
FROM animal_visits 
WHERE visit_datetime >= '2026-04-09';
