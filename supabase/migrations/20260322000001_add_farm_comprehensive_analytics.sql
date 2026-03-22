-- =====================================================================
-- Farm Comprehensive Analytics Views
-- =====================================================================
-- Migration: 20260322000001
-- Created: 2026-03-22
--
-- OVERVIEW:
-- This migration creates comprehensive analytics views for individual farms
-- showing all activities: treatments, vaccinations, visits, product usage, costs
-- =====================================================================

-- =====================================================================
-- 1. FARM SUMMARY ANALYTICS
-- =====================================================================
-- Provides high-level summary statistics for each farm

CREATE OR REPLACE VIEW public.vw_farm_summary_analytics AS
SELECT 
    f.id AS farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    
    -- Animal counts
    COUNT(DISTINCT a.id) AS total_animals,
    COUNT(DISTINCT a.id) FILTER (WHERE a.active = true) AS active_animals,
    
    -- Activity counts
    COUNT(DISTINCT t.id) AS total_treatments,
    COUNT(DISTINCT v.id) AS total_vaccinations,
    COUNT(DISTINCT av.id) AS total_visits,
    
    -- Product and disease diversity
    COUNT(DISTINCT ui.product_id) AS unique_products_used,
    COUNT(DISTINCT t.disease_id) FILTER (WHERE t.disease_id IS NOT NULL) AS unique_diseases_treated,
    
    -- Cost summary
    COALESCE(SUM(ui.total_cost), 0) AS total_cost,
    COALESCE(SUM(ui.total_cost) FILTER (WHERE ui.source_table = 'treatments'), 0) AS treatment_cost,
    COALESCE(SUM(ui.total_cost) FILTER (WHERE ui.source_table = 'vaccinations'), 0) AS vaccination_cost,
    
    -- Date ranges
    MIN(t.reg_date) AS first_treatment_date,
    MAX(t.reg_date) AS last_treatment_date,
    MIN(av.visit_datetime) AS first_visit_date,
    MAX(av.visit_datetime) AS last_visit_date
    
FROM public.farms f
LEFT JOIN public.animals a ON f.id = a.farm_id
LEFT JOIN public.treatments t ON f.id = t.farm_id
LEFT JOIN public.vaccinations v ON f.id = v.farm_id
LEFT JOIN public.animal_visits av ON f.id = av.farm_id
LEFT JOIN public.usage_items ui ON f.id = ui.farm_id
GROUP BY f.id, f.name, f.code
ORDER BY f.name;

COMMENT ON VIEW public.vw_farm_summary_analytics IS 'Comprehensive summary statistics for each farm';

-- =====================================================================
-- 2. FARM TREATMENT DETAILS
-- =====================================================================
-- Detailed treatment information per farm

CREATE OR REPLACE VIEW public.vw_farm_treatment_details AS
SELECT 
    t.farm_id,
    t.id AS treatment_id,
    t.reg_date,
    t.first_symptoms_date,
    a.tag_no AS animal_tag,
    a.species,
    d.name AS disease_name,
    d.code AS disease_code,
    t.outcome,
    t.clinical_diagnosis,
    t.vet_name,
    t.withdrawal_until,
    t.withdrawal_until_milk,
    t.withdrawal_until_meat,
    t.mastitis_teat,
    t.mastitis_type,
    
    -- Medication summary
    COUNT(ui.id) AS medication_count,
    COALESCE(SUM(ui.quantity), 0) AS total_medication_quantity,
    COALESCE(SUM(ui.total_cost), 0) AS total_treatment_cost,
    
    -- Medication details as JSON
    json_agg(
        json_build_object(
            'product_name', p.name,
            'quantity', ui.quantity,
            'unit', ui.unit,
            'cost', ui.total_cost,
            'lot', b.lot
        ) ORDER BY ui.created_at
    ) FILTER (WHERE ui.id IS NOT NULL) AS medications_used,
    
    t.created_at,
    t.updated_at
    
FROM public.treatments t
JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.usage_items ui ON t.id = ui.source_id AND ui.source_table = 'treatments'
LEFT JOIN public.products p ON ui.product_id = p.id
LEFT JOIN public.batches b ON ui.batch_id = b.id
GROUP BY 
    t.farm_id, t.id, t.reg_date, t.first_symptoms_date,
    a.tag_no, a.species, d.name, d.code, t.outcome,
    t.clinical_diagnosis, t.vet_name, t.withdrawal_until,
    t.withdrawal_until_milk, t.withdrawal_until_meat,
    t.mastitis_teat, t.mastitis_type, t.created_at, t.updated_at
