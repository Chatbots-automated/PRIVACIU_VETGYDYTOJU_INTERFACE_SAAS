-- =====================================================================
-- Update Product Analytics to Include Direct Farm Batches
-- =====================================================================
-- Updates vw_allocation_analytics_by_product to show both:
-- 1. Products allocated from warehouse (farm_stock_allocations)
-- 2. Products directly assigned to farms via invoices (batches)
-- =====================================================================

DROP VIEW IF EXISTS public.vw_allocation_analytics_by_product CASCADE;

CREATE OR REPLACE VIEW public.vw_allocation_analytics_by_product AS
WITH warehouse_allocations AS (
    -- Stock allocated from warehouse to farms
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.primary_pack_unit AS unit,
        fsa.farm_id,
        fsa.id AS allocation_id,
        fsa.allocated_qty AS qty,
        fsa.allocation_date AS activity_date
    FROM public.products p
    LEFT JOIN public.farm_stock_allocations fsa ON p.id = fsa.product_id
),
direct_batches AS (
    -- Stock directly assigned to farms via invoices
    SELECT 
        p.id AS product_id,
        p.name AS product_name,
        p.category,
        p.primary_pack_unit AS unit,
        b.farm_id,
        b.id AS allocation_id,
        b.received_qty AS qty,
        b.created_at AS activity_date
    FROM public.products p
    INNER JOIN public.batches b ON p.id = b.product_id
    WHERE b.invoice_id IS NOT NULL  -- Only include batches from direct invoice assignments
),
combined AS (
    SELECT * FROM warehouse_allocations
    WHERE farm_id IS NOT NULL  -- Exclude products with no allocations
    UNION ALL
    SELECT * FROM direct_batches
)
SELECT 
    product_id,
    product_name,
    category,
    unit,
    COUNT(DISTINCT farm_id) AS farms_using,
    COUNT(DISTINCT allocation_id) AS total_allocations,
    SUM(qty) AS total_qty_allocated,
    MAX(activity_date) AS last_allocation_date
FROM combined
GROUP BY product_id, product_name, category, unit
ORDER BY total_qty_allocated DESC NULLS LAST;

COMMENT ON VIEW public.vw_allocation_analytics_by_product IS 'Analytics showing which products are allocated most, including both warehouse allocations and direct farm invoice assignments';

-- Grant permissions
GRANT SELECT ON public.vw_allocation_analytics_by_product TO authenticated;
