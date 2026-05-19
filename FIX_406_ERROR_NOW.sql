-- Quick fix for immediate 406 error
-- Run this NOW in Supabase SQL Editor

-- Check if your client exists
SELECT id, name, subscription_plan, subscription_status 
FROM clients 
WHERE id = '31a46955-a804-4c00-bc41-5ea60abb2b15';

-- If the above returns no rows, create the client:
INSERT INTO clients (
  id,
  name,
  code,
  subscription_plan,
  subscription_status,
  contact_email,
  created_at
)
VALUES (
  '31a46955-a804-4c00-bc41-5ea60abb2b15',
  'Veterinary Organization',
  'ORG-31a46955',
  'professional'::subscription_plan,
  'active'::subscription_status,
  'contact@organization.com',
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  subscription_plan = 'professional'::subscription_plan,
  subscription_status = 'active'::subscription_status;

-- Verify it was created/updated
SELECT id, name, subscription_plan, subscription_status 
FROM clients 
WHERE id = '31a46955-a804-4c00-bc41-5ea60abb2b15';
