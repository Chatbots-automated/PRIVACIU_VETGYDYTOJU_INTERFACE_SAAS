-- =====================================================================
-- MULTI-TENANT SAAS BASELINE SCHEMA
-- =====================================================================
-- Created: 2026-04-25
-- Description: Complete multi-tenant SaaS veterinary management system.
--              Supports multiple clients (organizations), each with multiple farms.
--              Three-tier hierarchy: CLIENT → FARM → DATA
-- =====================================================================

-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================================
-- 2. CUSTOM TYPES (ENUMS)
-- =====================================================================

DO $$ BEGIN
    CREATE TYPE public.product_category AS ENUM (
        'medicines',
        'prevention',
        'reproduction',
        'treatment_materials',
        'hygiene',
        'biocide',
        'technical',
        'svirkstukai',
        'bolusas',
        'vakcina'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.unit AS ENUM (
        'ml',
        'l',
        'g',
        'kg',
        'pcs',
        'vnt',
        'tablet',
        'bolus',
        'syringe'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_plan AS ENUM (
        'trial',
        'basic',
        'professional',
        'enterprise'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.subscription_status AS ENUM (
        'active',
        'inactive',
        'suspended',
        'cancelled'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================================
-- 3. TOP-LEVEL: CLIENTS (ORGANIZATIONS)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    company_code text UNIQUE,
    vat_code text,
    address text,
    city text,
    postal_code text,
    country text DEFAULT 'Lithuania',
    contact_person text,
    contact_phone text,
    contact_email text NOT NULL,
    subscription_plan public.subscription_plan DEFAULT 'trial' NOT NULL,
    subscription_status public.subscription_status DEFAULT 'active' NOT NULL,
    subscription_start_date date DEFAULT CURRENT_DATE,
    subscription_end_date date,
    max_farms integer DEFAULT 1 NOT NULL,
    max_users integer DEFAULT 5 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    onboarded_at timestamptz DEFAULT now(),
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_clients_company_code ON public.clients(company_code);
CREATE INDEX idx_clients_subscription_status ON public.clients(subscription_status);
CREATE INDEX idx_clients_is_active ON public.clients(is_active);

COMMENT ON TABLE public.clients IS 'Top-level tenant: Organizations/companies that use the system';
COMMENT ON COLUMN public.clients.max_farms IS 'Maximum number of farms allowed for this client based on subscription';
COMMENT ON COLUMN public.clients.max_users IS 'Maximum number of users allowed for this client based on subscription';

-- =====================================================================
-- 4. SECOND-LEVEL: FARMS (CLIENT SUB-ORGANIZATIONS)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.farms (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    code text,
    address text,
    contact_person text,
    contact_phone text,
    contact_email text,
    vic_username text,
    vic_password_encrypted text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT farms_client_code_unique UNIQUE (client_id, code)
);

CREATE INDEX idx_farms_client_id ON public.farms(client_id);
CREATE INDEX idx_farms_code ON public.farms(code);
CREATE INDEX idx_farms_is_active ON public.farms(is_active);

COMMENT ON TABLE public.farms IS 'Second-level tenant: Individual farms managed by a client';
COMMENT ON COLUMN public.farms.client_id IS 'Links farm to parent client organization';

-- =====================================================================
-- 5. USER MANAGEMENT
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    email text UNIQUE,
    password_hash text,
    role text NOT NULL,
    full_name text DEFAULT '' NOT NULL,
    default_farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
    can_access_all_farms boolean DEFAULT false NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    frozen_at timestamptz,
    frozen_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    last_login timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['client_admin', 'admin', 'vet', 'tech', 'viewer', 'secretary', 'farm_worker', 'warehouse_worker', 'custom']))
);

CREATE INDEX idx_users_client_id ON public.users(client_id);
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_default_farm_id ON public.users(default_farm_id);

COMMENT ON TABLE public.users IS 'System users with client and farm-based access control';
COMMENT ON COLUMN public.users.client_id IS 'Associates user with a specific client organization';
COMMENT ON COLUMN public.users.default_farm_id IS 'Default farm for user operations (optional)';
COMMENT ON COLUMN public.users.can_access_all_farms IS 'If true, user can access all farms within their client';
COMMENT ON COLUMN public.users.role IS 'client_admin: can manage all farms in client; admin: can manage assigned farm(s); vet/tech/viewer/worker: specific permissions';

-- User-Farm Access Mapping (for users who access specific farms, not all)
CREATE TABLE IF NOT EXISTS public.user_farm_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT user_farm_access_unique UNIQUE (user_id, farm_id)
);

CREATE INDEX idx_user_farm_access_user_id ON public.user_farm_access(user_id);
CREATE INDEX idx_user_farm_access_farm_id ON public.user_farm_access(farm_id);

