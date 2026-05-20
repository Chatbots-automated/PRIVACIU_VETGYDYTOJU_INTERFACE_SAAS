-- Add 'Tiekėjo išlaidos' (Supplier Costs) category - Part 1: Enum Value
-- This must be run FIRST and committed before the rest

-- Add new category to enum if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'supplier_costs' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_category')
    ) THEN
        ALTER TYPE product_category ADD VALUE 'supplier_costs';
    END IF;
END $$;

-- Add fields to track which invoice/batch the supplier costs belong to
ALTER TABLE public.warehouse_batches 
ADD COLUMN IF NOT EXISTS linked_batch_group TEXT;

ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS linked_batch_group TEXT;

COMMENT ON COLUMN public.warehouse_batches.linked_batch_group IS 'Groups batches that arrived together (same invoice/delivery). Used to proportion supplier costs across products.';
COMMENT ON COLUMN public.batches.linked_batch_group IS 'Groups batches that arrived together (same invoice/delivery). Used to proportion supplier costs across products.';
