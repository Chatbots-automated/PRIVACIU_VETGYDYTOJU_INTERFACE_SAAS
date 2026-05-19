-- =====================================================================
-- FIX MISSING CLIENT RECORDS
-- =====================================================================
-- Created: 2026-05-19
-- Description: Create missing client records for users with orphaned client_ids
--              and ensure referential integrity across the database
-- =====================================================================

-- First, let's check if there are any orphaned client_ids
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT u.client_id)
    INTO orphaned_count
    FROM public.users u
    LEFT JOIN public.clients c ON u.client_id = c.id
    WHERE c.id IS NULL;
    
    RAISE NOTICE 'Found % orphaned client_ids in users table', orphaned_count;
END $$;

-- Create missing client records for any orphaned client_ids
-- This uses information from the users table to create reasonable defaults
INSERT INTO public.clients (
    id,
    name,
    contact_email,
    subscription_plan,
    subscription_status,
    subscription_start_date,
    max_farms,
    max_users,
    is_active,
    vat_registered,
    created_at,
    updated_at
)
SELECT DISTINCT
    u.client_id,
    COALESCE(
        (SELECT c.name FROM public.clients c WHERE c.id IN (SELECT client_id FROM public.users WHERE client_id IS NOT NULL) LIMIT 1),
        'Organizacija ' || SUBSTRING(u.client_id::text, 1, 8)
    ) as name,
    COALESCE(
        MIN(u.email) FILTER (WHERE u.email IS NOT NULL),
        'contact@' || SUBSTRING(u.client_id::text, 1, 8) || '.lt'
    ) as contact_email,
    'professional'::subscription_plan as subscription_plan,
    'active'::subscription_status as subscription_status,
    NOW() as subscription_start_date,
    15 as max_farms,
    5 as max_users,
    true as is_active,
    false as vat_registered,
    NOW() as created_at,
    NOW() as updated_at
FROM public.users u
LEFT JOIN public.clients c ON u.client_id = c.id
WHERE c.id IS NULL
  AND u.client_id IS NOT NULL
GROUP BY u.client_id
ON CONFLICT (id) DO NOTHING;

-- Verify the fix worked
DO $$
DECLARE
    remaining_orphans INTEGER;
    total_clients INTEGER;
    total_users INTEGER;
BEGIN
    -- Check for remaining orphans
    SELECT COUNT(DISTINCT u.client_id)
    INTO remaining_orphans
    FROM public.users u
    LEFT JOIN public.clients c ON u.client_id = c.id
    WHERE c.id IS NULL AND u.client_id IS NOT NULL;
    
    -- Get totals
    SELECT COUNT(*) INTO total_clients FROM public.clients;
    SELECT COUNT(*) INTO total_users FROM public.users;
    
    RAISE NOTICE '=== Migration Results ===';
    RAISE NOTICE 'Total clients: %', total_clients;
    RAISE NOTICE 'Total users: %', total_users;
    RAISE NOTICE 'Remaining orphaned client_ids: %', remaining_orphans;
    
    IF remaining_orphans > 0 THEN
        RAISE WARNING 'There are still % orphaned client_ids! Manual intervention required.', remaining_orphans;
    ELSE
        RAISE NOTICE 'SUCCESS: All client_ids are now valid!';
    END IF;
END $$;

-- Add helpful comments
COMMENT ON TABLE public.clients IS 'Client organizations in the multi-tenant system. All users must belong to a valid client.';

-- Create a function to prevent orphaned client_ids in the future
CREATE OR REPLACE FUNCTION public.validate_user_client_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if client_id exists in clients table
    IF NEW.client_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.clients WHERE id = NEW.client_id
    ) THEN
        RAISE EXCEPTION 'Invalid client_id: %. Client does not exist in clients table.', NEW.client_id
            USING HINT = 'Create the client record first before assigning users to it.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to users table to validate client_id
DROP TRIGGER IF EXISTS validate_user_client_id_trigger ON public.users;
CREATE TRIGGER validate_user_client_id_trigger
    BEFORE INSERT OR UPDATE OF client_id ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_user_client_id();

COMMENT ON FUNCTION public.validate_user_client_id IS 'Validates that user client_id references an existing client';
COMMENT ON TRIGGER validate_user_client_id_trigger ON public.users IS 'Prevents orphaned client_ids in users table';

-- Similarly validate farms table
CREATE OR REPLACE FUNCTION public.validate_farm_client_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if client_id exists in clients table
    IF NEW.client_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.clients WHERE id = NEW.client_id
    ) THEN
        RAISE EXCEPTION 'Invalid client_id: %. Client does not exist in clients table.', NEW.client_id
            USING HINT = 'Create the client record first before creating farms.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to farms table to validate client_id
DROP TRIGGER IF EXISTS validate_farm_client_id_trigger ON public.farms;
CREATE TRIGGER validate_farm_client_id_trigger
    BEFORE INSERT OR UPDATE OF client_id ON public.farms
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_farm_client_id();

COMMENT ON FUNCTION public.validate_farm_client_id IS 'Validates that farm client_id references an existing client';
COMMENT ON TRIGGER validate_farm_client_id_trigger ON public.farms IS 'Prevents orphaned client_ids in farms table';

-- Similarly validate products table
CREATE OR REPLACE FUNCTION public.validate_product_client_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if client_id exists in clients table
    IF NEW.client_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.clients WHERE id = NEW.client_id
    ) THEN
        RAISE EXCEPTION 'Invalid client_id: %. Client does not exist in clients table.', NEW.client_id
            USING HINT = 'Create the client record first before creating products.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to products table to validate client_id
DROP TRIGGER IF EXISTS validate_product_client_id_trigger ON public.products;
CREATE TRIGGER validate_product_client_id_trigger
    BEFORE INSERT OR UPDATE OF client_id ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.validate_product_client_id();

COMMENT ON FUNCTION public.validate_product_client_id IS 'Validates that product client_id references an existing client';
COMMENT ON TRIGGER validate_product_client_id_trigger ON public.products IS 'Prevents orphaned client_ids in products table';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
-- This migration:
-- 1. ✅ Identified orphaned client_ids
-- 2. ✅ Created missing client records with reasonable defaults
-- 3. ✅ Verified all client_ids are now valid
-- 4. ✅ Added triggers to prevent future orphaned client_ids
-- =====================================================================
