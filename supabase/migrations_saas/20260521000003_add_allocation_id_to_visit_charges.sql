-- =====================================================================
-- ADD ALLOCATION_ID TO VISIT_CHARGES FOR TRACKING
-- =====================================================================
-- This allows us to track which farm_stock_allocations have been invoiced
-- and exclude them from future invoices once paid
-- =====================================================================

-- Add allocation_id column to track product allocations
ALTER TABLE public.visit_charges 
ADD COLUMN IF NOT EXISTS allocation_id uuid REFERENCES public.farm_stock_allocations(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_visit_charges_allocation_id ON public.visit_charges(allocation_id);

COMMENT ON COLUMN public.visit_charges.allocation_id IS 'Links product charges to farm stock allocations for tracking';
