-- =====================================================
-- Auto-recalculate treatments when product withdrawal days change
-- =====================================================
-- This trigger automatically recalculates all treatments that use a product
-- when you change the product's withdrawal_days_meat or withdrawal_days_milk

-- Create the trigger function
CREATE OR REPLACE FUNCTION public.recalculate_treatments_on_product_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    treatment_rec RECORD;
    recalc_count INTEGER := 0;
BEGIN
    -- Only recalculate if withdrawal days actually changed
    IF (OLD.withdrawal_days_meat IS DISTINCT FROM NEW.withdrawal_days_meat) 
       OR (OLD.withdrawal_days_milk IS DISTINCT FROM NEW.withdrawal_days_milk)
       OR (OLD.withdrawal_iv_meat IS DISTINCT FROM NEW.withdrawal_iv_meat)
       OR (OLD.withdrawal_iv_milk IS DISTINCT FROM NEW.withdrawal_iv_milk)
       OR (OLD.withdrawal_im_meat IS DISTINCT FROM NEW.withdrawal_im_meat)
       OR (OLD.withdrawal_im_milk IS DISTINCT FROM NEW.withdrawal_im_milk)
       OR (OLD.withdrawal_sc_meat IS DISTINCT FROM NEW.withdrawal_sc_meat)
       OR (OLD.withdrawal_sc_milk IS DISTINCT FROM NEW.withdrawal_sc_milk)
       OR (OLD.withdrawal_iu_meat IS DISTINCT FROM NEW.withdrawal_iu_meat)
       OR (OLD.withdrawal_iu_milk IS DISTINCT FROM NEW.withdrawal_iu_milk)
       OR (OLD.withdrawal_imm_meat IS DISTINCT FROM NEW.withdrawal_imm_meat)
       OR (OLD.withdrawal_imm_milk IS DISTINCT FROM NEW.withdrawal_imm_milk)
       OR (OLD.withdrawal_pos_meat IS DISTINCT FROM NEW.withdrawal_pos_meat)
       OR (OLD.withdrawal_pos_milk IS DISTINCT FROM NEW.withdrawal_pos_milk)
    THEN
        RAISE NOTICE 'Product "%" withdrawal days changed. Recalculating affected treatments...', NEW.name;
        
        -- Find all treatments that use this product
        FOR treatment_rec IN 
            SELECT DISTINCT t.id
            FROM public.treatments t
            JOIN public.usage_items ui ON ui.treatment_id = t.id
            WHERE ui.product_id = NEW.id
        LOOP
            -- Recalculate withdrawal dates for this treatment
            PERFORM public.calculate_withdrawal_dates(treatment_rec.id);
            recalc_count := recalc_count + 1;
        END LOOP;
        
        RAISE NOTICE '✅ Recalculated % treatments for product "%"', recalc_count, NEW.name;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS trigger_recalculate_treatments_on_product_update ON public.products;

-- Create the trigger
CREATE TRIGGER trigger_recalculate_treatments_on_product_update
    AFTER UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_treatments_on_product_update();

COMMENT ON FUNCTION public.recalculate_treatments_on_product_update IS 'Automatically recalculates withdrawal dates for all treatments when a product''s withdrawal days are changed';

-- Test: Show recent product updates
SELECT 
    'Trigger installed successfully! Now when you change a product''s withdrawal days, all treatments will automatically recalculate.' as message;
