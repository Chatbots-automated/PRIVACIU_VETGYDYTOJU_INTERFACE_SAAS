-- =====================================================================
-- SAAS MULTI-TENANT EXAMPLE QUERIES
-- =====================================================================
-- This file contains example queries for the multi-tenant SaaS system
-- Demonstrates common patterns and best practices

-- =====================================================================
-- 1. USER AUTHENTICATION & SETUP
-- =====================================================================

-- Login user and get accessible farms
-- Step 1: Verify credentials
SELECT * FROM verify_password('admin@demo.com', 'admin123');

-- Step 2: Update last login
SELECT update_last_login('user-uuid-here');

-- Step 3: Get accessible farms for user
SELECT * FROM get_user_accessible_farms('user-uuid-here');

-- Check if user can access specific farm
SELECT can_user_access_farm('user-uuid-here', 'farm-uuid-here');

-- =====================================================================
-- 2. CLIENT MANAGEMENT
-- =====================================================================

-- Create new client organization
INSERT INTO clients (
    name,
    company_code,
    contact_email,
    subscription_plan,
    subscription_status,
    max_farms,
    max_users
) VALUES (
    'My Veterinary Clinic',
    'VET-2026-001',
    'contact@myvet.com',
    'professional',
    'active',
    5,
    25
);

-- View client with subscription usage
SELECT 
    c.id,
    c.name,
    c.subscription_plan,
    c.subscription_status,
    c.max_farms,
    c.max_users,
    COUNT(DISTINCT f.id) as current_farms,
    COUNT(DISTINCT u.id) as current_users,
    c.max_farms - COUNT(DISTINCT f.id) as farms_remaining,
    c.max_users - COUNT(DISTINCT u.id) as users_remaining
FROM clients c
LEFT JOIN farms f ON f.client_id = c.id AND f.is_active = true
LEFT JOIN users u ON u.client_id = c.id AND u.is_frozen = false
WHERE c.id = 'client-uuid-here'
GROUP BY c.id;

-- Update subscription plan
SELECT update_subscription_plan(
    'client-uuid-here',
    'enterprise',  -- new plan
    20,            -- new max_farms
    100,           -- new max_users
    '2027-04-25'   -- subscription end date
);

-- =====================================================================
-- 3. FARM MANAGEMENT
-- =====================================================================

-- Create new farm for client
-- First check if client can add more farms
SELECT can_client_add_farm('client-uuid-here');

-- If true, create farm
INSERT INTO farms (
    client_id,
    name,
    code,
    address,
    contact_person,
    contact_phone
) VALUES (
    'client-uuid-here',
    'North Valley Farm',
    'NVF-001',
    '123 Farm Road, Vilnius',
    'Jonas Jonaitis',
    '+370 600 12345'
);

-- List all farms for a client
SELECT 
    id,
    name,
    code,
    address,
    is_active,
    created_at
FROM farms
WHERE client_id = 'client-uuid-here'
ORDER BY name;

-- =====================================================================
-- 4. USER MANAGEMENT
-- =====================================================================

-- Create client admin (can access all farms)
SELECT create_user(
    'admin@client.com',    -- email
    'secure_password_123', -- password
    'client_admin',        -- role
    'client-uuid-here',    -- client_id
    'John Administrator',  -- full_name
    'default-farm-uuid',   -- default_farm_id
    true                   -- can_access_all_farms
);

-- Create regular user (specific farm access)
SELECT create_user(
    'vet@client.com',
    'secure_password_123',
    'vet',
    'client-uuid-here',
    'Dr. Veterinarian',
    'farm-uuid-here',
    false  -- can_access_all_farms = false
);

-- Grant specific farm access to user
INSERT INTO user_farm_access (user_id, farm_id)
VALUES 
    ('user-uuid-here', 'farm-1-uuid'),
    ('user-uuid-here', 'farm-2-uuid');

-- List users in a client with their access
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.can_access_all_farms,
    u.default_farm_id,
    u.is_frozen,
    COUNT(ufa.farm_id) as explicit_farm_access_count
