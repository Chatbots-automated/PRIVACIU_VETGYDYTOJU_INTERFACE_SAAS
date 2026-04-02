-- Update allocation analytics to include directly assigned farm invoices
-- Currently only shows warehouse→farm allocations, missing direct invoice assignments

DROP VIEW IF EXISTS public.vw_allocation_analytics_by_farm CASCADE;

CREATE OR REPLACE VIEW public.vw_allocation_analytics_by_farm AS
WITH warehouse_allocations AS (
    -- Stock allocated from warehouse to farms
    SELECT 
        f.id AS farm_id,
        f.name AS farm_name,
        f.code AS farm_code,
        fsa.id AS allocation_id,
        fsa.product_id,
        fsa.allocated_qty AS qty,
        wb.purchase_price * (fsa.allocated_qty / NULLIF(wb.received_qty, 0)) AS value_after_discount,
        CASE
            WHEN ii.discount_percent IS NOT NULL AND ii.discount_percent > 0 AND ii.discount_percent < 100
            THEN (ii.total_price / (1 - ii.discount_percent / 100.0))
                 * (fsa.allocated_qty / NULLIF(wb.received_qty, 0))
            ELSE wb.purchase_price * (fsa.allocated_qty / NULLIF(wb.received_qty, 0))
        END AS value_before_discount,
        fsa.allocation_date AS activity_date
    FROM public.farms f
    INNER JOIN public.farm_stock_allocations fsa ON f.id = fsa.farm_id
    INNER JOIN public.warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
    LEFT JOIN LATERAL (
        SELECT ii0.total_price, ii0.discount_percent
        FROM public.invoice_items ii0
        WHERE ii0.warehouse_batch_id = wb.id
        ORDER BY ii0.line_no NULLS LAST, ii0.id
        LIMIT 1
    ) ii ON true
),
direct_invoices AS (
    -- Stock directly assigned to farms via invoices
    SELECT 
        f.id AS farm_id,
        f.name AS farm_name,
        f.code AS farm_code,
        b.id AS allocation_id,
        b.product_id,
        b.received_qty AS qty,
        b.purchase_price AS value_after_discount,
        CASE
            WHEN ii.discount_percent IS NOT NULL AND ii.discount_percent > 0 AND ii.discount_percent < 100
            THEN ii.total_price / (1 - ii.discount_percent / 100.0)
            ELSE b.purchase_price
        END AS value_before_discount,
        b.created_at AS activity_date
    FROM public.farms f
    INNER JOIN public.batches b ON f.id = b.farm_id
    INNER JOIN public.invoices inv ON b.invoice_id = inv.id AND inv.farm_id = f.id
    LEFT JOIN public.invoice_items ii ON ii.invoice_id = inv.id AND ii.product_id = b.product_id AND ii.batch_id = b.id
),
combined AS (
    SELECT * FROM warehouse_allocations
    UNION ALL
    SELECT * FROM direct_invoices
)
SELECT 
    farm_id,
    farm_name,
    farm_code,
    COUNT(DISTINCT allocation_id) AS total_allocations,
    COUNT(DISTINCT product_id) AS unique_products,
    SUM(qty) AS total_qty_allocated,
    SUM(value_after_discount) AS total_value_allocated,
    SUM(value_before_discount) AS total_value_allocated_before_discount,
    MAX(activity_date) AS last_allocation_date
FROM combined
GROUP BY farm_id, farm_name, farm_code
ORDER BY total_value_allocated DESC NULLS LAST;

COMMENT ON VIEW public.vw_allocation_analytics_by_farm IS 'Farm allocation analytics including both warehouse allocations and directly assigned invoices';
