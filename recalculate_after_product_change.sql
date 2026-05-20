-- =====================================================
-- Recalculate treatments after changing product withdrawal days
-- =====================================================
-- Use this when you change a product's withdrawal_days_meat or withdrawal_days_milk
-- and need to update all existing treatments that use that product

-- OPTION 1: Recalculate treatments for a SPECIFIC product
-- Replace 'YOUR_PRODUCT_NAME' with the actual product name
DO $$
DECLARE
    treatment_rec RECORD;
    processed_count INTEGER := 0;
    v_product_name TEXT := 'Rivanolo 0.1%';  -- CHANGE THIS to your product name
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Recalculating treatments for product: %', v_product_name;
    RAISE NOTICE '========================================';
    
    FOR treatment_rec IN 
        SELECT DISTINCT t.id, t.reg_date
        FROM public.treatments t
        JOIN public.usage_items ui ON ui.treatment_id = t.id
        JOIN public.products p ON p.id = ui.product_id
        WHERE p.name = v_product_name
        ORDER BY t.reg_date DESC
    LOOP
        -- Recalculate withdrawal dates
        PERFORM public.calculate_withdrawal_dates(treatment_rec.id);
        processed_count := processed_count + 1;
        
        IF processed_count % 10 = 0 THEN
            RAISE NOTICE 'Processed % treatments...', processed_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMPLETED! Recalculated % treatments', processed_count;
    RAISE NOTICE '========================================';
END $$;

-- =====================================================
-- OPTION 2: Recalculate ALL treatments (if you changed multiple products)
-- =====================================================
-- Uncomment this if you want to recalculate everything:

/*
DO $$
DECLARE
    treatment_rec RECORD;
    processed_count INTEGER := 0;
    total_count INTEGER := 0;
BEGIN
    SELECT COUNT(DISTINCT t.id) INTO total_count
    FROM public.treatments t
    JOIN public.usage_items ui ON ui.treatment_id = t.id
    JOIN public.products p ON p.id = ui.product_id
    WHERE p.category = 'medicines';
    
    RAISE NOTICE 'Recalculating ALL % treatments...', total_count;
    
    FOR treatment_rec IN 
        SELECT DISTINCT t.id
        FROM public.treatments t
        JOIN public.usage_items ui ON ui.treatment_id = t.id
        JOIN public.products p ON p.id = ui.product_id
        WHERE p.category = 'medicines'
        ORDER BY t.created_at DESC
    LOOP
        PERFORM public.calculate_withdrawal_dates(treatment_rec.id);
        processed_count := processed_count + 1;
        
        IF processed_count % 50 = 0 THEN
            RAISE NOTICE 'Progress: % of %', processed_count, total_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'COMPLETED! Recalculated % treatments', processed_count;
END $$;
*/

-- =====================================================
-- VERIFY: Check the treatments for this product
-- =====================================================
-- Replace 'YOUR_PRODUCT_NAME' with the actual product name
SELECT 
    t.id as treatment_id,
    t.reg_date,
    p.name as product_name,
    p.withdrawal_days_meat as product_meat_days,
    p.withdrawal_days_milk as product_milk_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    -- Calculate what it should be based on current product settings
    CASE 
        WHEN p.withdrawal_days_meat > 0 
        THEN t.reg_date + p.withdrawal_days_meat + 1
        ELSE NULL
    END as expected_meat_date,
    CASE 
        WHEN p.withdrawal_days_milk > 0 
        THEN t.reg_date + p.withdrawal_days_milk + 1
        ELSE NULL
    END as expected_milk_date,
    -- Check if it matches
    CASE 
        WHEN p.withdrawal_days_meat = 0 AND t.withdrawal_until_meat IS NULL THEN '✅ Correct'
        WHEN p.withdrawal_days_meat > 0 AND t.withdrawal_until_meat = (t.reg_date + p.withdrawal_days_meat + 1) THEN '✅ Correct'
        ELSE '❌ Needs recalculation'
    END as meat_status,
    CASE 
        WHEN p.withdrawal_days_milk = 0 AND t.withdrawal_until_milk IS NULL THEN '✅ Correct'
        WHEN p.withdrawal_days_milk > 0 AND t.withdrawal_until_milk = (t.reg_date + p.withdrawal_days_milk + 1) THEN '✅ Correct'
        ELSE '❌ Needs recalculation'
    END as milk_status
FROM public.treatments t
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON p.id = ui.product_id
WHERE p.name = 'Rivanolo 0.1%'  -- CHANGE THIS to your product name
ORDER BY t.reg_date DESC
LIMIT 20;
