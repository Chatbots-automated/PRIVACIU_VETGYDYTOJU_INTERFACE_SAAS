-- =====================================================================
-- FIX LOGIN 409 ERROR - URGENT
-- =====================================================================
-- Run this immediately in Supabase SQL Editor to fix login

-- Update verify_password to return user_farm_id (4th column)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO authenticated;

-- Test it works
SELECT * FROM verify_password('gratasgedraitis@gmail.com', '123456');
