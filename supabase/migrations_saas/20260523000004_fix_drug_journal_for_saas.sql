-- =====================================================================
-- FIX DRUG JOURNAL VIEW FOR SAAS WITH CORRECT USAGE CALCULATION
-- =====================================================================
-- Description: Update vw_vet_drug_journal to include client_id and properly
--              calculate quantity_used from actual usage records
-- Created: 2026-05-23
-- =====================================================================

DROP VIEW IF EXISTS public.vw_vet_drug_journal CASCADE;

CREATE OR REPLACE VIEW public.vw_vet_drug_journal AS
-- Farm batches
SELECT 
    b.client_id,
    b.farm_id,
    b.id AS batch_id,
    b.product_id,
    b.invoice_id,
    b.created_at AS receipt_date,
    p.name AS product_name,
    p.registration_code,
    p.active_substance,
    s.name AS supplier_name,
    b.lot AS batch_number,
    b.mfg_date AS manufacture_date,
    b.expiry_date,
    b.qty_received AS quantity_received,
    p.primary_pack_unit AS unit,
    -- Calculate actual usage from usage_items, vaccinations, and biocide_usage
    COALESCE(
        (SELECT SUM(quantity) FROM usage_items WHERE batch_id = b.id), 0
    ) + COALESCE(
        (SELECT SUM(dose_amount) FROM vaccinations WHERE batch_id = b.id), 0
    ) + COALESCE(
        (SELECT SUM(quantity_used) FROM biocide_usage WHERE batch_id = b.id), 0
    ) AS quantity_used,
    b.qty_left AS quantity_remaining,
    b.doc_number AS invoice_number,
    b.doc_date AS invoice_date,
    COALESCE(b.doc_title, 'Invoice') AS doc_title,
    'farm' AS source
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.suppliers s ON b.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention', 'vakcina')

UNION ALL

-- Warehouse batches
SELECT 
    wb.client_id,
    NULL AS farm_id,
    wb.id AS batch_id,
    wb.product_id,
    wb.invoice_id,
    wb.created_at AS receipt_date,
    p.name AS product_name,
    p.registration_code,
    p.active_substance,
    s.name AS supplier_name,
    wb.lot AS batch_number,
    NULL AS manufacture_date,
    wb.expiry_date,
    wb.received_qty AS quantity_received,
    p.primary_pack_unit AS unit,
    -- Calculate actual usage from usage_items, vaccinations, and biocide_usage using warehouse_batch_id
    COALESCE(
        (SELECT SUM(quantity) FROM usage_items WHERE warehouse_batch_id = wb.id), 0
    ) + COALESCE(
        (SELECT SUM(dose_amount) FROM vaccinations WHERE warehouse_batch_id = wb.id), 0
    ) + COALESCE(
        (SELECT SUM(quantity_used) FROM biocide_usage WHERE warehouse_batch_id = wb.id), 0
    ) AS quantity_used,
    wb.qty_left AS quantity_remaining,
    wb.doc_number AS invoice_number,
    wb.doc_date AS invoice_date,
    COALESCE(wb.doc_title, 'Invoice') AS doc_title,
    'warehouse' AS source
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention', 'vakcina')

ORDER BY receipt_date DESC;

COMMENT ON VIEW public.vw_vet_drug_journal IS 'SaaS veterinary drug journal with client_id, proper usage calculation from actual usage records, and support for warehouse batches';

-- Grant permissions
GRANT SELECT ON public.vw_vet_drug_journal TO authenticated;
GRANT SELECT ON public.vw_vet_drug_journal TO anon;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Drug journal view fixed! Now shows correct "Sunaudotas kiekis" from actual usage records';
END $$;
