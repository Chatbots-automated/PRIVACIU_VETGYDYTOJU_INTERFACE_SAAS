-- ⚠️ WARNING: THIS SCRIPT DELETES ALL DATA! ⚠️
-- This is a MANUAL script for testing purposes only.
-- DO NOT run this in production!
-- 
-- Usage:
-- Run this manually when you want to clean up and test from scratch.

BEGIN;

-- Disable triggers temporarily to avoid constraint issues
SET session_replication_role = replica;

-- Delete in order respecting foreign keys (children first, then parents)

-- 1. Delete finance-related data
DELETE FROM public.visit_charges;
DELETE FROM public.service_invoices;
DELETE FROM public.service_prices;

-- 2. Delete treatment-related data
DELETE FROM public.usage_items;
DELETE FROM public.course_doses;
DELETE FROM public.course_medication_schedules;
DELETE FROM public.treatment_courses;
DELETE FROM public.treatments;

-- 3. Delete vaccination and prevention data
DELETE FROM public.vaccinations;

-- 4. Delete visit data
DELETE FROM public.animal_visits;

-- 5. Delete hoof care data
DELETE FROM public.hoof_records;

-- 6. Delete teat status data
DELETE FROM public.teat_status;

-- 7. Delete synchronization data
DELETE FROM public.synchronization_steps;
DELETE FROM public.animal_synchronizations;
DELETE FROM public.synchronization_protocols;

-- 8. Delete insemination data
DELETE FROM public.insemination_records;
DELETE FROM public.insemination_inventory;

-- 9. Delete biocide and waste data
DELETE FROM public.batch_waste_tracking;
DELETE FROM public.medical_waste;
DELETE FROM public.biocide_usage;

-- 10. Delete batch and stock data
DELETE FROM public.batches;
DELETE FROM public.warehouse_batches WHERE true;
DELETE FROM public.farm_stock_allocations WHERE true;

-- 11. Delete invoice-related data
DELETE FROM public.invoice_items;
DELETE FROM public.invoices;

-- 12. Finally, delete products
DELETE FROM public.products;

-- Re-enable triggers
SET session_replication_role = DEFAULT;

-- Log what was deleted
DO $$
BEGIN
    RAISE NOTICE '🗑️ ========================================';
    RAISE NOTICE '🗑️ DATABASE CLEANUP COMPLETE';
    RAISE NOTICE '🗑️ ========================================';
    RAISE NOTICE '✅ Deleted all visit_charges';
    RAISE NOTICE '✅ Deleted all service_invoices';
    RAISE NOTICE '✅ Deleted all service_prices';
    RAISE NOTICE '✅ Deleted all usage_items';
    RAISE NOTICE '✅ Deleted all course_doses';
    RAISE NOTICE '✅ Deleted all course_medication_schedules';
    RAISE NOTICE '✅ Deleted all treatment_courses';
    RAISE NOTICE '✅ Deleted all treatments';
    RAISE NOTICE '✅ Deleted all vaccinations';
    RAISE NOTICE '✅ Deleted all animal_visits';
    RAISE NOTICE '✅ Deleted all hoof_records';
    RAISE NOTICE '✅ Deleted all teat_status';
    RAISE NOTICE '✅ Deleted all synchronization data';
    RAISE NOTICE '✅ Deleted all insemination data';
    RAISE NOTICE '✅ Deleted all biocide and waste data';
    RAISE NOTICE '✅ Deleted all batches';
    RAISE NOTICE '✅ Deleted all warehouse_batches';
    RAISE NOTICE '✅ Deleted all farm_stock_allocations';
    RAISE NOTICE '✅ Deleted all invoice_items';
    RAISE NOTICE '✅ Deleted all invoices';
    RAISE NOTICE '✅ Deleted all products';
    RAISE NOTICE '🗑️ ========================================';
    RAISE NOTICE '🎉 Ready for fresh testing!';
    RAISE NOTICE '🗑️ ========================================';
END $$;

COMMIT;
