-- Add administered_date to usage_items to track when medication was actually given
-- This allows treatment courses to show different dates for each day's medications
ALTER TABLE public.usage_items ADD COLUMN IF NOT EXISTS administered_date date;

COMMENT ON COLUMN public.usage_items.administered_date IS 'Date when medication was actually administered (for treatment courses with multiple days)';

-- Update existing usage_items to set administered_date from treatment reg_date
UPDATE public.usage_items ui
SET administered_date = t.reg_date
FROM public.treatments t
WHERE ui.treatment_id = t.id AND ui.administered_date IS NULL;

-- Update process_visit_medications function to include administered_date
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

    -- If no treatment exists, try to get it from related_treatment_id
    IF v_treatment_id IS NULL AND NEW.related_treatment_id IS NOT NULL THEN
      v_treatment_id := NEW.related_treatment_id;
    END IF;

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
          administration_route,
          administered_date
        ) VALUES (
          NEW.farm_id,
          v_treatment_id,
          (v_medication->>'product_id')::uuid,
          (v_medication->>'batch_id')::uuid,
          v_requested_qty,
          v_unit_value::unit,
          COALESCE(v_medication->>'purpose', 'treatment'),
          v_medication->>'administration_route',
          DATE(NEW.visit_datetime)
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

COMMENT ON FUNCTION public.process_visit_medications() IS 'Automatically creates usage_items with administration routes and administered_date when visit status changes to Baigtas';

-- Update vw_treated_animals_detailed to use administered_date for registration_date
DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;

CREATE OR REPLACE VIEW public.vw_treated_animals_detailed AS
-- Medications from usage_items (one-time usage)
SELECT 
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

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals with medication details. Uses administered_date from usage_items for accurate date tracking in multi-day courses';

-- Recreate dependent view
DROP VIEW IF EXISTS public.vw_treated_animals_all_farms CASCADE;

CREATE OR REPLACE VIEW public.vw_treated_animals_all_farms AS
SELECT * FROM public.vw_treated_animals_detailed;

COMMENT ON VIEW public.vw_treated_animals_all_farms IS 'All farms treated animals view for Vetpraktika UAB cross-farm reporting';
