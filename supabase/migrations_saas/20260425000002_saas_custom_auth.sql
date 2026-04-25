-- =====================================================================
-- CUSTOM AUTHENTICATION SYSTEM FOR SAAS
-- =====================================================================
-- This migration adds custom authentication functions for the multi-tenant SaaS system
-- We use our own user management instead of Supabase Auth

-- =====================================================================
-- AUTH FUNCTIONS
-- =====================================================================

-- Function to verify password and return user info
CREATE OR REPLACE FUNCTION public.verify_password(p_email text, p_password text)
RETURNS TABLE(
    user_id uuid,
    user_email text,
    user_role text,
    user_client_id uuid,
    user_default_farm_id uuid,
    user_can_access_all_farms boolean,
    user_full_name text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.email,
        u.role,
        u.client_id,
        u.default_farm_id,
        u.can_access_all_farms,
        u.full_name
    FROM public.users u
    INNER JOIN public.clients c ON u.client_id = c.id
    WHERE u.email = p_email
        AND u.password_hash = crypt(p_password, u.password_hash)
        AND u.is_frozen = false
        AND c.is_active = true
        AND c.subscription_status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.verify_password(text, text) IS 'Verifies user credentials and returns user info for custom auth. Only returns users from active clients with active subscriptions.';

-- Function to create new user
CREATE OR REPLACE FUNCTION public.create_user(
    p_email text,
    p_password text,
    p_role text DEFAULT 'viewer',
    p_client_id uuid DEFAULT NULL,
    p_full_name text DEFAULT '',
    p_default_farm_id uuid DEFAULT NULL,
    p_can_access_all_farms boolean DEFAULT false
)
RETURNS uuid AS $$
DECLARE
    new_user_id uuid;
    user_count integer;
    max_users integer;
BEGIN
    -- Check if client has reached user limit
    SELECT COUNT(*), c.max_users
    INTO user_count, max_users
    FROM public.users u
    INNER JOIN public.clients c ON c.id = p_client_id
    WHERE u.client_id = p_client_id
    GROUP BY c.max_users;

    IF user_count >= max_users THEN
        RAISE EXCEPTION 'Client has reached maximum user limit of %', max_users;
    END IF;

    -- Create user
    INSERT INTO public.users (
        email,
        password_hash,
        role,
        client_id,
        full_name,
        default_farm_id,
        can_access_all_farms,
        is_frozen
    ) VALUES (
        p_email,
        crypt(p_password, gen_salt('bf')),
        p_role,
        p_client_id,
        p_full_name,
        p_default_farm_id,
        p_can_access_all_farms,
        false
    )
    RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_user IS 'Creates a new user with hashed password. Checks client user limit.';

-- Function to update user password
CREATE OR REPLACE FUNCTION public.update_user_password(
    p_user_id uuid,
    p_password text
)
RETURNS boolean AS $$
BEGIN
    UPDATE public.users
    SET password_hash = crypt(p_password, gen_salt('bf')),
        updated_at = now()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_user_password(uuid, text) IS 'Updates user password with new hashed value';

-- Function to update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
    UPDATE public.users
    SET last_login = now()
    WHERE id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_last_login(uuid) IS 'Updates the last_login timestamp for a user';

-- Function to check if user can access a specific farm
CREATE OR REPLACE FUNCTION public.can_user_access_farm(
    p_user_id uuid,
    p_farm_id uuid
)
RETURNS boolean AS $$
DECLARE
    v_can_access_all boolean;
    v_client_id uuid;
    v_farm_client_id uuid;
    v_has_explicit_access boolean;
BEGIN
    -- Get user's client_id and can_access_all_farms
    SELECT client_id, can_access_all_farms
    INTO v_client_id, v_can_access_all
    FROM public.users
    WHERE id = p_user_id;

    -- Get farm's client_id
    SELECT client_id INTO v_farm_client_id
    FROM public.farms
    WHERE id = p_farm_id;

    -- If farm doesn't belong to user's client, deny access
    IF v_farm_client_id != v_client_id THEN
        RETURN false;
    END IF;

    -- If user can access all farms in their client, grant access
    IF v_can_access_all THEN
        RETURN true;
    END IF;

    -- Check if user has explicit access to this farm
    SELECT EXISTS (
        SELECT 1 FROM public.user_farm_access
        WHERE user_id = p_user_id AND farm_id = p_farm_id
    ) INTO v_has_explicit_access;

    RETURN v_has_explicit_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_user_access_farm IS 'Checks if a user can access a specific farm';

-- Function to get list of farms accessible by user
CREATE OR REPLACE FUNCTION public.get_user_accessible_farms(p_user_id uuid)
RETURNS TABLE(
    farm_id uuid,
    farm_name text,
    farm_code text,
    farm_address text,
    farm_is_active boolean
) AS $$
DECLARE
    v_can_access_all boolean;
    v_client_id uuid;
BEGIN
    -- Get user's client_id and can_access_all_farms
    SELECT client_id, can_access_all_farms
    INTO v_client_id, v_can_access_all
    FROM public.users
    WHERE id = p_user_id;

    -- If user can access all farms, return all farms in their client
    IF v_can_access_all THEN
        RETURN QUERY
        SELECT f.id, f.name, f.code, f.address, f.is_active
        FROM public.farms f
        WHERE f.client_id = v_client_id
        ORDER BY f.name;
    ELSE
        -- Return only explicitly granted farms
        RETURN QUERY
        SELECT f.id, f.name, f.code, f.address, f.is_active
        FROM public.farms f
        INNER JOIN public.user_farm_access ufa ON ufa.farm_id = f.id
        WHERE ufa.user_id = p_user_id
            AND f.client_id = v_client_id
        ORDER BY f.name;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_user_accessible_farms IS 'Returns list of farms accessible by the user';

-- =====================================================================
-- SUBSCRIPTION MANAGEMENT FUNCTIONS
-- =====================================================================

-- Function to check if client can add more farms
CREATE OR REPLACE FUNCTION public.can_client_add_farm(p_client_id uuid)
RETURNS boolean AS $$
DECLARE
    farm_count integer;
    max_farms integer;
BEGIN
    SELECT COUNT(*), c.max_farms
    INTO farm_count, max_farms
    FROM public.farms f
    INNER JOIN public.clients c ON c.id = p_client_id
    WHERE f.client_id = p_client_id
    GROUP BY c.max_farms;

    IF farm_count IS NULL THEN
        RETURN true; -- No farms yet
    END IF;

    RETURN farm_count < max_farms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_client_add_farm IS 'Checks if client can add more farms based on subscription limit';

-- Function to update subscription plan
CREATE OR REPLACE FUNCTION public.update_subscription_plan(
    p_client_id uuid,
    p_new_plan public.subscription_plan,
    p_new_max_farms integer,
    p_new_max_users integer,
    p_subscription_end_date date DEFAULT NULL
)
RETURNS boolean AS $$
BEGIN
    UPDATE public.clients
    SET 
        subscription_plan = p_new_plan,
        max_farms = p_new_max_farms,
        max_users = p_new_max_users,
        subscription_end_date = p_subscription_end_date,
        updated_at = now()
    WHERE id = p_client_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_subscription_plan IS 'Updates client subscription plan and limits';

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================

-- Grant execute permissions on auth functions to anon (for login page)
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.update_last_login(uuid) TO anon;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_user(text, text, text, uuid, text, uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_access_farm(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_farms(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_client_add_farm(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_subscription_plan(uuid, public.subscription_plan, integer, integer, date) TO authenticated;

-- =====================================================================
-- INSERT DEFAULT DATA
-- =====================================================================

-- Insert a default demo client
INSERT INTO public.clients (
    id,
    name,
    company_code,
    contact_email,
    subscription_plan,
    subscription_status,
    max_farms,
    max_users,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Demo Organization',
    'DEMO-001',
    'demo@example.com',
    'professional',
    'active',
    10,
    50,
    true
)
ON CONFLICT (id) DO NOTHING;

-- Insert a default farm for demo client
INSERT INTO public.farms (
    id,
    client_id,
    name,
    code,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000001'::uuid,
    'Demo Farm #1',
    'FARM-001',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Insert default admin user for demo client
-- Email: admin@demo.com, Password: admin123
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@demo.com') THEN
        INSERT INTO public.users (
            email,
            password_hash,
            role,
            client_id,
            full_name,
            default_farm_id,
            can_access_all_farms,
            is_frozen
        ) VALUES (
            'admin@demo.com',
            crypt('admin123', gen_salt('bf')),
            'client_admin',
            '00000000-0000-0000-0000-000000000001'::uuid,
            'Demo Administrator',
            '00000000-0000-0000-0000-000000000002'::uuid,
            true,
            false
        );
    END IF;
END $$;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
