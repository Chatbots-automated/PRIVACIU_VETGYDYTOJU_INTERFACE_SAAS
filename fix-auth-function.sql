-- =====================================================================
-- Fix Authentication Function
-- =====================================================================
-- The verify_password function needs to return user_farm_id
-- This fixes the 409 error when logging in

-- Update verify_password to return farm_id
CREATE OR REPLACE FUNCTION public.verify_password(p_email text, p_password text)
RETURNS TABLE(user_id uuid, user_email text, user_role text, user_farm_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.role, u.farm_id
  FROM public.users u
  WHERE u.email = p_email
    AND u.password_hash = crypt(p_password, u.password_hash)
    AND u.is_frozen = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_password(text, text) IS 'Verifies user credentials and returns user info including farm_id for custom auth';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO authenticated;

-- Verify the function signature
SELECT 
    routine_name,
    data_type,
    ordinal_position,
    parameter_name
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND routine_name = 'verify_password'
ORDER BY ordinal_position;