COMMENT ON TABLE public.user_farm_access IS 'Defines which specific farms a user can access (if not can_access_all_farms)';

-- User Module Permissions (for custom roles)
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    module_name text NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT user_module_permissions_unique UNIQUE (user_id, module_name)
);

CREATE INDEX idx_user_module_permissions_user_id ON public.user_module_permissions(user_id);

COMMENT ON TABLE public.user_module_permissions IS 'Granular module permissions for users with custom role';

-- User Audit Logs
CREATE TABLE IF NOT EXISTS public.user_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    action text NOT NULL,
    table_name text,
    record_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    user_agent text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_user_audit_logs_user_id ON public.user_audit_logs(user_id);
CREATE INDEX idx_user_audit_logs_client_id ON public.user_audit_logs(client_id);
CREATE INDEX idx_user_audit_logs_farm_id ON public.user_audit_logs(farm_id);
CREATE INDEX idx_user_audit_logs_created_at ON public.user_audit_logs(created_at);

COMMENT ON TABLE public.user_audit_logs IS 'Audit trail of all user actions in the system';

-- =====================================================================
-- 6. SYSTEM CONFIGURATION
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    setting_type text NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT system_settings_setting_type_check CHECK (setting_type = ANY (ARRAY['number', 'text', 'boolean'])),
    CONSTRAINT system_settings_scope_unique UNIQUE (client_id, farm_id, setting_key)
);

CREATE INDEX idx_system_settings_client_id ON public.system_settings(client_id);
CREATE INDEX idx_system_settings_farm_id ON public.system_settings(farm_id);

COMMENT ON TABLE public.system_settings IS 'Configuration settings (client-level if farm_id is NULL, farm-level if specified)';
COMMENT ON COLUMN public.system_settings.farm_id IS 'NULL for client-level settings, specific farm ID for farm-level settings';

