-- =====================================================================
-- FIX ALL JOURNAL DISPLAY ISSUES
-- =====================================================================
-- Description: Fix withdrawal report showing days, and ensure all journal
--              views use correct usage calculations
-- Created: 2026-05-23
-- =====================================================================

-- =====================================================================
-- 1. FIX VACCINATION TRIGGER - Only set vaccination_id, not treatment_id
-- =====================================================================
-- This fixes the "usage_items_single_parent" constraint violation
CREATE OR REPLACE FUNCTION public.create_usage_item_from_vaccination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only create usage_item if batch_id OR warehouse_batch_id is provided
    IF (NEW.batch_id IS NOT NULL OR NEW.warehouse_batch_id IS NOT NULL) 
       AND NEW.dose_amount IS NOT NULL 
       AND NEW.dose_amount > 0 THEN
        
        -- Create usage_item for the vaccination
        -- NOTE: Only set vaccination_id as parent (not treatment_id) to satisfy usage_items_single_parent constraint
        INSERT INTO public.usage_items (
            client_id,
            farm_id,
            product_id,
            batch_id,
            warehouse_batch_id,
            quantity,
            unit,
            vaccination_id,
            administered_date,
            created_at
        ) VALUES (
            NEW.client_id,
            NEW.farm_id,
            NEW.product_id,
            NEW.batch_id, -- NULL if from warehouse
            NEW.warehouse_batch_id, -- NULL if from farm
            NEW.dose_amount,
            NEW.unit,
            NEW.id,
            NEW.vaccination_date,
            NEW.created_at
        );

        RAISE NOTICE 'Created usage_item for vaccination %. Product: %, Batch: % / Warehouse: %, Qty: % %',
            NEW.id, NEW.product_id, NEW.batch_id, NEW.warehouse_batch_id, NEW.dose_amount, NEW.unit;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_usage_from_vaccination ON public.vaccinations;

CREATE TRIGGER create_usage_from_vaccination 
AFTER INSERT ON public.vaccinations
FOR EACH ROW 
EXECUTE FUNCTION public.create_usage_item_from_vaccination();

GRANT EXECUTE ON FUNCTION public.create_usage_item_from_vaccination() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_usage_item_from_vaccination() TO anon;

-- =====================================================================
-- 2. FIX WITHDRAWAL REPORT - Add column aliases and include vaccines
-- =====================================================================
DROP VIEW IF EXISTS public.vw_withdrawal_report CASCADE;

