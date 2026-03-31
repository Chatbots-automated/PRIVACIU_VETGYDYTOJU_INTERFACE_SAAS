-- =====================================================================
-- Add Administration Routes and Outcome Date - Complete Migration
-- =====================================================================
-- Migration: 20260331000001
-- Created: 2026-03-31
--
-- OVERVIEW:
-- This migration adds:
-- 1. Route-specific withdrawal periods for products (i.v, i.m, s.c, i.u, i.mm, p.o.s)
-- 2. Administration route tracking in usage_items and treatment_courses
-- 3. Outcome date field for treatments
-- 4. Updates all views and functions to support these new fields
-- =====================================================================

-- =====================================================================
-- PART 1: Add New Columns to Tables
-- =====================================================================

-- Add route-specific withdrawal columns to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS withdrawal_iv_meat integer,
ADD COLUMN IF NOT EXISTS withdrawal_iv_milk integer,
ADD COLUMN IF NOT EXISTS withdrawal_im_meat integer,
ADD COLUMN IF NOT EXISTS withdrawal_im_milk integer,
ADD COLUMN IF NOT EXISTS withdrawal_sc_meat integer,
ADD COLUMN IF NOT EXISTS withdrawal_sc_milk integer,
ADD COLUMN IF NOT EXISTS withdrawal_iu_meat integer,
ADD COLUMN IF NOT EXISTS withdrawal_iu_milk integer,
ADD COLUMN IF NOT EXISTS withdrawal_imm_meat integer,
ADD COLUMN IF NOT EXISTS withdrawal_imm_milk integer,
ADD COLUMN IF NOT EXISTS withdrawal_pos_meat integer,
ADD COLUMN IF NOT EXISTS withdrawal_pos_milk integer;

COMMENT ON COLUMN public.products.withdrawal_iv_meat IS 'Withdrawal days for meat when administered intravenously (i.v)';
COMMENT ON COLUMN public.products.withdrawal_iv_milk IS 'Withdrawal days for milk when administered intravenously (i.v)';
COMMENT ON COLUMN public.products.withdrawal_im_meat IS 'Withdrawal days for meat when administered intramuscularly (i.m)';
COMMENT ON COLUMN public.products.withdrawal_im_milk IS 'Withdrawal days for milk when administered intramuscularly (i.m)';
COMMENT ON COLUMN public.products.withdrawal_sc_meat IS 'Withdrawal days for meat when administered subcutaneously (s.c)';
COMMENT ON COLUMN public.products.withdrawal_sc_milk IS 'Withdrawal days for milk when administered subcutaneously (s.c)';
COMMENT ON COLUMN public.products.withdrawal_iu_meat IS 'Withdrawal days for meat when administered intrauterine (i.u - į gimdą)';
COMMENT ON COLUMN public.products.withdrawal_iu_milk IS 'Withdrawal days for milk when administered intrauterine (i.u - į gimdą)';
COMMENT ON COLUMN public.products.withdrawal_imm_meat IS 'Withdrawal days for meat when administered intramammary (i.mm - į spenį)';
COMMENT ON COLUMN public.products.withdrawal_imm_milk IS 'Withdrawal days for milk when administered intramammary (i.mm - į spenį)';
COMMENT ON COLUMN public.products.withdrawal_pos_meat IS 'Withdrawal days for meat when administered orally (p.o.s - per burną)';
COMMENT ON COLUMN public.products.withdrawal_pos_milk IS 'Withdrawal days for milk when administered orally (p.o.s - per burną)';

-- Add administration route to usage_items table
ALTER TABLE public.usage_items
ADD COLUMN IF NOT EXISTS administration_route text;

COMMENT ON COLUMN public.usage_items.administration_route IS 'Administration route: iv, im, sc, iu, imm, pos';

-- Add administration route to treatment_courses table
ALTER TABLE public.treatment_courses
ADD COLUMN IF NOT EXISTS administration_route text;

COMMENT ON COLUMN public.treatment_courses.administration_route IS 'Administration route: iv, im, sc, iu, imm, pos';

-- Add outcome_date to treatments table
ALTER TABLE public.treatments
ADD COLUMN IF NOT EXISTS outcome_date date;

COMMENT ON COLUMN public.treatments.outcome_date IS 'Date when the disease ended (ligos baigtis)';

