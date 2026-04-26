-- Create fn_fifo_batch function for automatic FIFO batch selection
-- This function returns the next batch to use based on FIFO (First In, First Out) logic
-- Used in BulkTreatment.tsx to automatically select the batch when a product is chosen

CREATE OR REPLACE FUNCTION public.fn_fifo_batch(
    p_farm_id uuid,
    p_product_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT b.id
    FROM public.batches b
    LEFT JOIN public.stock_by_batch sb ON sb.batch_id = b.id
    WHERE b.product_id = p_product_id
      AND b.farm_id = p_farm_id
      AND COALESCE(sb.on_hand, 0) > 0
      AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)
    ORDER BY 
        b.expiry_date NULLS LAST,   -- Prioritize batches expiring soonest
        b.mfg_date NULLS LAST,       -- Then oldest manufactured
        b.doc_date NULLS LAST        -- Then oldest received
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_fifo_batch(uuid, uuid) IS 'Returns the next batch to use based on FIFO (First In, First Out) logic with farm isolation. Used for automatic batch selection in bulk treatments.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.fn_fifo_batch(uuid, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.fn_fifo_batch(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_fifo_batch(uuid, uuid) TO service_role;
