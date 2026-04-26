-- Migration to merge duplicate products with the same name in the same farm
-- This keeps the oldest product and updates all references

DO $$
DECLARE
    duplicate_record RECORD;
    keep_id UUID;
    delete_ids UUID[];
BEGIN
    -- Find duplicate products (same name, same farm_id, same client_id)
    FOR duplicate_record IN
        SELECT 
            name,
            farm_id,
            client_id,
            array_agg(id ORDER BY created_at) as product_ids,
            COUNT(*) as duplicate_count
        FROM public.products
        WHERE farm_id IS NOT NULL
        GROUP BY name, farm_id, client_id
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first (oldest) product, delete the rest
        keep_id := duplicate_record.product_ids[1];
        delete_ids := duplicate_record.product_ids[2:];
        
        RAISE NOTICE 'Merging duplicates for product: % (farm_id: %)', duplicate_record.name, duplicate_record.farm_id;
        RAISE NOTICE '  Keeping: %', keep_id;
        RAISE NOTICE '  Deleting: %', delete_ids;
        
        -- Update all references to point to the kept product
        
        -- Update batches
        UPDATE public.batches
        SET product_id = keep_id
        WHERE product_id = ANY(delete_ids);
        
        -- Update usage_items
        UPDATE public.usage_items
        SET product_id = keep_id
        WHERE product_id = ANY(delete_ids);
        
        -- Update treatment_medications
        UPDATE public.treatment_medications
        SET product_id = keep_id
        WHERE product_id = ANY(delete_ids);
        
        -- Update warehouse_batches
        UPDATE public.warehouse_batches
        SET product_id = keep_id
        WHERE product_id = ANY(delete_ids);
        
        -- Update farm_stock_allocations
        UPDATE public.farm_stock_allocations
        SET product_id = keep_id
        WHERE product_id = ANY(delete_ids);
        
        -- Delete the duplicate products
        DELETE FROM public.products
        WHERE id = ANY(delete_ids);
        
        RAISE NOTICE '  ✅ Merged successfully';
    END LOOP;
    
    RAISE NOTICE '🎉 Duplicate product merge complete!';
END $$;
