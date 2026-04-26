-- Add purchase_price to vw_warehouse_stock_available view
-- This is needed so that when allocating stock to farms, the purchase price is preserved

DROP VIEW IF EXISTS public.vw_warehouse_stock_available CASCADE;

CREATE VIEW public.vw_warehouse_stock_available AS
SELECT
    wb.id AS warehouse_batch_id,
    wb.client_id,
    wb.product_id,
    p.name AS product_name,
    p.category,
    p.primary_pack_unit AS unit,
    wb.lot,
    wb.expiry_date,
    wb.received_qty,
    wb.qty_left AS available_qty,
    wb.qty_allocated,
    wb.status,
    wb.purchase_price,  -- ⬅️ ADDED: Needed for cost tracking when allocating to farms
    wb.currency,        -- ⬅️ ADDED: Currency for the purchase price
    s.name AS supplier_name,
    wb.doc_number,
    wb.doc_date,
    wb.created_at
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE wb.qty_left > 0
  AND wb.status = 'active'
  AND (wb.expiry_date IS NULL OR wb.expiry_date >= CURRENT_DATE)
ORDER BY wb.expiry_date ASC NULLS LAST, wb.created_at ASC;

COMMENT ON VIEW public.vw_warehouse_stock_available IS 'Available warehouse stock ready for allocation (FIFO order) with purchase price for cost tracking';