CREATE TABLE IF NOT EXISTS public.shared_notepad (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    content text DEFAULT '' NOT NULL,
    last_edited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_shared_notepad_client_id ON public.shared_notepad(client_id);
CREATE INDEX idx_shared_notepad_farm_id ON public.shared_notepad(farm_id);

COMMENT ON TABLE public.shared_notepad IS 'Shared notepad for farm team collaboration';

-- =====================================================================
-- 7. VETERINARY CORE TABLES
-- =====================================================================

-- Species Reference Table (Shared across all clients)
CREATE TABLE IF NOT EXISTS public.species (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    code text UNIQUE NOT NULL,
    name_lt text NOT NULL,
    name_en text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_species_code ON public.species(code);

COMMENT ON TABLE public.species IS 'Reference table for animal species (shared across all clients)';

-- Insert default species
INSERT INTO public.species (code, name_lt, name_en) VALUES
    ('bovine', 'Galvijai', 'Cattle'),
    ('porcine', 'Kiaulės', 'Pigs'),
    ('ovine', 'Avys', 'Sheep'),
    ('caprine', 'Ožkos', 'Goats'),
    ('equine', 'Arkliai', 'Horses'),
    ('poultry', 'Paukščiai', 'Poultry'),
    ('other', 'Kita', 'Other')
ON CONFLICT (code) DO NOTHING;

-- Animals
CREATE TABLE IF NOT EXISTS public.animals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    tag_no text,
    species text DEFAULT 'bovine',
    sex text,
    age_months integer,
    holder_name text,
    holder_address text,
    breed text,
    birth_date text,
    active boolean DEFAULT true NOT NULL,
    updated_from_vic_at timestamptz,
    source text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_animals_client_id ON public.animals(client_id);
CREATE INDEX idx_animals_farm_id ON public.animals(farm_id);
CREATE INDEX idx_animals_tag_no ON public.animals(tag_no);
CREATE INDEX idx_animals_active ON public.animals(active);

COMMENT ON TABLE public.animals IS 'Core animal registry for veterinary tracking';
COMMENT ON COLUMN public.animals.client_id IS 'Client organization that owns this animal record';
COMMENT ON COLUMN public.animals.farm_id IS 'Specific farm where animal is located';

-- Diseases
CREATE TABLE IF NOT EXISTS public.diseases (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    code text,
    name text NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_diseases_client_id ON public.diseases(client_id);
CREATE INDEX idx_diseases_farm_id ON public.diseases(farm_id);

COMMENT ON TABLE public.diseases IS 'Disease classification registry';
COMMENT ON COLUMN public.diseases.farm_id IS 'NULL for client-wide diseases, specific farm ID for farm-specific diseases';
COMMENT ON COLUMN public.diseases.is_shared IS 'If true, disease is visible to all farms within the client';

-- Treatments
CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE,
    disease_id uuid REFERENCES public.diseases(id) ON DELETE SET NULL,
    visit_id uuid,
    reg_date date DEFAULT CURRENT_DATE NOT NULL,
    first_symptoms_date date,
    animal_condition text,
    tests text,
    clinical_diagnosis text,
    outcome text,
    outcome_date date,
    services text,
    withdrawal_until date,
    withdrawal_until_milk date,
    withdrawal_until_meat date,
    vet_name text,
    vet_signature_path text,
    notes text,
    mastitis_teat text,
    mastitis_type text,
    syringe_count integer,
    creates_future_visits boolean DEFAULT false,
    affected_teats jsonb DEFAULT '[]'::jsonb,
    sick_teats jsonb DEFAULT '[]'::jsonb,
    disabled_teats text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT treatments_mastitis_teat_check CHECK (mastitis_teat = ANY (ARRAY['LF', 'RF', 'LR', 'RR', NULL])),
    CONSTRAINT treatments_mastitis_type_check CHECK (mastitis_type = ANY (ARRAY['new', 'recurring', NULL]))
);

CREATE INDEX idx_treatments_client_id ON public.treatments(client_id);
CREATE INDEX idx_treatments_farm_id ON public.treatments(farm_id);
CREATE INDEX idx_treatments_animal_id ON public.treatments(animal_id);
CREATE INDEX idx_treatments_disease_id ON public.treatments(disease_id);
CREATE INDEX idx_treatments_reg_date ON public.treatments(reg_date);

COMMENT ON TABLE public.treatments IS 'Veterinary treatment records';
COMMENT ON COLUMN public.treatments.disabled_teats IS 'Array of teat positions that were disabled during this treatment';

-- Animal Visits
CREATE TABLE IF NOT EXISTS public.animal_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    related_treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
    related_visit_id uuid,
    course_id uuid,
    sync_step_id uuid,
    visit_datetime timestamptz NOT NULL,
    procedures text[] DEFAULT '{}'::text[] NOT NULL,
    temperature numeric(4,1),
    temperature_measured_at timestamptz,
    status text DEFAULT 'Planuojamas' NOT NULL,
    notes text,
    vet_name text,
    next_visit_required boolean DEFAULT false,
    next_visit_date timestamptz,
    treatment_required boolean DEFAULT false,
    planned_medications jsonb,
    medications_processed boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT animal_visits_status_check CHECK (status = ANY (ARRAY['Planuojamas', 'Vykdomas', 'Baigtas', 'Atšauktas', 'Neįvykęs']))
);

CREATE INDEX idx_animal_visits_client_id ON public.animal_visits(client_id);
CREATE INDEX idx_animal_visits_farm_id ON public.animal_visits(farm_id);
CREATE INDEX idx_animal_visits_animal_id ON public.animal_visits(animal_id);
CREATE INDEX idx_animal_visits_status ON public.animal_visits(status);
CREATE INDEX idx_animal_visits_visit_datetime ON public.animal_visits(visit_datetime);

COMMENT ON TABLE public.animal_visits IS 'Scheduled and completed animal visits';
COMMENT ON COLUMN public.animal_visits.planned_medications IS 'JSONB array of medications planned for this visit';
COMMENT ON COLUMN public.animal_visits.medications_processed IS 'Whether planned medications have been deducted from inventory';

-- Teat Status
CREATE TABLE IF NOT EXISTS public.teat_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    teat_position text NOT NULL,
    is_disabled boolean DEFAULT false,
    disabled_date date,
    disabled_reason text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT teat_status_teat_position_check CHECK (teat_position = ANY (ARRAY['d1', 'd2', 'k1', 'k2'])),
    CONSTRAINT teat_status_animal_teat_unique UNIQUE (animal_id, teat_position)
);

CREATE INDEX idx_teat_status_client_id ON public.teat_status(client_id);
CREATE INDEX idx_teat_status_farm_id ON public.teat_status(farm_id);
CREATE INDEX idx_teat_status_animal_id ON public.teat_status(animal_id);

COMMENT ON TABLE public.teat_status IS 'Tracks disabled teats per animal';

-- Vaccinations
CREATE TABLE IF NOT EXISTS public.vaccinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE,
    product_id uuid NOT NULL,
    batch_id uuid,
    vaccination_date date DEFAULT CURRENT_DATE NOT NULL,
    next_booster_date date,
    dose_number integer DEFAULT 1,
    dose_amount numeric NOT NULL,
    unit public.unit NOT NULL,
    notes text,
    administered_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_vaccinations_client_id ON public.vaccinations(client_id);
CREATE INDEX idx_vaccinations_farm_id ON public.vaccinations(farm_id);
CREATE INDEX idx_vaccinations_animal_id ON public.vaccinations(animal_id);
CREATE INDEX idx_vaccinations_vaccination_date ON public.vaccinations(vaccination_date);

COMMENT ON TABLE public.vaccinations IS 'Vaccination records for animals';

