-- =====================================================================
-- Add Signature Columns to Withdrawal Report View
-- =====================================================================
-- Created: 2026-04-30
-- Description:
--   Updates vw_withdrawal_report to include signature columns
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
    d.name AS disease_name,
    p.name AS medicine_name,
    ui.quantity AS dose,
    ui.unit,
    -- Original withdrawal dates
    t.withdrawal_until_meat AS withdrawal_until_meat_original,
    t.withdrawal_until_milk AS withdrawal_until_milk_original,
    -- Eco-farm adjusted withdrawal dates
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN
                    t.withdrawal_until_meat + INTERVAL '1 day' * (t.withdrawal_until_meat - t.reg_date)
                ELSE
                    t.withdrawal_until_meat
            END
        ELSE
            t.withdrawal_until_meat
    END AS withdrawal_until_meat,
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN
                    t.withdrawal_until_milk + INTERVAL '1 day' * (t.withdrawal_until_milk - t.reg_date)
                ELSE
                    t.withdrawal_until_milk
            END
        ELSE
            t.withdrawal_until_milk
    END AS withdrawal_until_milk,
    -- Days until withdrawal OK (eco-adjusted)
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN
                    ((t.withdrawal_until_meat + INTERVAL '1 day' * (t.withdrawal_until_meat - t.reg_date))::date - CURRENT_DATE)
                ELSE
                    0
            END
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
            (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE
            0
    END AS days_until_meat_ok,
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN
                    ((t.withdrawal_until_milk + INTERVAL '1 day' * (t.withdrawal_until_milk - t.reg_date))::date - CURRENT_DATE)
                ELSE
                    0
            END
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
            (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE
            0
    END AS days_until_milk_ok,
    t.vet_name,
    -- NEW: Signature columns
    t.owner_signature_status,
    t.owner_signature_token,
    t.owner_signed_at,
    t.vet_signed_at
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
LEFT JOIN public.products p ON ui.product_id = p.id
LEFT JOIN public.diseases d ON t.disease_id = d.id;

COMMENT ON VIEW public.vw_withdrawal_report IS 'Withdrawal periods report with eco-farm adjustments and signature columns (multi-tenant)';

GRANT SELECT ON public.vw_withdrawal_report TO authenticated;
