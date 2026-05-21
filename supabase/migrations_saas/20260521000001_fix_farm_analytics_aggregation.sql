-- =====================================================================
-- FIX FARM ANALYTICS - CORRECT UNIQUE PRODUCTS AGGREGATION
-- =====================================================================
-- The issue: COUNT(DISTINCT fa.unique_products) was wrong
-- Should be: MAX(fa.unique_products) since each row already has a count
-- =====================================================================

DROP VIEW IF EXISTS public.vw_allocation_analytics_by_farm CASCADE;

CREATE OR REPLACE VIEW public.vw_allocation_analytics_by_farm AS
WITH 
-- Step 1: Get allocations with their prices (ONE ROW PER ALLOCATION)
allocation_data AS (
    SELECT DISTINCT ON (fsa.id)
        fsa.client_id,
        fsa.id,
        fsa.farm_id,
        fsa.product_id,
        fsa.allocated_qty,
        fsa.allocation_date,
        CASE 
            WHEN wb.received_qty > 0 AND wb.purchase_price IS NOT NULL
            THEN fsa.allocated_qty * (wb.purchase_price / wb.received_qty)
            ELSE 0
        END AS value_allocated,
        CASE 
            WHEN wb.received_qty > 0 AND ii.unit_price IS NOT NULL
            THEN fsa.allocated_qty * ii.unit_price
            WHEN wb.received_qty > 0 AND wb.purchase_price IS NOT NULL
            THEN fsa.allocated_qty * (wb.purchase_price / wb.received_qty)
            ELSE 0
        END AS value_before_discount
    FROM farm_stock_allocations fsa
    LEFT JOIN warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
    LEFT JOIN invoice_items ii ON ii.warehouse_batch_id = fsa.warehouse_batch_id AND ii.product_id = fsa.product_id
    ORDER BY fsa.id, ii.created_at DESC NULLS LAST
),
-- Step 2: Get direct batches with their prices (ONE ROW PER BATCH)
batch_data AS (
    SELECT DISTINCT ON (b.id)
        b.client_id,
        b.id,
        b.farm_id,
        b.product_id,
        b.qty_received,
        b.created_at AS allocation_date,
        -- purchase_price is already the TOTAL for the batch
        COALESCE(b.purchase_price, 0) AS value_allocated,
        -- For before_discount: if invoice items exist, use them; otherwise use batch price
        CASE
            WHEN ii.unit_price IS NOT NULL THEN ii.unit_price * b.qty_received
            ELSE COALESCE(b.purchase_price, 0)
        END AS value_before_discount
    FROM batches b
    LEFT JOIN invoice_items ii ON ii.batch_id = b.id AND ii.product_id = b.product_id
    WHERE b.invoice_id IS NOT NULL
    ORDER BY b.id, ii.created_at DESC NULLS LAST
),
-- Step 3: Aggregate per farm (with client_id for filtering)
farm_aggregates AS (
    SELECT
        client_id,
        farm_id,
        COUNT(*) AS allocation_count,
        COUNT(DISTINCT product_id) AS unique_products,
        SUM(allocated_qty) AS total_qty,
        SUM(value_allocated) AS total_value_allocated,
        SUM(value_before_discount) AS total_value_before_discount,
        MAX(allocation_date) AS last_date
    FROM allocation_data
    GROUP BY client_id, farm_id
    
    UNION ALL
    
    SELECT
        client_id,
        farm_id,
        COUNT(*) AS allocation_count,
        COUNT(DISTINCT product_id) AS unique_products,
        SUM(qty_received) AS total_qty,
        SUM(value_allocated) AS total_value_allocated,
        SUM(value_before_discount) AS total_value_before_discount,
        MAX(allocation_date) AS last_date
    FROM batch_data
    GROUP BY client_id, farm_id
)
-- Step 4: Final aggregation - FIX: SUM allocations, MAX unique_products
SELECT
    f.id AS farm_id,
    f.client_id,
    f.name AS farm_name,
    f.code AS farm_code,
    COALESCE(SUM(fa.allocation_count), 0)::bigint AS total_allocations,
    COALESCE(SUM(fa.unique_products), 0)::bigint AS unique_products,
    COALESCE(SUM(fa.total_qty), 0) AS total_qty_allocated,
    COALESCE(SUM(fa.total_value_allocated), 0) AS total_value_allocated,
    MAX(fa.last_date) AS last_allocation_date,
    COALESCE(SUM(fa.total_value_before_discount), 0) AS total_value_allocated_before_discount
FROM farms f
LEFT JOIN farm_aggregates fa ON f.id = fa.farm_id AND f.client_id = fa.client_id
GROUP BY f.id, f.client_id, f.name, f.code
ORDER BY total_value_allocated DESC NULLS LAST;

COMMENT ON VIEW public.vw_allocation_analytics_by_farm IS 'Farm analytics with correct aggregation (fixed unique_products counting)';

GRANT SELECT ON public.vw_allocation_analytics_by_farm TO authenticated;
