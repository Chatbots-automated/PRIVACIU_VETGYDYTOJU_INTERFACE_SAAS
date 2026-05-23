-- =====================================================================
-- FIX CLIENT_PAYMENTS RLS FOR CUSTOM AUTH
-- =====================================================================
-- Description: Disable RLS on client_payments since we're using custom auth
-- The application layer handles authorization through custom auth context
-- Created: 2026-05-23
-- =====================================================================

-- Drop existing policy
DROP POLICY IF EXISTS "client_admin can manage payments" ON public.client_payments;

-- Disable RLS on client_payments (custom auth handles security in app layer)
ALTER TABLE public.client_payments DISABLE ROW LEVEL SECURITY;

-- Ensure permissions are granted
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_payments TO anon;

-- Add comment explaining why RLS is disabled
COMMENT ON TABLE public.client_payments IS 'Payment tracking for custom daily subscription plans. RLS disabled - security handled by custom auth in application layer.';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Successfully disabled RLS on client_payments table for custom auth compatibility';
END $$;
