-- =====================================================================
-- CUSTOM AUTHENTICATION SYSTEM
-- =====================================================================
-- This migration adds custom authentication functions for the RVAC system
-- We use our own user management instead of Supabase Auth

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- AUTH FUNCTIONS
-- =====================================================================

-- Function to verify password and return user info
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

COMMENT ON FUNCTION public.verify_password(text, text) IS 'Verifies user credentials and returns user info for custom auth';

-- Function to create new user
CREATE OR REPLACE FUNCTION public.create_user(
  p_email text,
  p_password text,
  p_role text DEFAULT 'viewer',
  p_farm_id uuid DEFAULT NULL,
  p_full_name text DEFAULT ''
)
RETURNS uuid AS $$
DECLARE
  new_user_id uuid;
BEGIN
  INSERT INTO public.users (email, password_hash, role, farm_id, full_name, is_frozen)
  VALUES (p_email, crypt(p_password, gen_salt('bf')), p_role, p_farm_id, p_full_name, false)
  RETURNING id INTO new_user_id;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.create_user(text, text, text, uuid, text) IS 'Creates a new user with hashed password';

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

-- =====================================================================
-- FIX RLS POLICIES FOR USERS TABLE
-- =====================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view users in their farm" ON public.users;
DROP POLICY IF EXISTS "Admins can manage users in their farm" ON public.users;
DROP POLICY IF EXISTS "Anyone can read user data" ON public.users;
DROP POLICY IF EXISTS "Allow user creation" ON public.users;
DROP POLICY IF EXISTS "Allow user updates" ON public.users;
DROP POLICY IF EXISTS "Allow user deletion" ON public.users;

-- Allow anyone to read users (needed for login)
-- The verify_password function is SECURITY DEFINER so it can read password_hash
CREATE POLICY "Anyone can read user data"
  ON public.users
  FOR SELECT
  USING (true);

-- Allow inserts (for user creation via create_user function)
CREATE POLICY "Allow user creation"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Allow updates (for password changes, last_login, etc.)
CREATE POLICY "Allow user updates"
  ON public.users
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow deletes (for user management)
CREATE POLICY "Allow user deletion"
  ON public.users
  FOR DELETE
  USING (true);

-- =====================================================================
-- INSERT DEFAULT ADMIN USER AND DEFAULT FARM
-- =====================================================================

