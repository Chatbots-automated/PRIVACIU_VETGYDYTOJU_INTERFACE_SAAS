-- Create stock_by_batch view for easier access to batch inventory
-- This view is used by bulk treatment, synchronization protocols, dashboard, etc.

DROP VIEW IF EXISTS public.stock_by_batch CASCADE;

CREATE VIEW public.stock_by_batch AS
SELECT
    b.id AS batch_id,
    b.client_id,
    b.farm_id,
    b.product_id,
    b.lot AS batch_number,
    b.lot,
    b.expiry_date,
    b.qty_left AS on_hand,
    b.purchase_price,
    p.name AS product_name,
    p.category AS product_category,
    p.primary_pack_unit AS unit,
    b.created_at,
    b.updated_at
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
WHERE b.qty_left > 0
ORDER BY b.expiry_date ASC NULLS LAST, b.created_at ASC;

COMMENT ON VIEW public.stock_by_batch IS 'Batch-level inventory with product details for farms';