-- =====================================================================
-- PART 2: Update Withdrawal Calculation Function
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

    -- Calculate milk withdrawal using route-specific periods
    WITH course_milk AS (
        SELECT v_reg_date + tc.days + 
            COALESCE(
                CASE tc.administration_route
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
            ) + 1 as wd
        FROM public.treatment_courses tc
        JOIN public.products p ON p.id = tc.product_id
        WHERE tc.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
    ),
    single_milk AS (
        SELECT v_reg_date + 
            COALESCE(
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
            ) + 1 as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
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

    -- Calculate meat withdrawal using route-specific periods
    WITH course_meat AS (
        SELECT v_reg_date + tc.days + 
            COALESCE(
                CASE tc.administration_route
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
            ) + 1 as wd
        FROM public.treatment_courses tc
        JOIN public.products p ON p.id = tc.product_id
        WHERE tc.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
    ),
    single_meat AS (
        SELECT v_reg_date + 
            COALESCE(
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
            ) + 1 as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
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

    UPDATE public.treatments 
    SET withdrawal_until_milk = v_milk_until, 
        withdrawal_until_meat = v_meat_until 
    WHERE id = p_treatment_id;
END;
$$;

COMMENT ON FUNCTION public.calculate_withdrawal_dates(uuid) IS 'Calculates and updates withdrawal dates for milk and meat based on medications used and their administration routes';

-- =====================================================================
-- PART 3: Update Process Visit Medications Trigger Function
-- =====================================================================

CREATE OR REPLACE FUNCTION public.process_visit_medications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_medication jsonb;
  v_treatment_id uuid;
  v_product record;
  v_unit_value text;
  v_requested_qty decimal;
  v_remaining_qty decimal;
  v_batch record;
  v_batch_qty decimal;
  v_total_available decimal;
BEGIN
  -- Only process if status is changing TO "Baigtas" and medications haven't been processed yet
  IF NEW.status = 'Baigtas'
     AND (OLD.status IS NULL OR OLD.status != 'Baigtas')
     AND NEW.planned_medications IS NOT NULL
     AND NOT COALESCE(NEW.medications_processed, false) THEN

    RAISE NOTICE 'Processing medications for visit %', NEW.id;

    -- Get the treatment_id for this visit (if exists)
    SELECT id INTO v_treatment_id
    FROM treatments
    WHERE visit_id = NEW.id
    LIMIT 1;

    -- If no treatment exists yet and this visit requires treatment, create one
    IF v_treatment_id IS NULL AND NEW.treatment_required THEN
      INSERT INTO treatments (
        farm_id,
        animal_id,
        visit_id,
        reg_date,
        vet_name,
        created_by_user_id,
        notes
      ) VALUES (
        NEW.farm_id,
        NEW.animal_id,
        NEW.id,
        DATE(NEW.visit_datetime),
        NEW.vet_name,
        NEW.created_by_user_id,
        'Auto-created from course visit completion'
      )
      RETURNING id INTO v_treatment_id;

      RAISE NOTICE 'Created treatment record %', v_treatment_id;
    END IF;

    -- Process each planned medication
    FOR v_medication IN SELECT * FROM jsonb_array_elements(NEW.planned_medications)
    LOOP
      v_unit_value := v_medication->>'unit';
      v_requested_qty := (v_medication->>'qty')::decimal;

      -- Skip if no quantity specified
      IF v_requested_qty IS NULL OR v_requested_qty <= 0 THEN
        RAISE NOTICE 'Skipping medication with no quantity: %', v_medication->>'product_id';
        CONTINUE;
      END IF;

      -- Get product info
      SELECT * INTO v_product
      FROM products
      WHERE id = (v_medication->>'product_id')::uuid;

      IF NOT FOUND THEN
        RAISE NOTICE 'Product not found: %', v_medication->>'product_id';
        CONTINUE;
      END IF;

      -- Check if batch_id is provided
      IF v_medication->>'batch_id' IS NOT NULL AND v_medication->>'batch_id' != '' THEN
        -- Use the specified batch
        -- NOTE: Stock deduction happens automatically via trigger_update_batch_qty_left trigger
        INSERT INTO usage_items (
          farm_id,
          treatment_id,
          product_id,
          batch_id,
          qty,
          unit,
          purpose,
          administration_route
        ) VALUES (
          NEW.farm_id,
          v_treatment_id,
          (v_medication->>'product_id')::uuid,
          (v_medication->>'batch_id')::uuid,
          v_requested_qty,
          v_unit_value::unit,
          COALESCE(v_medication->>'purpose', 'treatment'),
          v_medication->>'administration_route'
        );

        RAISE NOTICE 'Created usage_item for % % of product % (stock deducted by trigger)', v_requested_qty, v_unit_value, v_product.name;
      ELSE
        RAISE NOTICE 'No batch specified for product %, skipping', v_product.name;
      END IF;
    END LOOP;

    -- Mark medications as processed
    NEW.medications_processed := true;
    RAISE NOTICE 'Medications processed for visit %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.process_visit_medications() IS 'Automatically creates usage_items with administration routes and deducts from batch stock when visit status changes to Baigtas';

-- =====================================================================
-- PART 4: Recreate Views with New Fields
-- =====================================================================

-- Drop all dependent views first
DROP VIEW IF EXISTS public.vw_treated_animals_all_farms CASCADE;
DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;
DROP VIEW IF EXISTS public.treatment_history_view CASCADE;

-- Recreate vw_treated_animals_detailed
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
    TRIM(CONCAT_WS(E'\n',
        CASE WHEN av.temperature IS NOT NULL THEN 'Temperatūra: ' || av.temperature::text || '°C' ELSE NULL END,
        NULLIF(TRIM(t.clinical_diagnosis), ''),
        NULLIF(TRIM(t.tests), '')
    )) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.qty AS medicine_dose,
    ui.unit::text AS medicine_unit,
    ui.administration_route,
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
    t.outcome_date,
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
    TRIM(CONCAT_WS(E'\n',
        CASE WHEN av.temperature IS NOT NULL THEN 'Temperatūra: ' || av.temperature::text || '°C' ELSE NULL END,
        NULLIF(TRIM(t.clinical_diagnosis), ''),
        NULLIF(TRIM(t.tests), '')
    )) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    tc.total_dose AS medicine_dose,
    tc.unit::text AS medicine_unit,
    tc.administration_route,
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
    t.outcome_date,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'treatment_course' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
JOIN public.treatment_courses tc ON tc.treatment_id = t.id
JOIN public.products p ON tc.product_id = p.id;

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals with medication information, including temperature from visits and administration routes';

-- Recreate vw_treated_animals_all_farms
CREATE OR REPLACE VIEW public.vw_treated_animals_all_farms AS
-- Medications from usage_items (one-time usage)
SELECT 
    t.farm_id,
    f.name AS farm_name,
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
    TRIM(CONCAT_WS(E'\n',
        CASE WHEN av.temperature IS NOT NULL THEN 'Temperatūra: ' || av.temperature::text || '°C' ELSE NULL END,
        NULLIF(TRIM(t.clinical_diagnosis), ''),
        NULLIF(TRIM(t.tests), '')
    )) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.qty AS medicine_dose,
    ui.unit::text AS medicine_unit,
    ui.administration_route,
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
    t.outcome_date,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'usage_item' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
JOIN public.usage_items ui ON ui.treatment_id = t.id
JOIN public.products p ON ui.product_id = p.id

UNION ALL

-- Medications from treatment_courses (multi-day courses)
SELECT 
    t.farm_id,
    f.name AS farm_name,
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
    TRIM(CONCAT_WS(E'\n',
        CASE WHEN av.temperature IS NOT NULL THEN 'Temperatūra: ' || av.temperature::text || '°C' ELSE NULL END,
        NULLIF(TRIM(t.clinical_diagnosis), ''),
        NULLIF(TRIM(t.tests), '')
    )) AS tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    tc.total_dose AS medicine_dose,
    tc.unit::text AS medicine_unit,
    tc.administration_route,
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
    t.outcome_date,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'treatment_course' AS medication_source,
    t.created_by_user_id
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
JOIN public.treatment_courses tc ON tc.treatment_id = t.id
JOIN public.products p ON tc.product_id = p.id;

COMMENT ON VIEW public.vw_treated_animals_all_farms IS 'All farms view of treated animals with medication information, including administration routes';

-- Recreate treatment_history_view
CREATE OR REPLACE VIEW public.treatment_history_view AS
SELECT 
    t.id AS treatment_id,
    t.farm_id,
    t.reg_date,
    t.first_symptoms_date,
    t.animal_condition,
    t.tests,
    t.clinical_diagnosis,
    t.outcome,
    t.outcome_date,
    t.services,
    t.vet_name,
    t.notes,
    t.mastitis_teat,
    t.mastitis_type,
    t.sick_teats,
    t.affected_teats,
    t.syringe_count,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.created_at,
    a.id AS animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.holder_name AS owner_name,
    d.id AS disease_id,
    d.code AS disease_code,
    d.name AS disease_name,
    (
        SELECT json_agg(json_build_object(
            'product_name', p.name,
            'quantity', ui.qty,
            'unit', ui.unit,
            'batch_lot', b.lot,
            'administration_route', ui.administration_route
        ))
        FROM public.usage_items ui
        LEFT JOIN public.products p ON ui.product_id = p.id
        LEFT JOIN public.batches b ON ui.batch_id = b.id
        WHERE ui.treatment_id = t.id
    ) AS products_used,
    (
        SELECT json_agg(json_build_object(
            'course_id', tc.id,
            'product_name', p.name,
            'total_dose', tc.total_dose,
            'daily_dose', tc.daily_dose,
            'days', tc.days,
            'unit', tc.unit,
            'start_date', tc.start_date,
            'doses_administered', tc.doses_administered,
            'status', tc.status,
            'batch_lot', b.lot,
            'administration_route', tc.administration_route
        ))
        FROM public.treatment_courses tc
        LEFT JOIN public.products p ON tc.product_id = p.id
        LEFT JOIN public.batches b ON tc.batch_id = b.id
        WHERE tc.treatment_id = t.id
    ) AS treatment_courses
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
ORDER BY t.reg_date DESC, t.created_at DESC;

COMMENT ON VIEW public.treatment_history_view IS 'Comprehensive treatment history with products, courses, and administration routes';
