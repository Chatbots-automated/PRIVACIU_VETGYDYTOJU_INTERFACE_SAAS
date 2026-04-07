-- =====================================================================
-- Fix Cross-Farm Batch Product References
-- =====================================================================
-- Issue: Some batches reference products from OTHER farms
-- (batch.farm_id != product.farm_id)
--
-- This migration:
-- 1. Finds batches where batch.farm_id != product.farm_id
-- 2. Creates farm-specific products if they don't exist
-- 3. Updates batches to reference the correct farm-specific product

DO $$
DECLARE
  batch_record RECORD;
  source_product RECORD;
  farm_product_id uuid;
  fixed_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting cross-farm batch product reference fix...';
  
  -- Loop through all batches where farm_id doesn't match product's farm_id
  FOR batch_record IN 
    SELECT 
      b.id as batch_id, 
      b.farm_id, 
      b.product_id as source_product_id,
      p.name as product_name,
      p.farm_id as product_farm_id
    FROM public.batches b
    JOIN public.products p ON p.id = b.product_id
    WHERE b.farm_id IS NOT NULL  -- Batch belongs to a farm
      AND (p.farm_id IS NULL OR p.farm_id != b.farm_id)  -- Product is warehouse or different farm
  LOOP
    RAISE NOTICE 'Processing batch % at farm % (product from farm %: %)', 
      batch_record.batch_id, 
      batch_record.farm_id, 
      batch_record.product_farm_id,
      batch_record.product_name;
    
    -- Check if correct farm-specific product already exists
    SELECT id INTO farm_product_id
    FROM public.products
    WHERE farm_id = batch_record.farm_id
      AND name = batch_record.product_name
    LIMIT 1;
    
    -- If farm product doesn't exist, create it
    IF farm_product_id IS NULL THEN
      RAISE NOTICE '  Creating farm-specific product for: %', batch_record.product_name;
      
      -- Get source product details
      SELECT * INTO source_product
      FROM public.products
      WHERE id = batch_record.source_product_id;
      
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
        is_active
      ) VALUES (
        batch_record.farm_id,
        source_product.name,
        source_product.category,
        source_product.primary_pack_unit,
        source_product.primary_pack_size,
        source_product.active_substance,
        source_product.registration_code,
        source_product.dosage_notes,
        source_product.withdrawal_days_meat,
        source_product.withdrawal_days_milk,
        source_product.subcategory,
        true
      )
      RETURNING id INTO farm_product_id;
      
      RAISE NOTICE '  Created farm product with id: %', farm_product_id;
    ELSE
      RAISE NOTICE '  Found existing farm product with id: %', farm_product_id;
    END IF;
    
    -- Update batch to reference correct farm product
    UPDATE public.batches
    SET product_id = farm_product_id
    WHERE id = batch_record.batch_id;
    
    fixed_count := fixed_count + 1;
    RAISE NOTICE '  ✓ Updated batch % to reference farm product %', batch_record.batch_id, farm_product_id;
  END LOOP;
  
  RAISE NOTICE 'Completed! Fixed % batches with cross-farm product references', fixed_count;
END $$;
