-- Test query to check withdrawal calculation issue
-- This will help us understand why products with 0 withdrawal days show 1 day

-- 1. Check the current calculate_withdrawal_dates function definition
SELECT 
    p.prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'calculate_withdrawal_dates';

-- 2. Check some sample treatments and their products
SELECT 
    t.id as treatment_id,
    t.reg_date,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    ui.product_id,
    p.name as product_name,
    p.withdrawal_days_meat,
    p.withdrawal_days_milk,
    p.withdrawal_iv_meat,
    p.withdrawal_iv_milk,
    p.withdrawal_im_meat,
    p.withdrawal_im_milk,
    ui.administration_route,
    -- Calculate what the withdrawal date should be for meat
    CASE 
        WHEN COALESCE(
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
        ) > 0 
        THEN t.reg_date + COALESCE(
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
        ) + 1
        ELSE NULL
    END as expected_meat_date,
    -- Calculate what the withdrawal date should be for milk
    CASE 
        WHEN COALESCE(
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
        ) > 0 
        THEN t.reg_date + COALESCE(
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
        ) + 1
        ELSE NULL
    END as expected_milk_date
FROM public.treatments t
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON p.id = ui.product_id
WHERE p.category = 'medicines'
  AND (
    -- Find cases where product has 0 withdrawal but date is set
    (p.withdrawal_days_meat = 0 OR p.withdrawal_days_meat IS NULL) 
    OR (p.withdrawal_days_milk = 0 OR p.withdrawal_days_milk IS NULL)
  )
ORDER BY t.created_at DESC
LIMIT 20;

-- 3. Find products with 0 or NULL withdrawal days
SELECT 
    id,
    name,
    category,
    withdrawal_days_meat,
    withdrawal_days_milk,
    withdrawal_iv_meat,
    withdrawal_iv_milk,
    withdrawal_im_meat,
    withdrawal_im_milk,
    withdrawal_sc_meat,
    withdrawal_sc_milk
FROM public.products
WHERE category = 'medicines'
  AND (
    withdrawal_days_meat = 0 OR withdrawal_days_milk = 0
    OR withdrawal_days_meat IS NULL OR withdrawal_days_milk IS NULL
  )
LIMIT 10;
