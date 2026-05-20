-- Fix withdrawal date calculation to NOT add +1 day when withdrawal period is 0
-- Issue: Products with 0 withdrawal days were showing next day as withdrawal date
-- Solution: Only add +1 safety day when withdrawal period is > 0

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
        v_milk_until := NULL;
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
        v_meat_until := NULL;
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

COMMENT ON FUNCTION public.calculate_withdrawal_dates IS 'Calculates milk and meat withdrawal dates ONLY when withdrawal period > 0. Adds +1 safety day only for products with actual withdrawal periods. Products with 0 days get NULL dates.';

-- Recalculate all existing treatments to fix any that have incorrect dates
DO $$
DECLARE
    treatment_rec RECORD;
BEGIN
    FOR treatment_rec IN 
        SELECT DISTINCT t.id
        FROM public.treatments t
        WHERE t.withdrawal_until_milk IS NOT NULL OR t.withdrawal_until_meat IS NOT NULL
    LOOP
        PERFORM public.calculate_withdrawal_dates(treatment_rec.id);
    END LOOP;
END $$;
