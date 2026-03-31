-- =====================================================================
-- Fix Treated Animals Report - Add Temperature and Default Values
-- =====================================================================
-- Migration: 20260325000003
-- Created: 2026-03-25
--
-- OVERVIEW:
-- Updates the vw_treated_animals_detailed view to:
-- 1. Default first_symptoms_date to reg_date if null
-- 2. Default animal_condition to 'Patenkinama' if null
-- 3. Include temperature from animal_visits in the tests field
-- =====================================================================

DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;

CREATE OR REPLACE VIEW public.vw_treated_animals_detailed AS
-- Medications from usage_items (one-time usage)
SELECT 
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), NULLIF(TRIM(t.animal_condition), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    COALESCE(
        t.tests,
        CASE 
            WHEN av.temperature IS NOT NULL 
            THEN 'Temperatūra: ' || av.temperature::text || '°C'
            ELSE NULL
        END
    ) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.qty AS medicine_dose,
    ui.unit::text AS medicine_unit,
    COALESCE((
        SELECT MAX(tc.days)
        FROM public.treatment_courses tc
        WHERE tc.treatment_id = t.id
    ), 1) AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'usage_item' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON ui.product_id = p.id

UNION ALL

-- Medications from treatment_courses (multi-day courses)
SELECT 
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), NULLIF(TRIM(t.animal_condition), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    COALESCE(
        t.tests,
        CASE 
            WHEN av.temperature IS NOT NULL 
            THEN 'Temperatūra: ' || av.temperature::text || '°C'
            ELSE NULL
        END
    ) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    tc.total_dose AS medicine_dose,
    tc.unit::text AS medicine_unit,
    tc.days AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'treatment_course' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
JOIN public.treatment_courses tc ON tc.treatment_id = t.id
JOIN public.products p ON tc.product_id = p.id

UNION ALL

-- Medications from planned_medications (from visits - JSONB array)
SELECT 
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), NULLIF(TRIM(t.animal_condition), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    COALESCE(
        t.tests,
        CASE 
            WHEN av.temperature IS NOT NULL 
            THEN 'Temperatūra: ' || av.temperature::text || '°C'
            ELSE NULL
        END
    ) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    (med.value->>'dose')::numeric AS medicine_dose,
    (med.value->>'unit')::text AS medicine_unit,
    COALESCE((med.value->>'days')::integer, 1) AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'planned_medication' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
JOIN public.animal_visits av ON av.id = t.visit_id
CROSS JOIN LATERAL jsonb_array_elements(av.planned_medications) AS med(value)
JOIN public.products p ON p.id = (med.value->>'product_id')::uuid
WHERE av.planned_medications IS NOT NULL 
  AND jsonb_array_length(av.planned_medications) > 0;

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of all treated animals with medications. Includes temperature from visits, defaults first_symptoms_date to reg_date, and animal_condition to Patenkinama.';

GRANT SELECT ON public.vw_treated_animals_detailed TO authenticated;

-- =====================================================================
-- Update vw_treated_animals_all_farms with same fixes
-- =====================================================================

DROP VIEW IF EXISTS public.vw_treated_animals_all_farms CASCADE;

CREATE OR REPLACE VIEW public.vw_treated_animals_all_farms AS
-- Medications from usage_items (one-time usage)
SELECT 
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), NULLIF(TRIM(t.animal_condition), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    COALESCE(
        t.tests,
        CASE 
            WHEN av.temperature IS NOT NULL 
            THEN 'Temperatūra: ' || av.temperature::text || '°C'
            ELSE NULL
        END
    ) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.qty AS medicine_dose,
    ui.unit::text AS medicine_unit,
    COALESCE((
        SELECT MAX(tc.days)
        FROM public.treatment_courses tc
        WHERE tc.treatment_id = t.id
    ), 1) AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'usage_item' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON ui.product_id = p.id

UNION ALL

-- Medications from treatment_courses (multi-day courses)
SELECT 
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), NULLIF(TRIM(t.animal_condition), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    COALESCE(
        t.tests,
        CASE 
            WHEN av.temperature IS NOT NULL 
            THEN 'Temperatūra: ' || av.temperature::text || '°C'
            ELSE NULL
        END
    ) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    tc.total_dose AS medicine_dose,
    tc.unit::text AS medicine_unit,
    tc.days AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'treatment_course' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
JOIN public.treatment_courses tc ON tc.treatment_id = t.id
JOIN public.products p ON tc.product_id = p.id

UNION ALL

-- Medications from planned_medications (from visits - JSONB array)
SELECT 
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), NULLIF(TRIM(t.animal_condition), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    COALESCE(
        t.tests,
        CASE 
            WHEN av.temperature IS NOT NULL 
            THEN 'Temperatūra: ' || av.temperature::text || '°C'
            ELSE NULL
        END
    ) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    (med.value->>'dose')::numeric AS medicine_dose,
    (med.value->>'unit')::text AS medicine_unit,
    COALESCE((med.value->>'days')::integer, 1) AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'planned_medication' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
JOIN public.animal_visits av ON av.id = t.visit_id
CROSS JOIN LATERAL jsonb_array_elements(av.planned_medications) AS med(value)
JOIN public.products p ON p.id = (med.value->>'product_id')::uuid
WHERE av.planned_medications IS NOT NULL 
  AND jsonb_array_length(av.planned_medications) > 0;

COMMENT ON VIEW public.vw_treated_animals_all_farms IS 'Farm-wide treated animals register with temperature from visits, defaults for first_symptoms_date and animal_condition.';

GRANT SELECT ON public.vw_treated_animals_all_farms TO authenticated;
