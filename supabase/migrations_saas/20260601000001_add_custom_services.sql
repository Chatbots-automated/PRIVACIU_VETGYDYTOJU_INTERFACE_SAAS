-- =====================================================
-- CUSTOM SERVICES SYSTEM
-- Created: 2026-06-01
-- =====================================================
-- Adds support for user-created custom services

-- =====================================================
-- 1. UPDATE SERVICE_PRICES TABLE
-- =====================================================
-- Add fields for custom services
ALTER TABLE public.service_prices
ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS service_name text;

-- Update the constraint to allow any text for custom services
ALTER TABLE public.service_prices 
DROP CONSTRAINT IF EXISTS service_prices_procedure_check;

-- Add new constraint that allows system procedures OR custom services
ALTER TABLE public.service_prices 
ADD CONSTRAINT service_prices_procedure_check CHECK (
    (NOT is_custom AND procedure_type = ANY (ARRAY[
        'Gydymas',
        'Vakcina',
        'Profilaktika',
        'Temperatūra',
        'Apžiūra',
        'Konsultacija',
        'Skubus iškvietimas',
        'Sinchronizacijos protokolas',
        'Diagnostika'
    ])) OR
    (is_custom AND procedure_type IS NOT NULL)
);

-- =====================================================
-- 2. ADD CUSTOM SERVICES TO ANIMAL VISITS
-- =====================================================
-- Add array to store selected custom service IDs
ALTER TABLE public.animal_visits
ADD COLUMN IF NOT EXISTS custom_services uuid[] DEFAULT ARRAY[]::uuid[];

-- Add index for custom services
CREATE INDEX IF NOT EXISTS idx_animal_visits_custom_services ON public.animal_visits USING gin(custom_services);

-- =====================================================
-- 3. ADD CUSTOM SERVICES TO VISIT CHARGES
-- =====================================================
-- Track custom services in charges
ALTER TABLE public.visit_charges
ADD COLUMN IF NOT EXISTS custom_service_ids uuid[] DEFAULT ARRAY[]::uuid[];

COMMENT ON COLUMN public.service_prices.is_custom IS 'True for user-created custom services, False for system services';
COMMENT ON COLUMN public.service_prices.service_name IS 'Display name for custom services (e.g., "Caesar cut")';
COMMENT ON COLUMN public.animal_visits.custom_services IS 'Array of custom service IDs selected for this visit';
COMMENT ON COLUMN public.visit_charges.custom_service_ids IS 'Array of custom service IDs included in this charge';
