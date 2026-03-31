-- Fix usage_items constraint to allow synchronization entries (all three source IDs can be NULL)
ALTER TABLE public.usage_items DROP CONSTRAINT IF EXISTS usage_items_source_check;

ALTER TABLE public.usage_items ADD CONSTRAINT usage_items_source_check CHECK (
    (treatment_id IS NOT NULL AND vaccination_id IS NULL AND biocide_usage_id IS NULL) OR
    (treatment_id IS NULL AND vaccination_id IS NOT NULL AND biocide_usage_id IS NULL) OR
    (treatment_id IS NULL AND vaccination_id IS NULL AND biocide_usage_id IS NOT NULL) OR
    (treatment_id IS NULL AND vaccination_id IS NULL AND biocide_usage_id IS NULL AND purpose = 'synchronization')
);

COMMENT ON CONSTRAINT usage_items_source_check ON public.usage_items IS 'Ensures usage_items are linked to exactly one source (treatment, vaccination, biocide_usage) or are synchronization entries';
