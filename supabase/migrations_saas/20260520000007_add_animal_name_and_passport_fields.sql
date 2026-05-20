-- Add missing fields to animals table to match VIC webhook response
-- Fields: name, passport_series, passport_number, animal_subtype

ALTER TABLE public.animals
ADD COLUMN IF NOT EXISTS name TEXT,
ADD COLUMN IF NOT EXISTS passport_series TEXT,
ADD COLUMN IF NOT EXISTS passport_number TEXT,
ADD COLUMN IF NOT EXISTS animal_subtype TEXT;

COMMENT ON COLUMN public.animals.name IS 'Animal name (optional, mainly for pets)';
COMMENT ON COLUMN public.animals.passport_series IS 'Passport series from VIC system';
COMMENT ON COLUMN public.animals.passport_number IS 'Passport number from VIC system';
COMMENT ON COLUMN public.animals.animal_subtype IS 'Specific animal type from VIC (e.g., Karvė, Bulius, Telyčia) - maps to animalType in webhook';

