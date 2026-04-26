-- =====================================================
-- FIX SERVICE PRICES RLS POLICIES
-- Created: 2026-04-26
-- =====================================================
-- This app uses custom auth (not Supabase Auth), so auth.uid() returns NULL
-- For SaaS, we use RLS with simple permissive policies
-- and rely on application-level client_id checks (which are already in place)

-- =====================================================
-- 1. DROP OLD RESTRICTIVE POLICIES
-- =====================================================

DROP POLICY IF EXISTS "service_prices_select_policy" ON public.service_prices;
DROP POLICY IF EXISTS "service_prices_insert_policy" ON public.service_prices;
DROP POLICY IF EXISTS "service_prices_update_policy" ON public.service_prices;
DROP POLICY IF EXISTS "service_prices_delete_policy" ON public.service_prices;

DROP POLICY IF EXISTS "service_invoices_select_policy" ON public.service_invoices;
DROP POLICY IF EXISTS "service_invoices_insert_policy" ON public.service_invoices;
DROP POLICY IF EXISTS "service_invoices_update_policy" ON public.service_invoices;
DROP POLICY IF EXISTS "service_invoices_delete_policy" ON public.service_invoices;

DROP POLICY IF EXISTS "visit_charges_select_policy" ON public.visit_charges;
DROP POLICY IF EXISTS "visit_charges_insert_policy" ON public.visit_charges;
DROP POLICY IF EXISTS "visit_charges_update_policy" ON public.visit_charges;
DROP POLICY IF EXISTS "visit_charges_delete_policy" ON public.visit_charges;

-- =====================================================
-- 2. CREATE PERMISSIVE POLICIES
-- =====================================================
-- Following the pattern used by other tables in this system
-- Application-level checks ensure proper client_id isolation

-- Service Prices - Enable all for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.service_prices;
CREATE POLICY "Enable all for authenticated users" ON public.service_prices
    FOR ALL USING (true) WITH CHECK (true);

-- Service Invoices - Enable all for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.service_invoices;
CREATE POLICY "Enable all for authenticated users" ON public.service_invoices
    FOR ALL USING (true) WITH CHECK (true);

-- Visit Charges - Enable all for authenticated users
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.visit_charges;
CREATE POLICY "Enable all for authenticated users" ON public.visit_charges
    FOR ALL USING (true) WITH CHECK (true);
