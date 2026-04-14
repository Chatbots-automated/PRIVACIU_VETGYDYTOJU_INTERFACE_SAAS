-- =====================================================================
-- Fix Withdrawal Calculation for All Products with Withdrawal Days
-- =====================================================================
-- Created: 2026-04-13
-- Description:
--   Updates calculate_withdrawal_dates function to calculate withdrawal periods
--   for ANY product that has withdrawal_days_milk or withdrawal_days_meat defined,
--   regardless of category. Adds +1 safety buffer only when withdrawal days > 0.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.calculate_withdrawal_dates(p_treatment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_reg_date date;
    v_milk_until date;
    v_meat_until date;
BEGIN
    SELECT reg_date INTO v_reg_date FROM public.treatments WHERE id = p_treatment_id;

    -- Calculate milk withdrawal for ANY product that has withdrawal days defined
    -- Include products with 0 days withdrawal (>= 0 instead of > 0)
    -- Add +1 day for safety buffer only when withdrawal_days > 0
    WITH course_milk AS (
        SELECT v_reg_date + tc.days + p.withdrawal_days_milk + CASE WHEN p.withdrawal_days_milk > 0 THEN 1 ELSE 0 END as wd
        FROM public.treatment_courses tc
        JOIN public.products p ON p.id = tc.product_id
        WHERE tc.treatment_id = p_treatment_id 
          AND p.withdrawal_days_milk IS NOT NULL
          AND p.withdrawal_days_milk >= 0
    ),
    single_milk AS (
        SELECT v_reg_date + p.withdrawal_days_milk + CASE WHEN p.withdrawal_days_milk > 0 THEN 1 ELSE 0 END as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.withdrawal_days_milk IS NOT NULL
          AND p.withdrawal_days_milk >= 0
          AND NOT EXISTS (
            SELECT 1 FROM public.treatment_courses tc 
            WHERE tc.treatment_id = p_treatment_id 
              AND tc.product_id = ui.product_id
          )
    ),
    all_milk AS (
        SELECT wd FROM course_milk 
        UNION ALL 
        SELECT wd FROM single_milk
    )
    SELECT MAX(wd) INTO v_milk_until FROM all_milk;

    -- Calculate meat withdrawal for ANY product that has withdrawal days defined
    -- Include products with 0 days withdrawal (>= 0 instead of > 0)
    -- Add +1 day for safety buffer only when withdrawal_days > 0
    WITH course_meat AS (
        SELECT v_reg_date + tc.days + p.withdrawal_days_meat + CASE WHEN p.withdrawal_days_meat > 0 THEN 1 ELSE 0 END as wd
        FROM public.treatment_courses tc
        JOIN public.products p ON p.id = tc.product_id
        WHERE tc.treatment_id = p_treatment_id 
          AND p.withdrawal_days_meat IS NOT NULL
          AND p.withdrawal_days_meat >= 0
    ),
    single_meat AS (
        SELECT v_reg_date + p.withdrawal_days_meat + CASE WHEN p.withdrawal_days_meat > 0 THEN 1 ELSE 0 END as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.withdrawal_days_meat IS NOT NULL
          AND p.withdrawal_days_meat >= 0
          AND NOT EXISTS (
            SELECT 1 FROM public.treatment_courses tc 
            WHERE tc.treatment_id = p_treatment_id 
              AND tc.product_id = ui.product_id
          )
    ),
    all_meat AS (
        SELECT wd FROM course_meat 
        UNION ALL 
        SELECT wd FROM single_meat
    )
    SELECT MAX(wd) INTO v_meat_until FROM all_meat;

    -- Update treatment with calculated dates
    UPDATE public.treatments 
    SET 
        withdrawal_until_milk = v_milk_until,
        withdrawal_until_meat = v_meat_until 
    WHERE id = p_treatment_id;
END;
$$;

COMMENT ON FUNCTION public.calculate_withdrawal_dates(uuid) IS 'Calculates and updates withdrawal dates for milk and meat based on ANY product that has withdrawal days defined, regardless of category. Adds +1 day safety buffer only when withdrawal days > 0.';
