-- =====================================================================
-- CREATE BIOCIDE ACCOUNTING JOURNAL VIEW
-- =====================================================================
-- BIOCIDINIŲ PRODUKTŲ APSKAITOS ŽURNALAS
-- This view provides data for the biocide products accounting journal
-- =====================================================================

DROP VIEW IF EXISTS public.vw_biocide_accounting_journal CASCADE;

CREATE OR REPLACE VIEW public.vw_biocide_accounting_journal AS
-- Biocide usage from farm batches
SELECT
    bu.client_id,
    bu.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    p.id AS product_id,
    p.name AS product_name,
    p.primary_pack_unit AS unit,
    b.received_date AS receipt_date,
    b.doc_title AS document_title,
    b.doc_number AS document_number,
    b.doc_date AS document_date,
    b.qty_received AS quantity_received,
    b.mfg_date AS manufacturing_date,
    b.expiry_date,
    b.lot AS batch_number,
    bu.usage_date,
    bu.area_treated AS usage_purpose,
    bu.quantity_used,
    bu.applied_by,
    bu.notes,
    b.id AS batch_id,
    'farm' AS source
FROM public.biocide_usage bu
JOIN public.products p ON bu.product_id = p.id
JOIN public.batches b ON bu.batch_id = b.id
JOIN public.farms f ON bu.farm_id = f.id
WHERE p.category = 'biocide'
  AND bu.batch_id IS NOT NULL

UNION ALL

-- Biocide usage from warehouse batches
SELECT
    bu.client_id,
    bu.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    p.id AS product_id,
    p.name AS product_name,
    p.primary_pack_unit AS unit,
    wb.doc_date AS receipt_date,
    wb.doc_title AS document_title,
    wb.doc_number AS document_number,
    wb.doc_date AS document_date,
    wb.received_qty AS quantity_received,
    wb.mfg_date AS manufacturing_date,
    wb.expiry_date,
    wb.lot AS batch_number,
    bu.usage_date,
    bu.area_treated AS usage_purpose,
    bu.quantity_used,
    bu.applied_by,
    bu.notes,
    wb.id AS batch_id,
    'warehouse' AS source
FROM public.biocide_usage bu
JOIN public.products p ON bu.product_id = p.id
JOIN public.warehouse_batches wb ON bu.warehouse_batch_id = wb.id
JOIN public.farms f ON bu.farm_id = f.id
WHERE p.category = 'biocide'
  AND bu.warehouse_batch_id IS NOT NULL

ORDER BY usage_date DESC, product_name;

COMMENT ON VIEW public.vw_biocide_accounting_journal IS 'Biocide products accounting journal with all usage details';

-- Grant permissions
GRANT SELECT ON public.vw_biocide_accounting_journal TO authenticated;
GRANT SELECT ON public.vw_biocide_accounting_journal TO anon;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Created vw_biocide_accounting_journal view:';
    RAISE NOTICE '   - Tracks biocide product receipts and usage';
    RAISE NOTICE '   - Supports both farm and warehouse batches';
    RAISE NOTICE '   - Ready for BIOCIDINIŲ PRODUKTŲ APSKAITOS ŽURNALAS report';
END $$;
