-- =====================================================================
-- Truncate All Data Tables (Preserve Users and Farms)
-- =====================================================================
-- Migration: 20260325000004
-- Created: 2026-03-25
--
-- OVERVIEW:
-- Clears all operational data from the system while preserving:
-- - users (user accounts)
-- - farms (client/farm information)
--
-- WARNING: This will delete ALL data including:
-- - Animals, treatments, visits, vaccinations
-- - Products, batches, invoices, stock
-- - Warehouse data, usage items
-- - All other operational records
--
-- This operation CANNOT be undone!
-- =====================================================================

-- Disable triggers temporarily to avoid cascading issues
SET session_replication_role = replica;

-- =====================================================================
-- TRUNCATE DATA TABLES (in order to respect foreign key dependencies)
-- =====================================================================

-- 1. Clear dependent records first (usage, courses, doses, schedules)
TRUNCATE TABLE public.course_doses CASCADE;
TRUNCATE TABLE public.course_medication_schedules CASCADE;
TRUNCATE TABLE public.treatment_courses CASCADE;
TRUNCATE TABLE public.usage_items CASCADE;

-- 2. Clear treatment and visit related tables
TRUNCATE TABLE public.teat_status CASCADE;
TRUNCATE TABLE public.treatments CASCADE;
TRUNCATE TABLE public.animal_visits CASCADE;
TRUNCATE TABLE public.vaccinations CASCADE;
TRUNCATE TABLE public.hoof_records CASCADE;

-- 3. Clear synchronization and insemination records
TRUNCATE TABLE public.synchronization_steps CASCADE;
TRUNCATE TABLE public.animal_synchronizations CASCADE;
TRUNCATE TABLE public.synchronization_protocols CASCADE;
TRUNCATE TABLE public.insemination_records CASCADE;
TRUNCATE TABLE public.insemination_inventory CASCADE;
TRUNCATE TABLE public.insemination_products CASCADE;

-- 4. Clear biocide and waste tracking
TRUNCATE TABLE public.batch_waste_tracking CASCADE;
TRUNCATE TABLE public.medical_waste CASCADE;
TRUNCATE TABLE public.biocide_usage CASCADE;

-- 5. Clear animals (after all dependent records are cleared)
TRUNCATE TABLE public.animals CASCADE;

-- 6. Clear inventory and warehouse data
TRUNCATE TABLE public.batches CASCADE;
TRUNCATE TABLE public.invoice_items CASCADE;
TRUNCATE TABLE public.invoices CASCADE;
TRUNCATE TABLE public.warehouse_batches CASCADE;

-- 7. Clear products and suppliers
TRUNCATE TABLE public.products CASCADE;
TRUNCATE TABLE public.suppliers CASCADE;

-- 8. Clear reference data (diseases, hoof codes)
TRUNCATE TABLE public.diseases CASCADE;
TRUNCATE TABLE public.hoof_condition_codes CASCADE;

-- 9. Clear system settings and notepad
TRUNCATE TABLE public.shared_notepad CASCADE;
TRUNCATE TABLE public.system_settings CASCADE;

-- 10. Clear audit logs (optional - you may want to keep these)
TRUNCATE TABLE public.user_audit_logs CASCADE;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- =====================================================================
-- VERIFICATION
-- =====================================================================

-- Show remaining record counts for preserved tables
DO $$
DECLARE
    user_count INTEGER;
    farm_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users;
    SELECT COUNT(*) INTO farm_count FROM public.farms;
    
    RAISE NOTICE 'Data truncation complete!';
    RAISE NOTICE 'Preserved records:';
    RAISE NOTICE '  - Users: %', user_count;
    RAISE NOTICE '  - Farms: %', farm_count;
END $$;

-- Optional: Show all table counts to verify truncation
DO $$
DECLARE
    r RECORD;
    row_count INTEGER;
BEGIN
    RAISE NOTICE 'Table record counts after truncation:';
    FOR r IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename NOT LIKE 'pg_%'
        ORDER BY tablename
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM public.%I', r.tablename) INTO row_count;
        IF row_count > 0 THEN
            RAISE NOTICE '  - %: % records', r.tablename, row_count;
        END IF;
    END LOOP;
END $$;
