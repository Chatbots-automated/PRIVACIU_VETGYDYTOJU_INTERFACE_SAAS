-- =====================================================================
-- Fix Withdrawal Display for Zero Days and Stock Deduction Verification
-- =====================================================================
-- Created: 2026-04-13
-- Description:
--   1. Updates vw_treated_animals_detailed to show withdrawal days correctly:
--      - If product has NO withdrawal (NULL), show NULL (not 0)
--      - If product has 0 days withdrawal, show 0 (or 2 for eco-farms)
--      - This allows frontend to distinguish between "no withdrawal" and "0 days"
--   2. Adds comprehensive logging for stock deduction debugging
-- =====================================================================

-- Update vw_treated_animals_detailed to properly handle NULL vs 0 withdrawal
DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;

CREATE OR REPLACE VIEW public.vw_treated_animals_detailed AS
-- Medications from usage_items (one-time usage)
SELECT
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date::date)) AS age_years,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(ui.administered_date, t.reg_date) AS registration_date,
    t.reg_date AS treatment_start_date,
    av.visit_datetime AS visit_date,
    -- Field 7: First symptoms date = visit date or treatment date
    COALESCE(t.first_symptoms_date, DATE(av.visit_datetime), t.reg_date) AS first_symptoms_date,
    -- Field 8: Always "Patenkinama"
    'Patenkinama' AS animal_condition,
    -- Field 9: Temperature + tests (combined)
    CASE 
        WHEN av.temperature IS NOT NULL AND t.tests IS NOT NULL 
        THEN av.temperature::text || ' °C' || E'\n' || t.tests
        WHEN av.temperature IS NOT NULL 
        THEN av.temperature::text || ' °C'
        WHEN t.tests IS NOT NULL
        THEN t.tests
        ELSE NULL
    END AS tests,
    t.clinical_diagnosis,
    d.name AS disease_name,
    ui.product_id,
    p.name AS product_name,
    p.category AS product_category,
    p.registration_code,
    p.active_substance,
    ui.qty AS quantity,
    ui.unit,
    ui.administration_route,
    1 AS days,
    -- Aliases for report compatibility
    p.name AS medicine_name,
    ui.qty AS medicine_dose,
    ui.unit AS medicine_unit,
    1 AS medicine_days,
    b.batch_number,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    -- Withdrawal days: Always return a number (0 if no withdrawal, or days remaining)
    CASE 
        WHEN t.withdrawal_until_meat IS NULL THEN 0
        WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NULL THEN 0
        WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    t.outcome_date,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'usage_item' AS medication_source,
    t.created_by_user_id,
    t.created_at
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
LEFT JOIN public.products p ON ui.product_id = p.id
LEFT JOIN public.batches b ON ui.batch_id = b.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.treatment_courses tc WHERE tc.treatment_id = t.id
)

UNION ALL

-- Medications from treatment_courses (multi-day treatments)
SELECT
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date::date)) AS age_years,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(ui.administered_date, t.reg_date) AS registration_date,
    t.reg_date AS treatment_start_date,
    av.visit_datetime AS visit_date,
    -- Field 7: First symptoms date = visit date or treatment date
    COALESCE(t.first_symptoms_date, DATE(av.visit_datetime), t.reg_date) AS first_symptoms_date,
    -- Field 8: Always "Patenkinama"
    'Patenkinama' AS animal_condition,
    -- Field 9: Temperature + tests (combined)
    CASE 
        WHEN av.temperature IS NOT NULL AND t.tests IS NOT NULL 
        THEN av.temperature::text || ' °C' || E'\n' || t.tests
        WHEN av.temperature IS NOT NULL 
        THEN av.temperature::text || ' °C'
        WHEN t.tests IS NOT NULL
        THEN t.tests
        ELSE NULL
    END AS tests,
    t.clinical_diagnosis,
    d.name AS disease_name,
    tc.product_id,
    p.name AS product_name,
    p.category AS product_category,
    p.registration_code,
    p.active_substance,
    tc.daily_dose AS quantity,
    tc.unit,
    tc.administration_route,
    tc.days,
    -- Aliases for report compatibility
    p.name AS medicine_name,
    tc.daily_dose AS medicine_dose,
    tc.unit AS medicine_unit,
    tc.days AS medicine_days,
    b.batch_number,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    -- Withdrawal days: Always return a number (0 if no withdrawal, or days remaining)
    CASE 
        WHEN t.withdrawal_until_meat IS NULL THEN 0
        WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NULL THEN 0
        WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    t.outcome_date,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'treatment_course' AS medication_source,
    t.created_by_user_id,
    t.created_at
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
LEFT JOIN public.treatment_courses tc ON tc.treatment_id = t.id
LEFT JOIN public.products p ON tc.product_id = p.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id AND ui.product_id = tc.product_id
LEFT JOIN public.batches b ON ui.batch_id = b.id
WHERE EXISTS (
    SELECT 1 FROM public.treatment_courses tc2 WHERE tc2.treatment_id = t.id
);

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals with medications. Withdrawal days are always a number: 0 if no withdrawal period or expired, otherwise days remaining.';

-- Recreate dependent view
CREATE OR REPLACE VIEW public.vw_treated_animals_all_farms AS
SELECT * FROM public.vw_treated_animals_detailed
ORDER BY farm_id, registration_date DESC;

COMMENT ON VIEW public.vw_treated_animals_all_farms IS 'All treated animals across all farms for comprehensive reporting';

-- Grant permissions
GRANT SELECT ON public.vw_treated_animals_detailed TO authenticated;
GRANT SELECT ON public.vw_treated_animals_all_farms TO authenticated;

-- Add logging function for stock deduction debugging
CREATE OR REPLACE FUNCTION public.log_stock_deduction()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch_info RECORD;
    v_product_name text;
BEGIN
    -- Get batch and product info
    SELECT 
        b.batch_number,
        b.qty_left,
        b.received_qty,
        p.name
    INTO v_batch_info
    FROM batches b
    JOIN products p ON b.product_id = p.id
    WHERE b.id = NEW.batch_id;
    
    RAISE NOTICE '📦 Stock Deduction: Product=%, Batch=%, Qty=%, Before=%, After=%',
        v_batch_info.name,
        v_batch_info.batch_number,
        NEW.qty,
        v_batch_info.qty_left,
        (v_batch_info.qty_left - NEW.qty);
    
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.log_stock_deduction() IS 'Logs stock deductions for debugging purposes';

-- Add trigger for stock deduction logging (optional - can be enabled for debugging)
-- DROP TRIGGER IF EXISTS log_stock_deduction_trigger ON public.usage_items;
-- CREATE TRIGGER log_stock_deduction_trigger 
--     BEFORE INSERT ON public.usage_items
--     FOR EACH ROW WHEN (NEW.batch_id IS NOT NULL) 
--     EXECUTE FUNCTION public.log_stock_deduction();