FROM users u
LEFT JOIN user_farm_access ufa ON u.id = ufa.user_id
WHERE u.client_id = 'client-uuid-here'
GROUP BY u.id
ORDER BY u.full_name;

-- =====================================================================
-- 5. QUERYING DATA (ANIMALS EXAMPLE)
-- =====================================================================

-- Query animals for specific farm (most common pattern)
SELECT 
    id,
    tag_no,
    species,
    breed,
    active
FROM animals
WHERE client_id = 'client-uuid-here'
  AND farm_id = 'farm-uuid-here'
  AND active = true
ORDER BY tag_no;

-- Query animals across all client's farms (for client_admin or reports)
SELECT 
    a.id,
    a.tag_no,
    a.species,
    a.breed,
    f.name as farm_name,
    f.code as farm_code
FROM animals a
INNER JOIN farms f ON a.farm_id = f.id
WHERE a.client_id = 'client-uuid-here'
  AND a.active = true
ORDER BY f.name, a.tag_no;

-- Query animals for user's accessible farms only
SELECT 
    a.id,
    a.tag_no,
    a.species,
    a.breed,
    f.name as farm_name
FROM animals a
INNER JOIN farms f ON a.farm_id = f.id
WHERE a.client_id = 'user-client-id-here'
  AND (
    -- User can access all farms
    (SELECT can_access_all_farms FROM users WHERE id = 'user-uuid-here') = true
    OR
    -- User has explicit access to this farm
    a.farm_id IN (
        SELECT farm_id FROM user_farm_access 
        WHERE user_id = 'user-uuid-here'
    )
  )
  AND a.active = true
ORDER BY f.name, a.tag_no;

-- =====================================================================
-- 6. SHARED RESOURCES (PRODUCTS EXAMPLE)
-- =====================================================================

-- Query products for a farm (includes client-wide shared products)
SELECT 
    p.id,
    p.name,
    p.category,
    p.farm_id,
    p.is_shared,
    CASE 
        WHEN p.farm_id IS NULL THEN 'All Farms'
        WHEN p.is_shared THEN 'Shared'
        ELSE 'This Farm Only'
    END as availability
FROM products p
WHERE p.client_id = 'client-uuid-here'
  AND (
    p.farm_id = 'farm-uuid-here'  -- Farm-specific products
    OR p.farm_id IS NULL           -- Client-wide products
  )
  AND p.is_active = true
ORDER BY p.name;

-- Create client-wide shared product (available to all farms)
INSERT INTO products (
    client_id,
    farm_id,      -- NULL for client-wide
    is_shared,    -- true for visibility
    name,
    category,
    primary_pack_unit,
    primary_pack_size
) VALUES (
    'client-uuid-here',
    NULL,         -- Client-wide (all farms)
    true,
    'Amoxicillin 100mg',
    'medicines',
    'ml',
    100
);

-- Create farm-specific product
INSERT INTO products (
    client_id,
    farm_id,
    is_shared,
    name,
    category,
    primary_pack_unit,
    primary_pack_size
) VALUES (
    'client-uuid-here',
    'farm-uuid-here',  -- Specific farm only
    false,
    'Custom Farm Product',
    'medicines',
    'ml',
    50
);

-- =====================================================================
-- 7. TREATMENTS & USAGE TRACKING
-- =====================================================================

-- Create treatment for animal
INSERT INTO treatments (
    client_id,
    farm_id,
    animal_id,
    disease_id,
    reg_date,
    clinical_diagnosis,
    vet_name,
    withdrawal_until_milk,
    withdrawal_until_meat
) VALUES (
    'client-uuid-here',
    'farm-uuid-here',
    'animal-uuid-here',
    'disease-uuid-here',
    CURRENT_DATE,
    'Mastitis in LF quarter',
    'Dr. Veterinarian',
    CURRENT_DATE + INTERVAL '7 days',
    CURRENT_DATE + INTERVAL '14 days'
);

