-- =====================================================================
-- Update Treated Animals View with Signature Columns (SAAS VERSION)
-- =====================================================================
-- Created: 2026-04-30
-- Description:
--   Updates vw_treated_animals_detailed to include signature columns
--   for the official GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS
--   Based on SAAS multi-tenant schema
-- =====================================================================

-- Drop and recreate views
DROP VIEW IF EXISTS public.vw_treated_animals_all_farms CASCADE;
DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;

-- Create detailed view with signature columns
CREATE VIEW public.vw_treated_animals_detailed AS
SELECT
    t.client_id,
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    COALESCE(ui.administered_date, t.reg_date) AS registration_date,
    t.reg_date AS treatment_start_date,
    av.visit_datetime AS visit_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date::date)) AS age_years,
    EXTRACT(YEAR FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, DATE(av.visit_datetime), t.reg_date) AS first_symptoms_date,
    CASE
        WHEN av.temperature IS NOT NULL AND t.tests IS NOT NULL
        THEN av.temperature::text || ' °C' || E'\n' || t.tests
        WHEN av.temperature IS NOT NULL
        THEN av.temperature::text || ' °C'
        WHEN t.tests IS NOT NULL
        THEN t.tests
        ELSE NULL
    END AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    p.name AS product_name,
    p.category AS product_category,
    p.registration_code,
    p.active_substance,
    ui.product_id,
    ui.quantity,
    ui.quantity AS medicine_dose,
    ui.unit,
    ui.unit::text AS medicine_unit,
    ui.administration_route,
    1 AS days,
    1 AS medicine_days,
    b.lot AS batch_number,
    -- NEW: Formatted prescription text
    CONCAT(
        'Rp.: ', p.name, E'\n',
        'D.t.d.N ', ui.quantity::text, ' ', ui.unit, E'\n',
        'S. ', COALESCE(ui.administration_route, '-'), ' skirta ', ui.quantity::text, ' ', ui.unit
    ) AS prescription_text,
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
    t.outcome_date,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'usage_item' AS medication_source,
    -- NEW: Signature columns
    t.owner_signature_status,
    t.owner_signature_token,
    t.owner_signed_at,
    t.vet_signed_at,
    -- Signature display text for Column 14 (Owner)
    CASE 
        WHEN t.owner_signature_status = 'verified' THEN 
            'Pasirašyta ' || to_char(t.owner_signed_at, 'YYYY-MM-DD HH24:MI')
        WHEN t.owner_signature_status = 'pending' THEN 
            'Laukiama parašo'
        WHEN t.owner_signature_status = 'declined' THEN 
            'Atsisakyta pasirašyti'
        ELSE 
            '-'
    END AS owner_signature_display,
    -- Signature display text for Column 15 (Vet)
    'Pasirašyta' AS vet_signature_display
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
LEFT JOIN public.products p ON ui.product_id = p.id
LEFT JOIN public.batches b ON ui.batch_id = b.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id;

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals with medications, withdrawal periods, formatted prescription text, and signature columns';

-- Recreate all farms view
CREATE VIEW public.vw_treated_animals_all_farms AS
SELECT
    client_id,
    farm_id,
    treatment_id,
    animal_id,
    disease_id,
    registration_date,
    treatment_start_date,
    visit_date,
    created_at,
    animal_tag,
    species,
    sex,
    birth_date,
    age_years,
    age_months,
    owner_name,
    owner_address,
    disease_name,
    disease_code,
    clinical_diagnosis,
    animal_condition,
    first_symptoms_date,
    tests,
    services,
    medicine_name,
    medicine_id,
    product_name,
    product_category,
    registration_code,
    active_substance,
    product_id,
    quantity,
    medicine_dose,
    unit,
    medicine_unit,
    administration_route,
    days,
    medicine_days,
    batch_number,
    prescription_text,
    withdrawal_until_meat,
    withdrawal_until_milk,
    withdrawal_days_meat,
    withdrawal_days_milk,
    treatment_outcome,
    outcome_date,
    veterinarian,
    notes,
    medication_source,
    -- NEW: Signature columns
    owner_signature_status,
    owner_signature_token,
    owner_signed_at,
    vet_signed_at,
    owner_signature_display,
    vet_signature_display
FROM public.vw_treated_animals_detailed;

COMMENT ON VIEW public.vw_treated_animals_all_farms IS 'All farms view of treated animals with signature columns - used by AllFarmsReports component';
