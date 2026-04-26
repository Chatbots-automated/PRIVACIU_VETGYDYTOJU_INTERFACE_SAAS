-- =====================================================
-- FIX BATCH STOCK DEDUCTION
-- Created: 2026-04-26
-- =====================================================
-- This migration adds triggers to automatically update batches.qty_used
-- when usage_items are created, updated, or deleted

-- =====================================================
-- 1. FUNCTION TO UPDATE BATCH QTY_USED
-- =====================================================

CREATE OR REPLACE FUNCTION update_batch_qty_used()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        UPDATE public.batches
        SET qty_used = qty_used + NEW.quantity
        WHERE id = NEW.batch_id;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- If batch_id changed, adjust both old and new batches
        IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
            -- Decrease qty_used from old batch
            IF OLD.batch_id IS NOT NULL THEN
                UPDATE public.batches
                SET qty_used = qty_used - OLD.quantity
                WHERE id = OLD.batch_id;
            END IF;
            
            -- Increase qty_used in new batch
            IF NEW.batch_id IS NOT NULL THEN
                UPDATE public.batches
                SET qty_used = qty_used + NEW.quantity
                WHERE id = NEW.batch_id;
            END IF;
        -- If only quantity changed
        ELSIF OLD.quantity != NEW.quantity THEN
            UPDATE public.batches
            SET qty_used = qty_used - OLD.quantity + NEW.quantity
            WHERE id = NEW.batch_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.batch_id IS NOT NULL THEN
            UPDATE public.batches
            SET qty_used = qty_used - OLD.quantity
            WHERE id = OLD.batch_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION update_batch_qty_used IS 'Automatically updates batch qty_used when usage_items are inserted/updated/deleted';

-- =====================================================
-- 2. CREATE TRIGGER ON USAGE_ITEMS
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_batch_qty_used ON public.usage_items;

CREATE TRIGGER trigger_update_batch_qty_used
    AFTER INSERT OR UPDATE OR DELETE ON public.usage_items
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_qty_used();

-- =====================================================
-- 3. RECALCULATE EXISTING QTY_USED
-- =====================================================
-- Fix any existing batches that have incorrect qty_used

UPDATE public.batches b
SET qty_used = COALESCE(
    (SELECT SUM(ui.quantity)
     FROM public.usage_items ui
     WHERE ui.batch_id = b.id),
    0
)
WHERE EXISTS (
    SELECT 1 FROM public.usage_items ui WHERE ui.batch_id = b.id
);

-- =====================================================
-- 4. SIMILAR TRIGGER FOR BIOCIDE_USAGE (if applicable)
-- =====================================================

CREATE OR REPLACE FUNCTION update_batch_qty_used_biocide()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Handle INSERT
    IF TG_OP = 'INSERT' THEN
        IF NEW.batch_id IS NOT NULL THEN
            UPDATE public.batches
            SET qty_used = qty_used + NEW.quantity_used
            WHERE id = NEW.batch_id;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle UPDATE
    IF TG_OP = 'UPDATE' THEN
        -- If batch_id changed, adjust both old and new batches
        IF OLD.batch_id IS DISTINCT FROM NEW.batch_id THEN
            -- Decrease qty_used from old batch
            IF OLD.batch_id IS NOT NULL THEN
                UPDATE public.batches
                SET qty_used = qty_used - OLD.quantity_used
                WHERE id = OLD.batch_id;
            END IF;
            
            -- Increase qty_used in new batch
            IF NEW.batch_id IS NOT NULL THEN
                UPDATE public.batches
                SET qty_used = qty_used + NEW.quantity_used
                WHERE id = NEW.batch_id;
            END IF;
        -- If only quantity changed
        ELSIF OLD.quantity_used != NEW.quantity_used THEN
            IF NEW.batch_id IS NOT NULL THEN
                UPDATE public.batches
                SET qty_used = qty_used - OLD.quantity_used + NEW.quantity_used
                WHERE id = NEW.batch_id;
            END IF;
        END IF;
        
        RETURN NEW;
    END IF;
    
    -- Handle DELETE
    IF TG_OP = 'DELETE' THEN
        IF OLD.batch_id IS NOT NULL THEN
            UPDATE public.batches
            SET qty_used = qty_used - OLD.quantity_used
            WHERE id = OLD.batch_id;
        END IF;
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION update_batch_qty_used_biocide IS 'Automatically updates batch qty_used when biocide_usage records are inserted/updated/deleted';

DROP TRIGGER IF EXISTS trigger_update_batch_qty_used_biocide ON public.biocide_usage;

CREATE TRIGGER trigger_update_batch_qty_used_biocide
    AFTER INSERT OR UPDATE OR DELETE ON public.biocide_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_batch_qty_used_biocide();

-- Recalculate for biocide_usage
UPDATE public.batches b
SET qty_used = COALESCE(
    (SELECT SUM(ui.quantity)
     FROM public.usage_items ui
     WHERE ui.batch_id = b.id),
    0
) + COALESCE(
    (SELECT SUM(bu.quantity_used)
     FROM public.biocide_usage bu
     WHERE bu.batch_id = b.id),
    0
)
WHERE EXISTS (
    SELECT 1 FROM public.biocide_usage bu WHERE bu.batch_id = b.id
);