-- =====================================================================
-- 8. INVENTORY MANAGEMENT
-- =====================================================================

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    name text NOT NULL,
    category public.product_category NOT NULL,
    primary_pack_unit public.unit NOT NULL,
    primary_pack_size numeric,
    active_substance text,
    registration_code text,
    dosage_notes text,
    is_active boolean DEFAULT true NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    withdrawal_days_meat integer,
    withdrawal_days_milk integer,
    subcategory text,
    subcategory_2 text,
    package_weight_g numeric(10,2),
    administration_routes text[] DEFAULT '{}'::text[],
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT products_package_weight_g_check CHECK (package_weight_g > 0)
);

CREATE INDEX idx_products_client_id ON public.products(client_id);
CREATE INDEX idx_products_farm_id ON public.products(farm_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_is_active ON public.products(is_active);

COMMENT ON TABLE public.products IS 'Product catalog for medications, supplies, and materials';
COMMENT ON COLUMN public.products.client_id IS 'Client who owns this product';
COMMENT ON COLUMN public.products.farm_id IS 'NULL for client-wide products, specific farm ID for farm-specific products';
COMMENT ON COLUMN public.products.is_shared IS 'If true, product is visible to all farms within the client';
COMMENT ON COLUMN public.products.package_weight_g IS 'Empty package weight in grams for waste tracking';

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    name text NOT NULL,
    code text,
    vat_code text,
    phone text,
    email text,
    is_shared boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_suppliers_client_id ON public.suppliers(client_id);
CREATE INDEX idx_suppliers_farm_id ON public.suppliers(farm_id);

COMMENT ON TABLE public.suppliers IS 'Supplier registry for inventory procurement';
COMMENT ON COLUMN public.suppliers.farm_id IS 'NULL for client-wide suppliers, specific farm ID for farm-specific suppliers';
COMMENT ON COLUMN public.suppliers.is_shared IS 'If true, supplier is visible to all farms within the client';

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL,
    total_amount numeric,
    currency text DEFAULT 'EUR',
    notes text,
    doc_title text DEFAULT 'Invoice',
    supplier_name text,
    supplier_code text,
    supplier_vat text,
    total_net numeric(10,2) DEFAULT 0,
    total_vat numeric(10,2) DEFAULT 0,
    total_gross numeric(10,2) DEFAULT 0,
    vat_rate numeric(5,2) DEFAULT 0,
    pdf_filename text,
    discount_percent numeric(5,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_invoices_client_id ON public.invoices(client_id);
CREATE INDEX idx_invoices_farm_id ON public.invoices(farm_id);
CREATE INDEX idx_invoices_invoice_date ON public.invoices(invoice_date);

COMMENT ON TABLE public.invoices IS 'Invoice records for expense tracking';

-- Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid,
    product_id uuid,
    line_no integer,
    description text,
    sku text,
    quantity numeric(10,2),
    unit_price numeric(10,2),
    total_price numeric(10,2),
    discount_percent numeric(5,2) DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_invoice_items_client_id ON public.invoice_items(client_id);
CREATE INDEX idx_invoice_items_farm_id ON public.invoice_items(farm_id);
CREATE INDEX idx_invoice_items_invoice_id ON public.invoice_items(invoice_id);

COMMENT ON TABLE public.invoice_items IS 'Line items for invoices';

-- Batches
CREATE TABLE IF NOT EXISTS public.batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL,
    invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
    lot text,
    mfg_date date,
    expiry_date date,
    doc_title text,
    doc_number text,
    doc_date date,
    purchase_price numeric(12,2),
    unit_price numeric(12,2),
    qty_received numeric(12,2) NOT NULL,
    qty_used numeric(12,2) DEFAULT 0 NOT NULL,
    qty_wasted numeric(12,2) DEFAULT 0 NOT NULL,
    qty_left numeric(12,2) GENERATED ALWAYS AS (qty_received - qty_used - qty_wasted) STORED,
    received_date date DEFAULT CURRENT_DATE,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT batches_qty_received_check CHECK (qty_received >= 0),
    CONSTRAINT batches_qty_used_check CHECK (qty_used >= 0),
    CONSTRAINT batches_qty_wasted_check CHECK (qty_wasted >= 0)
);

CREATE INDEX idx_batches_client_id ON public.batches(client_id);
CREATE INDEX idx_batches_farm_id ON public.batches(farm_id);
CREATE INDEX idx_batches_product_id ON public.batches(product_id);
CREATE INDEX idx_batches_expiry_date ON public.batches(expiry_date);

COMMENT ON TABLE public.batches IS 'Inventory batches with FIFO tracking';

-- Usage Items (Product Usage Tracking)
CREATE TABLE IF NOT EXISTS public.usage_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    treatment_id uuid REFERENCES public.treatments(id) ON DELETE CASCADE,
    vaccination_id uuid REFERENCES public.vaccinations(id) ON DELETE CASCADE,
    visit_id uuid REFERENCES public.animal_visits(id) ON DELETE CASCADE,
    prevention_id uuid,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE SET NULL,
    quantity numeric NOT NULL,
    unit public.unit NOT NULL,
    used_date date DEFAULT CURRENT_DATE NOT NULL,
    administered_date date,
    administration_route text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT usage_items_quantity_check CHECK (quantity > 0),
    CONSTRAINT usage_items_single_parent CHECK (
        (treatment_id IS NOT NULL)::int + 
        (vaccination_id IS NOT NULL)::int + 
        (visit_id IS NOT NULL)::int + 
        (prevention_id IS NOT NULL)::int <= 1
    )
);

