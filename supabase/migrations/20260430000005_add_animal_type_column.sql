-- =====================================================================
-- Add Animal Type Column
-- =====================================================================
-- Created: 2026-04-30
-- Description:
--   Adds animal_type column to distinguish between produkcinis (production) 
--   and augintinis (pet) animals
-- =====================================================================

-- Add animal_type column to animals table
ALTER TABLE public.animals
ADD COLUMN IF NOT EXISTS animal_type text DEFAULT 'produkcinis' CHECK (animal_type IN ('produkcinis', 'augintinis'));

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_animals_animal_type ON public.animals(animal_type);

COMMENT ON COLUMN public.animals.animal_type IS 'Type of animal: produkcinis (production) or augintinis (pet)';

-- Update existing animals to be produkcinis by default
UPDATE public.animals SET animal_type = 'produkcinis' WHERE animal_type IS NULL;
