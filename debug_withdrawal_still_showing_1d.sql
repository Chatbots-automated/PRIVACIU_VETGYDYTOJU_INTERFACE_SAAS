-- Debug query to see what's happening with withdrawal dates
-- Run this to understand why it still shows "1d"

-- 1. Check a specific treatment and see what dates are stored
SELECT 
    t.id as treatment_id,
    t.reg_date,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    -- Calculate days from today
    t.withdrawal_until_meat - CURRENT_DATE as days_until_meat,
    t.withdrawal_until_milk - CURRENT_DATE as days_until_milk,
    -- Show the products used
    p.name as product_name,
    p.withdrawal_days_meat,
    p.withdrawal_days_milk,
    ui.administration_route
FROM public.treatments t
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON p.id = ui.product_id
WHERE p.category = 'medicines'
  AND t.created_at > CURRENT_DATE - INTERVAL '7 days'  -- Last 7 days
ORDER BY t.created_at DESC
LIMIT 20;

-- 2. Check what the view shows
SELECT 
    treatment_id,
    registration_date,
    medicine_name,
    withdrawal_until_meat,
    withdrawal_until_milk,
    withdrawal_days_meat,
    withdrawal_days_milk
FROM public.vw_treated_animals_detailed
WHERE registration_date > CURRENT_DATE - INTERVAL '7 days'
ORDER BY registration_date DESC
LIMIT 20;

-- 3. Find treatments where product has 0 withdrawal but date is still set
SELECT 
    t.id as treatment_id,
    t.reg_date,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    p.name as product_name,
    p.withdrawal_days_meat,
    p.withdrawal_days_milk,
    -- This should be NULL if product has 0 days
    CASE 
        WHEN p.withdrawal_days_meat = 0 AND t.withdrawal_until_meat IS NOT NULL 
        THEN '❌ WRONG - Should be NULL'
        WHEN p.withdrawal_days_meat = 0 AND t.withdrawal_until_meat IS NULL 
        THEN '✅ CORRECT - Is NULL'
        ELSE 'Has withdrawal days'
    END as meat_status,
    CASE 
        WHEN p.withdrawal_days_milk = 0 AND t.withdrawal_until_milk IS NOT NULL 
        THEN '❌ WRONG - Should be NULL'
        WHEN p.withdrawal_days_milk = 0 AND t.withdrawal_until_milk IS NULL 
        THEN '✅ CORRECT - Is NULL'
        ELSE 'Has withdrawal days'
    END as milk_status
FROM public.treatments t
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON p.id = ui.product_id
WHERE p.category = 'medicines'
  AND (p.withdrawal_days_meat = 0 OR p.withdrawal_days_milk = 0)
ORDER BY t.created_at DESC
LIMIT 20;