CREATE INDEX idx_usage_items_client_id ON public.usage_items(client_id);
CREATE INDEX idx_usage_items_farm_id ON public.usage_items(farm_id);
CREATE INDEX idx_usage_items_treatment_id ON public.usage_items(treatment_id);
CREATE INDEX idx_usage_items_product_id ON public.usage_items(product_id);
CREATE INDEX idx_usage_items_batch_id ON public.usage_items(batch_id);
CREATE INDEX idx_usage_items_used_date ON public.usage_items(used_date);

COMMENT ON TABLE public.usage_items IS 'Product usage tracking with FIFO batch deduction';
COMMENT ON CONSTRAINT usage_items_single_parent ON public.usage_items IS 'Usage item must belong to exactly one parent (treatment, vaccination, visit, or prevention)';

-- =====================================================================
-- 9. TREATMENT COURSES & SCHEDULES
-- =====================================================================

-- Treatment Courses
CREATE TABLE IF NOT EXISTS public.treatment_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    initial_treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
    course_name text NOT NULL,
    start_date date NOT NULL,
    end_date date,
    status text DEFAULT 'active' NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT treatment_courses_status_check CHECK (status = ANY (ARRAY['active', 'completed', 'cancelled']))
);

CREATE INDEX idx_treatment_courses_client_id ON public.treatment_courses(client_id);
CREATE INDEX idx_treatment_courses_farm_id ON public.treatment_courses(farm_id);
CREATE INDEX idx_treatment_courses_animal_id ON public.treatment_courses(animal_id);

COMMENT ON TABLE public.treatment_courses IS 'Multi-day treatment courses';

-- Course Doses
CREATE TABLE IF NOT EXISTS public.course_doses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    course_id uuid REFERENCES public.treatment_courses(id) ON DELETE CASCADE NOT NULL,
    visit_id uuid REFERENCES public.animal_visits(id) ON DELETE SET NULL,
    scheduled_date date NOT NULL,
    administered_date date,
    dose_number integer NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT course_doses_status_check CHECK (status = ANY (ARRAY['pending', 'completed', 'skipped']))
);

CREATE INDEX idx_course_doses_client_id ON public.course_doses(client_id);
CREATE INDEX idx_course_doses_farm_id ON public.course_doses(farm_id);
CREATE INDEX idx_course_doses_course_id ON public.course_doses(course_id);

COMMENT ON TABLE public.course_doses IS 'Individual doses within treatment courses';

