-- =====================================================================
-- Add User Tracking to Treatments and Other Tables
-- =====================================================================
-- This migration adds user tracking to treatments and other relevant tables

-- Add created_by_user_id to treatments
ALTER TABLE public.treatments
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.treatments.created_by_user_id IS 'User who created this treatment record';

-- Add created_by_user_id to vaccinations
ALTER TABLE public.vaccinations
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.vaccinations.created_by_user_id IS 'User who created this vaccination record';

-- Add created_by_user_id to animal_visits
ALTER TABLE public.animal_visits
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.animal_visits.created_by_user_id IS 'User who created this visit record';

-- Update the treated animals view to use user's full_name from users table
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
    COALESCE(u.full_name, t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'usage_item' AS medication_source
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.users u ON t.created_by_user_id = u.id
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
    COALESCE(u.full_name, t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'treatment_course' AS medication_source
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.users u ON t.created_by_user_id = u.id
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
    COALESCE(u.full_name, t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes,
    'planned_medication' AS medication_source
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.users u ON t.created_by_user_id = u.id
JOIN public.animal_visits av ON av.id = t.visit_id
CROSS JOIN LATERAL jsonb_array_elements(av.planned_medications) AS med(value)
JOIN public.products p ON p.id = (med.value->>'product_id')::uuid
WHERE av.planned_medications IS NOT NULL 
  AND jsonb_array_length(av.planned_medications) > 0

ORDER BY registration_date DESC, created_at DESC;

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals with one row per medication. Veterinarian name comes from users table via created_by_user_id.';

-- Update process_visit_medications function to set created_by_user_id
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
        INSERT INTO usage_items (
          farm_id,
          treatment_id,
          product_id,
          batch_id,
          qty,
          unit,
          purpose
        ) VALUES (
          NEW.farm_id,
          v_treatment_id,
          (v_medication->>'product_id')::uuid,
          (v_medication->>'batch_id')::uuid,
          v_requested_qty,
          v_unit_value,
          COALESCE(v_medication->>'purpose', 'treatment')
        );

        RAISE NOTICE 'Created usage_item for batch %', v_medication->>'batch_id';
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

COMMENT ON FUNCTION public.process_visit_medications() IS 'Automatically creates usage_items when visit status changes to Baigtas. Sets created_by_user_id from visit.';
