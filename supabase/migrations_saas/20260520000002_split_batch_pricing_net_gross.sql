-- =====================================================================
-- SPLIT BATCH PRICING INTO NET AND GROSS
-- =====================================================================
-- Created: 2026-05-20
-- Description: Add purchase_price_net and purchase_price_gross fields to batches and warehouse_batches
--              This allows proper VAT handling for both VAT-registered and non-VAT clients
-- =====================================================================

-- =====================================================================
-- PART 1: ADD NEW COLUMNS TO BATCHES
-- =====================================================================

ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS purchase_price_net numeric(12,2),
ADD COLUMN IF NOT EXISTS purchase_price_gross numeric(12,2);

COMMENT ON COLUMN public.batches.purchase_price_net IS 'Purchase price excluding VAT (for VAT-registered clients)';
COMMENT ON COLUMN public.batches.purchase_price_gross IS 'Purchase price including VAT (for non-VAT clients)';
COMMENT ON COLUMN public.batches.purchase_price IS 'DEPRECATED: Use purchase_price_net or purchase_price_gross instead';

-- =====================================================================
-- PART 2: ADD NEW COLUMNS TO WAREHOUSE_BATCHES
-- =====================================================================

ALTER TABLE public.warehouse_batches 
ADD COLUMN IF NOT EXISTS purchase_price_net numeric(12,2),
ADD COLUMN IF NOT EXISTS purchase_price_gross numeric(12,2);

COMMENT ON COLUMN public.warehouse_batches.purchase_price_net IS 'Purchase price excluding VAT (for VAT-registered clients)';
COMMENT ON COLUMN public.warehouse_batches.purchase_price_gross IS 'Purchase price including VAT (for non-VAT clients)';
COMMENT ON COLUMN public.warehouse_batches.purchase_price IS 'DEPRECATED: Use purchase_price_net or purchase_price_gross instead';

-- =====================================================================
-- PART 3: MIGRATE EXISTING DATA FOR BATCHES
-- =====================================================================
-- Logic:
-- - If client has vat_code (non-empty), they bought at NET prices, so calculate GROSS
-- - If client has no vat_code, they bought at GROSS prices, so calculate NET
-- =====================================================================

DO $$ 
DECLARE
    batch_record RECORD;
    client_record RECORD;
    vat_multiplier numeric;
BEGIN
    -- Iterate through all batches that have a purchase_price
    FOR batch_record IN 
        SELECT b.id, b.client_id, b.purchase_price
        FROM public.batches b
        WHERE b.purchase_price IS NOT NULL
          AND (b.purchase_price_net IS NULL OR b.purchase_price_gross IS NULL)
    LOOP
        -- Get the client's VAT info
        SELECT vat_code, vat_rate 
        INTO client_record
        FROM public.clients 
        WHERE id = batch_record.client_id;
        
        -- Calculate VAT multiplier (e.g., 21% = 1.21)
        vat_multiplier := 1 + (COALESCE(client_record.vat_rate, 21.00) / 100);
        
        -- Determine if client is VAT registered (has non-empty vat_code)
        IF client_record.vat_code IS NOT NULL AND TRIM(client_record.vat_code) != '' THEN
            -- Client is VAT registered: purchase_price is NET, calculate GROSS
            UPDATE public.batches
            SET 
                purchase_price_net = batch_record.purchase_price,
                purchase_price_gross = ROUND(batch_record.purchase_price * vat_multiplier, 2)
            WHERE id = batch_record.id;
        ELSE
            -- Client is NOT VAT registered: purchase_price is GROSS, calculate NET
            UPDATE public.batches
            SET 
                purchase_price_gross = batch_record.purchase_price,
                purchase_price_net = ROUND(batch_record.purchase_price / vat_multiplier, 2)
            WHERE id = batch_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated batch pricing data successfully';
END $$;

-- =====================================================================
-- PART 4: MIGRATE EXISTING DATA FOR WAREHOUSE_BATCHES
-- =====================================================================

DO $$ 
DECLARE
    batch_record RECORD;
    client_record RECORD;
    vat_multiplier numeric;
BEGIN
    -- Iterate through all warehouse batches that have a purchase_price
    FOR batch_record IN 
        SELECT wb.id, wb.client_id, wb.purchase_price
        FROM public.warehouse_batches wb
        WHERE wb.purchase_price IS NOT NULL
          AND (wb.purchase_price_net IS NULL OR wb.purchase_price_gross IS NULL)
    LOOP
        -- Get the client's VAT info
        SELECT vat_code, vat_rate 
        INTO client_record
        FROM public.clients 
        WHERE id = batch_record.client_id;
        
        -- Calculate VAT multiplier (e.g., 21% = 1.21)
        vat_multiplier := 1 + (COALESCE(client_record.vat_rate, 21.00) / 100);
        
        -- Determine if client is VAT registered (has non-empty vat_code)
        IF client_record.vat_code IS NOT NULL AND TRIM(client_record.vat_code) != '' THEN
            -- Client is VAT registered: purchase_price is NET, calculate GROSS
            UPDATE public.warehouse_batches
            SET 
                purchase_price_net = batch_record.purchase_price,
                purchase_price_gross = ROUND(batch_record.purchase_price * vat_multiplier, 2)
            WHERE id = batch_record.id;
        ELSE
            -- Client is NOT VAT registered: purchase_price is GROSS, calculate NET
            UPDATE public.warehouse_batches
            SET 
                purchase_price_gross = batch_record.purchase_price,
                purchase_price_net = ROUND(batch_record.purchase_price / vat_multiplier, 2)
            WHERE id = batch_record.id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migrated warehouse batch pricing data successfully';
END $$;

-- =====================================================================
-- PART 5: CREATE HELPER FUNCTION FOR VAT-AWARE UNIT COST
-- =====================================================================
-- This function returns the correct unit cost based on client VAT registration
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_vat_aware_unit_cost(
    p_batch_id uuid,
    p_client_id uuid,
    p_is_warehouse_batch boolean DEFAULT false
)
RETURNS numeric AS $$
DECLARE
    v_purchase_price_net numeric;
    v_purchase_price_gross numeric;
    v_qty_received numeric;
    v_client_has_vat_code boolean;
    v_unit_cost numeric;
BEGIN
    -- Check if client is VAT registered
    SELECT (vat_code IS NOT NULL AND TRIM(vat_code) != '') 
    INTO v_client_has_vat_code
    FROM public.clients
    WHERE id = p_client_id;
    
    -- Get batch pricing info
    IF p_is_warehouse_batch THEN
        SELECT purchase_price_net, purchase_price_gross, received_qty
        INTO v_purchase_price_net, v_purchase_price_gross, v_qty_received
        FROM public.warehouse_batches
        WHERE id = p_batch_id;
    ELSE
        SELECT purchase_price_net, purchase_price_gross, qty_received
        INTO v_purchase_price_net, v_purchase_price_gross, v_qty_received
        FROM public.batches
        WHERE id = p_batch_id;
    END IF;
    
    -- Return 0 if no valid data
    IF v_qty_received IS NULL OR v_qty_received = 0 THEN
        RETURN 0;
    END IF;
    
    -- Use NET price if client is VAT registered, GROSS otherwise
    IF v_client_has_vat_code THEN
        v_unit_cost := COALESCE(v_purchase_price_net, 0) / v_qty_received;
    ELSE
        v_unit_cost := COALESCE(v_purchase_price_gross, 0) / v_qty_received;
    END IF;
    
    RETURN ROUND(v_unit_cost, 4);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_vat_aware_unit_cost IS 'Returns VAT-aware unit cost: NET for VAT-registered clients, GROSS for others';
