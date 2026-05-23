-- =====================================================================
-- FIX VW_VET_DRUG_JOURNAL_ALL_FARMS - FOR APSKAITA MODULE
-- =====================================================================
-- Problem: This view was using wb.qty_allocated which is wrong
-- Solution: Use same tracked usage logic as vw_vet_drug_journal_complete
-- =====================================================================

DROP VIEW IF EXISTS public.vw_vet_drug_journal_all_farms CASCADE;

CREATE VIEW public.vw_vet_drug_journal_all_farms AS
-- Farm-level batches
SELECT
    b.client_id,
    b.created_at::date AS receipt_date,
    f.name AS farm_name,
    f.code AS farm_code,
    p.name AS product_name,
    p.id AS product_id,
    p.registration_code,
    p.active_substance,
    p.primary_pack_unit AS unit,
    b.lot AS batch_number,
    b.lot,
    b.expiry_date,
    b.qty_received AS quantity_received,
    -- Farm batches: use GREATEST to handle old stock
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
    ) AS quantity_used,
    b.qty_left AS quantity_remaining,
    s.name AS supplier_name,
    b.doc_title,
    b.doc_number AS invoice_number,
    b.doc_date AS invoice_date,
    b.farm_id,
    b.id AS batch_id,
    'farm_batch' AS source
FROM public.batches b
JOIN public.farms f ON b.farm_id = f.id
JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.suppliers s ON b.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention', 'vakcina', 'biocide')
AND b.farm_id IS NOT NULL

UNION ALL

-- Warehouse-level batches
SELECT
    wb.client_id,
    wb.created_at::date AS receipt_date,
    'Bendras sandėlis' AS farm_name,
    'WAREHOUSE' AS farm_code,
    p.name AS product_name,
    p.id AS product_id,
    p.registration_code,
    p.active_substance,
    p.primary_pack_unit AS unit,
    wb.lot AS batch_number,
    wb.lot,
    wb.expiry_date,
    wb.received_qty AS quantity_received,
    -- Warehouse batches: ONLY tracked usage (not allocations)
    COALESCE(
      (SELECT SUM(quantity) FROM usage_items WHERE warehouse_batch_id = wb.id),
      0
    ) +
    COALESCE(
      (SELECT SUM(quantity_used) FROM biocide_usage WHERE warehouse_batch_id = wb.id),
      0
    ) AS quantity_used,
    wb.qty_left AS quantity_remaining,
    s.name AS supplier_name,
    wb.doc_title,
    wb.doc_number AS invoice_number,
    wb.doc_date AS invoice_date,
    NULL::uuid AS farm_id,
    wb.id AS batch_id,
    'warehouse_batch' AS source
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention', 'vakcina', 'biocide')

ORDER BY receipt_date DESC;

COMMENT ON VIEW public.vw_vet_drug_journal_all_farms IS 'Drug receipts across all farms and warehouse with correct usage tracking for apskaita module';

-- Grant permissions
GRANT SELECT ON public.vw_vet_drug_journal_all_farms TO authenticated;
GRANT SELECT ON public.vw_vet_drug_journal_all_farms TO anon;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Fixed vw_vet_drug_journal_all_farms for apskaita module:';
    RAISE NOTICE '   - Warehouse batches now show tracked usage (not qty_allocated)';
    RAISE NOTICE '   - Farm batches use GREATEST logic for old stock';
    RAISE NOTICE '   - Added vakcina and biocide categories';
    RAISE NOTICE '   - Stock balance and write-off reports in apskaita will now be correct!';
END $$;
