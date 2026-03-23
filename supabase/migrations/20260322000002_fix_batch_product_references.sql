-- =====================================================================
-- Fix Batch Product References
-- =====================================================================
-- Issue: Some batches reference warehouse products (farm_id = NULL)
-- instead of farm-specific products, causing stock to not display
-- in treatment forms.
--
-- This migration:
-- 1. Finds batches that reference warehouse products
-- 2. Creates farm-specific products if they don't exist
-- 3. Updates batches to reference the correct farm-specific product

DO $$
DECLARE
  batch_record RECORD;
  warehouse_product RECORD;
  farm_product_id uuid;
BEGIN
  RAISE NOTICE 'Starting batch product reference fix...';
  
  -- Loop through all batches that reference warehouse products
  FOR batch_record IN 
    SELECT b.id as batch_id, b.farm_id, b.product_id as warehouse_product_id, p.name as product_name
    FROM public.batches b
    JOIN public.products p ON p.id = b.product_id
    WHERE p.farm_id IS NULL  -- Warehouse product
      AND b.farm_id IS NOT NULL  -- But batch belongs to a farm
  LOOP
    RAISE NOTICE 'Processing batch % for farm % (warehouse product: %)', 
      batch_record.batch_id, batch_record.farm_id, batch_record.product_name;
    
    -- Check if farm-specific product already exists
    SELECT id INTO farm_product_id
    FROM public.products
    WHERE farm_id = batch_record.farm_id
      AND name = batch_record.product_name
    LIMIT 1;
    
    -- If farm product doesn't exist, create it
    IF farm_product_id IS NULL THEN
      RAISE NOTICE '  Creating farm-specific product for: %', batch_record.product_name;
      
      -- Get warehouse product details
      SELECT * INTO warehouse_product
      FROM public.products
      WHERE id = batch_record.warehouse_product_id;
      
      -- Create farm-specific product
      INSERT INTO public.products (
        farm_id,
        name,
        category,
        primary_pack_unit,
        primary_pack_size,
        active_substance,
        registration_code,
        dosage_notes,
        withdrawal_days_meat,
        withdrawal_days_milk,
        subcategory,
        subcategory_2,
        package_weight_g,
        is_active
      ) VALUES (
        batch_record.farm_id,
        warehouse_product.name,
        warehouse_product.category,
        warehouse_product.primary_pack_unit,
        warehouse_product.primary_pack_size,
        warehouse_product.active_substance,
        warehouse_product.registration_code,
        warehouse_product.dosage_notes,
        warehouse_product.withdrawal_days_meat,
        warehouse_product.withdrawal_days_milk,
        warehouse_product.subcategory,
        warehouse_product.subcategory_2,
        warehouse_product.package_weight_g,
        warehouse_product.is_active
      )
      RETURNING id INTO farm_product_id;
      
      RAISE NOTICE '  Created farm product with ID: %', farm_product_id;
    ELSE
      RAISE NOTICE '  Farm product already exists with ID: %', farm_product_id;
    END IF;
    
    -- Update batch to reference farm-specific product
    UPDATE public.batches
    SET product_id = farm_product_id
    WHERE id = batch_record.batch_id;
    
    RAISE NOTICE '  Updated batch to reference farm product';
  END LOOP;
  
  RAISE NOTICE 'Batch product reference fix completed!';
END $$;

-- Verify the fix
SELECT 
  'Batches with warehouse products' as status,
  COUNT(*) as count
FROM public.batches b
JOIN public.products p ON p.id = b.product_id
WHERE p.farm_id IS NULL AND b.farm_id IS NOT NULL;