-- Record product usage for treatment
INSERT INTO usage_items (
    client_id,
    farm_id,
    treatment_id,
    product_id,
    batch_id,
    animal_id,
    quantity,
    unit,
    used_date,
    administration_route
) VALUES (
    'client-uuid-here',
    'farm-uuid-here',
    'treatment-uuid-here',
    'product-uuid-here',
    'batch-uuid-here',
    'animal-uuid-here',
    50,
    'ml',
    CURRENT_DATE,
    'intramammary'
);

-- Query treatment history for animal
SELECT 
    t.id,
    t.reg_date,
    t.clinical_diagnosis,
    t.vet_name,
    d.name as disease_name,
    t.withdrawal_until_milk,
    t.withdrawal_until_meat,
    f.name as farm_name
FROM treatments t
LEFT JOIN diseases d ON t.disease_id = d.id
INNER JOIN farms f ON t.farm_id = f.id
WHERE t.client_id = 'client-uuid-here'
  AND t.animal_id = 'animal-uuid-here'
ORDER BY t.reg_date DESC;

-- Query product usage with batch info
SELECT 
    ui.id,
    ui.used_date,
    p.name as product_name,
    ui.quantity,
    ui.unit,
    b.lot as batch_lot,
    b.expiry_date,
    a.tag_no as animal_tag,
    f.name as farm_name
FROM usage_items ui
INNER JOIN products p ON ui.product_id = p.id
LEFT JOIN batches b ON ui.batch_id = b.id
LEFT JOIN animals a ON ui.animal_id = a.id
INNER JOIN farms f ON ui.farm_id = f.id
WHERE ui.client_id = 'client-uuid-here'
  AND ui.farm_id = 'farm-uuid-here'
  AND ui.used_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY ui.used_date DESC;

-- =====================================================================
-- 8. INVENTORY MANAGEMENT
-- =====================================================================

-- View current stock by product (with batch details)
SELECT 
    p.id,
    p.name as product_name,
    p.category,
    b.lot,
    b.expiry_date,
    b.qty_received,
    b.qty_used,
    b.qty_wasted,
    b.qty_left,
    CASE 
        WHEN b.is_expired THEN 'Expired'
        WHEN b.qty_left <= 0 THEN 'Depleted'
        WHEN b.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'Expiring Soon'
        ELSE 'OK'
    END as status
FROM products p
INNER JOIN batches b ON p.id = b.product_id
WHERE b.client_id = 'client-uuid-here'
  AND b.farm_id = 'farm-uuid-here'
  AND b.qty_left > 0
ORDER BY p.name, b.expiry_date;

-- Aggregate stock by product (total across all batches)
SELECT 
    p.id,
    p.name as product_name,
    p.category,
    p.primary_pack_unit,
    SUM(b.qty_left) as total_qty_left,
    COUNT(b.id) as batch_count,
    MIN(b.expiry_date) as earliest_expiry
FROM products p
LEFT JOIN batches b ON p.id = b.product_id AND b.qty_left > 0
WHERE p.client_id = 'client-uuid-here'
  AND (p.farm_id = 'farm-uuid-here' OR p.farm_id IS NULL)
  AND p.is_active = true
GROUP BY p.id, p.name, p.category, p.primary_pack_unit
ORDER BY p.name;

-- =====================================================================
-- 9. CROSS-FARM REPORTING (CLIENT ADMIN)
-- =====================================================================

-- Total animals by farm
SELECT 
    f.id,
    f.name as farm_name,
    f.code as farm_code,
    COUNT(a.id) as total_animals,
    COUNT(CASE WHEN a.active THEN 1 END) as active_animals,
    COUNT(CASE WHEN a.species = 'bovine' THEN 1 END) as cattle_count
FROM farms f
LEFT JOIN animals a ON f.id = a.farm_id
WHERE f.client_id = 'client-uuid-here'
  AND f.is_active = true
GROUP BY f.id, f.name, f.code
ORDER BY f.name;

-- Treatment counts by farm (last 30 days)
SELECT 
    f.id,
    f.name as farm_name,
    COUNT(t.id) as treatment_count,
    COUNT(DISTINCT t.animal_id) as animals_treated,
    COUNT(DISTINCT t.vet_name) as veterinarians
