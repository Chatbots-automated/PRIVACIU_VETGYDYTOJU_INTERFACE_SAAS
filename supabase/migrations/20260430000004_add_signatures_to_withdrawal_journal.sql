-- =====================================================================
-- Add Signature Columns to Withdrawal Journal All Farms View
-- =====================================================================
-- Created: 2026-04-30
-- Description:
--   Updates vw_withdrawal_journal_all_farms to include signature columns
-- =====================================================================

DROP VIEW IF EXISTS public.vw_withdrawal_journal_all_farms CASCADE;

CREATE VIEW public.vw_withdrawal_journal_all_farms AS
SELECT
    t.client_id,
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.reg_date AS treatment_date,
    a.tag_no AS animal_tag,
    a.species,
    d.name AS disease_name,
    p.name AS medicine_name,
    ui.quantity AS dose,
    ui.unit,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS days_until_meat_ok,
    CASE
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
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
LEFT JOIN public.diseases d ON t.disease_id = d.id
WHERE (t.withdrawal_until_meat IS NOT NULL OR t.withdrawal_until_milk IS NOT NULL)
ORDER BY t.reg_date DESC;

COMMENT ON VIEW public.vw_withdrawal_journal_all_farms IS 'Withdrawal periods across all farms with signature columns';

GRANT SELECT ON public.vw_withdrawal_journal_all_farms TO authenticated;
