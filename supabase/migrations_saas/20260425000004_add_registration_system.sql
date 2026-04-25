-- =====================================================================
-- ADD REGISTRATION CODE SYSTEM
-- =====================================================================
-- Created: 2026-04-25
-- Description: Add registration code column for client onboarding
-- =====================================================================

-- Add registration_code column to clients table
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS registration_code text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_clients_registration_code ON public.clients(registration_code);

COMMENT ON COLUMN public.clients.registration_code IS 'Unique code for client registration/onboarding (format: XXXX-XXXX-XXXX)';

-- Function to validate registration code and get client info
CREATE OR REPLACE FUNCTION public.validate_registration_code(p_code text)
RETURNS TABLE(
    client_id uuid,
    client_name text,
    client_email text,
    subscription_plan text,
    subscription_status text,
    is_active boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.name,
        c.contact_email,
        c.subscription_plan::text,
        c.subscription_status::text,
        c.is_active
    FROM public.clients c
    WHERE c.registration_code = p_code
        AND c.is_active = true
        AND c.subscription_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.validate_registration_code IS 'Validates registration code and returns client info for registration';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.validate_registration_code(text) TO anon;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