FROM farms f
LEFT JOIN treatments t ON f.id = t.farm_id 
    AND t.reg_date >= CURRENT_DATE - INTERVAL '30 days'
WHERE f.client_id = 'client-uuid-here'
  AND f.is_active = true
GROUP BY f.id, f.name
ORDER BY treatment_count DESC;

-- Product usage by farm (last 30 days)
SELECT 
    f.name as farm_name,
    p.name as product_name,
    p.category,
    SUM(ui.quantity) as total_used,
    p.primary_pack_unit as unit,
    COUNT(ui.id) as usage_count
FROM usage_items ui
INNER JOIN products p ON ui.product_id = p.id
INNER JOIN farms f ON ui.farm_id = f.id
WHERE ui.client_id = 'client-uuid-here'
  AND ui.used_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY f.name, p.name, p.category, p.primary_pack_unit
ORDER BY f.name, total_used DESC;

-- =====================================================================
-- 10. AUDIT & LOGGING
-- =====================================================================

-- View recent user actions for client
SELECT 
    ual.created_at,
    u.email as user_email,
    u.full_name,
    f.name as farm_name,
    ual.action,
    ual.table_name,
    ual.record_id
FROM user_audit_logs ual
LEFT JOIN users u ON ual.user_id = u.id
LEFT JOIN farms f ON ual.farm_id = f.id
WHERE ual.client_id = 'client-uuid-here'
ORDER BY ual.created_at DESC
LIMIT 100;

-- Log a user action
SELECT log_user_action(
    'user-uuid-here',           -- p_user_id
    'create_treatment',         -- p_action
    'treatments',               -- p_table_name
    'treatment-uuid-here',      -- p_record_id
    NULL,                       -- p_old_data
    '{"disease": "mastitis"}'::jsonb  -- p_new_data
);

-- =====================================================================
-- 11. USEFUL AGGREGATE QUERIES
-- =====================================================================

-- Client overview dashboard
SELECT 
    c.id,
    c.name,
    c.subscription_plan,
    c.subscription_status,
    COUNT(DISTINCT f.id) as farms_count,
    COUNT(DISTINCT u.id) as users_count,
    COUNT(DISTINCT a.id) as total_animals,
    COUNT(DISTINCT t.id) FILTER (WHERE t.reg_date >= CURRENT_DATE - INTERVAL '30 days') as treatments_last_30d
FROM clients c
LEFT JOIN farms f ON c.id = f.client_id AND f.is_active = true
LEFT JOIN users u ON c.id = u.client_id AND u.is_frozen = false
LEFT JOIN animals a ON c.id = a.client_id AND a.active = true
LEFT JOIN treatments t ON c.id = t.client_id
WHERE c.id = 'client-uuid-here'
GROUP BY c.id;

-- Low stock alerts by farm
SELECT 
    f.name as farm_name,
    p.name as product_name,
    p.category,
    SUM(b.qty_left) as qty_left,
    p.primary_pack_unit as unit,
    MIN(b.expiry_date) as earliest_expiry
FROM products p
INNER JOIN batches b ON p.id = b.product_id
INNER JOIN farms f ON b.farm_id = f.id
WHERE b.client_id = 'client-uuid-here'
  AND b.qty_left > 0
GROUP BY f.name, p.id, p.name, p.category, p.primary_pack_unit
HAVING SUM(b.qty_left) < 100  -- Low stock threshold
ORDER BY qty_left ASC;

-- Expiring products by farm
SELECT 
    f.name as farm_name,
    p.name as product_name,
    b.lot,
    b.expiry_date,
    b.qty_left,
    CURRENT_DATE - b.expiry_date as days_until_expiry
FROM batches b
INNER JOIN products p ON b.product_id = p.id
INNER JOIN farms f ON b.farm_id = f.id
WHERE b.client_id = 'client-uuid-here'
  AND b.qty_left > 0
  AND b.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '60 days'
ORDER BY b.expiry_date ASC;

-- =====================================================================
-- END OF EXAMPLES
-- =====================================================================
