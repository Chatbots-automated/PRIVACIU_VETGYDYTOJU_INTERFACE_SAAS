-- =====================================================================
-- MAKE INVOICE farm_id NULLABLE FOR SHARED WAREHOUSE
-- =====================================================================
-- Created: 2026-04-25
-- Description: Allow invoices to be client-wide (not tied to specific farm)
--              for central/shared warehouse functionality
-- =====================================================================

-- Make farm_id nullable for invoices (allow client-wide invoices)
ALTER TABLE public.invoices 
  ALTER COLUMN farm_id DROP NOT NULL;

COMMENT ON COLUMN public.invoices.farm_id IS 'Farm ID for farm-specific invoices, NULL for client-wide shared warehouse invoices';

-- Update invoice_items to also allow NULL farm_id
ALTER TABLE public.invoice_items 
  ALTER COLUMN farm_id DROP NOT NULL;

COMMENT ON COLUMN public.invoice_items.farm_id IS 'Farm ID for farm-specific invoice items, NULL for client-wide shared warehouse items';

-- Update batches to allow NULL farm_id (for shared warehouse stock)
ALTER TABLE public.batches 
  ALTER COLUMN farm_id DROP NOT NULL;

COMMENT ON COLUMN public.batches.farm_id IS 'Farm ID for farm-specific batches, NULL for client-wide shared warehouse batches';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Note: When farm_id is NULL, the stock is shared across all farms within the client
