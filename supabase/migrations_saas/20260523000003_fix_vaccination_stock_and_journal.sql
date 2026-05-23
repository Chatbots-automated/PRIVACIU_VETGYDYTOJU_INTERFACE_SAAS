-- =====================================================================
-- FIX VACCINATION STOCK DEDUCTION AND JOURNAL DISPLAY
-- =====================================================================
-- Description: Add trigger to automatically create usage_items for vaccinations
--              This fixes:
--              1. Vaccine stock not deducting in bulk treatments
--              2. Vaccine products not showing in treatment journals
--              3. Withdrawal periods not showing for vaccines
-- Created: 2026-05-23
-- =====================================================================

-- Step 1: Create function to automatically create usage_item from vaccination
CREATE OR REPLACE FUNCTION public.create_usage_item_from_vaccination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only create usage_item if batch_id OR warehouse_batch_id is provided
    IF (NEW.batch_id IS NOT NULL OR NEW.warehouse_batch_id IS NOT NULL) 
       AND NEW.dose_amount IS NOT NULL 
       AND NEW.dose_amount > 0 THEN
        
        -- Create usage_item for the vaccination
        -- NOTE: Only set vaccination_id as parent (not treatment_id) to satisfy usage_items_single_parent constraint
        INSERT INTO public.usage_items (
            client_id,
            farm_id,
            product_id,
            batch_id,
            warehouse_batch_id,
            quantity,
            unit,
            vaccination_id,
            administered_date,
            created_at
        ) VALUES (
            NEW.client_id,
            NEW.farm_id,
            NEW.product_id,
            NEW.batch_id, -- NULL if from warehouse
            NEW.warehouse_batch_id, -- NULL if from farm
            NEW.dose_amount,
            NEW.unit,
            NEW.id,
            NEW.vaccination_date,
            NEW.created_at
        );

        RAISE NOTICE 'Created usage_item for vaccination %. Product: %, Batch: % / Warehouse: %, Qty: % %',
            NEW.id, NEW.product_id, NEW.batch_id, NEW.warehouse_batch_id, NEW.dose_amount, NEW.unit;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_usage_item_from_vaccination() IS 'Automatically creates usage_item when vaccination is recorded - enables stock deduction and journal reporting';

-- Step 2: Create trigger on vaccinations table
DROP TRIGGER IF EXISTS create_usage_from_vaccination ON public.vaccinations;

CREATE TRIGGER create_usage_from_vaccination 
AFTER INSERT ON public.vaccinations
FOR EACH ROW 
EXECUTE FUNCTION public.create_usage_item_from_vaccination();

COMMENT ON TRIGGER create_usage_from_vaccination ON public.vaccinations IS 'Auto-creates usage_item for each vaccination to track stock usage and enable journal reporting';

-- Step 3: Grant permissions
GRANT EXECUTE ON FUNCTION public.create_usage_item_from_vaccination() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_usage_item_from_vaccination() TO anon;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Successfully created vaccination trigger - vaccine stock will now deduct and show in journals!';
END $$;
