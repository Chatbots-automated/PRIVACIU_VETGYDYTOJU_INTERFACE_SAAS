-- =====================================================================
-- FIX WAREHOUSE BATCH QUANTITY_USED CALCULATION
-- =====================================================================
-- Problem: Warehouse batches were showing (received_qty - qty_left) as "used"
-- But this difference represents ALLOCATIONS to farms, not actual usage!
--
-- Solution: 
-- - Warehouse batches: only show tracked usage (usage_items + biocide_usage)
-- - Farm batches: keep GREATEST logic for backward compatibility
-- =====================================================================

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
  -- For farm batches: use GREATEST to handle old stock where usage wasn't tracked
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
  -- For warehouse batches: ONLY tracked usage (not allocations)
  -- The difference (received_qty - qty_left) is ALLOCATION to farms, not usage
  COALESCE(
    (SELECT SUM(quantity) FROM usage_items WHERE warehouse_batch_id = wb.id),
    0
  ) +
  COALESCE(
    (SELECT SUM(quantity_used) FROM biocide_usage WHERE warehouse_batch_id = wb.id),
    0
  ) as quantity_used
FROM warehouse_batches wb
JOIN products p ON wb.product_id = p.id
LEFT JOIN suppliers s ON wb.supplier_id = s.id
LEFT JOIN invoices i ON wb.invoice_id = i.id
WHERE p.category IN ('medicines', 'prevention', 'vakcina', 'biocide');

COMMENT ON VIEW public.vw_vet_drug_journal_complete IS 'Comprehensive view of both farm and warehouse batches with correct usage calculations: farm batches use GREATEST(tracked, qty_diff) for old stock compatibility, warehouse batches only show tracked usage (not allocations)';

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================
GRANT SELECT ON public.vw_vet_drug_journal_complete TO authenticated;
GRANT SELECT ON public.vw_vet_drug_journal_complete TO anon;

-- =====================================================================
-- SUCCESS MESSAGE
-- =====================================================================
DO $$ 
BEGIN
    RAISE NOTICE '✅ Fixed warehouse batch quantity_used calculation:';
    RAISE NOTICE '   - Warehouse batches now show ONLY tracked usage (not allocations)';
    RAISE NOTICE '   - Farm batches still use GREATEST logic for old stock compatibility';
    RAISE NOTICE '   - Stock balance and write-off reports will now be accurate!';
END $$;
