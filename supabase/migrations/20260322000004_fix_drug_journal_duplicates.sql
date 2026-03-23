-- =====================================================================
-- Fix Drug Journal Duplicates
-- =====================================================================
-- Issue: When warehouse stock is allocated to farms, it appears twice:
-- 1. As warehouse batch (with invoice details)
-- 2. As farm batch (with "Warehouse Allocation")
--
-- Solution: Only show warehouse batches that haven't been fully allocated

DROP VIEW IF EXISTS public.vw_vet_drug_journal_all_farms CASCADE;

CREATE VIEW public.vw_vet_drug_journal_all_farms AS
-- Farm-level batches (with invoice_id from original warehouse batch if allocated)
SELECT 
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
    b.received_qty AS quantity_received,
    (b.received_qty - b.qty_left) AS quantity_used,
    b.qty_left AS quantity_remaining,
    s.name AS supplier_name,
    b.doc_title,
    b.doc_number AS invoice_number,
    b.doc_date AS invoice_date,
    b.farm_id,
    b.id AS batch_id,
    b.invoice_id,
    'farm_batch' AS source
FROM public.batches b
JOIN public.farms f ON b.farm_id = f.id
JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.suppliers s ON b.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention')

UNION ALL

-- Warehouse-level batches (only show if NOT fully allocated to avoid duplicates)
SELECT 
    wb.created_at::date AS receipt_date,
    'Vetpraktika UAB Sandėlis' AS farm_name,
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
    wb.qty_allocated AS quantity_used,
    wb.qty_left AS quantity_remaining,
    s.name AS supplier_name,
    wb.doc_title,
    wb.doc_number AS invoice_number,
    wb.doc_date AS invoice_date,
    NULL::uuid AS farm_id,
    wb.id AS batch_id,
    wb.invoice_id,
    'warehouse_batch' AS source
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention')
  AND wb.qty_left > 0  -- Only show warehouse batches with remaining stock

ORDER BY receipt_date DESC;

COMMENT ON VIEW public.vw_vet_drug_journal_all_farms IS 'Farm-wide veterinary drug journal showing medicine receipts across all farms and warehouse (warehouse batches excluded if fully allocated to prevent duplicates)';

-- Grant permissions
GRANT SELECT ON public.vw_vet_drug_journal_all_farms TO authenticated;
