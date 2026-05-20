-- COMPREHENSIVE DEBUG QUERY FOR WITHDRAWAL ISSUE
-- Copy this entire query and run it in Supabase SQL Editor

-- =====================================================
-- 1. CHECK IF THE FUNCTION IS UP TO DATE
-- =====================================================
SELECT 
    'Function Definition' as check_type,
    CASE 
        WHEN prosrc LIKE '%v_max_meat_days > 0%' THEN '✅ Function is correct (checks > 0)'
        ELSE '❌ Function is OLD - needs update'
    END as status,
    prosrc as function_body
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'calculate_withdrawal_dates';

-- =====================================================
-- 2. CHECK ACTUAL DATA IN TREATMENTS
-- =====================================================
SELECT 
    '2. Recent Treatments' as section,
    t.id as treatment_id,
    t.reg_date,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.withdrawal_until_meat - CURRENT_DATE as days_meat,
    t.withdrawal_until_milk - CURRENT_DATE as days_milk,
    p.name as product_name,
    p.withdrawal_days_meat as product_meat_days,
    p.withdrawal_days_milk as product_milk_days,
    CASE 
        WHEN p.withdrawal_days_meat = 0 AND t.withdrawal_until_meat IS NOT NULL 
        THEN '❌ WRONG - Should be NULL!'
        WHEN p.withdrawal_days_meat = 0 AND t.withdrawal_until_meat IS NULL 
        THEN '✅ CORRECT'
        WHEN p.withdrawal_days_meat > 0 AND t.withdrawal_until_meat IS NOT NULL
        THEN '✅ CORRECT (has days)'
        ELSE 'N/A'
    END as meat_status,
    CASE 
        WHEN p.withdrawal_days_milk = 0 AND t.withdrawal_until_milk IS NOT NULL 
        THEN '❌ WRONG - Should be NULL!'
        WHEN p.withdrawal_days_milk = 0 AND t.withdrawal_until_milk IS NULL 
        THEN '✅ CORRECT'
        WHEN p.withdrawal_days_milk > 0 AND t.withdrawal_until_milk IS NOT NULL
        THEN '✅ CORRECT (has days)'
        ELSE 'N/A'
    END as milk_status
FROM public.treatments t
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON p.id = ui.product_id
WHERE p.category = 'medicines'
  AND t.created_at > CURRENT_DATE - INTERVAL '3 days'
ORDER BY t.created_at DESC
LIMIT 10;

-- =====================================================
-- 3. CHECK SPECIFIC PRODUCTS WITH 0 WITHDRAWAL DAYS
-- =====================================================
SELECT 
    '3. Products with 0 withdrawal' as section,
    p.name,
    p.withdrawal_days_meat,
    p.withdrawal_days_milk,
    p.category,
    COUNT(DISTINCT t.id) as treatment_count,
    COUNT(CASE WHEN t.withdrawal_until_meat IS NOT NULL THEN 1 END) as treatments_with_meat_date,
    COUNT(CASE WHEN t.withdrawal_until_milk IS NOT NULL THEN 1 END) as treatments_with_milk_date
FROM public.products p
LEFT JOIN public.usage_items ui ON ui.product_id = p.id
LEFT JOIN public.treatments t ON t.id = ui.treatment_id
WHERE p.category = 'medicines'
  AND (p.withdrawal_days_meat = 0 OR p.withdrawal_days_milk = 0)
GROUP BY p.id, p.name, p.withdrawal_days_meat, p.withdrawal_days_milk, p.category
ORDER BY treatment_count DESC
LIMIT 10;

-- =====================================================
-- 4. CHECK WHAT THE VIEW SHOWS
-- =====================================================
SELECT 
    '4. What the view shows' as section,
    treatment_id,
    registration_date,
    medicine_name,
    withdrawal_until_meat,
    withdrawal_until_milk,
    withdrawal_days_meat as view_days_meat,
    withdrawal_days_milk as view_days_milk
FROM public.vw_treated_animals_detailed
WHERE registration_date > CURRENT_DATE - INTERVAL '3 days'
ORDER BY registration_date DESC
LIMIT 10;