-- Course Medication Schedules
CREATE TABLE IF NOT EXISTS public.course_medication_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    course_id uuid REFERENCES public.treatment_courses(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    dose_amount numeric NOT NULL,
    dose_unit public.unit NOT NULL,
    frequency_days integer NOT NULL,
    total_doses integer NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_course_medication_schedules_client_id ON public.course_medication_schedules(client_id);
CREATE INDEX idx_course_medication_schedules_farm_id ON public.course_medication_schedules(farm_id);
CREATE INDEX idx_course_medication_schedules_course_id ON public.course_medication_schedules(course_id);

COMMENT ON TABLE public.course_medication_schedules IS 'Medication schedules for treatment courses';

-- =====================================================================
-- 10. SYNCHRONIZATION & BREEDING
-- =====================================================================

-- Synchronization Protocols
CREATE TABLE IF NOT EXISTS public.synchronization_protocols (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    protocol_name text NOT NULL,
    description text,
    duration_days integer NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_synchronization_protocols_client_id ON public.synchronization_protocols(client_id);
CREATE INDEX idx_synchronization_protocols_farm_id ON public.synchronization_protocols(farm_id);

COMMENT ON TABLE public.synchronization_protocols IS 'Breeding synchronization protocol templates';
COMMENT ON COLUMN public.synchronization_protocols.farm_id IS 'NULL for client-wide protocols';

-- Animal Synchronizations
CREATE TABLE IF NOT EXISTS public.animal_synchronizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    protocol_id uuid REFERENCES public.synchronization_protocols(id) ON DELETE CASCADE NOT NULL,
    start_date date NOT NULL,
    expected_end_date date NOT NULL,
    actual_end_date date,
    status text DEFAULT 'active' NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT animal_synchronizations_status_check CHECK (status = ANY (ARRAY['active', 'completed', 'cancelled']))
);

CREATE INDEX idx_animal_synchronizations_client_id ON public.animal_synchronizations(client_id);
CREATE INDEX idx_animal_synchronizations_farm_id ON public.animal_synchronizations(farm_id);
CREATE INDEX idx_animal_synchronizations_animal_id ON public.animal_synchronizations(animal_id);

COMMENT ON TABLE public.animal_synchronizations IS 'Active synchronization protocols for animals';

-- Synchronization Steps
CREATE TABLE IF NOT EXISTS public.synchronization_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    protocol_id uuid REFERENCES public.synchronization_protocols(id) ON DELETE CASCADE NOT NULL,
    animal_sync_id uuid REFERENCES public.animal_synchronizations(id) ON DELETE CASCADE,
    step_number integer NOT NULL,
    step_name text NOT NULL,
    days_from_start integer NOT NULL,
    scheduled_date date,
    completed_date date,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    dose_amount numeric,
    dose_unit public.unit,
    visit_id uuid REFERENCES public.animal_visits(id) ON DELETE SET NULL,
    status text DEFAULT 'pending' NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT synchronization_steps_status_check CHECK (status = ANY (ARRAY['pending', 'completed', 'skipped']))
);

CREATE INDEX idx_synchronization_steps_client_id ON public.synchronization_steps(client_id);
CREATE INDEX idx_synchronization_steps_farm_id ON public.synchronization_steps(farm_id);
CREATE INDEX idx_synchronization_steps_protocol_id ON public.synchronization_steps(protocol_id);
CREATE INDEX idx_synchronization_steps_animal_sync_id ON public.synchronization_steps(animal_sync_id);

COMMENT ON TABLE public.synchronization_steps IS 'Individual steps within synchronization protocols';

-- Insemination Products
CREATE TABLE IF NOT EXISTS public.insemination_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
    bull_code text NOT NULL,
    bull_name text,
    breed text,
    supplier text,
    is_active boolean DEFAULT true NOT NULL,
    is_shared boolean DEFAULT false NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_insemination_products_client_id ON public.insemination_products(client_id);
CREATE INDEX idx_insemination_products_farm_id ON public.insemination_products(farm_id);

COMMENT ON TABLE public.insemination_products IS 'Bull semen products for insemination';

-- Insemination Inventory
CREATE TABLE IF NOT EXISTS public.insemination_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.insemination_products(id) ON DELETE CASCADE NOT NULL,
    lot_number text,
    received_date date NOT NULL,
    qty_received integer NOT NULL,
    qty_used integer DEFAULT 0 NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_insemination_inventory_client_id ON public.insemination_inventory(client_id);
CREATE INDEX idx_insemination_inventory_farm_id ON public.insemination_inventory(farm_id);

COMMENT ON TABLE public.insemination_inventory IS 'Insemination product inventory tracking';

-- Insemination Records
CREATE TABLE IF NOT EXISTS public.insemination_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    insemination_product_id uuid REFERENCES public.insemination_products(id) ON DELETE SET NULL,
    inventory_id uuid REFERENCES public.insemination_inventory(id) ON DELETE SET NULL,
    sync_id uuid REFERENCES public.animal_synchronizations(id) ON DELETE SET NULL,
    insemination_date date NOT NULL,
    inseminator_name text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_insemination_records_client_id ON public.insemination_records(client_id);
CREATE INDEX idx_insemination_records_farm_id ON public.insemination_records(farm_id);
CREATE INDEX idx_insemination_records_animal_id ON public.insemination_records(animal_id);

COMMENT ON TABLE public.insemination_records IS 'Animal insemination records';

-- =====================================================================
-- 11. HEALTH MONITORING
-- =====================================================================

