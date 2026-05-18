-- Migration: Add VIC data storage to farms table
-- Created: 2026-05-18
-- Purpose: Store complete VIC lookup data for each farm/vet doctor

-- Add columns to store VIC data
ALTER TABLE public.farms
ADD COLUMN IF NOT EXISTS vic_data JSONB,
ADD COLUMN IF NOT EXISTS vic_personal_code TEXT,
ADD COLUMN IF NOT EXISTS vic_vet_license TEXT,
ADD COLUMN IF NOT EXISTS vic_is_vet_doctor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vic_is_marker BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS vic_holdings_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS vic_last_synced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS client_personal_code TEXT,
ADD COLUMN IF NOT EXISTS vic_production_username TEXT,
ADD COLUMN IF NOT EXISTS vic_production_password TEXT,
ADD COLUMN IF NOT EXISTS vic_pet_username TEXT,
ADD COLUMN IF NOT EXISTS vic_pet_password TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_farms_vic_personal_code ON public.farms(vic_personal_code);
CREATE INDEX IF NOT EXISTS idx_farms_vic_vet_license ON public.farms(vic_vet_license);
CREATE INDEX IF NOT EXISTS idx_farms_vic_is_vet_doctor ON public.farms(vic_is_vet_doctor);
CREATE INDEX IF NOT EXISTS idx_farms_vic_last_synced_at ON public.farms(vic_last_synced_at);
CREATE INDEX IF NOT EXISTS idx_farms_client_personal_code ON public.farms(client_personal_code);

-- Add comments for documentation
COMMENT ON COLUMN public.farms.vic_data IS 'Complete VIC lookup response data (JSONB)';
COMMENT ON COLUMN public.farms.vic_personal_code IS 'VIC personal or company code';
COMMENT ON COLUMN public.farms.vic_vet_license IS 'Veterinary license number from VIC';
COMMENT ON COLUMN public.farms.vic_is_vet_doctor IS 'Whether this person is a registered vet doctor';
COMMENT ON COLUMN public.farms.vic_is_marker IS 'Whether this person is a registered marker';
COMMENT ON COLUMN public.farms.vic_holdings_count IS 'Number of holdings (ūkiai) registered in VIC';
COMMENT ON COLUMN public.farms.vic_last_synced_at IS 'Timestamp of last VIC data synchronization';
COMMENT ON COLUMN public.farms.client_personal_code IS 'Personal code of the client (farm owner) for animal data fetching';
COMMENT ON COLUMN public.farms.vic_production_username IS 'VIC username for production animals';
COMMENT ON COLUMN public.farms.vic_production_password IS 'VIC password for production animals';
COMMENT ON COLUMN public.farms.vic_pet_username IS 'VIC username for pet animals';
COMMENT ON COLUMN public.farms.vic_pet_password IS 'VIC password for pet animals';
