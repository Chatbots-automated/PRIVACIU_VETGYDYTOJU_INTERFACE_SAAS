-- =====================================================================
-- Update Report Views for Multi-Tenancy
-- =====================================================================
-- This migration updates the report views to include farm_id and match
-- the column names expected by the Reports component.

-- Drop existing views
DROP VIEW IF EXISTS public.vw_vet_drug_journal CASCADE;
DROP VIEW IF EXISTS public.vw_biocide_journal CASCADE;
DROP VIEW IF EXISTS public.vw_medical_waste CASCADE;
DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;

-- =====================================================================
-- Veterinary Drug Journal View
-- =====================================================================
CREATE OR REPLACE VIEW public.vw_vet_drug_journal AS
SELECT 
    b.farm_id,
    b.id AS batch_id,
    b.product_id,
    b.created_at AS receipt_date,
    p.name AS product_name,
    p.registration_code,
    p.active_substance,
    s.name AS supplier_name,
    b.lot AS batch_number,
    b.mfg_date AS manufacture_date,
    b.expiry_date,
    b.received_qty AS quantity_received,
    p.primary_pack_unit AS unit,
    COALESCE((
        SELECT SUM(ui.qty)
        FROM public.usage_items ui
        WHERE ui.batch_id = b.id
    ), 0) AS quantity_used,
    (b.received_qty - COALESCE((
        SELECT SUM(ui.qty)
        FROM public.usage_items ui
        WHERE ui.batch_id = b.id
    ), 0)) AS quantity_remaining,
    b.doc_number AS invoice_number,
    b.doc_date AS invoice_date,
    'Invoice' AS doc_title
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.suppliers s ON b.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention')
ORDER BY b.created_at DESC;

COMMENT ON VIEW public.vw_vet_drug_journal IS 'Veterinary drug journal with batch tracking and usage calculations';

-- =====================================================================
-- Biocide Journal View
-- =====================================================================
CREATE OR REPLACE VIEW public.vw_biocide_journal AS
SELECT 
    bu.farm_id,
    bu.id AS entry_id,
    bu.product_id,
    bu.use_date,
    p.name AS biocide_name,
    p.registration_code,
    p.active_substance,
    bu.purpose,
    bu.work_scope,
    bu.qty AS quantity_used,
    bu.unit,
    b.lot AS batch_number,
    b.expiry_date AS batch_expiry,
    bu.used_by_name AS applied_by,
    bu.created_at AS logged_at
FROM public.biocide_usage bu
JOIN public.products p ON bu.product_id = p.id
LEFT JOIN public.batches b ON bu.batch_id = b.id
WHERE p.category = 'biocide'
ORDER BY bu.use_date DESC;

COMMENT ON VIEW public.vw_biocide_journal IS 'Biocide usage journal for regulatory compliance';

-- =====================================================================
-- Medical Waste View
-- =====================================================================
CREATE OR REPLACE VIEW public.vw_medical_waste AS
SELECT 
    mw.farm_id,
    mw.id AS entry_id,
    mw.waste_code,
    mw.name AS waste_type,
    mw.period AS reporting_period,
    mw.date AS record_date,
    mw.qty_generated AS quantity_generated,
    mw.qty_transferred AS quantity_transferred,
    mw.carrier AS waste_carrier,
    mw.processor AS waste_processor,
    mw.transfer_date,
    mw.doc_no AS transfer_document,
    mw.responsible AS responsible_person,
    mw.created_at AS logged_at
FROM public.medical_waste mw
ORDER BY mw.date DESC;

COMMENT ON VIEW public.vw_medical_waste IS 'Medical waste tracking with source details';

-- =====================================================================
-- Treated Animals Detailed View
-- =====================================================================
-- This view combines medications from three sources:
-- 1. usage_items (one-time usage)
-- 2. treatment_courses (multi-day courses)
-- 3. planned_medications from visits (planned but not yet executed)

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
    t.animal_condition,
    t.first_symptoms_date,
    t.tests,
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
    'usage_item' AS medication_source
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
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
    t.animal_condition,
    t.first_symptoms_date,
    t.tests,
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
    'treatment_course' AS medication_source
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
JOIN public.treatment_courses tc ON tc.treatment_id = t.id
JOIN public.products p ON tc.product_id = p.id

UNION ALL

-- Medications from planned_medications (from visits)
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
    t.animal_condition,
    t.first_symptoms_date,
    t.tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    (med.value->>'qty')::numeric AS medicine_dose,
    med.value->>'unit' AS medicine_unit,
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
    'planned_medication' AS medication_source
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
JOIN public.animal_visits av ON av.id = t.visit_id
CROSS JOIN LATERAL jsonb_array_elements(av.planned_medications) AS med(value)
JOIN public.products p ON p.id = (med.value->>'product_id')::uuid
WHERE av.planned_medications IS NOT NULL 
  AND jsonb_array_length(av.planned_medications) > 0

ORDER BY registration_date DESC, created_at DESC;

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals with one row per medication. Disease is NEVER NULL. Treatment duration calculated from treatment courses.';
