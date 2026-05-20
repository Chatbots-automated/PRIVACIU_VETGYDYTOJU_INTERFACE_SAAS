-- =====================================================
-- COMPLETE FIX FOR WITHDRAWAL 0-DAY ISSUE
-- =====================================================
-- This migration includes EVERYTHING needed to fix the issue:
-- 1. Updates the calculate_withdrawal_dates function
-- 2. Recalculates all existing treatments
-- Run this ONE migration to fix everything!

-- =====================================================
-- STEP 1: Update the function to handle 0-day products correctly
-- =====================================================
CREATE OR REPLACE FUNCTION public.calculate_withdrawal_dates(p_treatment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_reg_date date;
    v_milk_until date;
    v_meat_until date;
    v_max_milk_days integer;
    v_max_meat_days integer;
BEGIN
    SELECT reg_date INTO v_reg_date FROM public.treatments WHERE id = p_treatment_id;

    -- Calculate milk withdrawal: find max withdrawal days first
    WITH milk_days AS (
        SELECT COALESCE(
                CASE ui.administration_route
                    WHEN 'iv' THEN p.withdrawal_iv_milk
                    WHEN 'im' THEN p.withdrawal_im_milk
                    WHEN 'sc' THEN p.withdrawal_sc_milk
                    WHEN 'iu' THEN p.withdrawal_iu_milk
                    WHEN 'imm' THEN p.withdrawal_imm_milk
                    WHEN 'pos' THEN p.withdrawal_pos_milk
                    ELSE p.withdrawal_days_milk
                END,
                p.withdrawal_days_milk,
                0
            ) as days
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
    )
    SELECT MAX(days) INTO v_max_milk_days FROM milk_days;

    -- Only set withdrawal date if max days > 0, and add +1 safety day
    IF v_max_milk_days IS NOT NULL AND v_max_milk_days > 0 THEN
        v_milk_until := v_reg_date + v_max_milk_days + 1;
    ELSE
        v_milk_until := NULL;  -- NULL for 0-day products
    END IF;

    -- Calculate meat withdrawal: find max withdrawal days first
    WITH meat_days AS (
        SELECT COALESCE(
                CASE ui.administration_route
                    WHEN 'iv' THEN p.withdrawal_iv_meat
                    WHEN 'im' THEN p.withdrawal_im_meat
                    WHEN 'sc' THEN p.withdrawal_sc_meat
                    WHEN 'iu' THEN p.withdrawal_iu_meat
                    WHEN 'imm' THEN p.withdrawal_imm_meat
                    WHEN 'pos' THEN p.withdrawal_pos_meat
                    ELSE p.withdrawal_days_meat
                END,
                p.withdrawal_days_meat,
                0
            ) as days
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
    )
    SELECT MAX(days) INTO v_max_meat_days FROM meat_days;

    -- Only set withdrawal date if max days > 0, and add +1 safety day
    IF v_max_meat_days IS NOT NULL AND v_max_meat_days > 0 THEN
        v_meat_until := v_reg_date + v_max_meat_days + 1;
    ELSE
        v_meat_until := NULL;  -- NULL for 0-day products
    END IF;

    -- Update the treatment record
    UPDATE public.treatments
    SET 
        withdrawal_until_milk = v_milk_until,
        withdrawal_until_meat = v_meat_until,
        updated_at = now()
    WHERE id = p_treatment_id;
END;
$$;

COMMENT ON FUNCTION public.calculate_withdrawal_dates IS 'Calculates milk and meat withdrawal dates ONLY when withdrawal period > 0. Products with 0 days get NULL dates (displayed as "Nėra" in reports).';

-- =====================================================
-- STEP 2: Recalculate all existing treatments
-- =====================================================
DO $$
DECLARE
    treatment_rec RECORD;
    total_count INTEGER := 0;
    processed_count INTEGER := 0;
BEGIN
    -- Count total treatments to process
    SELECT COUNT(DISTINCT t.id) INTO total_count
    FROM public.treatments t
    JOIN public.usage_items ui ON ui.treatment_id = t.id
    JOIN public.products p ON p.id = ui.product_id
    WHERE p.category = 'medicines';
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Starting withdrawal date recalculation';
    RAISE NOTICE 'Total treatments to process: %', total_count;
    RAISE NOTICE '========================================';
    
    -- Process each treatment
    FOR treatment_rec IN 
        SELECT DISTINCT t.id, t.created_at
        FROM public.treatments t
        JOIN public.usage_items ui ON ui.treatment_id = t.id
        JOIN public.products p ON p.id = ui.product_id
        WHERE p.category = 'medicines'
        ORDER BY t.created_at DESC
    LOOP
        -- Call the calculate_withdrawal_dates function
        PERFORM public.calculate_withdrawal_dates(treatment_rec.id);
        
        processed_count := processed_count + 1;
        
        -- Log progress every 50 records
        IF processed_count % 50 = 0 THEN
            RAISE NOTICE 'Progress: % of % treatments processed...', processed_count, total_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMPLETED! Recalculated % treatments', processed_count;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- STEP 3: Verify the fix
-- =====================================================
-- Count treatments with 0-day products that now correctly have NULL dates
WITH zero_day_products AS (
    SELECT DISTINCT t.id as treatment_id
    FROM public.treatments t
    JOIN public.usage_items ui ON ui.treatment_id = t.id
    JOIN public.products p ON p.id = ui.product_id
    WHERE p.category = 'medicines'
      AND p.withdrawal_days_meat = 0 
      AND p.withdrawal_days_milk = 0
),
correct_nulls AS (
    SELECT COUNT(*) as null_count
    FROM public.treatments t
    WHERE t.id IN (SELECT treatment_id FROM zero_day_products)
      AND t.withdrawal_until_meat IS NULL 
      AND t.withdrawal_until_milk IS NULL
),
incorrect_dates AS (
    SELECT COUNT(*) as date_count
    FROM public.treatments t
    WHERE t.id IN (SELECT treatment_id FROM zero_day_products)
      AND (t.withdrawal_until_meat IS NOT NULL OR t.withdrawal_until_milk IS NOT NULL)
)
SELECT 
    '✅ Treatments with 0-day products that correctly have NULL dates: ' || COALESCE(null_count::text, '0') as result
FROM correct_nulls
UNION ALL
SELECT 
    CASE 
        WHEN date_count > 0 
        THEN '❌ Treatments with 0-day products that STILL have dates (WRONG): ' || date_count::text
        ELSE '✅ All 0-day product treatments are correct!'
    END as result
FROM incorrect_dates;

-- Show some examples of recent treatments
SELECT 
    '--- Recent treatments with their withdrawal dates ---' as info;

SELECT 
    t.id,
    t.reg_date,
    p.name as product,
    p.withdrawal_days_meat as prod_meat_days,
    p.withdrawal_days_milk as prod_milk_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN p.withdrawal_days_meat = 0 AND t.withdrawal_until_meat IS NULL THEN '✅'
        WHEN p.withdrawal_days_meat = 0 AND t.withdrawal_until_meat IS NOT NULL THEN '❌'
        WHEN p.withdrawal_days_meat > 0 AND t.withdrawal_until_meat IS NOT NULL THEN '✅'
        ELSE '?'
    END as meat_ok,
    CASE 
        WHEN p.withdrawal_days_milk = 0 AND t.withdrawal_until_milk IS NULL THEN '✅'
        WHEN p.withdrawal_days_milk = 0 AND t.withdrawal_until_milk IS NOT NULL THEN '❌'
        WHEN p.withdrawal_days_milk > 0 AND t.withdrawal_until_milk IS NOT NULL THEN '✅'
        ELSE '?'
    END as milk_ok
FROM public.treatments t
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON p.id = ui.product_id
WHERE p.category = 'medicines'
  AND t.created_at > CURRENT_DATE - INTERVAL '7 days'
ORDER BY t.created_at DESC
LIMIT 20;
