-- =====================================================================
-- Add Users After Database Truncation
-- =====================================================================
-- This script recreates the users that were deleted during truncation
-- Run this in Supabase SQL Editor

-- First, let's check if we have any farms (we need at least one farm for users)
-- If no farms exist, we'll create a default RVAC farm

DO $$
DECLARE
  rvac_farm_id uuid;
  user1_id uuid;
  user2_id uuid;
BEGIN
  -- Check if RVAC farm exists, if not create it
  SELECT id INTO rvac_farm_id
  FROM public.farms
  WHERE code = 'RVAC' OR name ILIKE '%RVAC%'
  LIMIT 1;
  
  IF rvac_farm_id IS NULL THEN
    -- Create RVAC farm
    INSERT INTO public.farms (name, code, is_active)
    VALUES ('RVAC Veterinarija', 'RVAC', true)
    RETURNING id INTO rvac_farm_id;
    
    RAISE NOTICE 'Created RVAC farm with ID: %', rvac_farm_id;
  ELSE
    RAISE NOTICE 'Using existing farm with ID: %', rvac_farm_id;
  END IF;
  
  -- Add user 1: gratasgedraitis@gmail.com
  INSERT INTO public.users (
    email, 
    password_hash, 
    role, 
    farm_id, 
    full_name, 
    is_frozen
  )
  VALUES (
    'gratasgedraitis@gmail.com',
    crypt('123456', gen_salt('bf')),
    'admin',
    rvac_farm_id,
    'Gratas Gedraitis',
    false
  )
  RETURNING id INTO user1_id;
  
  RAISE NOTICE 'Created user: gratasgedraitis@gmail.com (ID: %)', user1_id;
  
  -- Add user 2: daumantas.jatautas@rvac.lt
  INSERT INTO public.users (
    email, 
    password_hash, 
    role, 
    farm_id, 
    full_name, 
    is_frozen
  )
  VALUES (
    'daumantas.jatautas@rvac.lt',
    crypt('Daumantas123-', gen_salt('bf')),
    'admin',
    rvac_farm_id,
    'Daumantas Jatautas',
    false
  )
  RETURNING id INTO user2_id;
  
  RAISE NOTICE 'Created user: daumantas.jatautas@rvac.lt (ID: %)', user2_id;
  
  RAISE NOTICE 'Successfully created 2 users!';
  
END $$;

-- Verify users were created
SELECT 
  email,
  role,
  full_name,
  is_frozen,
  created_at
FROM public.users
ORDER BY created_at DESC;
