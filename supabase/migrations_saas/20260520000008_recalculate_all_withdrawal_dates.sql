-- =====================================================
-- Recalculate all withdrawal dates to fix 0-day issue
-- =====================================================
-- This migration recalculates withdrawal dates for all treatments
-- to ensure products with 0 withdrawal days show NULL (not tomorrow's date)

-- Recalculate all treatments that have medicines
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
    
    RAISE NOTICE 'Starting withdrawal date recalculation for % treatments...', total_count;
    
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
        
        -- Log progress every 100 records
        IF processed_count % 100 = 0 THEN
            RAISE NOTICE 'Processed % of % treatments...', processed_count, total_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed! Recalculated withdrawal dates for % treatments.', processed_count;
END $$;

-- Verify the fix by checking how many treatments now have NULL withdrawal dates
-- when all their products have 0 or NULL withdrawal days
SELECT 
    COUNT(*) as treatments_with_null_dates
FROM public.treatments t
WHERE (t.withdrawal_until_meat IS NULL AND t.withdrawal_until_milk IS NULL)
  AND EXISTS (
    SELECT 1 
    FROM public.usage_items ui
    JOIN public.products p ON ui.product_id = p.id
    WHERE ui.treatment_id = t.id 
      AND p.category = 'medicines'
  )
  AND NOT EXISTS (
    -- Check if there's any product with actual withdrawal days
    SELECT 1 
    FROM public.usage_items ui
    JOIN public.products p ON ui.product_id = p.id
    WHERE ui.treatment_id = t.id
      AND p.category = 'medicines'
      AND (
        (p.withdrawal_days_meat IS NOT NULL AND p.withdrawal_days_meat > 0)
        OR (p.withdrawal_days_milk IS NOT NULL AND p.withdrawal_days_milk > 0)
      )
  );
