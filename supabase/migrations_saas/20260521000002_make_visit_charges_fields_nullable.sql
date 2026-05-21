-- =====================================================================
-- FIX VISIT_CHARGES - Make visit_id nullable for product charges
-- =====================================================================
-- Product charges from allocations are not tied to visits
-- So visit_id should be nullable
-- =====================================================================

-- Make visit_id nullable
ALTER TABLE public.visit_charges 
ALTER COLUMN visit_id DROP NOT NULL;

-- Make animal_id nullable too (products aren't tied to specific animals)
ALTER TABLE public.visit_charges 
ALTER COLUMN animal_id DROP NOT NULL;

COMMENT ON COLUMN public.visit_charges.visit_id IS 'Visit ID (nullable for product charges)';
COMMENT ON COLUMN public.visit_charges.animal_id IS 'Animal ID (nullable for product charges)';