ORDER BY t.reg_date DESC;

COMMENT ON VIEW public.vw_farm_treatment_details IS 'Detailed treatment records with medication information per farm';

-- =====================================================================
-- 3. FARM VACCINATION DETAILS
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_vaccination_details AS
SELECT 
    v.farm_id,
    v.id AS vaccination_id,
    v.vaccination_date,
    v.next_booster_date,
    a.tag_no AS animal_tag,
    a.species,
    p.name AS product_name,
    p.category,
    v.dose_amount,
    v.unit,
    v.dose_number,
    b.lot,
    b.expiry_date AS batch_expiry,
    v.administered_by,
    v.notes,
    v.created_at
    
FROM public.vaccinations v
JOIN public.animals a ON v.animal_id = a.id
JOIN public.products p ON v.product_id = p.id
LEFT JOIN public.batches b ON v.batch_id = b.id
ORDER BY v.vaccination_date DESC;

COMMENT ON VIEW public.vw_farm_vaccination_details IS 'Detailed vaccination records per farm';

-- =====================================================================
-- 4. FARM VISIT DETAILS
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_visit_details AS
SELECT 
    av.farm_id,
    av.id AS visit_id,
    av.visit_datetime,
    a.tag_no AS animal_tag,
    a.species,
    av.status,
    av.temperature,
    av.temperature_measured_at,
    av.procedures,
    av.vet_name,
    av.notes,
    av.treatment_required,
    av.next_visit_required,
    av.next_visit_date,
    t.id AS related_treatment_id,
    d.name AS related_disease_name,
    av.created_at,
    av.updated_at
    
FROM public.animal_visits av
JOIN public.animals a ON av.animal_id = a.id
LEFT JOIN public.treatments t ON av.related_treatment_id = t.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
ORDER BY av.visit_datetime DESC;

COMMENT ON VIEW public.vw_farm_visit_details IS 'Detailed visit records with related treatment information per farm';

-- =====================================================================
-- 5. FARM PRODUCT USAGE SUMMARY
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_product_usage_summary AS
SELECT 
    ui.farm_id,
    ui.product_id,
    p.name AS product_name,
    p.category,
    p.primary_pack_unit AS unit,
    
    -- Usage statistics
    COUNT(ui.id) AS times_used,
    COUNT(DISTINCT ui.source_id) AS unique_events,
    COALESCE(SUM(ui.quantity), 0) AS total_quantity,
    COALESCE(SUM(ui.total_cost), 0) AS total_cost,
    
    -- Usage by source
    COUNT(ui.id) FILTER (WHERE ui.source_table = 'treatments') AS used_in_treatments,
    COUNT(ui.id) FILTER (WHERE ui.source_table = 'vaccinations') AS used_in_vaccinations,
    COUNT(ui.id) FILTER (WHERE ui.source_table = 'animal_visits') AS used_in_visits,
    
    -- Date range
    MIN(ui.used_at) AS first_used_date,
    MAX(ui.used_at) AS last_used_date,
    
    -- Average usage
    AVG(ui.quantity) AS avg_quantity_per_use,
    AVG(ui.total_cost) AS avg_cost_per_use
    
FROM public.usage_items ui
JOIN public.products p ON ui.product_id = p.id
GROUP BY ui.farm_id, ui.product_id, p.name, p.category, p.primary_pack_unit
ORDER BY times_used DESC;

COMMENT ON VIEW public.vw_farm_product_usage_summary IS 'Product usage statistics aggregated per farm';

-- =====================================================================
-- 6. FARM ANIMAL ACTIVITY SUMMARY
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_animal_activity AS
SELECT 
    a.farm_id,
    a.id AS animal_id,
    a.tag_no,
    a.species,
    a.sex,
    a.breed,
    a.active,
    
    -- Activity counts
    COUNT(DISTINCT t.id) AS treatment_count,
    COUNT(DISTINCT v.id) AS vaccination_count,
    COUNT(DISTINCT av.id) AS visit_count,
    
    -- Cost summary
    COALESCE(SUM(ui.total_cost), 0) AS total_cost,
    
    -- Date ranges
    MIN(t.reg_date) AS first_treatment_date,
    MAX(t.reg_date) AS last_treatment_date,
    MAX(av.visit_datetime) AS last_visit_date,
    
    -- Health indicators
    COUNT(t.id) FILTER (WHERE t.outcome = 'Pasveiko') AS recovered_count,
    COUNT(t.id) FILTER (WHERE t.outcome = 'Gydoma' OR t.outcome IS NULL) AS ongoing_count,
    COUNT(t.id) FILTER (WHERE t.outcome = 'Kritęs') AS deceased_count,
    
    -- Most recent activity timestamp
    GREATEST(
        MAX(t.created_at),
        MAX(v.created_at),
        MAX(av.created_at)
    ) AS last_activity
    
