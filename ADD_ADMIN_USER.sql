-- =====================================================================
-- ADD NEW CLIENT ADMIN USER
-- =====================================================================
-- Email: gratasgedraitis@gmail.com
-- Password: Gratasged123
-- Role: client_admin (full platform access)
-- =====================================================================

-- Insert the new admin user
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
    'gratasgedraitis@gmail.com',
    crypt('Gratasged123', gen_salt('bf')),  -- Bcrypt password hash
    'client_admin',                          -- Full admin role
    '00000000-0000-0000-0000-000000000001', -- Demo client ID (or use your actual client ID)
    'Gratas Gedraitis',                     -- Full name
    NULL,                                    -- No default farm (admin has access to all)
    true,                                    -- Can access all farms
    false                                    -- Not frozen
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = crypt('Gratasged123', gen_salt('bf')),
    role = 'client_admin',
    can_access_all_farms = true,
    is_frozen = false,
    updated_at = now();

-- Verify the user was created
SELECT 
    id,
    email,
    role,
    full_name,
    can_access_all_farms,
    is_frozen,
    created_at
FROM public.users
WHERE email = 'gratasgedraitis@gmail.com';