-- Hoof Condition Codes (Reference Table - Shared)
CREATE TABLE IF NOT EXISTS public.hoof_condition_codes (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    code text UNIQUE NOT NULL,
    description text NOT NULL,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.hoof_condition_codes IS 'Reference table for hoof condition classifications';

-- Insert standard hoof condition codes
INSERT INTO public.hoof_condition_codes (code, description) VALUES
    ('0', 'Healthy'),
    ('1', 'Minor lesion'),
    ('2', 'Moderate lesion'),
    ('3', 'Severe lesion')
ON CONFLICT (code) DO NOTHING;

-- Hoof Records
CREATE TABLE IF NOT EXISTS public.hoof_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    examination_date date NOT NULL,
    lf_condition text,
    rf_condition text,
    lr_condition text,
    rr_condition text,
    notes text,
    examined_by text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_hoof_records_client_id ON public.hoof_records(client_id);
CREATE INDEX idx_hoof_records_farm_id ON public.hoof_records(farm_id);
CREATE INDEX idx_hoof_records_animal_id ON public.hoof_records(animal_id);

COMMENT ON TABLE public.hoof_records IS 'Hoof health examination records';

-- Biocide Usage
CREATE TABLE IF NOT EXISTS public.biocide_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    usage_date date DEFAULT CURRENT_DATE NOT NULL,
    area_treated text,
    quantity_used numeric NOT NULL,
    unit public.unit NOT NULL,
    application_method text,
    applied_by text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_biocide_usage_client_id ON public.biocide_usage(client_id);
CREATE INDEX idx_biocide_usage_farm_id ON public.biocide_usage(farm_id);
CREATE INDEX idx_biocide_usage_product_id ON public.biocide_usage(product_id);

COMMENT ON TABLE public.biocide_usage IS 'Biocide and prevention product usage tracking';

-- =====================================================================
-- 12. WASTE MANAGEMENT
-- =====================================================================

-- Medical Waste
CREATE TABLE IF NOT EXISTS public.medical_waste (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    waste_date date DEFAULT CURRENT_DATE NOT NULL,
    weight_grams numeric(10,2) NOT NULL,
    waste_type text NOT NULL,
    disposal_method text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT medical_waste_weight_check CHECK (weight_grams > 0)
);

CREATE INDEX idx_medical_waste_client_id ON public.medical_waste(client_id);
CREATE INDEX idx_medical_waste_farm_id ON public.medical_waste(farm_id);
CREATE INDEX idx_medical_waste_waste_date ON public.medical_waste(waste_date);

COMMENT ON TABLE public.medical_waste IS 'Medical waste tracking and disposal records';

-- Batch Waste Tracking
CREATE TABLE IF NOT EXISTS public.batch_waste_tracking (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    waste_id uuid REFERENCES public.medical_waste(id) ON DELETE CASCADE NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT batch_waste_tracking_unique UNIQUE (batch_id, waste_id)
);

CREATE INDEX idx_batch_waste_tracking_client_id ON public.batch_waste_tracking(client_id);
CREATE INDEX idx_batch_waste_tracking_farm_id ON public.batch_waste_tracking(farm_id);
CREATE INDEX idx_batch_waste_tracking_batch_id ON public.batch_waste_tracking(batch_id);

COMMENT ON TABLE public.batch_waste_tracking IS 'Links batches to generated medical waste';

-- =====================================================================
-- 13. ENABLE ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_farm_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notepad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.species ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teat_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synchronization_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_synchronizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synchronization_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insemination_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insemination_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insemination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoof_condition_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoof_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biocide_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_waste_tracking ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 14. RLS POLICIES (PERMISSIVE FOR CUSTOM AUTH)
-- =====================================================================
-- Since we use custom authentication at application level,
-- we create permissive policies. The application handles authorization.

-- Clients
CREATE POLICY "Allow all operations on clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- Farms
CREATE POLICY "Allow all operations on farms" ON public.farms FOR ALL USING (true) WITH CHECK (true);

-- Users
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true) WITH CHECK (true);

-- User Farm Access
CREATE POLICY "Allow all operations on user_farm_access" ON public.user_farm_access FOR ALL USING (true) WITH CHECK (true);

-- User Module Permissions
CREATE POLICY "Allow all operations on user_module_permissions" ON public.user_module_permissions FOR ALL USING (true) WITH CHECK (true);

-- User Audit Logs
CREATE POLICY "Allow all operations on user_audit_logs" ON public.user_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- System Settings
CREATE POLICY "Allow all operations on system_settings" ON public.system_settings FOR ALL USING (true) WITH CHECK (true);

-- Shared Notepad
CREATE POLICY "Allow all operations on shared_notepad" ON public.shared_notepad FOR ALL USING (true) WITH CHECK (true);

-- Species (Reference Table)
CREATE POLICY "Allow all to read species" ON public.species FOR SELECT USING (true);
CREATE POLICY "Allow all operations on species" ON public.species FOR ALL USING (true) WITH CHECK (true);

-- Animals
CREATE POLICY "Allow all operations on animals" ON public.animals FOR ALL USING (true) WITH CHECK (true);

-- Diseases
CREATE POLICY "Allow all operations on diseases" ON public.diseases FOR ALL USING (true) WITH CHECK (true);

-- Treatments
CREATE POLICY "Allow all operations on treatments" ON public.treatments FOR ALL USING (true) WITH CHECK (true);

-- Animal Visits
CREATE POLICY "Allow all operations on animal_visits" ON public.animal_visits FOR ALL USING (true) WITH CHECK (true);

