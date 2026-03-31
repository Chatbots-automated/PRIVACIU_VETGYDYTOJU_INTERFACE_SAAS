-- Add is_eco_farm column to farms table
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS is_eco_farm boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.farms.is_eco_farm IS 'Eco-farm flag: withdrawal periods are doubled (0 days becomes 2 days, others are multiplied by 2)';

-- Update withdrawal report view to show ALL treatments and apply eco-farm logic
DROP VIEW IF EXISTS public.vw_withdrawal_report CASCADE;

CREATE OR REPLACE VIEW public.vw_withdrawal_report AS
SELECT 
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
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    -- Original withdrawal days (without eco-farm multiplier)
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat_original,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk_original,
    -- Eco-farm adjusted withdrawal days
    CASE 
        WHEN f.is_eco_farm THEN
            CASE 
                WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
                    CASE 
                        WHEN (t.withdrawal_until_meat - CURRENT_DATE) = 0 THEN 2
                        ELSE (t.withdrawal_until_meat - CURRENT_DATE) * 2
                    END
                WHEN t.withdrawal_until_meat IS NOT NULL THEN 2  -- Past withdrawal becomes 2 for eco
                ELSE 0
            END
        ELSE
            CASE 
                WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
                THEN (t.withdrawal_until_meat - CURRENT_DATE)
                ELSE 0
            END
    END AS withdrawal_days_meat,
    CASE 
        WHEN f.is_eco_farm THEN
            CASE 
                WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
                    CASE 
                        WHEN (t.withdrawal_until_milk - CURRENT_DATE) = 0 THEN 2
                        ELSE (t.withdrawal_until_milk - CURRENT_DATE) * 2
                    END
                WHEN t.withdrawal_until_milk IS NOT NULL THEN 2  -- Past withdrawal becomes 2 for eco
                ELSE 0
            END
        ELSE
            CASE 
                WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
                THEN (t.withdrawal_until_milk - CURRENT_DATE)
                ELSE 0
            END
    END AS withdrawal_days_milk,
    COALESCE(d.name, t.clinical_diagnosis, 'Nenurodyta') AS disease_name,
    t.vet_name AS veterinarian,
    t.notes,
    (
        SELECT string_agg(DISTINCT p.name, ', ')
        FROM public.usage_items ui
        JOIN public.products p ON ui.product_id = p.id
        WHERE ui.treatment_id = t.id
    ) AS medicines_used,
    t.created_at,
    t.updated_at
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
WHERE 
    -- Show ALL treatments that have withdrawal periods (even if expired)
    t.withdrawal_until_meat IS NOT NULL OR t.withdrawal_until_milk IS NOT NULL
ORDER BY 
    f.name ASC,
    GREATEST(
        COALESCE(t.withdrawal_until_meat, '1900-01-01'::date),
        COALESCE(t.withdrawal_until_milk, '1900-01-01'::date)
    ) DESC;

COMMENT ON VIEW public.vw_withdrawal_report IS 'All animals with withdrawal periods (karencija) - per farm. Includes eco-farm logic: 0 days becomes 2, others are multiplied by 2';

-- Update all-farms withdrawal journal view with eco-farm logic
DROP VIEW IF EXISTS public.vw_withdrawal_journal_all_farms CASCADE;

CREATE OR REPLACE VIEW public.vw_withdrawal_journal_all_farms AS
SELECT 
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    f.is_eco_farm,
    t.id AS treatment_id,
    t.animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, a.birth_date::date)) AS age_years,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    t.reg_date AS treatment_date,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    -- Original withdrawal days
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat_original,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk_original,
    -- Eco-farm adjusted withdrawal days
    CASE 
        WHEN f.is_eco_farm THEN
            CASE 
                WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
                    CASE 
                        WHEN (t.withdrawal_until_meat - CURRENT_DATE) = 0 THEN 2
                        ELSE (t.withdrawal_until_meat - CURRENT_DATE) * 2
                    END
                WHEN t.withdrawal_until_meat IS NOT NULL THEN 2  -- Past withdrawal becomes 2 for eco
                ELSE 0
            END
        ELSE
            CASE 
                WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
                THEN (t.withdrawal_until_meat - CURRENT_DATE)
                ELSE 0
            END
    END AS withdrawal_days_meat,
    CASE 
        WHEN f.is_eco_farm THEN
            CASE 
                WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
                    CASE 
                        WHEN (t.withdrawal_until_milk - CURRENT_DATE) = 0 THEN 2
                        ELSE (t.withdrawal_until_milk - CURRENT_DATE) * 2
                    END
                WHEN t.withdrawal_until_milk IS NOT NULL THEN 2  -- Past withdrawal becomes 2 for eco
                ELSE 0
            END
        ELSE
            CASE 
                WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
                THEN (t.withdrawal_until_milk - CURRENT_DATE)
                ELSE 0
            END
    END AS withdrawal_days_milk,
    CASE
        WHEN (f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL) OR 
             (NOT f.is_eco_farm AND t.withdrawal_until_meat >= CURRENT_DATE) THEN
            CASE
                WHEN (f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL) OR 
                     (NOT f.is_eco_farm AND t.withdrawal_until_milk >= CURRENT_DATE) THEN 'Mėsa ir pienas'
                ELSE 'Mėsa'
            END
        WHEN (f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL) OR 
             (NOT f.is_eco_farm AND t.withdrawal_until_milk >= CURRENT_DATE) THEN 'Pienas'
        ELSE 'Nėra'
    END AS withdrawal_type,
    COALESCE(d.name, t.clinical_diagnosis, 'Nenurodyta') AS disease_name,
    t.vet_name AS veterinarian,
    t.notes,
    (
        SELECT json_agg(
            json_build_object(
                'name', p.name,
                'quantity', ui.qty,
                'unit', ui.unit::text,
                'batch_lot', b.lot
            )
        )
        FROM public.usage_items ui
        JOIN public.products p ON ui.product_id = p.id
        LEFT JOIN public.batches b ON ui.batch_id = b.id
        WHERE ui.treatment_id = t.id
    ) AS medicines_detail,
    (
        SELECT string_agg(DISTINCT p.name, ', ')
        FROM public.usage_items ui
        JOIN public.products p ON ui.product_id = p.id
        WHERE ui.treatment_id = t.id
    ) AS medicines_used,
    t.created_at,
    t.updated_at
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
WHERE 
    -- Show ALL treatments with withdrawal periods (including expired ones for eco-farms)
    t.withdrawal_until_meat IS NOT NULL OR t.withdrawal_until_milk IS NOT NULL
ORDER BY 
    f.name ASC,
    GREATEST(
        COALESCE(t.withdrawal_until_meat, '1900-01-01'::date),
        COALESCE(t.withdrawal_until_milk, '1900-01-01'::date)
    ) DESC;

COMMENT ON VIEW public.vw_withdrawal_journal_all_farms IS 'Farm-wide withdrawal journal (karencijos žurnalas) showing all animals with withdrawal periods across all farms. Includes eco-farm logic: 0 days becomes 2, others are multiplied by 2';
