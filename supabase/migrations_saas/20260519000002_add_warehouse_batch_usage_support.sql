-- =====================================================================
-- ADD WAREHOUSE BATCH USAGE SUPPORT
-- =====================================================================
-- Created: 2026-05-19
-- Description: Allow farms to use products directly from warehouse_batches
-- without requiring allocation to farm batches first
-- =====================================================================

-- =====================================================================
-- 1. ADD WAREHOUSE_BATCH_ID TO USAGE_ITEMS
-- =====================================================================

ALTER TABLE public.usage_items
  ADD COLUMN IF NOT EXISTS warehouse_batch_id uuid REFERENCES public.warehouse_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_usage_items_warehouse_batch_id 
  ON public.usage_items(warehouse_batch_id);

COMMENT ON COLUMN public.usage_items.warehouse_batch_id IS 'References warehouse batch when using client-wide stock directly';

-- Update the constraint to allow either batch_id OR warehouse_batch_id (but not both)
ALTER TABLE public.usage_items
  DROP CONSTRAINT IF EXISTS usage_items_batch_source_check;

ALTER TABLE public.usage_items
  ADD CONSTRAINT usage_items_batch_source_check 
  CHECK (
    (batch_id IS NOT NULL AND warehouse_batch_id IS NULL) OR
    (batch_id IS NULL AND warehouse_batch_id IS NOT NULL)
  );

-- =====================================================================
-- 2. CREATE TRIGGER FOR WAREHOUSE BATCH USAGE
-- =====================================================================

CREATE OR REPLACE FUNCTION update_warehouse_batch_qty_on_usage()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.warehouse_batch_id IS NOT NULL THEN
            UPDATE public.warehouse_batches
            SET 
                qty_left = qty_left - NEW.quantity,
                updated_at = now()
            WHERE id = NEW.warehouse_batch_id;
            
            IF NOT FOUND THEN
                RAISE EXCEPTION 'Warehouse batch not found: %', NEW.warehouse_batch_id;
            END IF;
        END IF;
        RETURN NEW;

    -- Handle UPDATE
    ELSIF TG_OP = 'UPDATE' THEN
        -- If warehouse_batch_id changed
        IF OLD.warehouse_batch_id IS DISTINCT FROM NEW.warehouse_batch_id THEN
            -- Restore qty to old batch
            IF OLD.warehouse_batch_id IS NOT NULL THEN
                UPDATE public.warehouse_batches
                SET 
                    qty_left = qty_left + OLD.quantity,
                    updated_at = now()
                WHERE id = OLD.warehouse_batch_id;
            END IF;
            
            -- Deduct from new batch
            IF NEW.warehouse_batch_id IS NOT NULL THEN
                UPDATE public.warehouse_batches
                SET 
                    qty_left = qty_left - NEW.quantity,
                    updated_at = now()
                WHERE id = NEW.warehouse_batch_id;
            END IF;
            
        -- If quantity changed but warehouse_batch_id stayed the same
        ELSIF OLD.quantity != NEW.quantity AND NEW.warehouse_batch_id IS NOT NULL THEN
            UPDATE public.warehouse_batches
            SET 
                qty_left = qty_left + OLD.quantity - NEW.quantity,
                updated_at = now()
            WHERE id = NEW.warehouse_batch_id;
        END IF;
        RETURN NEW;

    -- Handle DELETE
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.warehouse_batch_id IS NOT NULL THEN
            UPDATE public.warehouse_batches
            SET 
                qty_left = qty_left + OLD.quantity,
                updated_at = now()
            WHERE id = OLD.warehouse_batch_id;
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_warehouse_batch_qty_on_usage ON public.usage_items;

CREATE TRIGGER trigger_update_warehouse_batch_qty_on_usage
    AFTER INSERT OR UPDATE OR DELETE ON public.usage_items
    FOR EACH ROW
    EXECUTE FUNCTION update_warehouse_batch_qty_on_usage();

COMMENT ON FUNCTION update_warehouse_batch_qty_on_usage() IS 'Automatically updates warehouse_batches.qty_left when products are used directly from warehouse';

-- =====================================================================
-- 3. UPDATE EXISTING TRIGGERS FOR BIOCIDE_USAGE AND VACCINATIONS
-- =====================================================================

-- Add warehouse_batch_id to biocide_usage table
ALTER TABLE public.biocide_usage
  ADD COLUMN IF NOT EXISTS warehouse_batch_id uuid REFERENCES public.warehouse_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_biocide_usage_warehouse_batch_id 
  ON public.biocide_usage(warehouse_batch_id);

-- Add batch source constraint for biocide_usage
ALTER TABLE public.biocide_usage
  DROP CONSTRAINT IF EXISTS biocide_usage_batch_source_check;

ALTER TABLE public.biocide_usage
  ADD CONSTRAINT biocide_usage_batch_source_check 
  CHECK (
    (batch_id IS NOT NULL AND warehouse_batch_id IS NULL) OR
    (batch_id IS NULL AND warehouse_batch_id IS NOT NULL)
  );

-- Add warehouse_batch_id to vaccinations table
ALTER TABLE public.vaccinations
  ADD COLUMN IF NOT EXISTS warehouse_batch_id uuid REFERENCES public.warehouse_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vaccinations_warehouse_batch_id 
  ON public.vaccinations(warehouse_batch_id);

-- Add batch source constraint for vaccinations
ALTER TABLE public.vaccinations
  DROP CONSTRAINT IF EXISTS vaccinations_batch_source_check;

ALTER TABLE public.vaccinations
  ADD CONSTRAINT vaccinations_batch_source_check 
  CHECK (
    (batch_id IS NOT NULL AND warehouse_batch_id IS NULL) OR
    (batch_id IS NULL AND warehouse_batch_id IS NOT NULL) OR
    (batch_id IS NULL AND warehouse_batch_id IS NULL)
  );

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
