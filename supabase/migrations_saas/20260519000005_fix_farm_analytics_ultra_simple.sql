-- =====================================================================
-- FIX FARM ANALYTICS - INCLUDE BOTH ALLOCATIONS AND DIRECT BATCHES
-- =====================================================================
-- This version includes:
-- 1. Allocations from farm_stock_allocations (warehouse allocations)
-- 2. Direct batches from batches table (invoice-based batches)
-- =====================================================================

-- Drop existing view
DROP VIEW IF EXISTS public.vw_allocation_analytics_by_farm CASCADE;

-- Create view that includes both allocations and direct batches
CREATE OR REPLACE VIEW public.vw_allocation_analytics_by_farm AS
SELECT
    f.id AS farm_id,
    f.client_id,
    f.name AS farm_name,
    f.code AS farm_code,
    
    -- Count allocations + direct batches
    (
        SELECT COUNT(*)
        FROM farm_stock_allocations fsa
        WHERE fsa.farm_id = f.id
    ) + (
        SELECT COUNT(*)
        FROM batches b
        WHERE b.farm_id = f.id AND b.invoice_id IS NOT NULL
    ) AS total_allocations,
    
    -- Count unique products from both sources
    (
        SELECT COUNT(DISTINCT product_id)
        FROM (
            SELECT product_id FROM farm_stock_allocations WHERE farm_id = f.id
            UNION
            SELECT product_id FROM batches WHERE farm_id = f.id AND invoice_id IS NOT NULL
        ) combined
    ) AS unique_products,
    
    -- Sum quantities from both sources
    (
        SELECT COALESCE(SUM(allocated_qty), 0)
        FROM farm_stock_allocations fsa
        WHERE fsa.farm_id = f.id
    ) + (
        SELECT COALESCE(SUM(qty_received), 0)
        FROM batches b
        WHERE b.farm_id = f.id AND b.invoice_id IS NOT NULL
    ) AS total_qty_allocated,
    
    -- Calculate value from allocations
    (
        SELECT COALESCE(SUM(
            CASE 
                WHEN wb.received_qty > 0 AND wb.purchase_price IS NOT NULL
                THEN fsa.allocated_qty * (wb.purchase_price / wb.received_qty)
                ELSE 0
            END
        ), 0)
        FROM farm_stock_allocations fsa
        LEFT JOIN warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
        WHERE fsa.farm_id = f.id
    ) + 
    -- Add value from direct batches
    (
        SELECT COALESCE(SUM(b.purchase_price * b.qty_received), 0)
        FROM batches b
        WHERE b.farm_id = f.id AND b.invoice_id IS NOT NULL
    ) AS total_value_allocated,
    
    -- Latest date from both sources
    GREATEST(
        (
            SELECT MAX(allocation_date)
            FROM farm_stock_allocations fsa
            WHERE fsa.farm_id = f.id
        ),
        (
            SELECT MAX(created_at)
            FROM batches b
            WHERE b.farm_id = f.id AND b.invoice_id IS NOT NULL
        )
    ) AS last_allocation_date,
    
    -- Calculate value before discount from allocations
    (
        SELECT COALESCE(SUM(
            fsa.allocated_qty * 
            COALESCE(
                (
                    SELECT ii.unit_price 
                    FROM invoice_items ii 
                    WHERE ii.warehouse_batch_id = fsa.warehouse_batch_id 
                    AND ii.product_id = fsa.product_id
                    ORDER BY ii.created_at DESC
                    LIMIT 1
                ),
                CASE 
                    WHEN wb.received_qty > 0 AND wb.purchase_price IS NOT NULL
                    THEN (wb.purchase_price / wb.received_qty)
                    ELSE 0
                END
            )
        ), 0)
        FROM farm_stock_allocations fsa
        LEFT JOIN warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
        WHERE fsa.farm_id = f.id
    ) +
    -- Add value before discount from direct batches
    (
        SELECT COALESCE(SUM(
            b.qty_received * 
            COALESCE(
                (
                    SELECT ii.unit_price 
                    FROM invoice_items ii 
                    WHERE ii.batch_id = b.id 
                    AND ii.product_id = b.product_id
                    ORDER BY ii.created_at DESC
                    LIMIT 1
                ),
                b.purchase_price
            )
        ), 0)
        FROM batches b
        WHERE b.farm_id = f.id AND b.invoice_id IS NOT NULL
    ) AS total_value_allocated_before_discount

FROM public.farms f
ORDER BY total_value_allocated DESC NULLS LAST;

COMMENT ON VIEW public.vw_allocation_analytics_by_farm IS 'Farm analytics including both warehouse allocations and direct invoice batches';

-- Grant permissions
GRANT SELECT ON public.vw_allocation_analytics_by_farm TO authenticated;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