FROM public.animals a
LEFT JOIN public.treatments t ON a.id = t.animal_id
LEFT JOIN public.vaccinations v ON a.id = v.animal_id
LEFT JOIN public.animal_visits av ON a.id = av.animal_id
LEFT JOIN public.usage_items ui ON a.id = ui.animal_id
GROUP BY a.farm_id, a.id, a.tag_no, a.species, a.sex, a.breed, a.active
ORDER BY last_activity DESC NULLS LAST;

COMMENT ON VIEW public.vw_farm_animal_activity IS 'Animal activity summary with treatment, vaccination, and cost data per farm';

-- =====================================================================
-- 7. FARM DISEASE STATISTICS
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_disease_statistics AS
SELECT 
    t.farm_id,
    d.id AS disease_id,
    d.code AS disease_code,
    d.name AS disease_name,
    
    -- Case counts
    COUNT(t.id) AS total_cases,
    COUNT(DISTINCT t.animal_id) AS animals_affected,
    
    -- Outcomes
    COUNT(t.id) FILTER (WHERE t.outcome = 'Pasveiko') AS recovered_cases,
    COUNT(t.id) FILTER (WHERE t.outcome = 'Gydoma' OR t.outcome IS NULL) AS ongoing_cases,
    COUNT(t.id) FILTER (WHERE t.outcome = 'Kritęs') AS deceased_cases,
    
    -- Recovery rate
    ROUND(
        (COUNT(t.id) FILTER (WHERE t.outcome = 'Pasveiko')::numeric / 
        NULLIF(COUNT(t.id), 0) * 100), 
        1
    ) AS recovery_rate_percent,
    
    -- Cost
    COALESCE(SUM(ui.total_cost), 0) AS total_treatment_cost,
    COALESCE(AVG(ui.total_cost), 0) AS avg_cost_per_case,
    
    -- Dates
    MIN(t.reg_date) AS first_case_date,
    MAX(t.reg_date) AS last_case_date
    
FROM public.treatments t
JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.usage_items ui ON t.id = ui.source_id AND ui.source_table = 'treatments'
GROUP BY t.farm_id, d.id, d.code, d.name
ORDER BY total_cases DESC;

COMMENT ON VIEW public.vw_farm_disease_statistics IS 'Disease occurrence and treatment outcome statistics per farm';

-- =====================================================================
-- 8. FARM MONTHLY ACTIVITY TIMELINE
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_monthly_activity AS
SELECT 
    f.id AS farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    date_trunc('month', activity_date)::date AS month,
    
    COUNT(*) FILTER (WHERE activity_type = 'treatment') AS treatments,
    COUNT(*) FILTER (WHERE activity_type = 'vaccination') AS vaccinations,
    COUNT(*) FILTER (WHERE activity_type = 'visit') AS visits,
    
    COALESCE(SUM(cost), 0) AS total_cost
    
FROM public.farms f
CROSS JOIN LATERAL (
    SELECT t.reg_date AS activity_date, 'treatment' AS activity_type, ui.total_cost AS cost
    FROM public.treatments t
    LEFT JOIN public.usage_items ui ON t.id = ui.source_id AND ui.source_table = 'treatments'
    WHERE t.farm_id = f.id
    
    UNION ALL
    
    SELECT v.vaccination_date AS activity_date, 'vaccination' AS activity_type, 0 AS cost
    FROM public.vaccinations v
    WHERE v.farm_id = f.id
    
    UNION ALL
    
    SELECT av.visit_datetime::date AS activity_date, 'visit' AS activity_type, 0 AS cost
    FROM public.animal_visits av
    WHERE av.farm_id = f.id
) activities
GROUP BY f.id, f.name, f.code, date_trunc('month', activity_date)
ORDER BY f.name, month DESC;

