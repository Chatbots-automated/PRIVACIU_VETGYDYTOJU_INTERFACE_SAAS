-- DEBUG AND CLEANUP SQL COMMANDS
-- Run these in Supabase SQL Editor

-- 1. Check for any farms with invalid client_ids
SELECT 
    f.id, 
    f.name, 
    f.client_id, 
    f.client_personal_code,
    c.id as client_exists
FROM farms f 
LEFT JOIN clients c ON f.client_id = c.id 
WHERE c.id IS NULL;

-- 2. Delete all farms with personal code 46006191264
DELETE FROM farms WHERE client_personal_code = '46006191264';

-- 3. Delete all farms with invalid (non-existent) client_ids
DELETE FROM farms 
WHERE client_id NOT IN (SELECT id FROM clients);

-- 4. Check which user you're logged in as (run this to see all users)
SELECT 
    u.id, 
    u.email, 
    u.client_id, 
    c.name as client_name,
    c.id as client_exists
FROM users u 
LEFT JOIN clients c ON u.client_id = c.id 
ORDER BY u.created_at DESC;

-- 5. If you need to fix a specific user's client_id, use this (replace the IDs):
-- UPDATE users 
-- SET client_id = 'YOUR_VALID_CLIENT_ID' 
-- WHERE id = 'YOUR_USER_ID';

-- 6. View all existing clients
SELECT id, name, created_at 
FROM clients 
ORDER BY created_at DESC;

-- 7. Delete ALL temp farms (ones starting with "Temp -")
DELETE FROM farms WHERE name LIKE 'Temp -%';
