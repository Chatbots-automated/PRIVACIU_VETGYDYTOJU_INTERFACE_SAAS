-- =====================================================================
-- ADD TREATMENT_ID COLUMN TO VACCINATIONS TABLE
-- =====================================================================
-- Description: Add treatment_id column to vaccinations table to link
--              vaccinations with treatments for proper journal display
-- Created: 2026-05-23
-- =====================================================================

BEGIN;

-- Check if column already exists
DO $$ 
BEGIN
    -- Add treatment_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vaccinations' 
        AND column_name = 'treatment_id'
    ) THEN
        ALTER TABLE public.vaccinations 
        ADD COLUMN treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL;
        
        -- Add index for better query performance
        CREATE INDEX idx_vaccinations_treatment_id ON public.vaccinations(treatment_id);
        
        RAISE NOTICE '✅ Added treatment_id column to vaccinations table';
    ELSE
        RAISE NOTICE 'ℹ️  treatment_id column already exists in vaccinations table';
    END IF;
    
    -- Add warehouse_batch_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'vaccinations' 
        AND column_name = 'warehouse_batch_id'
    ) THEN
        ALTER TABLE public.vaccinations 
        ADD COLUMN warehouse_batch_id uuid REFERENCES public.warehouse_batches(id) ON DELETE SET NULL;
        
        -- Add index for better query performance
        CREATE INDEX idx_vaccinations_warehouse_batch_id ON public.vaccinations(warehouse_batch_id);
        
        RAISE NOTICE '✅ Added warehouse_batch_id column to vaccinations table';
    ELSE
        RAISE NOTICE 'ℹ️  warehouse_batch_id column already exists in vaccinations table';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN public.vaccinations.treatment_id IS 'Links vaccination to treatment record for journal display and tracking';
COMMENT ON COLUMN public.vaccinations.warehouse_batch_id IS 'References warehouse batch when vaccine is from warehouse (for stock tracking)';

COMMIT;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE '✅ Vaccinations table updated successfully!';
    RAISE NOTICE '   - treatment_id column allows linking vaccines to treatments';
    RAISE NOTICE '   - warehouse_batch_id column allows tracking warehouse vaccine usage';
END $$;
