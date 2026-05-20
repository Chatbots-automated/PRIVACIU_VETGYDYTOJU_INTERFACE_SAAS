-- =====================================================================
-- ADD VAT RATE TO CLIENTS TABLE
-- =====================================================================
-- Created: 2026-05-20
-- Description: Add vat_rate field to clients table for per-client VAT rate configuration
--              Defaults to 21.00 (standard Lithuanian PVM rate)
-- =====================================================================

-- Add vat_rate column to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS vat_rate numeric(5,2) DEFAULT 21.00 NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.clients.vat_rate IS 'VAT/PVM rate percentage for this client (e.g., 21.00 for 21%)';

-- Update existing clients to have the default VAT rate if somehow NULL
UPDATE public.clients 
SET vat_rate = 21.00 
WHERE vat_rate IS NULL;