CREATE VIEW public.vw_withdrawal_report AS
SELECT
    t.client_id,
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    f.is_eco_farm,
    t.id AS treatment_id,
    t.animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    t.reg_date AS treatment_date,
    -- Original withdrawal dates
    t.withdrawal_until_meat AS withdrawal_until_meat_original,
    t.withdrawal_until_milk AS withdrawal_until_milk_original,
    -- Eco-farm adjusted withdrawal dates
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN
                    CASE
                        WHEN (t.withdrawal_until_meat - CURRENT_DATE) = 0
                        THEN (CURRENT_DATE + INTERVAL '2 days')::date
                        ELSE (t.reg_date + ((t.withdrawal_until_meat - t.reg_date) * 2) * INTERVAL '1 day')::date
                    END
                ELSE (CURRENT_DATE + INTERVAL '2 days')::date
            END
        ELSE t.withdrawal_until_meat
    END AS withdrawal_until_meat,
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN
                    CASE
                        WHEN (t.withdrawal_until_milk - CURRENT_DATE) = 0
                        THEN (CURRENT_DATE + INTERVAL '2 days')::date
                        ELSE (t.reg_date + ((t.withdrawal_until_milk - t.reg_date) * 2) * INTERVAL '1 day')::date
                    END
                ELSE (CURRENT_DATE + INTERVAL '2 days')::date
            END
        ELSE t.withdrawal_until_milk
    END AS withdrawal_until_milk,
    -- Withdrawal days remaining (meat)
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL THEN
            GREATEST(0,
                CASE
                    WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN
                        CASE
                            WHEN (t.withdrawal_until_meat - CURRENT_DATE) = 0
                            THEN 2
                            ELSE ((t.withdrawal_until_meat - t.reg_date) * 2) - (CURRENT_DATE - t.reg_date)
                        END
                    ELSE 2
                END
            )
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
            (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    -- Withdrawal days remaining (milk)
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL THEN
            GREATEST(0,
                CASE
                    WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN
                        CASE
                            WHEN (t.withdrawal_until_milk - CURRENT_DATE) = 0
                            THEN 2
                            ELSE ((t.withdrawal_until_milk - t.reg_date) * 2) - (CURRENT_DATE - t.reg_date)
                        END
                    ELSE 2
                END
            )
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
            (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    -- Add aliases for component compatibility
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL THEN
            GREATEST(0,
                CASE
                    WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN
                        CASE
                            WHEN (t.withdrawal_until_meat - CURRENT_DATE) = 0
                            THEN 2
                            ELSE ((t.withdrawal_until_meat - t.reg_date) * 2) - (CURRENT_DATE - t.reg_date)
                        END
                    ELSE 2
                END
            )
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
            (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS days_until_meat_ok,
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL THEN
            GREATEST(0,
                CASE
                    WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN
                        CASE
                            WHEN (t.withdrawal_until_milk - CURRENT_DATE) = 0
                            THEN 2
                            ELSE ((t.withdrawal_until_milk - t.reg_date) * 2) - (CURRENT_DATE - t.reg_date)
                        END
                    ELSE 2
                END
            )
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
            (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS days_until_milk_ok,
    COALESCE(d.name, t.clinical_diagnosis, 'Nenurodyta') AS disease_name,
    t.vet_name AS veterinarian,
    t.notes,
    -- Get medicines used in this treatment (includes both regular medicines and vaccines)
    (
        SELECT string_agg(DISTINCT med_info, ', ')
        FROM (
            -- Direct usage items linked to treatment
            SELECT p.name || ' ' || COALESCE(ui.quantity::text || ' ' || p.primary_pack_unit, '') as med_info
            FROM public.usage_items ui
            JOIN public.products p ON ui.product_id = p.id
            WHERE ui.treatment_id = t.id
            
            UNION ALL
            
            -- Vaccinations linked to treatment
            SELECT p.name || ' ' || COALESCE(v.dose_amount::text || ' ' || v.unit::text, '') as med_info
            FROM public.vaccinations v
            JOIN public.products p ON v.product_id = p.id
            WHERE v.treatment_id = t.id
        ) AS all_meds
    ) AS medicines_used,
    -- Get medicine name (for compatibility)
    COALESCE(
        (SELECT p.name FROM public.usage_items ui JOIN public.products p ON ui.product_id = p.id WHERE ui.treatment_id = t.id LIMIT 1),
        (SELECT p.name FROM public.vaccinations v JOIN public.products p ON v.product_id = p.id WHERE v.treatment_id = t.id LIMIT 1)
    ) AS medicine_name,
    -- Get dose info
    COALESCE(
        (SELECT ui.quantity FROM public.usage_items ui WHERE ui.treatment_id = t.id LIMIT 1),
        (SELECT v.dose_amount FROM public.vaccinations v WHERE v.treatment_id = t.id LIMIT 1)
    ) AS dose,
    -- Get unit (cast both to text for compatibility)
    COALESCE(
        (SELECT p.primary_pack_unit::text FROM public.usage_items ui JOIN public.products p ON ui.product_id = p.id WHERE ui.treatment_id = t.id LIMIT 1),
        (SELECT v.unit::text FROM public.vaccinations v WHERE v.treatment_id = t.id LIMIT 1)
    ) AS unit,
    t.vet_name,
    t.created_at,
    t.updated_at
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id;

COMMENT ON VIEW public.vw_withdrawal_report IS 'Withdrawal periods report with eco-farm adjustments and component-compatible column aliases (multi-tenant)';

-- =====================================================================
-- 3. FIX VW_TREATED_ANIMALS_DETAILED TO INCLUDE VACCINES
-- =====================================================================
-- This view needs to show both regular medicines AND vaccines
DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;

CREATE VIEW public.vw_treated_animals_detailed AS
-- Regular medicines from usage_items
SELECT
    t.client_id,
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    COALESCE(ui.administered_date, t.reg_date) AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    t.tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.quantity AS medicine_dose,
    ui.unit::text AS medicine_unit,
    ui.administration_route,
    1 AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.outcome,
    t.notes,
    t.vet_name,
    t.updated_at
FROM public.treatments t
LEFT JOIN public.usage_items ui ON t.id = ui.treatment_id
LEFT JOIN public.products p ON ui.product_id = p.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
WHERE p.category IN ('medicines', 'prevention') OR p.category IS NULL

UNION ALL

-- Vaccines from vaccinations table (linked to treatments)
SELECT
    t.client_id,
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    COALESCE(v.vaccination_date::timestamp, t.reg_date) AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(v.vaccination_date, t.reg_date::date), a.birth_date::date)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(v.vaccination_date, t.reg_date::date), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), 'Vakcinacija') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    t.tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    v.dose_amount AS medicine_dose,
    v.unit::text AS medicine_unit,
    NULL AS administration_route,
    1 AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.outcome,
    t.notes,
    t.vet_name,
    t.updated_at
FROM public.treatments t
JOIN public.vaccinations v ON t.id = v.treatment_id
LEFT JOIN public.products p ON v.product_id = p.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
WHERE p.category = 'vakcina';

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals including vaccines for veterinary reports (multi-tenant)';

-- =====================================================================
-- 3B. CREATE VW_TREATED_ANIMALS_ALL_FARMS (for accounting module)
-- =====================================================================
-- This is similar to vw_treated_animals_detailed but for cross-farm reports
DROP VIEW IF EXISTS public.vw_treated_animals_all_farms CASCADE;

CREATE VIEW public.vw_treated_animals_all_farms AS
-- Regular medicines from usage_items
SELECT
    t.client_id,
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    COALESCE(ui.administered_date, t.reg_date) AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    t.first_symptoms_date,
    t.tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.quantity AS medicine_dose,
    ui.unit::text AS medicine_unit,
    1 AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
            (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
            (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.vet_name,
    t.outcome,
    t.outcome_date
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
LEFT JOIN public.products p ON ui.product_id = p.id
WHERE p.category IN ('medicines', 'prevention') OR p.category IS NULL

UNION ALL

-- Vaccines from vaccinations table
SELECT
    t.client_id,
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    COALESCE(v.vaccination_date::timestamp, t.reg_date) AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(v.vaccination_date, t.reg_date::date), a.birth_date::date)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(v.vaccination_date, t.reg_date::date), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), 'Vakcinacija') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    t.first_symptoms_date,
    t.tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    v.dose_amount AS medicine_dose,
    v.unit::text AS medicine_unit,
    1 AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
            (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
            (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.vet_name,
    t.outcome,
    t.outcome_date
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
JOIN public.vaccinations v ON t.id = v.treatment_id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.products p ON v.product_id = p.id
WHERE p.category = 'vakcina';

COMMENT ON VIEW public.vw_treated_animals_all_farms IS 'Treated animals register across all farms including vaccines (for accounting module)';

-- =====================================================================
-- 4. ENSURE VW_VET_DRUG_JOURNAL_COMPLETE IS CORRECT
-- =====================================================================
-- This view is already created in 20260519000003, but let's verify it's correct
DROP VIEW IF EXISTS public.vw_vet_drug_journal_complete CASCADE;

CREATE OR REPLACE VIEW public.vw_vet_drug_journal_complete AS
-- =====================================================================
-- FARM BATCHES
-- =====================================================================
SELECT
  b.id as batch_id,
  b.product_id,
  b.farm_id,
  b.client_id,
  p.name as product_name,
  p.registration_code,
  p.primary_pack_unit,
  p.category as product_category,
  b.lot as batch_number,
  b.expiry_date,
  b.received_date,
  b.qty_received as quantity_received,
  b.qty_left as quantity_left,
  b.purchase_price,
  b.purchase_price as purchase_price_with_vat,
  COALESCE(s.name, '') as supplier,
  COALESCE(b.doc_number, i.invoice_number) as document_number,
  'farm' as source,
  -- Calculate usage: use tracked usage if available, otherwise calculate from stock difference
  GREATEST(
    COALESCE(
      (SELECT SUM(quantity) FROM usage_items WHERE batch_id = b.id),
      0
    ) +
    COALESCE(
      (SELECT SUM(quantity_used) FROM biocide_usage WHERE batch_id = b.id),
      0
    ),
    b.qty_received - COALESCE(b.qty_left, 0)
  ) as quantity_used
FROM batches b
JOIN products p ON b.product_id = p.id
LEFT JOIN suppliers s ON b.supplier_id = s.id
LEFT JOIN invoices i ON b.invoice_id = i.id
WHERE p.category IN ('medicines', 'prevention', 'vakcina', 'biocide')

UNION ALL

-- =====================================================================
-- WAREHOUSE BATCHES
-- =====================================================================
SELECT
  wb.id as batch_id,
  wb.product_id,
  NULL as farm_id,
  wb.client_id,
  p.name as product_name,
  p.registration_code,
  p.primary_pack_unit,
  p.category as product_category,
  wb.lot as batch_number,
  wb.expiry_date,
  wb.doc_date as received_date,
  wb.received_qty as quantity_received,
  wb.qty_left as quantity_left,
  wb.purchase_price,
  wb.purchase_price as purchase_price_with_vat,
  COALESCE(s.name, '') as supplier,
  COALESCE(wb.doc_number, i.invoice_number) as document_number,
  'warehouse' as source,
  -- Calculate usage: use tracked usage if available, otherwise calculate from stock difference
  GREATEST(
    COALESCE(
      (SELECT SUM(quantity) FROM usage_items WHERE warehouse_batch_id = wb.id),
      0
    ) +
    COALESCE(
      (SELECT SUM(quantity_used) FROM biocide_usage WHERE warehouse_batch_id = wb.id),
      0
    ),
    wb.received_qty - COALESCE(wb.qty_left, 0)
  ) as quantity_used
FROM warehouse_batches wb
JOIN products p ON wb.product_id = p.id
LEFT JOIN suppliers s ON wb.supplier_id = s.id
LEFT JOIN invoices i ON wb.invoice_id = i.id
WHERE p.category IN ('medicines', 'prevention', 'vakcina', 'biocide');

COMMENT ON VIEW public.vw_vet_drug_journal_complete IS 'Comprehensive view of both farm and warehouse batches with usage calculations for journal reports';

-- =====================================================================
-- 5. GRANT PERMISSIONS
-- =====================================================================
GRANT SELECT ON public.vw_treated_animals_detailed TO authenticated;
GRANT SELECT ON public.vw_treated_animals_detailed TO anon;
GRANT SELECT ON public.vw_treated_animals_all_farms TO authenticated;
GRANT SELECT ON public.vw_treated_animals_all_farms TO anon;
GRANT SELECT ON public.vw_withdrawal_report TO authenticated;
GRANT SELECT ON public.vw_withdrawal_report TO anon;
GRANT SELECT ON public.vw_vet_drug_journal_complete TO authenticated;
GRANT SELECT ON public.vw_vet_drug_journal_complete TO anon;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Fixed journal display issues:';
    RAISE NOTICE '   - Fixed vaccination trigger - no more "usage_items_single_parent" constraint violation';
    RAISE NOTICE '   - Treated animals journal (vw_treated_animals_detailed) now includes vaccines';
    RAISE NOTICE '   - Created vw_treated_animals_all_farms for accounting module';
    RAISE NOTICE '   - Withdrawal report now shows karencija days and includes vaccines';
    RAISE NOTICE '   - Stock balance shows correct sunaudota quantity';
    RAISE NOTICE '   - Write-off act shows all used medicines including vaccines';
    RAISE NOTICE '   - Bulk vaccination now works correctly!';
    RAISE NOTICE '   - All journals in both Veterinarija and Apskaita modules now show vaccines!';
END $$;