-- First, create a default farm for RVAC
INSERT INTO public.farms (id, name, code, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'RVAC Centras',
  'RVAC-001',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Insert default admin user (email: admin@rvac.lt, password: admin123)
-- Note: farm_id is required, so we use the default RVAC farm
-- First check if user already exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@rvac.lt') THEN
        INSERT INTO public.users (email, password_hash, role, farm_id, full_name, is_frozen)
        VALUES (
          'admin@rvac.lt',
          crypt('admin123', gen_salt('bf')),
          'admin',
          '00000000-0000-0000-0000-000000000001'::uuid,
          'RVAC Administrator',
          false
        );
    END IF;
END $$;

-- =====================================================================
-- FIX ALL RLS POLICIES FOR CUSTOM AUTH
-- =====================================================================
-- Since we use custom auth at application level (not Supabase Auth),
-- we need to make RLS policies permissive. The application handles authorization.

-- Drop all farm-based policies that use auth.uid()
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname 
              FROM pg_policies 
              WHERE schemaname = 'public' 
              AND policyname NOT LIKE 'Allow%'
              AND policyname NOT LIKE 'Anyone%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Create permissive policies for all tables
-- These allow all operations - authorization is handled at application level

-- Farms
DROP POLICY IF EXISTS "Allow all operations on farms" ON public.farms;
CREATE POLICY "Allow all operations on farms" ON public.farms FOR ALL USING (true) WITH CHECK (true);

-- Animals
DROP POLICY IF EXISTS "Allow all operations on animals" ON public.animals;
CREATE POLICY "Allow all operations on animals" ON public.animals FOR ALL USING (true) WITH CHECK (true);

-- Treatments
DROP POLICY IF EXISTS "Allow all operations on treatments" ON public.treatments;
CREATE POLICY "Allow all operations on treatments" ON public.treatments FOR ALL USING (true) WITH CHECK (true);

-- Animal Visits
DROP POLICY IF EXISTS "Allow all operations on animal_visits" ON public.animal_visits;
CREATE POLICY "Allow all operations on animal_visits" ON public.animal_visits FOR ALL USING (true) WITH CHECK (true);

-- Products
DROP POLICY IF EXISTS "Allow all operations on products" ON public.products;
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Batches
DROP POLICY IF EXISTS "Allow all operations on batches" ON public.batches;
CREATE POLICY "Allow all operations on batches" ON public.batches FOR ALL USING (true) WITH CHECK (true);

-- Suppliers
DROP POLICY IF EXISTS "Allow all operations on suppliers" ON public.suppliers;
CREATE POLICY "Allow all operations on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- Usage Items
DROP POLICY IF EXISTS "Allow all operations on usage_items" ON public.usage_items;
CREATE POLICY "Allow all operations on usage_items" ON public.usage_items FOR ALL USING (true) WITH CHECK (true);

-- Treatment Courses
DROP POLICY IF EXISTS "Allow all operations on treatment_courses" ON public.treatment_courses;
CREATE POLICY "Allow all operations on treatment_courses" ON public.treatment_courses FOR ALL USING (true) WITH CHECK (true);

-- Course Doses
DROP POLICY IF EXISTS "Allow all operations on course_doses" ON public.course_doses;
CREATE POLICY "Allow all operations on course_doses" ON public.course_doses FOR ALL USING (true) WITH CHECK (true);

-- Course Medication Schedules
DROP POLICY IF EXISTS "Allow all operations on course_medication_schedules" ON public.course_medication_schedules;
CREATE POLICY "Allow all operations on course_medication_schedules" ON public.course_medication_schedules FOR ALL USING (true) WITH CHECK (true);

-- Vaccinations
DROP POLICY IF EXISTS "Allow all operations on vaccinations" ON public.vaccinations;
CREATE POLICY "Allow all operations on vaccinations" ON public.vaccinations FOR ALL USING (true) WITH CHECK (true);

-- Diseases
DROP POLICY IF EXISTS "Allow all operations on diseases" ON public.diseases;
CREATE POLICY "Allow all operations on diseases" ON public.diseases FOR ALL USING (true) WITH CHECK (true);

-- Synchronization Protocols
DROP POLICY IF EXISTS "Allow all operations on synchronization_protocols" ON public.synchronization_protocols;
CREATE POLICY "Allow all operations on synchronization_protocols" ON public.synchronization_protocols FOR ALL USING (true) WITH CHECK (true);

-- Animal Synchronizations
DROP POLICY IF EXISTS "Allow all operations on animal_synchronizations" ON public.animal_synchronizations;
CREATE POLICY "Allow all operations on animal_synchronizations" ON public.animal_synchronizations FOR ALL USING (true) WITH CHECK (true);

-- Synchronization Steps
DROP POLICY IF EXISTS "Allow all operations on synchronization_steps" ON public.synchronization_steps;
CREATE POLICY "Allow all operations on synchronization_steps" ON public.synchronization_steps FOR ALL USING (true) WITH CHECK (true);

-- Insemination Products
DROP POLICY IF EXISTS "Allow all operations on insemination_products" ON public.insemination_products;
CREATE POLICY "Allow all operations on insemination_products" ON public.insemination_products FOR ALL USING (true) WITH CHECK (true);

-- Insemination Inventory
DROP POLICY IF EXISTS "Allow all operations on insemination_inventory" ON public.insemination_inventory;
CREATE POLICY "Allow all operations on insemination_inventory" ON public.insemination_inventory FOR ALL USING (true) WITH CHECK (true);

-- Insemination Records
DROP POLICY IF EXISTS "Allow all operations on insemination_records" ON public.insemination_records;
CREATE POLICY "Allow all operations on insemination_records" ON public.insemination_records FOR ALL USING (true) WITH CHECK (true);

-- Hoof Records
DROP POLICY IF EXISTS "Allow all operations on hoof_records" ON public.hoof_records;
CREATE POLICY "Allow all operations on hoof_records" ON public.hoof_records FOR ALL USING (true) WITH CHECK (true);

-- Hoof Condition Codes
DROP POLICY IF EXISTS "Allow all operations on hoof_condition_codes" ON public.hoof_condition_codes;
CREATE POLICY "Allow all operations on hoof_condition_codes" ON public.hoof_condition_codes FOR ALL USING (true) WITH CHECK (true);

-- Teat Status
DROP POLICY IF EXISTS "Allow all operations on teat_status" ON public.teat_status;
CREATE POLICY "Allow all operations on teat_status" ON public.teat_status FOR ALL USING (true) WITH CHECK (true);

-- Biocide Usage
DROP POLICY IF EXISTS "Allow all operations on biocide_usage" ON public.biocide_usage;
CREATE POLICY "Allow all operations on biocide_usage" ON public.biocide_usage FOR ALL USING (true) WITH CHECK (true);

-- Medical Waste
DROP POLICY IF EXISTS "Allow all operations on medical_waste" ON public.medical_waste;
CREATE POLICY "Allow all operations on medical_waste" ON public.medical_waste FOR ALL USING (true) WITH CHECK (true);

-- Batch Waste Tracking
DROP POLICY IF EXISTS "Allow all operations on batch_waste_tracking" ON public.batch_waste_tracking;
CREATE POLICY "Allow all operations on batch_waste_tracking" ON public.batch_waste_tracking FOR ALL USING (true) WITH CHECK (true);

-- Invoices
DROP POLICY IF EXISTS "Allow all operations on invoices" ON public.invoices;
CREATE POLICY "Allow all operations on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

-- Invoice Items
DROP POLICY IF EXISTS "Allow all operations on invoice_items" ON public.invoice_items;
CREATE POLICY "Allow all operations on invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

-- System Settings
DROP POLICY IF EXISTS "Allow all operations on system_settings" ON public.system_settings;
CREATE POLICY "Allow all operations on system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- Shared Notepad
DROP POLICY IF EXISTS "Allow all operations on shared_notepad" ON public.shared_notepad;
CREATE POLICY "Allow all operations on shared_notepad" ON public.shared_notepad FOR ALL USING (true) WITH CHECK (true);

-- User Audit Logs
DROP POLICY IF EXISTS "Allow all operations on user_audit_logs" ON public.user_audit_logs;
CREATE POLICY "Allow all operations on user_audit_logs" ON public.user_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================

-- Grant execute permissions on auth functions to anon (for login page)
GRANT EXECUTE ON FUNCTION public.verify_password(text, text) TO anon;
GRANT EXECUTE ON FUNCTION public.create_user(text, text, text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_password(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_last_login(uuid) TO authenticated;

-- Grant table access to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