COMMENT ON VIEW public.vw_farm_monthly_activity IS 'Monthly activity timeline showing treatments, vaccinations, and visits per farm';

-- =====================================================================
-- 9. FARM ALLOCATED STOCK SUMMARY
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_allocated_stock_summary AS
SELECT 
    f.id AS farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    p.id AS product_id,
    p.name AS product_name,
    p.category,
    p.primary_pack_unit AS unit,
    
    -- Allocation summary
    COUNT(fsa.id) AS allocation_count,
    COALESCE(SUM(fsa.allocated_qty), 0) AS total_allocated_qty,
    
    -- Usage summary
    COUNT(ui.id) AS usage_count,
    COALESCE(SUM(ui.quantity), 0) AS total_used_qty,
    
    -- Remaining stock (allocated - used)
    COALESCE(SUM(fsa.allocated_qty), 0) - COALESCE(SUM(ui.quantity), 0) AS qty_remaining,
    
    -- Cost
    COALESCE(SUM(wb.purchase_price * (fsa.allocated_qty / NULLIF(wb.received_qty, 0))), 0) AS total_allocated_value,
    COALESCE(SUM(ui.total_cost), 0) AS total_used_value,
    
    -- Dates
    MAX(fsa.allocation_date) AS last_allocation_date,
    MAX(ui.used_at) AS last_used_date
    
FROM public.farms f
CROSS JOIN public.products p
LEFT JOIN public.farm_stock_allocations fsa ON f.id = fsa.farm_id AND p.id = fsa.product_id
LEFT JOIN public.warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
LEFT JOIN public.usage_items ui ON f.id = ui.farm_id AND p.id = ui.product_id
WHERE fsa.id IS NOT NULL OR ui.id IS NOT NULL
GROUP BY f.id, f.name, f.code, p.id, p.name, p.category, p.primary_pack_unit
ORDER BY f.name, total_used_qty DESC;

COMMENT ON VIEW public.vw_farm_allocated_stock_summary IS 'Stock allocation and usage summary per farm and product';

-- =====================================================================
-- 10. FARM VETERINARIAN ACTIVITY
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_farm_veterinarian_activity AS
SELECT 
    farm_id,
    vet_name,
    
    -- Activity counts
    COUNT(*) FILTER (WHERE activity_type = 'treatment') AS treatment_count,
    COUNT(*) FILTER (WHERE activity_type = 'vaccination') AS vaccination_count,
    COUNT(*) FILTER (WHERE activity_type = 'visit') AS visit_count,
    COUNT(*) AS total_activities,
    
    -- Unique animals treated
    COUNT(DISTINCT animal_id) AS animals_treated,
    
    -- Date range
    MIN(activity_date) AS first_activity,
    MAX(activity_date) AS last_activity
    
FROM (
    SELECT 
        t.farm_id,
        t.vet_name,
        t.animal_id,
        t.reg_date AS activity_date,
        'treatment' AS activity_type
    FROM public.treatments t
    WHERE t.vet_name IS NOT NULL
    
    UNION ALL
    
    SELECT 
        v.farm_id,
        v.administered_by AS vet_name,
        v.animal_id,
        v.vaccination_date AS activity_date,
        'vaccination' AS activity_type
    FROM public.vaccinations v
    WHERE v.administered_by IS NOT NULL
    
    UNION ALL
    
    SELECT 
        av.farm_id,
        av.vet_name,
        av.animal_id,
        av.visit_datetime::date AS activity_date,
        'visit' AS activity_type
    FROM public.animal_visits av
    WHERE av.vet_name IS NOT NULL
) vet_activities
WHERE vet_name IS NOT NULL AND vet_name != ''
GROUP BY farm_id, vet_name
ORDER BY total_activities DESC;

COMMENT ON VIEW public.vw_farm_veterinarian_activity IS 'Veterinarian activity statistics per farm';

-- =====================================================================
-- 11. GRANT PERMISSIONS
-- =====================================================================

GRANT SELECT ON public.vw_farm_summary_analytics TO authenticated;
GRANT SELECT ON public.vw_farm_treatment_details TO authenticated;
GRANT SELECT ON public.vw_farm_vaccination_details TO authenticated;
GRANT SELECT ON public.vw_farm_visit_details TO authenticated;
GRANT SELECT ON public.vw_farm_allocated_stock_summary TO authenticated;
GRANT SELECT ON public.vw_farm_veterinarian_activity TO authenticated;
