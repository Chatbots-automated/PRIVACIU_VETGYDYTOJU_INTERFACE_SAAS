-- =====================================================================
-- ADD MISSING COLUMNS TO SAAS SCHEMA
-- =====================================================================
-- Created: 2026-04-25
-- Description: Add columns that were in old migrations but missing from SaaS baseline
-- =====================================================================

-- Add is_eco_farm column to farms table
ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS is_eco_farm boolean DEFAULT false NOT NULL;

COMMENT ON COLUMN public.farms.is_eco_farm IS 'Eco-farm flag: withdrawal periods are doubled (0 days becomes 2 days, others are multiplied by 2)';

-- Add postal_code to clients if not exists (for billing)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS postal_code text;

-- Add contact_person to clients if not exists
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contact_person text;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