-- Teat Status
CREATE POLICY "Allow all operations on teat_status" ON public.teat_status FOR ALL USING (true) WITH CHECK (true);

-- Vaccinations
CREATE POLICY "Allow all operations on vaccinations" ON public.vaccinations FOR ALL USING (true) WITH CHECK (true);

-- Products
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true) WITH CHECK (true);

-- Suppliers
CREATE POLICY "Allow all operations on suppliers" ON public.suppliers FOR ALL USING (true) WITH CHECK (true);

-- Invoices
CREATE POLICY "Allow all operations on invoices" ON public.invoices FOR ALL USING (true) WITH CHECK (true);

-- Invoice Items
CREATE POLICY "Allow all operations on invoice_items" ON public.invoice_items FOR ALL USING (true) WITH CHECK (true);

-- Batches
CREATE POLICY "Allow all operations on batches" ON public.batches FOR ALL USING (true) WITH CHECK (true);

-- Usage Items
CREATE POLICY "Allow all operations on usage_items" ON public.usage_items FOR ALL USING (true) WITH CHECK (true);

-- Treatment Courses
CREATE POLICY "Allow all operations on treatment_courses" ON public.treatment_courses FOR ALL USING (true) WITH CHECK (true);

-- Course Doses
CREATE POLICY "Allow all operations on course_doses" ON public.course_doses FOR ALL USING (true) WITH CHECK (true);

-- Course Medication Schedules
CREATE POLICY "Allow all operations on course_medication_schedules" ON public.course_medication_schedules FOR ALL USING (true) WITH CHECK (true);

-- Synchronization Protocols
CREATE POLICY "Allow all operations on synchronization_protocols" ON public.synchronization_protocols FOR ALL USING (true) WITH CHECK (true);

-- Animal Synchronizations
CREATE POLICY "Allow all operations on animal_synchronizations" ON public.animal_synchronizations FOR ALL USING (true) WITH CHECK (true);

-- Synchronization Steps
CREATE POLICY "Allow all operations on synchronization_steps" ON public.synchronization_steps FOR ALL USING (true) WITH CHECK (true);

-- Insemination Products
CREATE POLICY "Allow all operations on insemination_products" ON public.insemination_products FOR ALL USING (true) WITH CHECK (true);

-- Insemination Inventory
CREATE POLICY "Allow all operations on insemination_inventory" ON public.insemination_inventory FOR ALL USING (true) WITH CHECK (true);

-- Insemination Records
CREATE POLICY "Allow all operations on insemination_records" ON public.insemination_records FOR ALL USING (true) WITH CHECK (true);

-- Hoof Condition Codes (Reference Table)
CREATE POLICY "Allow all to read hoof_condition_codes" ON public.hoof_condition_codes FOR SELECT USING (true);
CREATE POLICY "Allow all operations on hoof_condition_codes" ON public.hoof_condition_codes FOR ALL USING (true) WITH CHECK (true);

-- Hoof Records
CREATE POLICY "Allow all operations on hoof_records" ON public.hoof_records FOR ALL USING (true) WITH CHECK (true);

-- Biocide Usage
CREATE POLICY "Allow all operations on biocide_usage" ON public.biocide_usage FOR ALL USING (true) WITH CHECK (true);

-- Medical Waste
CREATE POLICY "Allow all operations on medical_waste" ON public.medical_waste FOR ALL USING (true) WITH CHECK (true);

-- Batch Waste Tracking
CREATE POLICY "Allow all operations on batch_waste_tracking" ON public.batch_waste_tracking FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 15. GRANT PERMISSIONS
-- =====================================================================

-- Grant table access to anon and authenticated roles
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================================
-- 16. HELPER FUNCTIONS
-- =====================================================================

-- Function to log user actions
CREATE OR REPLACE FUNCTION public.log_user_action(
    p_user_id uuid,
    p_action text,
    p_table_name text DEFAULT NULL,
    p_record_id uuid DEFAULT NULL,
    p_old_data jsonb DEFAULT NULL,
    p_new_data jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_client_id uuid;
    v_farm_id uuid;
BEGIN
    -- Get user's client_id and default_farm_id
    SELECT client_id, default_farm_id INTO v_client_id, v_farm_id
    FROM public.users
    WHERE id = p_user_id;

    -- Insert audit log
    INSERT INTO public.user_audit_logs (
        user_id,
        client_id,
        farm_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    ) VALUES (
        p_user_id,
        v_client_id,
        v_farm_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_data,
        p_new_data
    );
END;
$$;

COMMENT ON FUNCTION public.log_user_action IS 'Logs user actions to audit trail';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

COMMENT ON SCHEMA public IS 'Multi-tenant SaaS veterinary management system with CLIENT → FARM → DATA hierarchy';
