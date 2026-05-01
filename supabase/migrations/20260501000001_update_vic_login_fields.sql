-- =====================================================================
-- Update VIC Login Fields to Separate Production and Pet Logins
-- =====================================================================
-- Created: 2026-05-01
-- Description:
--   Adds separate username/password fields for production and pet VIC logins
--   to support different credentials for production and pet animals
-- =====================================================================

-- Rename existing columns to production-specific fields
ALTER TABLE public.farms 
RENAME COLUMN vic_username TO vic_production_username;

ALTER TABLE public.farms
RENAME COLUMN vic_password_encrypted TO vic_production_password;

-- Add new columns for pet animal VIC credentials
ALTER TABLE public.farms
ADD COLUMN IF NOT EXISTS vic_pet_username text;

ALTER TABLE public.farms
ADD COLUMN IF NOT EXISTS vic_pet_password text;

-- Update comments
COMMENT ON COLUMN public.farms.vic_production_username IS 'VIC (Veterinary Information Center) username for production animals';
COMMENT ON COLUMN public.farms.vic_production_password IS 'VIC (Veterinary Information Center) password for production animals';
COMMENT ON COLUMN public.farms.vic_pet_username IS 'VIC (Veterinary Information Center) username for pet animals';
COMMENT ON COLUMN public.farms.vic_pet_password IS 'VIC (Veterinary Information Center) password for pet animals';
