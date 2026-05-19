-- =====================================================================
-- FIX FARM ANALYTICS TO INCLUDE ALL STOCK SOURCES
-- =====================================================================
-- Created: 2026-05-19
-- Description: Update farm analytics view to include:
-- 1. Allocated stock from warehouse (existing)
-- 2. Direct batches assigned to farm from invoices
-- FIX: Prevent multiplication from multiple invoice_items per batch
-- APPROACH: Use DISTINCT ON to get one price per batch/allocation
-- =====================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.vw_allocation_analytics_by_farm CASCADE;

-- Recreate view with comprehensive stock tracking
CREATE OR REPLACE VIEW public.vw_allocation_analytics_by_farm AS
WITH allocation_prices AS (
    -- Get the price for each allocation (one row per allocation)
    SELECT DISTINCT ON (fsa.id)
        fsa.id AS allocation_id,
        fsa.farm_id,
        fsa.product_id,
        fsa.allocated_qty,
        fsa.allocation_date,
        COALESCE(ii.unit_price, wb.purchase_price / NULLIF(wb.received_qty, 0), 0) AS unit_price_before_discount,
        COALESCE(wb.purchase_price / NULLIF(wb.received_qty, 0), 0) AS unit_price_after_discount
    FROM public.farm_stock_allocations fsa
    LEFT JOIN public.warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
    LEFT JOIN public.invoice_items ii ON ii.warehouse_batch_id = fsa.warehouse_batch_id AND ii.product_id = fsa.product_id
    ORDER BY fsa.id, ii.created_at DESC NULLS LAST
),
batch_prices AS (
    -- Get the price for each direct batch (one row per batch)
    SELECT DISTINCT ON (b.id)
        b.id AS batch_id,
        b.farm_id,
        b.product_id,
        b.qty_received,
        b.created_at AS allocation_date,
        COALESCE(ii.unit_price, b.purchase_price, 0) AS unit_price_before_discount,
        COALESCE(b.purchase_price, 0) AS unit_price_after_discount
    FROM public.batches b
    LEFT JOIN public.invoice_items ii ON ii.batch_id = b.id AND ii.product_id = b.product_id
    WHERE b.invoice_id IS NOT NULL
    ORDER BY b.id, ii.created_at DESC NULLS LAST
),
combined_stock AS (
    -- Combine allocations and batches into one list
    SELECT 
        farm_id,
        product_id,
        allocated_qty AS quantity,
        unit_price_after_discount,
        unit_price_before_discount,
        allocation_date
    FROM allocation_prices
    
    UNION ALL
    
    SELECT 
        farm_id,
        product_id,
        qty_received AS quantity,
        unit_price_after_discount,
        unit_price_before_discount,
        allocation_date
    FROM batch_prices
)
SELECT
    f.id AS farm_id,
    f.client_id,
    f.name AS farm_name,
    f.code AS farm_code,
    COALESCE(COUNT(cs.product_id), 0)::bigint AS total_allocations,
    COALESCE(COUNT(DISTINCT cs.product_id), 0)::bigint AS unique_products,
    COALESCE(SUM(cs.quantity), 0) AS total_qty_allocated,
    COALESCE(SUM(cs.quantity * cs.unit_price_after_discount), 0) AS total_value_allocated,
    MAX(cs.allocation_date) AS last_allocation_date,
    COALESCE(SUM(cs.quantity * cs.unit_price_before_discount), 0) AS total_value_allocated_before_discount
FROM public.farms f
LEFT JOIN combined_stock cs ON f.id = cs.farm_id
GROUP BY f.id, f.client_id, f.name, f.code
ORDER BY total_value_allocated DESC NULLS LAST;

COMMENT ON VIEW public.vw_allocation_analytics_by_farm IS 'Comprehensive farm analytics including allocated stock and direct batches (fixed multiplication issue with DISTINCT ON)';

-- Grant permissions
GRANT SELECT ON public.vw_allocation_analytics_by_farm TO authenticated;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
