-- =====================================================================
-- ADD VIC CREDENTIALS TO FARMS TABLE
-- =====================================================================
-- This migration adds VIC (Veterinary Information Center) credentials
-- to the farms table for automated data synchronization

-- Add VIC credentials columns to farms table
DO $$ BEGIN
    ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS vic_username text;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.farms ADD COLUMN IF NOT EXISTS vic_password text;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN public.farms.vic_username IS 'VIC (Veterinary Information Center) username for automated data sync';
COMMENT ON COLUMN public.farms.vic_password IS 'VIC password (encrypted at application level)';
