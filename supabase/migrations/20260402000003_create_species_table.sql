-- Create species table for managing animal species
-- Allows farms to define their own species with Lithuanian names
-- Code is auto-generated from name_lt for backward compatibility

CREATE TABLE IF NOT EXISTS public.species (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    code text NOT NULL,
    name_lt text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT species_code_farm_unique UNIQUE (farm_id, code)
);

COMMENT ON TABLE public.species IS 'Animal species definitions per farm with Lithuanian names';
COMMENT ON COLUMN public.species.code IS 'Internal code for species - auto-generated from name_lt, used for backward compatibility with existing animals.species field';
COMMENT ON COLUMN public.species.name_lt IS 'Lithuanian name for display (e.g., Galvijai, Šuo, Katė)';
COMMENT ON COLUMN public.species.farm_id IS 'Farm that owns this species definition';

-- Function to auto-generate code from Lithuanian name
CREATE OR REPLACE FUNCTION public.generate_species_code(name_lt text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
    -- Convert Lithuanian name to lowercase code
    -- Remove special characters and spaces
    RETURN lower(regexp_replace(
        translate(name_lt, 'ąčęėįšųūž', 'aceeisuuz'),
        '[^a-z0-9]', '', 'g'
    ));
END;
$$;

COMMENT ON FUNCTION public.generate_species_code IS 'Generates a code from Lithuanian species name for backward compatibility';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_species_farm_id ON public.species(farm_id);
CREATE INDEX IF NOT EXISTS idx_species_active ON public.species(is_active);

-- Insert default species for existing farms
-- Also create species entries for any existing unique species values in animals table
INSERT INTO public.species (farm_id, code, name_lt)
SELECT 
    f.id,
    s.code,
    s.name_lt
FROM public.farms f
CROSS JOIN (
    VALUES 
        ('bovine', 'Galvijai'),
        ('pig', 'Kiaulė'),
        ('sheep', 'Avis'),
        ('goat', 'Ožka'),
        ('horse', 'Arklys'),
        ('chicken', 'Višta'),
        ('dog', 'Šuo'),
        ('cat', 'Katė')
) AS s(code, name_lt)
WHERE f.is_active = true
ON CONFLICT (farm_id, code) DO NOTHING;

-- Create species entries for any existing species codes in animals table
-- This ensures backward compatibility with existing data
INSERT INTO public.species (farm_id, code, name_lt)
SELECT DISTINCT
    a.farm_id,
    a.species AS code,
    CASE 
        WHEN a.species = 'bovine' THEN 'Galvijai'
        WHEN a.species = 'pig' THEN 'Kiaulė'
        WHEN a.species = 'porcine' THEN 'Kiaulė'
        WHEN a.species = 'sheep' THEN 'Avis'
        WHEN a.species = 'ovine' THEN 'Avis'
        WHEN a.species = 'goat' THEN 'Ožka'
        WHEN a.species = 'caprine' THEN 'Ožka'
        WHEN a.species = 'horse' THEN 'Arklys'
        WHEN a.species = 'equine' THEN 'Arklys'
        WHEN a.species = 'chicken' THEN 'Višta'
        WHEN a.species = 'dog' THEN 'Šuo'
        WHEN a.species = 'cat' THEN 'Katė'
        ELSE initcap(a.species)
    END AS name_lt
FROM public.animals a
WHERE a.species IS NOT NULL 
    AND a.species != ''
ON CONFLICT (farm_id, code) DO NOTHING;

-- Enable RLS
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (permissive for custom auth)
DROP POLICY IF EXISTS "Allow all operations on species" ON public.species;
CREATE POLICY "Allow all operations on species" 
    ON public.species FOR ALL 
    USING (true) 
    WITH CHECK (true);

COMMENT ON POLICY "Allow all operations on species" ON public.species IS 'Allows all users to manage species. Application handles authorization.';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.species TO authenticated;
