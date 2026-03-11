-- =====================================================================
-- RVAC Veterinarija System - Baseline Schema
-- =====================================================================
-- Created: 2026-03-12
-- Description: Complete baseline schema for RVAC (Respublikinis veterinarijos 
--              aprūpinimo centras) multi-tenant veterinary management system.
--              Supports 60+ farms with two core modules: Veterinarija and Išlaidos.
-- =====================================================================

-- =====================================================================
-- 1. EXTENSIONS
-- =====================================================================

-- Note: Extensions are typically managed at the database level
-- Ensure these are enabled: uuid-ossp, pgcrypto

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

-- =====================================================================
-- 3. CORE MULTI-TENANCY TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.farms (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    name text NOT NULL,
    code text UNIQUE,
    address text,
    contact_person text,
    contact_phone text,
    contact_email text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.farms IS 'Multi-tenancy: Each farm is a separate tenant with isolated data';

-- =====================================================================
-- 4. USER MANAGEMENT
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    email text,
    password_hash text,
    role text NOT NULL,
    full_name text DEFAULT '' NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    is_frozen boolean DEFAULT false NOT NULL,
    frozen_at timestamptz,
    frozen_by uuid,
    last_login timestamptz,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['admin', 'vet', 'tech', 'viewer']))
);

COMMENT ON TABLE public.users IS 'System users with farm-based access control';
COMMENT ON COLUMN public.users.email IS 'Email can be NULL for users without login access (e.g., farm workers)';
COMMENT ON COLUMN public.users.farm_id IS 'Associates user with a specific farm for data isolation';

CREATE TABLE IF NOT EXISTS public.user_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
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

COMMENT ON TABLE public.user_audit_logs IS 'Audit trail of all user actions in the system';

-- =====================================================================
-- 5. SYSTEM CONFIGURATION
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.system_settings (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    setting_key text NOT NULL,
    setting_value text NOT NULL,
    setting_type text NOT NULL,
    description text,
    updated_at timestamptz DEFAULT now(),
    updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    CONSTRAINT system_settings_setting_type_check CHECK (setting_type = ANY (ARRAY['number', 'text', 'boolean'])),
    CONSTRAINT system_settings_farm_key_unique UNIQUE (farm_id, setting_key)
);

COMMENT ON TABLE public.system_settings IS 'Farm-specific system configuration settings';

CREATE TABLE IF NOT EXISTS public.shared_notepad (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    content text DEFAULT '' NOT NULL,
    last_edited_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.shared_notepad IS 'Shared notepad for farm team collaboration';

-- =====================================================================
-- 6. VETERINARY CORE TABLES
-- =====================================================================

-- Animals
CREATE TABLE IF NOT EXISTS public.animals (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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

COMMENT ON TABLE public.animals IS 'Core animal registry for veterinary tracking';
COMMENT ON COLUMN public.animals.farm_id IS 'Farm tenant isolation';

-- Diseases
CREATE TABLE IF NOT EXISTS public.diseases (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    code text,
    name text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.diseases IS 'Disease classification registry';

-- Treatments
CREATE TABLE IF NOT EXISTS public.treatments (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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

COMMENT ON TABLE public.treatments IS 'Veterinary treatment records';
COMMENT ON COLUMN public.treatments.disabled_teats IS 'Array of teat positions that were disabled during this treatment';

-- Animal Visits
CREATE TABLE IF NOT EXISTS public.animal_visits (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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

COMMENT ON TABLE public.animal_visits IS 'Scheduled and completed animal visits';
COMMENT ON COLUMN public.animal_visits.planned_medications IS 'JSONB array of medications planned for this visit';
COMMENT ON COLUMN public.animal_visits.medications_processed IS 'Whether planned medications have been deducted from inventory';
COMMENT ON COLUMN public.animal_visits.related_visit_id IS 'Links to the original visit for course treatments';
COMMENT ON COLUMN public.animal_visits.course_id IS 'Links visit to its parent treatment course';

-- Teat Status
CREATE TABLE IF NOT EXISTS public.teat_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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

COMMENT ON TABLE public.teat_status IS 'Tracks disabled teats per animal';

-- Vaccinations
CREATE TABLE IF NOT EXISTS public.vaccinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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

COMMENT ON TABLE public.vaccinations IS 'Vaccination records for animals';

-- =====================================================================
-- 7. INVENTORY MANAGEMENT
-- =====================================================================

-- Products
CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    category public.product_category NOT NULL,
    primary_pack_unit public.unit NOT NULL,
    primary_pack_size numeric,
    active_substance text,
    registration_code text,
    dosage_notes text,
    is_active boolean DEFAULT true NOT NULL,
    withdrawal_days_meat integer,
    withdrawal_days_milk integer,
    subcategory text,
    subcategory_2 text,
    package_weight_g numeric(10,2),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT products_package_weight_g_check CHECK (package_weight_g > 0)
);

COMMENT ON TABLE public.products IS 'Product catalog for medications, supplies, and materials';
COMMENT ON COLUMN public.products.package_weight_g IS 'Empty package weight in grams. Used for automatic medical waste generation when batch is fully depleted.';

-- Suppliers
CREATE TABLE IF NOT EXISTS public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    code text,
    vat_code text,
    phone text,
    email text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.suppliers IS 'Supplier registry for inventory procurement';

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.invoices IS 'Invoice records for expense tracking';

-- Invoice Items
CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.invoice_items IS 'Line items for invoices';

-- Batches
CREATE TABLE IF NOT EXISTS public.batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
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
    currency text DEFAULT 'EUR',
    received_qty numeric NOT NULL,
    qty_left numeric(10,2),
    invoice_path text,
    serial_number text,
    package_size numeric(10,2),
    package_count numeric(10,2),
    batch_number text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT batches_received_qty_check CHECK (received_qty >= 0),
    CONSTRAINT batches_status_check CHECK (status = ANY (ARRAY['active', 'depleted', 'expired']))
);

COMMENT ON TABLE public.batches IS 'Inventory batches with FIFO tracking';
COMMENT ON COLUMN public.batches.received_qty IS 'Total quantity calculated as package_size * package_count, or manually entered';
COMMENT ON COLUMN public.batches.package_size IS 'Size of a single package unit (e.g., 1 bottle = 10ml, 1 box = 100 tablets)';
COMMENT ON COLUMN public.batches.package_count IS 'Number of packages received (e.g., 6 bottles, 3 boxes)';
COMMENT ON COLUMN public.batches.qty_left IS 'Remaining quantity in this batch, automatically updated when usage_items are inserted';
COMMENT ON COLUMN public.batches.batch_number IS 'Human-readable batch identifier, generated from lot or created_at';
COMMENT ON COLUMN public.batches.status IS 'Batch status: active, depleted, or expired';

-- Usage Items (Product Usage Tracking)
CREATE TABLE IF NOT EXISTS public.usage_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    treatment_id uuid,
    vaccination_id uuid,
    biocide_usage_id uuid,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL,
    qty numeric NOT NULL,
    unit public.unit NOT NULL,
    purpose text DEFAULT 'treatment',
    teat text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT usage_items_qty_check CHECK (qty > 0),
    CONSTRAINT usage_items_source_check CHECK (
        (treatment_id IS NOT NULL AND vaccination_id IS NULL AND biocide_usage_id IS NULL) OR
        (treatment_id IS NULL AND vaccination_id IS NOT NULL AND biocide_usage_id IS NULL) OR
        (treatment_id IS NULL AND vaccination_id IS NULL AND biocide_usage_id IS NOT NULL)
    ),
    CONSTRAINT usage_items_teat_check CHECK (teat = ANY (ARRAY['d1', 'd2', 'k1', 'k2']))
);

COMMENT ON TABLE public.usage_items IS 'Tracks product usage across treatments, vaccinations, and biocide applications';
COMMENT ON COLUMN public.usage_items.biocide_usage_id IS 'Links to biocide_usage record for prevention/biocide product usage tracking';
COMMENT ON CONSTRAINT usage_items_source_check ON public.usage_items IS 'Ensures usage_items are linked to exactly one source: treatment, vaccination, or biocide_usage';

-- Treatment Courses
CREATE TABLE IF NOT EXISTS public.treatment_courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    treatment_id uuid NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    total_dose numeric,
    days integer NOT NULL,
    daily_dose numeric,
    unit public.unit NOT NULL,
    start_date date DEFAULT CURRENT_DATE NOT NULL,
    doses_administered integer DEFAULT 0,
    status text DEFAULT 'active',
    teat text,
    medication_schedule_flexible boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT treatment_courses_daily_dose_check CHECK (daily_dose > 0),
    CONSTRAINT treatment_courses_days_check CHECK (days > 0),
    CONSTRAINT treatment_courses_status_check CHECK (status = ANY (ARRAY['active', 'completed', 'cancelled'])),
    CONSTRAINT treatment_courses_teat_check CHECK (teat = ANY (ARRAY['d1', 'd2', 'k1', 'k2'])),
    CONSTRAINT treatment_courses_total_dose_check CHECK (total_dose > 0)
);

COMMENT ON TABLE public.treatment_courses IS 'Multi-day treatment courses for animals';
COMMENT ON COLUMN public.treatment_courses.batch_id IS 'Batch ID for the medication used in this course. NULL when course is planned but batch not yet selected (batch will be selected per visit). Populated when batch is selected upfront (legacy courses or immediate treatments).';
COMMENT ON COLUMN public.treatment_courses.total_dose IS 'Total dose for course. NULL when using manual entry per visit.';
COMMENT ON COLUMN public.treatment_courses.daily_dose IS 'Daily dose for course. NULL when using manual entry per visit.';
COMMENT ON COLUMN public.treatment_courses.medication_schedule_flexible IS 'True if course uses flexible per-date medication scheduling';

-- Course Doses
CREATE TABLE IF NOT EXISTS public.course_doses (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    course_id uuid REFERENCES public.treatment_courses(id) ON DELETE CASCADE NOT NULL,
    day_number integer NOT NULL,
    scheduled_date date NOT NULL,
    administered_date date,
    dose_amount numeric,
    unit public.unit NOT NULL,
    administered_by text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT course_doses_day_number_check CHECK (day_number > 0),
    CONSTRAINT course_doses_dose_amount_check CHECK (dose_amount > 0)
);

COMMENT ON TABLE public.course_doses IS 'Individual doses within a treatment course';
COMMENT ON COLUMN public.course_doses.dose_amount IS 'Actual dose amount administered. NULL until visit is completed and quantity is entered.';

-- Course Medication Schedules
CREATE TABLE IF NOT EXISTS public.course_medication_schedules (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    course_id uuid REFERENCES public.treatment_courses(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    visit_id uuid,
    scheduled_date date NOT NULL,
    unit text DEFAULT 'ml' NOT NULL,
    teat text,
    purpose text DEFAULT 'Gydymas',
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT course_medication_schedules_teat_check CHECK (teat = ANY (ARRAY['d1', 'd2', 'k1', 'k2']))
);

COMMENT ON TABLE public.course_medication_schedules IS 'Defines which medications should be used on which dates within a treatment course';
COMMENT ON COLUMN public.course_medication_schedules.batch_id IS 'Batch can be NULL at scheduling time, selected at visit completion';
COMMENT ON COLUMN public.course_medication_schedules.scheduled_date IS 'The date when this medication should be administered';
COMMENT ON COLUMN public.course_medication_schedules.visit_id IS 'Links to the actual visit when scheduled. NULL until visit is created.';

-- =====================================================================
-- 8. HOOF HEALTH TRACKING
-- =====================================================================

-- Hoof Condition Codes (Reference Table)
CREATE TABLE IF NOT EXISTS public.hoof_condition_codes (
    code text NOT NULL PRIMARY KEY,
    name_lt text NOT NULL,
    name_en text NOT NULL,
    description text,
    typical_severity_range text,
    treatment_notes text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.hoof_condition_codes IS 'Reference table for standardized hoof condition codes used internationally';

-- Hoof Records
CREATE TABLE IF NOT EXISTS public.hoof_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    visit_id uuid,
    condition_code text REFERENCES public.hoof_condition_codes(code) ON DELETE SET NULL,
    treatment_product_id uuid,
    treatment_batch_id uuid,
    examination_date date DEFAULT CURRENT_DATE NOT NULL,
    leg text NOT NULL,
    claw text NOT NULL,
    severity integer,
    was_trimmed boolean DEFAULT false,
    was_treated boolean DEFAULT false,
    treatment_quantity numeric(10,3),
    treatment_unit public.unit,
    treatment_notes text,
    bandage_applied boolean DEFAULT false,
    requires_followup boolean DEFAULT false,
    followup_date date,
    followup_completed boolean DEFAULT false,
    technician_name text NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT hoof_records_claw_check CHECK (claw = ANY (ARRAY['inner', 'outer'])),
    CONSTRAINT hoof_records_leg_check CHECK (leg = ANY (ARRAY['FL', 'FR', 'HL', 'HR'])),
    CONSTRAINT hoof_records_severity_check CHECK (severity >= 0 AND severity <= 4)
);

COMMENT ON TABLE public.hoof_records IS 'Main table tracking all hoof examinations, conditions, and treatments per animal';

-- =====================================================================
-- 9. SYNCHRONIZATION (BREEDING) PROTOCOLS
-- =====================================================================

-- Synchronization Protocols
CREATE TABLE IF NOT EXISTS public.synchronization_protocols (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text,
    steps jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.synchronization_protocols IS 'Breeding synchronization protocol templates';

-- Animal Synchronizations
CREATE TABLE IF NOT EXISTS public.animal_synchronizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    protocol_id uuid REFERENCES public.synchronization_protocols(id) ON DELETE RESTRICT NOT NULL,
    start_date date NOT NULL,
    status text DEFAULT 'Active' NOT NULL,
    insemination_date date,
    insemination_number text,
    result text,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT animal_synchronizations_status_check CHECK (status = ANY (ARRAY['Active', 'Completed', 'Cancelled']))
);

COMMENT ON TABLE public.animal_synchronizations IS 'Active synchronization protocols applied to animals';

-- Synchronization Steps
CREATE TABLE IF NOT EXISTS public.synchronization_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    synchronization_id uuid REFERENCES public.animal_synchronizations(id) ON DELETE CASCADE NOT NULL,
    step_number integer NOT NULL,
    step_name text NOT NULL,
    scheduled_date date NOT NULL,
    is_evening boolean DEFAULT false,
    medication_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    dosage numeric(10,2),
    dosage_unit text,
    completed boolean DEFAULT false,
    completed_at timestamptz,
    visit_id uuid,
    batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.synchronization_steps IS 'Individual steps within a synchronization protocol';

-- Insemination Products
CREATE TABLE IF NOT EXISTS public.insemination_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    product_type text NOT NULL,
    supplier_group text DEFAULT 'PASARU GRUPE',
    unit text DEFAULT 'vnt',
    price numeric(10,2),
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT insemination_products_product_type_check CHECK (product_type = ANY (ARRAY['SPERM', 'GLOVES']))
);

COMMENT ON TABLE public.insemination_products IS 'Specialized products for insemination procedures';

-- Insemination Inventory
CREATE TABLE IF NOT EXISTS public.insemination_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.insemination_products(id) ON DELETE CASCADE NOT NULL,
    quantity numeric(10,2) DEFAULT 0 NOT NULL,
    batch_number text,
    expiry_date date,
    received_date date DEFAULT CURRENT_DATE,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.insemination_inventory IS 'Inventory tracking for insemination products';

-- Insemination Records
CREATE TABLE IF NOT EXISTS public.insemination_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    sync_step_id uuid REFERENCES public.synchronization_steps(id) ON DELETE SET NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE NOT NULL,
    sperm_product_id uuid REFERENCES public.insemination_products(id) ON DELETE CASCADE NOT NULL,
    glove_product_id uuid REFERENCES public.insemination_products(id) ON DELETE SET NULL,
    performed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    insemination_date date DEFAULT CURRENT_DATE NOT NULL,
    sperm_quantity numeric(10,2) NOT NULL,
    glove_quantity numeric(10,2),
    notes text,
    pregnancy_confirmed boolean,
    pregnancy_check_date date,
    pregnancy_notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.insemination_records IS 'Records of insemination procedures performed';

-- =====================================================================
-- 10. BIOCIDE & WASTE MANAGEMENT
-- =====================================================================

-- Biocide Usage
CREATE TABLE IF NOT EXISTS public.biocide_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    use_date date NOT NULL,
    purpose text,
    work_scope text,
    qty numeric NOT NULL,
    unit public.unit NOT NULL,
    used_by_name text,
    user_signature_path text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT biocide_usage_qty_check CHECK (qty > 0)
);

COMMENT ON TABLE public.biocide_usage IS 'Tracking of biocide and prevention product usage';

-- Medical Waste
CREATE TABLE IF NOT EXISTS public.medical_waste (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    source_product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    source_batch_id uuid REFERENCES public.batches(id) ON DELETE SET NULL,
    waste_code text NOT NULL,
    name text NOT NULL,
    period text,
    date date,
    qty_generated numeric,
    qty_transferred numeric,
    carrier text,
    processor text,
    transfer_date date,
    doc_no text,
    responsible text,
    auto_generated boolean DEFAULT false NOT NULL,
    package_count integer,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT medical_waste_package_count_check CHECK (package_count > 0)
);

COMMENT ON TABLE public.medical_waste IS 'Medical waste tracking for regulatory compliance';
COMMENT ON COLUMN public.medical_waste.auto_generated IS 'True if this waste entry was automatically generated when batch reached zero stock';
COMMENT ON COLUMN public.medical_waste.source_batch_id IS 'Reference to the batch that generated this waste (for auto-generated entries)';
COMMENT ON COLUMN public.medical_waste.source_product_id IS 'Reference to the product that generated this waste (for auto-generated entries)';
COMMENT ON COLUMN public.medical_waste.package_count IS 'Number of empty packages for auto-generated waste entries';

-- Batch Waste Tracking
CREATE TABLE IF NOT EXISTS public.batch_waste_tracking (
    batch_id uuid REFERENCES public.batches(id) ON DELETE CASCADE NOT NULL PRIMARY KEY,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    medical_waste_id uuid REFERENCES public.medical_waste(id) ON DELETE CASCADE NOT NULL,
    waste_generated_at timestamptz DEFAULT now() NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.batch_waste_tracking IS 'Tracks which batches have already generated medical waste to prevent duplicates';

-- =====================================================================
-- 11. FOREIGN KEY CONSTRAINTS (Additional)
-- =====================================================================

-- Add remaining foreign keys that reference tables defined later (with IF NOT EXISTS)
DO $$ BEGIN
    ALTER TABLE public.treatments
        ADD CONSTRAINT treatments_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.animal_visits(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.treatment_courses
        ADD CONSTRAINT treatment_courses_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatments(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.usage_items
        ADD CONSTRAINT usage_items_treatment_id_fkey FOREIGN KEY (treatment_id) REFERENCES public.treatments(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.usage_items
        ADD CONSTRAINT usage_items_vaccination_id_fkey FOREIGN KEY (vaccination_id) REFERENCES public.vaccinations(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.usage_items
        ADD CONSTRAINT usage_items_biocide_usage_id_fkey FOREIGN KEY (biocide_usage_id) REFERENCES public.biocide_usage(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.animal_visits
        ADD CONSTRAINT animal_visits_related_visit_id_fkey FOREIGN KEY (related_visit_id) REFERENCES public.animal_visits(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.animal_visits
        ADD CONSTRAINT animal_visits_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.treatment_courses(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.animal_visits
        ADD CONSTRAINT animal_visits_sync_step_id_fkey FOREIGN KEY (sync_step_id) REFERENCES public.synchronization_steps(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.course_medication_schedules
        ADD CONSTRAINT course_medication_schedules_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.animal_visits(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.hoof_records
        ADD CONSTRAINT hoof_records_visit_id_fkey FOREIGN KEY (visit_id) REFERENCES public.animal_visits(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.hoof_records
        ADD CONSTRAINT hoof_records_treatment_product_id_fkey FOREIGN KEY (treatment_product_id) REFERENCES public.products(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.hoof_records
        ADD CONSTRAINT hoof_records_treatment_batch_id_fkey FOREIGN KEY (treatment_batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.batches(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE public.invoice_items
        ADD CONSTRAINT invoice_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================================
-- 12. INDEXES FOR PERFORMANCE
-- =====================================================================

-- Animals
CREATE UNIQUE INDEX IF NOT EXISTS animals_farm_tag_no_uk ON public.animals (farm_id, tag_no) WHERE tag_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animals_farm_id ON public.animals (farm_id);
CREATE INDEX IF NOT EXISTS idx_animals_active ON public.animals (farm_id, active);

-- Treatments
CREATE INDEX IF NOT EXISTS idx_treatments_farm_id ON public.treatments (farm_id);
CREATE INDEX IF NOT EXISTS idx_treatments_animal_id ON public.treatments (animal_id);
CREATE INDEX IF NOT EXISTS idx_treatments_disease_id ON public.treatments (disease_id);
CREATE INDEX IF NOT EXISTS idx_treatments_reg_date ON public.treatments (farm_id, reg_date DESC);
CREATE INDEX IF NOT EXISTS idx_treatments_withdrawal_milk ON public.treatments (farm_id, withdrawal_until_milk) WHERE withdrawal_until_milk IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treatments_withdrawal_meat ON public.treatments (farm_id, withdrawal_until_meat) WHERE withdrawal_until_meat IS NOT NULL;

-- Animal Visits
CREATE INDEX IF NOT EXISTS idx_animal_visits_farm_id ON public.animal_visits (farm_id);
CREATE INDEX IF NOT EXISTS idx_animal_visits_animal_id ON public.animal_visits (animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_visits_datetime ON public.animal_visits (farm_id, visit_datetime);
CREATE INDEX IF NOT EXISTS idx_animal_visits_status ON public.animal_visits (farm_id, status);
CREATE INDEX IF NOT EXISTS idx_animal_visits_animal_status ON public.animal_visits (animal_id, status);
CREATE INDEX IF NOT EXISTS idx_animal_visits_course ON public.animal_visits (course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_animal_visits_sync_step ON public.animal_visits (sync_step_id);
CREATE INDEX IF NOT EXISTS idx_animal_visits_related_treatment ON public.animal_visits (related_treatment_id) WHERE related_treatment_id IS NOT NULL;

-- Products
CREATE INDEX IF NOT EXISTS idx_products_farm_id ON public.products (farm_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (farm_id, category);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products (farm_id, is_active);

-- Batches
CREATE INDEX IF NOT EXISTS idx_batches_farm_id ON public.batches (farm_id);
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON public.batches (product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON public.batches (farm_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_batches_invoice ON public.batches (invoice_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON public.batches (farm_id, status);
CREATE INDEX IF NOT EXISTS idx_batches_package_size ON public.batches (package_size);
CREATE INDEX IF NOT EXISTS idx_batches_package_count ON public.batches (package_count);

-- Usage Items
CREATE INDEX IF NOT EXISTS idx_usage_items_farm_id ON public.usage_items (farm_id);
CREATE INDEX IF NOT EXISTS idx_usage_items_treatment ON public.usage_items (treatment_id);
CREATE INDEX IF NOT EXISTS idx_usage_items_vaccination ON public.usage_items (vaccination_id);
CREATE INDEX IF NOT EXISTS idx_usage_items_biocide ON public.usage_items (biocide_usage_id);
CREATE INDEX IF NOT EXISTS idx_usage_items_product ON public.usage_items (product_id);
CREATE INDEX IF NOT EXISTS idx_usage_items_batch ON public.usage_items (batch_id);

-- Treatment Courses
CREATE INDEX IF NOT EXISTS idx_courses_farm_id ON public.treatment_courses (farm_id);
CREATE INDEX IF NOT EXISTS idx_courses_treatment ON public.treatment_courses (treatment_id);
CREATE INDEX IF NOT EXISTS idx_courses_status ON public.treatment_courses (farm_id, status);

-- Course Doses
CREATE INDEX IF NOT EXISTS idx_course_doses_farm_id ON public.course_doses (farm_id);
CREATE INDEX IF NOT EXISTS idx_course_doses_course ON public.course_doses (course_id);
CREATE INDEX IF NOT EXISTS idx_course_doses_scheduled ON public.course_doses (scheduled_date);

-- Course Medication Schedules
CREATE INDEX IF NOT EXISTS idx_course_medication_schedules_farm_id ON public.course_medication_schedules (farm_id);
CREATE INDEX IF NOT EXISTS idx_course_medication_schedules_course ON public.course_medication_schedules (course_id);
CREATE INDEX IF NOT EXISTS idx_course_medication_schedules_date ON public.course_medication_schedules (scheduled_date);
CREATE INDEX IF NOT EXISTS idx_course_medication_schedules_visit ON public.course_medication_schedules (visit_id) WHERE visit_id IS NOT NULL;

-- Vaccinations
CREATE INDEX IF NOT EXISTS idx_vaccinations_farm_id ON public.vaccinations (farm_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_id ON public.vaccinations (animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_date ON public.vaccinations (farm_id, vaccination_date DESC);

-- Synchronizations
CREATE INDEX IF NOT EXISTS idx_animal_synchronizations_farm_id ON public.animal_synchronizations (farm_id);
CREATE INDEX IF NOT EXISTS idx_animal_synchronizations_animal_id ON public.animal_synchronizations (animal_id);
CREATE INDEX IF NOT EXISTS idx_animal_synchronizations_start_date ON public.animal_synchronizations (start_date);
CREATE INDEX IF NOT EXISTS idx_animal_synchronizations_status ON public.animal_synchronizations (farm_id, status);

-- Synchronization Steps
CREATE INDEX IF NOT EXISTS idx_synchronization_steps_farm_id ON public.synchronization_steps (farm_id);
CREATE INDEX IF NOT EXISTS idx_synchronization_steps_sync_id ON public.synchronization_steps (synchronization_id);
CREATE INDEX IF NOT EXISTS idx_synchronization_steps_scheduled ON public.synchronization_steps (scheduled_date);

-- Insemination Records
CREATE INDEX IF NOT EXISTS idx_insemination_records_farm_id ON public.insemination_records (farm_id);
CREATE INDEX IF NOT EXISTS idx_insemination_records_animal_id ON public.insemination_records (animal_id);
CREATE INDEX IF NOT EXISTS idx_insemination_records_date ON public.insemination_records (farm_id, insemination_date DESC);

-- Hoof Records
CREATE INDEX IF NOT EXISTS idx_hoof_records_farm_id ON public.hoof_records (farm_id);
CREATE INDEX IF NOT EXISTS idx_hoof_records_animal_id ON public.hoof_records (animal_id);
CREATE INDEX IF NOT EXISTS idx_hoof_records_exam_date ON public.hoof_records (farm_id, examination_date DESC);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_farm_id ON public.invoices (farm_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON public.invoices (farm_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON public.invoices (supplier_id);

-- Invoice Items
CREATE INDEX IF NOT EXISTS idx_invoice_items_farm_id ON public.invoice_items (farm_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items (invoice_id);

-- Suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_farm_id ON public.suppliers (farm_id);

-- Diseases
CREATE UNIQUE INDEX IF NOT EXISTS diseases_farm_name_idx ON public.diseases (farm_id, lower(name));

-- Biocide Usage
CREATE INDEX IF NOT EXISTS idx_biocide_usage_farm_id ON public.biocide_usage (farm_id);
CREATE INDEX IF NOT EXISTS idx_biocide_usage_date ON public.biocide_usage (farm_id, use_date DESC);

-- Medical Waste
CREATE INDEX IF NOT EXISTS idx_medical_waste_farm_id ON public.medical_waste (farm_id);
CREATE INDEX IF NOT EXISTS idx_medical_waste_date ON public.medical_waste (farm_id, date DESC);

-- Batch Waste Tracking
CREATE INDEX IF NOT EXISTS idx_batch_waste_tracking_farm_id ON public.batch_waste_tracking (farm_id);
CREATE INDEX IF NOT EXISTS idx_batch_waste_tracking_batch ON public.batch_waste_tracking (batch_id);

-- Teat Status
CREATE INDEX IF NOT EXISTS idx_teat_status_farm_id ON public.teat_status (farm_id);
CREATE INDEX IF NOT EXISTS idx_teat_status_animal_id ON public.teat_status (animal_id);

-- User Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_farm_id ON public.user_audit_logs (farm_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.user_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.user_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.user_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.user_audit_logs (table_name);

-- System Settings
CREATE INDEX IF NOT EXISTS idx_system_settings_farm_id ON public.system_settings (farm_id);

-- Shared Notepad
CREATE INDEX IF NOT EXISTS idx_shared_notepad_farm_id ON public.shared_notepad (farm_id);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_farm_id ON public.users (farm_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON public.users (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users (email) WHERE email IS NOT NULL;

-- Synchronization Protocols
CREATE INDEX IF NOT EXISTS idx_synchronization_protocols_farm_id ON public.synchronization_protocols (farm_id);

-- Insemination Products
CREATE INDEX IF NOT EXISTS idx_insemination_products_farm_id ON public.insemination_products (farm_id);

-- Insemination Inventory
CREATE INDEX IF NOT EXISTS idx_insemination_inventory_farm_id ON public.insemination_inventory (farm_id);

-- =====================================================================
-- 13. VIEWS
-- =====================================================================

-- Stock by Batch View
CREATE OR REPLACE VIEW public.stock_by_batch AS
SELECT 
    b.id AS batch_id,
    b.farm_id,
    p.id AS product_id,
    b.qty_left AS on_hand,
    b.expiry_date,
    b.lot,
    b.mfg_date,
    b.batch_number,
    b.status,
    p.name AS product_name,
    p.category AS product_category,
    b.received_qty,
    COALESCE(SUM(ui.qty), 0) AS total_used,
    b.created_at,
    CASE
        WHEN b.expiry_date < CURRENT_DATE THEN 'Expired'
        WHEN b.qty_left <= 0 THEN 'Depleted'
        WHEN b.qty_left < (b.received_qty * 0.2) THEN 'Low Stock'
        ELSE 'Available'
    END AS stock_status
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.usage_items ui ON ui.batch_id = b.id
GROUP BY b.id, b.batch_number, b.lot, b.status, p.id, p.name, p.category, 
         b.received_qty, b.qty_left, b.expiry_date, b.mfg_date, b.created_at, b.farm_id
ORDER BY b.created_at DESC;

COMMENT ON VIEW public.stock_by_batch IS 'Consolidated view of stock levels by batch with usage tracking and backward-compatible on_hand column';

-- Stock by Product View
CREATE OR REPLACE VIEW public.stock_by_product AS
SELECT 
    farm_id,
    product_id,
    product_name AS name,
    product_category AS category,
    SUM(on_hand) AS on_hand
FROM public.stock_by_batch
GROUP BY farm_id, product_id, product_name, product_category;

COMMENT ON VIEW public.stock_by_product IS 'Aggregated stock levels by product';

-- Treatment History View
CREATE OR REPLACE VIEW public.treatment_history_view AS
SELECT 
    t.id AS treatment_id,
    t.farm_id,
    t.reg_date,
    t.first_symptoms_date,
    t.animal_condition,
    t.tests,
    t.clinical_diagnosis,
    t.outcome,
    t.services,
    t.vet_name,
    t.notes,
    t.mastitis_teat,
    t.mastitis_type,
    t.syringe_count,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    t.created_at,
    a.id AS animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.holder_name AS owner_name,
    d.id AS disease_id,
    d.code AS disease_code,
    d.name AS disease_name,
    (
        SELECT json_agg(json_build_object(
            'product_name', p.name,
            'quantity', ui.qty,
            'unit', ui.unit,
            'batch_lot', b.lot
        ))
        FROM public.usage_items ui
        LEFT JOIN public.products p ON ui.product_id = p.id
        LEFT JOIN public.batches b ON ui.batch_id = b.id
        WHERE ui.treatment_id = t.id
    ) AS products_used,
    (
        SELECT json_agg(json_build_object(
            'course_id', tc.id,
            'product_name', p.name,
            'total_dose', tc.total_dose,
            'daily_dose', tc.daily_dose,
            'days', tc.days,
            'unit', tc.unit,
            'start_date', tc.start_date,
            'doses_administered', tc.doses_administered,
            'status', tc.status,
            'batch_lot', b.lot
        ))
        FROM public.treatment_courses tc
        LEFT JOIN public.products p ON tc.product_id = p.id
        LEFT JOIN public.batches b ON tc.batch_id = b.id
        WHERE tc.treatment_id = t.id
    ) AS treatment_courses
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
ORDER BY t.reg_date DESC, t.created_at DESC;

COMMENT ON VIEW public.treatment_history_view IS 'Comprehensive treatment history with products and courses';

-- Withdrawal Status View
CREATE OR REPLACE VIEW public.vw_withdrawal_status AS
SELECT 
    t.farm_id,
    t.animal_id,
    a.tag_no,
    MAX(t.withdrawal_until_milk) AS milk_until,
    MAX(t.withdrawal_until_meat) AS meat_until,
    CASE
        WHEN MAX(t.withdrawal_until_milk) >= CURRENT_DATE THEN true
        ELSE false
    END AS milk_active,
    CASE
        WHEN MAX(t.withdrawal_until_meat) >= CURRENT_DATE THEN true
        ELSE false
    END AS meat_active
FROM public.treatments t
LEFT JOIN public.animals a ON a.id = t.animal_id
WHERE t.animal_id IS NOT NULL
GROUP BY t.farm_id, t.animal_id, a.tag_no;

COMMENT ON VIEW public.vw_withdrawal_status IS 'Current withdrawal status for all animals';

-- Animal Visit Summary View
CREATE OR REPLACE VIEW public.animal_visit_summary AS
SELECT 
    av.id AS visit_id,
    av.farm_id,
    av.animal_id,
    a.tag_no,
    av.visit_datetime,
    av.status,
    av.procedures,
    av.vet_name,
    av.notes,
    av.temperature,
    av.next_visit_required,
    av.next_visit_date,
    av.treatment_required,
    t.clinical_diagnosis,
    t.outcome
FROM public.animal_visits av
LEFT JOIN public.animals a ON av.animal_id = a.id
LEFT JOIN public.treatments t ON av.related_treatment_id = t.id
ORDER BY av.visit_datetime DESC;

COMMENT ON VIEW public.animal_visit_summary IS 'Summary of animal visits with key details';

-- Veterinary Drug Journal View
CREATE OR REPLACE VIEW public.vw_vet_drug_journal AS
SELECT 
    ui.farm_id,
    ui.created_at::date AS use_date,
    a.tag_no AS animal_tag,
    p.name AS product_name,
    p.active_substance,
    ui.qty AS quantity,
    ui.unit,
    b.lot AS batch_lot,
    b.expiry_date,
    ui.purpose,
    t.clinical_diagnosis,
    t.vet_name,
    CASE 
        WHEN ui.treatment_id IS NOT NULL THEN 'Treatment'
        WHEN ui.vaccination_id IS NOT NULL THEN 'Vaccination'
        WHEN ui.biocide_usage_id IS NOT NULL THEN 'Biocide'
        ELSE 'Unknown'
    END AS usage_type
FROM public.usage_items ui
JOIN public.products p ON ui.product_id = p.id
LEFT JOIN public.batches b ON ui.batch_id = b.id
LEFT JOIN public.treatments t ON ui.treatment_id = t.id
LEFT JOIN public.vaccinations v ON ui.vaccination_id = v.id
LEFT JOIN public.animals a ON COALESCE(t.animal_id, v.animal_id) = a.id
ORDER BY ui.created_at DESC;

COMMENT ON VIEW public.vw_vet_drug_journal IS 'Comprehensive drug usage journal for regulatory reporting';

-- Biocide Journal View
CREATE OR REPLACE VIEW public.vw_biocide_journal AS
SELECT 
    bu.farm_id,
    bu.use_date,
    p.name AS product_name,
    p.active_substance,
    bu.qty AS quantity,
    bu.unit,
    b.lot AS batch_lot,
    bu.purpose,
    bu.work_scope,
    bu.used_by_name,
    bu.created_at
FROM public.biocide_usage bu
JOIN public.products p ON bu.product_id = p.id
LEFT JOIN public.batches b ON bu.batch_id = b.id
ORDER BY bu.use_date DESC;

COMMENT ON VIEW public.vw_biocide_journal IS 'Biocide usage journal for regulatory compliance';

-- Medical Waste View
CREATE OR REPLACE VIEW public.vw_medical_waste AS
SELECT 
    mw.farm_id,
    mw.waste_code,
    mw.name,
    mw.date,
    mw.qty_generated,
    mw.qty_transferred,
    mw.carrier,
    mw.processor,
    mw.transfer_date,
    mw.doc_no,
    mw.responsible,
    mw.auto_generated,
    mw.package_count,
    p.name AS source_product_name,
    b.lot AS source_batch_lot
FROM public.medical_waste mw
LEFT JOIN public.products p ON mw.source_product_id = p.id
LEFT JOIN public.batches b ON mw.source_batch_id = b.id
ORDER BY mw.date DESC;

COMMENT ON VIEW public.vw_medical_waste IS 'Medical waste tracking with source details';

-- Hoof Analytics Summary
CREATE OR REPLACE VIEW public.hoof_analytics_summary AS
SELECT 
    hr.farm_id,
    hr.animal_id,
    a.tag_no,
    COUNT(*) AS total_examinations,
    COUNT(*) FILTER (WHERE hr.was_treated) AS treatments_count,
    COUNT(*) FILTER (WHERE hr.was_trimmed) AS trims_count,
    COUNT(DISTINCT hr.condition_code) AS unique_conditions,
    MAX(hr.examination_date) AS last_examination,
    COUNT(*) FILTER (WHERE hr.requires_followup AND NOT hr.followup_completed) AS pending_followups
FROM public.hoof_records hr
JOIN public.animals a ON hr.animal_id = a.id
GROUP BY hr.farm_id, hr.animal_id, a.tag_no;

COMMENT ON VIEW public.hoof_analytics_summary IS 'Hoof health analytics per animal';

-- =====================================================================
-- 14. FUNCTIONS
-- =====================================================================

-- Timestamp Update Function
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_set_timestamp() IS 'Generic trigger function to update updated_at timestamp';

-- FIFO Batch Selection Function
CREATE OR REPLACE FUNCTION public.fn_fifo_batch(p_product_id uuid, p_farm_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT b.id
    FROM public.batches b
    LEFT JOIN public.stock_by_batch sb ON sb.batch_id = b.id
    WHERE b.product_id = p_product_id
      AND b.farm_id = p_farm_id
      AND COALESCE(sb.on_hand, 0) > 0
      AND (b.expiry_date IS NULL OR b.expiry_date >= CURRENT_DATE)
    ORDER BY b.expiry_date NULLS LAST, b.mfg_date NULLS LAST, b.doc_date NULLS LAST
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.fn_fifo_batch(uuid, uuid) IS 'Returns the next batch to use based on FIFO (First In, First Out) logic with farm isolation';

-- Calculate Received Quantity
CREATE OR REPLACE FUNCTION public.calculate_received_qty()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.package_size IS NOT NULL AND NEW.package_count IS NOT NULL THEN
        NEW.received_qty := NEW.package_size * NEW.package_count;
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_received_qty() IS 'Automatically calculates received_qty from package_size and package_count';

-- Initialize Batch Fields
CREATE OR REPLACE FUNCTION public.initialize_batch_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.qty_left IS NULL AND NEW.received_qty IS NOT NULL THEN
        NEW.qty_left := NEW.received_qty;
    END IF;

    IF NEW.batch_number IS NULL THEN
        NEW.batch_number := COALESCE(
            NULLIF(NEW.lot, ''),
            'B-' || TO_CHAR(COALESCE(NEW.doc_date, CURRENT_DATE), 'YYYYMMDD') || '-' || SUBSTRING(NEW.id::text, 1, 8)
        );
    END IF;

    IF NEW.status IS NULL THEN
        NEW.status := 'active';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.initialize_batch_fields() IS 'Automatically initializes batch fields (qty_left, batch_number, status) when a new batch is created';

-- Update Batch Quantity Left
CREATE OR REPLACE FUNCTION public.update_batch_qty_left()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE batches
    SET
        qty_left = qty_left - NEW.qty,
        status = CASE
            WHEN (qty_left - NEW.qty) <= 0 THEN 'depleted'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = NEW.batch_id;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_batch_qty_left() IS 'Automatically updates qty_left when usage_items are inserted';

-- Check Batch Stock Before Usage
CREATE OR REPLACE FUNCTION public.check_batch_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_qty_left numeric;
    v_batch_number text;
    v_product_name text;
    v_product_id uuid;
    v_total_available numeric;
    v_is_splitting boolean;
BEGIN
    BEGIN
        v_is_splitting := current_setting('app.is_splitting_usage_items')::boolean;
    EXCEPTION
        WHEN OTHERS THEN
            v_is_splitting := false;
    END;

    IF v_is_splitting THEN
        RETURN NEW;
    END IF;

    IF NEW.batch_id IS NOT NULL THEN
        SELECT b.qty_left, b.batch_number, p.name, p.id
        INTO v_qty_left, v_batch_number, v_product_name, v_product_id
        FROM batches b
        JOIN products p ON b.product_id = p.id
        WHERE b.id = NEW.batch_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Serija nerasta: %', NEW.batch_id;
        END IF;

        IF v_qty_left IS NULL THEN
            RAISE EXCEPTION 'Serijos % (%) qty_left yra NULL', v_batch_number, v_product_name;
        END IF;

        IF v_qty_left < NEW.qty THEN
            SELECT COALESCE(SUM(qty_left), 0) INTO v_total_available
            FROM batches
            WHERE product_id = v_product_id
              AND farm_id = NEW.farm_id
              AND qty_left > 0;

            IF v_total_available < NEW.qty THEN
                RAISE EXCEPTION 'Nepakanka atsargų produktui "%". Turima iš viso: %, Reikia: %',
                    v_product_name, v_total_available, NEW.qty;
            END IF;

            RAISE NOTICE 'Vienos serijos nepakanka (%). Bus automatiškai padalinta tarp % serijų. Turima iš viso: %',
                v_qty_left, 
                (SELECT COUNT(*) FROM batches WHERE product_id = v_product_id AND farm_id = NEW.farm_id AND qty_left > 0), 
                v_total_available;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_batch_stock() IS 'Validates that sufficient stock exists before allowing usage_items insertion';

-- Auto-Split Usage Items Across Batches (FIFO)
CREATE OR REPLACE FUNCTION public.auto_split_usage_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_qty_left numeric;
    v_remaining_qty numeric;
    v_batch record;
    v_allocated_qty numeric;
    v_product_id uuid;
    v_total_available numeric;
    v_is_splitting boolean;
BEGIN
    BEGIN
        v_is_splitting := current_setting('app.is_splitting_usage_items')::boolean;
    EXCEPTION
        WHEN OTHERS THEN
            v_is_splitting := false;
    END;

    IF v_is_splitting THEN
        RETURN NEW;
    END IF;

    SELECT b.qty_left, b.product_id INTO v_batch_qty_left, v_product_id
    FROM batches b
    WHERE b.id = NEW.batch_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch not found: %', NEW.batch_id;
    END IF;

    IF v_batch_qty_left >= NEW.qty THEN
        RETURN NEW;
    END IF;

    RAISE NOTICE 'Batch % only has %, need %. Starting auto-split...', 
        NEW.batch_id, v_batch_qty_left, NEW.qty;

    SELECT COALESCE(SUM(qty_left), 0) INTO v_total_available
    FROM batches
    WHERE product_id = v_product_id
      AND farm_id = NEW.farm_id
      AND qty_left > 0;

    IF v_total_available < NEW.qty THEN
        RAISE EXCEPTION 'Nepakanka atsargų! Turima iš viso: %, Reikia: %', v_total_available, NEW.qty;
    END IF;

    PERFORM set_config('app.is_splitting_usage_items', 'true', true);

    BEGIN
        v_remaining_qty := NEW.qty;

        FOR v_batch IN
            SELECT id, qty_left
            FROM batches
            WHERE product_id = v_product_id
              AND farm_id = NEW.farm_id
              AND qty_left > 0
            ORDER BY expiry_date ASC, created_at ASC
        LOOP
            v_allocated_qty := LEAST(v_batch.qty_left, v_remaining_qty);

            INSERT INTO usage_items (
                farm_id,
                treatment_id,
                vaccination_id,
                biocide_usage_id,
                product_id,
                batch_id,
                qty,
                unit,
                purpose,
                teat
            ) VALUES (
                NEW.farm_id,
                NEW.treatment_id,
                NEW.vaccination_id,
                NEW.biocide_usage_id,
                NEW.product_id,
                v_batch.id,
                v_allocated_qty,
                NEW.unit,
                NEW.purpose,
                NEW.teat
            );

            RAISE NOTICE 'Sukurtas padalintas įrašas: serija %, kiekis %', v_batch.id, v_allocated_qty;

            v_remaining_qty := v_remaining_qty - v_allocated_qty;

            IF v_remaining_qty <= 0.001 THEN
                EXIT;
            END IF;
        END LOOP;

        PERFORM set_config('app.is_splitting_usage_items', 'false', true);

        IF v_remaining_qty > 0.001 THEN
            RAISE EXCEPTION 'Nepavyko pilnai paskirstyti. Liko: %', v_remaining_qty;
        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            PERFORM set_config('app.is_splitting_usage_items', 'false', true);
            RAISE;
    END;

    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.auto_split_usage_items() IS 'Automatically splits usage across multiple batches when single batch has insufficient stock (FIFO)';

-- Calculate Withdrawal Dates
CREATE OR REPLACE FUNCTION public.calculate_withdrawal_dates(p_treatment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_reg_date date;
    v_milk_until date;
    v_meat_until date;
BEGIN
    SELECT reg_date INTO v_reg_date FROM public.treatments WHERE id = p_treatment_id;

    WITH course_milk AS (
        SELECT v_reg_date + tc.days + p.withdrawal_days_milk + 1 as wd
        FROM public.treatment_courses tc
        JOIN public.products p ON p.id = tc.product_id
        WHERE tc.treatment_id = p_treatment_id 
          AND p.category = 'medicines' 
          AND p.withdrawal_days_milk > 0
    ),
    single_milk AS (
        SELECT v_reg_date + p.withdrawal_days_milk + 1 as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines' 
          AND p.withdrawal_days_milk > 0
          AND NOT EXISTS (
            SELECT 1 FROM public.treatment_courses tc 
            WHERE tc.treatment_id = p_treatment_id 
              AND tc.product_id = ui.product_id
          )
    ),
    all_milk AS (
        SELECT wd FROM course_milk 
        UNION ALL 
        SELECT wd FROM single_milk
    )
    SELECT MAX(wd) INTO v_milk_until FROM all_milk;

    WITH course_meat AS (
        SELECT v_reg_date + tc.days + p.withdrawal_days_meat + 1 as wd
        FROM public.treatment_courses tc
        JOIN public.products p ON p.id = tc.product_id
        WHERE tc.treatment_id = p_treatment_id 
          AND p.category = 'medicines' 
          AND p.withdrawal_days_meat > 0
    ),
    single_meat AS (
        SELECT v_reg_date + p.withdrawal_days_meat + 1 as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines' 
          AND p.withdrawal_days_meat > 0
          AND NOT EXISTS (
            SELECT 1 FROM public.treatment_courses tc 
            WHERE tc.treatment_id = p_treatment_id 
              AND tc.product_id = ui.product_id
          )
    ),
    all_meat AS (
        SELECT wd FROM course_meat 
        UNION ALL 
        SELECT wd FROM single_meat
    )
    SELECT MAX(wd) INTO v_meat_until FROM all_meat;

    UPDATE public.treatments 
    SET withdrawal_until_milk = v_milk_until, 
        withdrawal_until_meat = v_meat_until 
    WHERE id = p_treatment_id;
END;
$$;

COMMENT ON FUNCTION public.calculate_withdrawal_dates(uuid) IS 'Calculates and updates withdrawal dates for milk and meat based on medications used';

-- Trigger Function for Withdrawal Calculation
CREATE OR REPLACE FUNCTION public.trigger_calculate_withdrawal_on_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    PERFORM calculate_withdrawal_dates(NEW.treatment_id);
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_calculate_withdrawal_on_usage() IS 'Trigger wrapper for withdrawal date calculation';

-- Check Batch Depletion and Generate Waste
CREATE OR REPLACE FUNCTION public.check_batch_depletion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_stock numeric;
    v_waste_id uuid;
BEGIN
    SELECT COALESCE(
        (
            SELECT b.received_qty - COALESCE(SUM(ui.qty), 0)
            FROM public.batches b
            LEFT JOIN public.usage_items ui ON ui.batch_id = b.id
            WHERE b.id = NEW.batch_id
            GROUP BY b.id, b.received_qty
        ),
        0
    ) INTO v_current_stock;

    IF v_current_stock <= 0 THEN
        v_waste_id := public.auto_generate_medical_waste(NEW.batch_id);

        IF v_waste_id IS NOT NULL THEN
            RAISE NOTICE 'Batch % depleted, waste entry % created', NEW.batch_id, v_waste_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_batch_depletion() IS 'Trigger function that detects when batch stock reaches 0 and generates waste entry';

-- Auto-Generate Medical Waste
CREATE OR REPLACE FUNCTION public.auto_generate_medical_waste(p_batch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_batch_record RECORD;
    v_product_record RECORD;
    v_waste_id uuid;
    v_waste_code text;
    v_waste_name text;
    v_total_weight numeric;
BEGIN
    IF EXISTS (SELECT 1 FROM public.batch_waste_tracking WHERE batch_id = p_batch_id) THEN
        SELECT medical_waste_id INTO v_waste_id
        FROM public.batch_waste_tracking
        WHERE batch_id = p_batch_id;
        RETURN v_waste_id;
    END IF;

    SELECT b.*, b.package_count as pkg_count
    INTO v_batch_record
    FROM public.batches b
    WHERE b.id = p_batch_id;

    IF NOT FOUND THEN
        RAISE NOTICE 'Batch % not found', p_batch_id;
        RETURN NULL;
    END IF;

    SELECT p.*
    INTO v_product_record
    FROM public.products p
    WHERE p.id = v_batch_record.product_id;

    IF NOT FOUND THEN
        RAISE NOTICE 'Product not found for batch %', p_batch_id;
        RETURN NULL;
    END IF;

    IF v_product_record.package_weight_g IS NULL THEN
        RAISE NOTICE 'Product % does not have package_weight_g configured, skipping waste generation', v_product_record.name;
        RETURN NULL;
    END IF;

    IF v_batch_record.pkg_count IS NULL OR v_batch_record.pkg_count <= 0 THEN
        RAISE NOTICE 'Batch % has invalid package_count, skipping waste generation', p_batch_id;
        RETURN NULL;
    END IF;

    v_total_weight := v_batch_record.pkg_count * v_product_record.package_weight_g;

    CASE v_product_record.category
        WHEN 'medicines' THEN v_waste_code := '18 02 02';
        WHEN 'vakcina' THEN v_waste_code := '18 02 02';
        WHEN 'prevention' THEN v_waste_code := '18 02 02';
        WHEN 'svirkstukai' THEN v_waste_code := '18 02 01';
        ELSE v_waste_code := '18 02 02';
    END CASE;

    IF v_batch_record.lot IS NOT NULL THEN
        v_waste_name := v_product_record.name || ' - Partija ' || v_batch_record.lot;
    ELSE
        v_waste_name := v_product_record.name || ' - Tuščios pakuotės';
    END IF;

    INSERT INTO public.medical_waste (
        farm_id,
        waste_code,
        name,
        date,
        qty_generated,
        auto_generated,
        source_batch_id,
        source_product_id,
        package_count
    )
    VALUES (
        v_batch_record.farm_id,
        v_waste_code,
        v_waste_name,
        CURRENT_DATE,
        v_total_weight,
        true,
        p_batch_id,
        v_batch_record.product_id,
        v_batch_record.pkg_count
    )
    RETURNING id INTO v_waste_id;

    INSERT INTO public.batch_waste_tracking (
        farm_id,
        batch_id,
        medical_waste_id,
        waste_generated_at
    )
    VALUES (
        v_batch_record.farm_id,
        p_batch_id,
        v_waste_id,
        now()
    );

    RAISE NOTICE 'Auto-generated medical waste % for batch % (Product: %, Weight: %g)',
        v_waste_id, p_batch_id, v_product_record.name, v_total_weight;

    RETURN v_waste_id;
END;
$$;

COMMENT ON FUNCTION public.auto_generate_medical_waste(uuid) IS 'Automatically generates medical waste entry when batch is depleted';

-- Create Usage Item from Vaccination
CREATE OR REPLACE FUNCTION public.create_usage_item_from_vaccination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.batch_id IS NOT NULL AND NEW.dose_amount IS NOT NULL AND NEW.dose_amount > 0 THEN
        INSERT INTO usage_items (
            farm_id,
            treatment_id,
            product_id,
            batch_id,
            qty,
            unit,
            purpose,
            vaccination_id,
            created_at
        ) VALUES (
            NEW.farm_id,
            NULL,
            NEW.product_id,
            NEW.batch_id,
            NEW.dose_amount,
            NEW.unit::unit,
            'vaccination',
            NEW.id,
            NEW.created_at
        );

        RAISE NOTICE 'Created usage_item for vaccination %. Product: %, Batch: %, Qty: % %',
            NEW.id, NEW.product_id, NEW.batch_id, NEW.dose_amount, NEW.unit;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_usage_item_from_vaccination() IS 'Automatically creates usage_item when vaccination is recorded';

-- Initialize Animal Synchronization
CREATE OR REPLACE FUNCTION public.initialize_animal_synchronization(
    p_animal_id uuid, 
    p_protocol_id uuid, 
    p_start_date date,
    p_farm_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sync_id uuid;
    v_protocol_steps jsonb;
    v_step jsonb;
BEGIN
    INSERT INTO public.animal_synchronizations (farm_id, animal_id, protocol_id, start_date, status)
    VALUES (p_farm_id, p_animal_id, p_protocol_id, p_start_date, 'Active')
    RETURNING id INTO v_sync_id;

    SELECT steps INTO v_protocol_steps
    FROM public.synchronization_protocols
    WHERE id = p_protocol_id;

    FOR v_step IN SELECT * FROM jsonb_array_elements(v_protocol_steps)
    LOOP
        INSERT INTO public.synchronization_steps (
            farm_id,
            synchronization_id,
            step_number,
            step_name,
            scheduled_date,
            is_evening
        ) VALUES (
            p_farm_id,
            v_sync_id,
            (v_step->>'step')::integer,
            v_step->>'medication',
            p_start_date + (v_step->>'day_offset')::integer,
            COALESCE((v_step->>'is_evening')::boolean, false)
        );
    END LOOP;

    RETURN v_sync_id;
END;
$$;

COMMENT ON FUNCTION public.initialize_animal_synchronization(uuid, uuid, date, uuid) IS 'Initializes a synchronization protocol for an animal with all steps';

-- Complete Synchronization Step
CREATE OR REPLACE FUNCTION public.complete_synchronization_step(
    p_step_id uuid,
    p_batch_id uuid DEFAULT NULL,
    p_actual_dosage numeric DEFAULT NULL,
    p_actual_unit text DEFAULT NULL,
    p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_step_record record;
BEGIN
    SELECT * INTO v_step_record
    FROM public.synchronization_steps
    WHERE id = p_step_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Step not found';
    END IF;

    IF v_step_record.completed THEN
        RAISE EXCEPTION 'Step already completed';
    END IF;

    UPDATE public.synchronization_steps
    SET
        completed = true,
        completed_at = now(),
        batch_id = p_batch_id,
        dosage = COALESCE(p_actual_dosage, dosage),
        dosage_unit = COALESCE(p_actual_unit, dosage_unit),
        notes = COALESCE(p_notes, notes)
    WHERE id = p_step_id;

    IF NOT EXISTS (
        SELECT 1 FROM public.synchronization_steps
        WHERE synchronization_id = v_step_record.synchronization_id
          AND completed = false
    ) THEN
        UPDATE public.animal_synchronizations
        SET status = 'Completed'
        WHERE id = v_step_record.synchronization_id;
    END IF;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.complete_synchronization_step(uuid, uuid, numeric, text, text) IS 'Marks a synchronization step as completed and updates protocol status';

-- Deduct Sync Step Medication
CREATE OR REPLACE FUNCTION public.deduct_sync_step_medication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.completed = true AND OLD.completed = false THEN
        IF NEW.medication_product_id IS NOT NULL AND NEW.batch_id IS NOT NULL AND NEW.dosage IS NOT NULL THEN
            INSERT INTO public.usage_items (
                farm_id,
                product_id,
                batch_id,
                qty,
                unit,
                purpose
            )
            SELECT 
                NEW.farm_id,
                NEW.medication_product_id,
                NEW.batch_id,
                NEW.dosage,
                NEW.dosage_unit::public.unit,
                'synchronization'
            WHERE NOT EXISTS (
                SELECT 1 FROM public.usage_items
                WHERE treatment_id IS NULL
                  AND vaccination_id IS NULL
                  AND biocide_usage_id IS NULL
                  AND batch_id = NEW.batch_id
                  AND product_id = NEW.medication_product_id
                  AND created_at::date = CURRENT_DATE
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.deduct_sync_step_medication() IS 'Automatically deducts medication from inventory when synchronization step is completed';

-- Cancel Animal Synchronization Protocols
CREATE OR REPLACE FUNCTION public.cancel_animal_synchronization_protocols(p_animal_id uuid)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_cancelled_count integer := 0;
BEGIN
    UPDATE public.animal_synchronizations
    SET status = 'Cancelled',
        updated_at = now()
    WHERE animal_id = p_animal_id
      AND status = 'Active';

    GET DIAGNOSTICS v_cancelled_count = ROW_COUNT;

    RETURN v_cancelled_count;
END;
$$;

COMMENT ON FUNCTION public.cancel_animal_synchronization_protocols(uuid) IS 'Cancels all active synchronization protocols for an animal';

-- Check Course Completion
CREATE OR REPLACE FUNCTION public.check_course_completion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_total_doses integer;
    v_completed_doses integer;
BEGIN
    SELECT COUNT(*), COUNT(*) FILTER (WHERE administered_date IS NOT NULL)
    INTO v_total_doses, v_completed_doses
    FROM public.course_doses
    WHERE course_id = NEW.course_id;

    IF v_completed_doses = v_total_doses THEN
        UPDATE public.treatment_courses
        SET status = 'completed',
            doses_administered = v_completed_doses,
            updated_at = now()
        WHERE id = NEW.course_id;
    ELSE
        UPDATE public.treatment_courses
        SET doses_administered = v_completed_doses,
            updated_at = now()
        WHERE id = NEW.course_id;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.check_course_completion() IS 'Updates course status when all doses are administered';

-- Create Course Doses
CREATE OR REPLACE FUNCTION public.create_course_doses()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_day integer;
BEGIN
    IF NEW.medication_schedule_flexible = false THEN
        FOR v_day IN 1..NEW.days
        LOOP
            INSERT INTO public.course_doses (
                farm_id,
                course_id,
                day_number,
                scheduled_date,
                unit
            ) VALUES (
                NEW.farm_id,
                NEW.id,
                v_day,
                NEW.start_date + (v_day - 1),
                NEW.unit
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.create_course_doses() IS 'Automatically creates dose records when a treatment course is created';

-- User Management Functions
CREATE OR REPLACE FUNCTION public.freeze_user(p_user_id uuid, p_admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role text;
BEGIN
    SELECT role INTO admin_role
    FROM public.users
    WHERE id = p_admin_id;

    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can freeze users';
    END IF;

    UPDATE public.users
    SET is_frozen = true,
        frozen_at = now(),
        frozen_by = p_admin_id,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.freeze_user(uuid, uuid) IS 'Freezes a user account (admin only)';

CREATE OR REPLACE FUNCTION public.unfreeze_user(p_user_id uuid, p_admin_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    admin_role text;
BEGIN
    SELECT role INTO admin_role
    FROM public.users
    WHERE id = p_admin_id;

    IF admin_role != 'admin' THEN
        RAISE EXCEPTION 'Only admins can unfreeze users';
    END IF;

    UPDATE public.users
    SET is_frozen = false,
        frozen_at = NULL,
        frozen_by = NULL,
        updated_at = now()
    WHERE id = p_user_id;

    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.unfreeze_user(uuid, uuid) IS 'Unfreezes a user account (admin only)';

-- Audit Logging Function
CREATE OR REPLACE FUNCTION public.log_user_action(
    p_user_id uuid,
    p_action text,
    p_table_name text DEFAULT NULL,
    p_record_id uuid DEFAULT NULL,
    p_old_data jsonb DEFAULT NULL,
    p_new_data jsonb DEFAULT NULL,
    p_ip_address text DEFAULT NULL,
    p_user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id uuid;
    v_farm_id uuid;
BEGIN
    SELECT farm_id INTO v_farm_id
    FROM public.users
    WHERE id = p_user_id;

    INSERT INTO public.user_audit_logs (
        user_id,
        farm_id,
        action,
        table_name,
        record_id,
        old_data,
        new_data,
        ip_address,
        user_agent
    )
    VALUES (
        p_user_id,
        v_farm_id,
        p_action,
        p_table_name,
        p_record_id,
        p_old_data,
        p_new_data,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION public.log_user_action IS 'Logs user actions for audit trail';

-- =====================================================================
-- 15. TRIGGERS
-- =====================================================================

-- Updated At Triggers
DROP TRIGGER IF EXISTS set_updated_at_farms ON public.farms;
DROP TRIGGER IF EXISTS set_updated_at_farms ON public.farms;
CREATE TRIGGER set_updated_at_farms BEFORE UPDATE ON public.farms
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_users ON public.users;
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_animals ON public.animals;
CREATE TRIGGER set_updated_at_animals BEFORE UPDATE ON public.animals
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_treatments ON public.treatments;
CREATE TRIGGER set_updated_at_treatments BEFORE UPDATE ON public.treatments
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_animal_visits ON public.animal_visits;
CREATE TRIGGER set_updated_at_animal_visits BEFORE UPDATE ON public.animal_visits
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_products ON public.products;
CREATE TRIGGER set_updated_at_products BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_batches ON public.batches;
CREATE TRIGGER set_updated_at_batches BEFORE UPDATE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_suppliers ON public.suppliers;
CREATE TRIGGER set_updated_at_suppliers BEFORE UPDATE ON public.suppliers
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_usage_items ON public.usage_items;
CREATE TRIGGER set_updated_at_usage_items BEFORE UPDATE ON public.usage_items
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_treatment_courses ON public.treatment_courses;
CREATE TRIGGER set_updated_at_treatment_courses BEFORE UPDATE ON public.treatment_courses
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_course_doses ON public.course_doses;
CREATE TRIGGER set_updated_at_course_doses BEFORE UPDATE ON public.course_doses
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_course_medication_schedules ON public.course_medication_schedules;
CREATE TRIGGER set_updated_at_course_medication_schedules BEFORE UPDATE ON public.course_medication_schedules
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_vaccinations ON public.vaccinations;
CREATE TRIGGER set_updated_at_vaccinations BEFORE UPDATE ON public.vaccinations
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_diseases ON public.diseases;
CREATE TRIGGER set_updated_at_diseases BEFORE UPDATE ON public.diseases
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_synchronization_protocols ON public.synchronization_protocols;
CREATE TRIGGER set_updated_at_synchronization_protocols BEFORE UPDATE ON public.synchronization_protocols
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_animal_synchronizations ON public.animal_synchronizations;
CREATE TRIGGER set_updated_at_animal_synchronizations BEFORE UPDATE ON public.animal_synchronizations
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_synchronization_steps ON public.synchronization_steps;
CREATE TRIGGER set_updated_at_synchronization_steps BEFORE UPDATE ON public.synchronization_steps
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_insemination_products ON public.insemination_products;
CREATE TRIGGER set_updated_at_insemination_products BEFORE UPDATE ON public.insemination_products
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_insemination_inventory ON public.insemination_inventory;
CREATE TRIGGER set_updated_at_insemination_inventory BEFORE UPDATE ON public.insemination_inventory
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_insemination_records ON public.insemination_records;
CREATE TRIGGER set_updated_at_insemination_records BEFORE UPDATE ON public.insemination_records
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_hoof_records ON public.hoof_records;
CREATE TRIGGER set_updated_at_hoof_records BEFORE UPDATE ON public.hoof_records
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_hoof_condition_codes ON public.hoof_condition_codes;
CREATE TRIGGER set_updated_at_hoof_condition_codes BEFORE UPDATE ON public.hoof_condition_codes
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_teat_status ON public.teat_status;
CREATE TRIGGER set_updated_at_teat_status BEFORE UPDATE ON public.teat_status
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_biocide_usage ON public.biocide_usage;
CREATE TRIGGER set_updated_at_biocide_usage BEFORE UPDATE ON public.biocide_usage
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_medical_waste ON public.medical_waste;
CREATE TRIGGER set_updated_at_medical_waste BEFORE UPDATE ON public.medical_waste
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_batch_waste_tracking ON public.batch_waste_tracking;
CREATE TRIGGER set_updated_at_batch_waste_tracking BEFORE UPDATE ON public.batch_waste_tracking
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_invoices ON public.invoices;
CREATE TRIGGER set_updated_at_invoices BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_invoice_items ON public.invoice_items;
CREATE TRIGGER set_updated_at_invoice_items BEFORE UPDATE ON public.invoice_items
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_system_settings ON public.system_settings;
CREATE TRIGGER set_updated_at_system_settings BEFORE UPDATE ON public.system_settings
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_shared_notepad ON public.shared_notepad;
CREATE TRIGGER set_updated_at_shared_notepad BEFORE UPDATE ON public.shared_notepad
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_user_audit_logs ON public.user_audit_logs;
CREATE TRIGGER set_updated_at_user_audit_logs BEFORE UPDATE ON public.user_audit_logs
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_timestamp();

-- Batch Management Triggers
DROP TRIGGER IF EXISTS trigger_calculate_received_qty ON public.batches;
CREATE TRIGGER trigger_calculate_received_qty BEFORE INSERT OR UPDATE ON public.batches
    FOR EACH ROW EXECUTE FUNCTION public.calculate_received_qty();

DROP TRIGGER IF EXISTS trigger_initialize_batch_fields ON public.batches;
CREATE TRIGGER trigger_initialize_batch_fields BEFORE INSERT ON public.batches
    FOR EACH ROW EXECUTE FUNCTION public.initialize_batch_fields();

-- Usage Item Triggers
DROP TRIGGER IF EXISTS a_auto_split_usage_items ON public.usage_items;
CREATE TRIGGER a_auto_split_usage_items BEFORE INSERT ON public.usage_items
    FOR EACH ROW EXECUTE FUNCTION public.auto_split_usage_items();

DROP TRIGGER IF EXISTS b_check_batch_stock ON public.usage_items;
CREATE TRIGGER b_check_batch_stock BEFORE INSERT ON public.usage_items
    FOR EACH ROW EXECUTE FUNCTION public.check_batch_stock();

DROP TRIGGER IF EXISTS trigger_update_batch_qty_left ON public.usage_items;
CREATE TRIGGER trigger_update_batch_qty_left AFTER INSERT ON public.usage_items
    FOR EACH ROW WHEN (NEW.batch_id IS NOT NULL) EXECUTE FUNCTION public.update_batch_qty_left();

DROP TRIGGER IF EXISTS trigger_check_batch_depletion ON public.usage_items;
CREATE TRIGGER trigger_check_batch_depletion AFTER INSERT ON public.usage_items
    FOR EACH ROW EXECUTE FUNCTION public.check_batch_depletion();

-- Withdrawal Calculation Triggers
DROP TRIGGER IF EXISTS auto_calculate_withdrawal_on_usage ON public.usage_items;
CREATE TRIGGER auto_calculate_withdrawal_on_usage AFTER INSERT OR UPDATE ON public.usage_items
    FOR EACH ROW WHEN (NEW.treatment_id IS NOT NULL) EXECUTE FUNCTION public.trigger_calculate_withdrawal_on_usage();

DROP TRIGGER IF EXISTS auto_calculate_withdrawal_on_course ON public.treatment_courses;
CREATE TRIGGER auto_calculate_withdrawal_on_course AFTER INSERT OR UPDATE ON public.treatment_courses
    FOR EACH ROW WHEN (NEW.treatment_id IS NOT NULL) EXECUTE FUNCTION public.trigger_calculate_withdrawal_on_usage();

-- Vaccination Triggers
DROP TRIGGER IF EXISTS create_usage_from_vaccination ON public.vaccinations;
CREATE TRIGGER create_usage_from_vaccination AFTER INSERT ON public.vaccinations
    FOR EACH ROW EXECUTE FUNCTION public.create_usage_item_from_vaccination();

-- Course Management Triggers
DROP TRIGGER IF EXISTS create_course_doses_trigger ON public.treatment_courses;
CREATE TRIGGER create_course_doses_trigger AFTER INSERT ON public.treatment_courses
    FOR EACH ROW EXECUTE FUNCTION public.create_course_doses();

DROP TRIGGER IF EXISTS trigger_check_course_completion ON public.course_doses;
CREATE TRIGGER trigger_check_course_completion AFTER UPDATE ON public.course_doses
    FOR EACH ROW WHEN (NEW.administered_date IS NOT NULL AND OLD.administered_date IS NULL)
    EXECUTE FUNCTION public.check_course_completion();

-- Synchronization Step Triggers
DROP TRIGGER IF EXISTS trg_sync_step_stock_deduction ON public.synchronization_steps;
CREATE TRIGGER trg_sync_step_stock_deduction AFTER UPDATE OF completed ON public.synchronization_steps
    FOR EACH ROW EXECUTE FUNCTION public.deduct_sync_step_medication();

-- =====================================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- =====================================================================

-- Enable RLS on all data tables
ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_doses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vaccinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synchronization_protocols ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.animal_synchronizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.synchronization_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insemination_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insemination_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insemination_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoof_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoof_condition_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teat_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biocide_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_waste ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_waste_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_notepad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 17. RLS POLICIES - FARM ISOLATION
-- =====================================================================

-- Helper function to get user's farm_id
CREATE OR REPLACE FUNCTION public.get_user_farm_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT farm_id FROM public.users WHERE id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_farm_id() IS 'Returns the farm_id of the currently authenticated user';

-- Farms Policies
DROP POLICY IF EXISTS "Users can view their own farm" ON public.farms;
CREATE POLICY "Users can view their own farm"
    ON public.farms FOR SELECT
    USING (id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Admins can update their farm" ON public.farms;
CREATE POLICY "Admins can update their farm"
    ON public.farms FOR UPDATE
    USING (id = public.get_user_farm_id() AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Users Policies
DROP POLICY IF EXISTS "Users can view users in their farm" ON public.users;
CREATE POLICY "Users can view users in their farm"
    ON public.users FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Admins can manage users in their farm" ON public.users;
CREATE POLICY "Admins can manage users in their farm"
    ON public.users FOR ALL
    USING (farm_id = public.get_user_farm_id() AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Animals Policies
DROP POLICY IF EXISTS "Users can view animals in their farm" ON public.animals;
CREATE POLICY "Users can view animals in their farm"
    ON public.animals FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage animals in their farm" ON public.animals;
CREATE POLICY "Users can manage animals in their farm"
    ON public.animals FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Treatments Policies
DROP POLICY IF EXISTS "Users can view treatments in their farm" ON public.treatments;
CREATE POLICY "Users can view treatments in their farm"
    ON public.treatments FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage treatments in their farm" ON public.treatments;
CREATE POLICY "Users can manage treatments in their farm"
    ON public.treatments FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Animal Visits Policies
DROP POLICY IF EXISTS "Users can view visits in their farm" ON public.animal_visits;
CREATE POLICY "Users can view visits in their farm"
    ON public.animal_visits FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage visits in their farm" ON public.animal_visits;
CREATE POLICY "Users can manage visits in their farm"
    ON public.animal_visits FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Products Policies
DROP POLICY IF EXISTS "Users can view products in their farm" ON public.products;
CREATE POLICY "Users can view products in their farm"
    ON public.products FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage products in their farm" ON public.products;
CREATE POLICY "Users can manage products in their farm"
    ON public.products FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Batches Policies
DROP POLICY IF EXISTS "Users can view batches in their farm" ON public.batches;
CREATE POLICY "Users can view batches in their farm"
    ON public.batches FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage batches in their farm" ON public.batches;
CREATE POLICY "Users can manage batches in their farm"
    ON public.batches FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Suppliers Policies
DROP POLICY IF EXISTS "Users can view suppliers in their farm" ON public.suppliers;
CREATE POLICY "Users can view suppliers in their farm"
    ON public.suppliers FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage suppliers in their farm" ON public.suppliers;
CREATE POLICY "Users can manage suppliers in their farm"
    ON public.suppliers FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Usage Items Policies
DROP POLICY IF EXISTS "Users can view usage_items in their farm" ON public.usage_items;
CREATE POLICY "Users can view usage_items in their farm"
    ON public.usage_items FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage usage_items in their farm" ON public.usage_items;
CREATE POLICY "Users can manage usage_items in their farm"
    ON public.usage_items FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Treatment Courses Policies
DROP POLICY IF EXISTS "Users can view courses in their farm" ON public.treatment_courses;
CREATE POLICY "Users can view courses in their farm"
    ON public.treatment_courses FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage courses in their farm" ON public.treatment_courses;
CREATE POLICY "Users can manage courses in their farm"
    ON public.treatment_courses FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Course Doses Policies
DROP POLICY IF EXISTS "Users can view course_doses in their farm" ON public.course_doses;
CREATE POLICY "Users can view course_doses in their farm"
    ON public.course_doses FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage course_doses in their farm" ON public.course_doses;
CREATE POLICY "Users can manage course_doses in their farm"
    ON public.course_doses FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Course Medication Schedules Policies
DROP POLICY IF EXISTS "Users can view medication schedules in their farm" ON public.course_medication_schedules;
CREATE POLICY "Users can view medication schedules in their farm"
    ON public.course_medication_schedules FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage medication schedules in their farm" ON public.course_medication_schedules;
CREATE POLICY "Users can manage medication schedules in their farm"
    ON public.course_medication_schedules FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Vaccinations Policies
DROP POLICY IF EXISTS "Users can view vaccinations in their farm" ON public.vaccinations;
CREATE POLICY "Users can view vaccinations in their farm"
    ON public.vaccinations FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage vaccinations in their farm" ON public.vaccinations;
CREATE POLICY "Users can manage vaccinations in their farm"
    ON public.vaccinations FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Diseases Policies
DROP POLICY IF EXISTS "Users can view diseases in their farm" ON public.diseases;
CREATE POLICY "Users can view diseases in their farm"
    ON public.diseases FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage diseases in their farm" ON public.diseases;
CREATE POLICY "Users can manage diseases in their farm"
    ON public.diseases FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Synchronization Protocols Policies
DROP POLICY IF EXISTS "Users can view protocols in their farm" ON public.synchronization_protocols;
CREATE POLICY "Users can view protocols in their farm"
    ON public.synchronization_protocols FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage protocols in their farm" ON public.synchronization_protocols;
CREATE POLICY "Users can manage protocols in their farm"
    ON public.synchronization_protocols FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Animal Synchronizations Policies
DROP POLICY IF EXISTS "Users can view synchronizations in their farm" ON public.animal_synchronizations;
CREATE POLICY "Users can view synchronizations in their farm"
    ON public.animal_synchronizations FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage synchronizations in their farm" ON public.animal_synchronizations;
CREATE POLICY "Users can manage synchronizations in their farm"
    ON public.animal_synchronizations FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Synchronization Steps Policies
DROP POLICY IF EXISTS "Users can view sync steps in their farm" ON public.synchronization_steps;
CREATE POLICY "Users can view sync steps in their farm"
    ON public.synchronization_steps FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage sync steps in their farm" ON public.synchronization_steps;
CREATE POLICY "Users can manage sync steps in their farm"
    ON public.synchronization_steps FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Insemination Products Policies
DROP POLICY IF EXISTS "Users can view insemination products in their farm" ON public.insemination_products;
CREATE POLICY "Users can view insemination products in their farm"
    ON public.insemination_products FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage insemination products in their farm" ON public.insemination_products;
CREATE POLICY "Users can manage insemination products in their farm"
    ON public.insemination_products FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Insemination Inventory Policies
DROP POLICY IF EXISTS "Users can view insemination inventory in their farm" ON public.insemination_inventory;
CREATE POLICY "Users can view insemination inventory in their farm"
    ON public.insemination_inventory FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage insemination inventory in their farm" ON public.insemination_inventory;
CREATE POLICY "Users can manage insemination inventory in their farm"
    ON public.insemination_inventory FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Insemination Records Policies
DROP POLICY IF EXISTS "Users can view insemination records in their farm" ON public.insemination_records;
CREATE POLICY "Users can view insemination records in their farm"
    ON public.insemination_records FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage insemination records in their farm" ON public.insemination_records;
CREATE POLICY "Users can manage insemination records in their farm"
    ON public.insemination_records FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Hoof Records Policies
DROP POLICY IF EXISTS "Users can view hoof records in their farm" ON public.hoof_records;
CREATE POLICY "Users can view hoof records in their farm"
    ON public.hoof_records FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage hoof records in their farm" ON public.hoof_records;
CREATE POLICY "Users can manage hoof records in their farm"
    ON public.hoof_records FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Hoof Condition Codes Policies (Reference Table - All Can View)
DROP POLICY IF EXISTS "Anyone can view condition codes" ON public.hoof_condition_codes;
CREATE POLICY "Anyone can view condition codes"
    ON public.hoof_condition_codes FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins can manage condition codes" ON public.hoof_condition_codes;
CREATE POLICY "Admins can manage condition codes"
    ON public.hoof_condition_codes FOR ALL
    USING (EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Teat Status Policies
DROP POLICY IF EXISTS "Users can view teat status in their farm" ON public.teat_status;
CREATE POLICY "Users can view teat status in their farm"
    ON public.teat_status FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage teat status in their farm" ON public.teat_status;
CREATE POLICY "Users can manage teat status in their farm"
    ON public.teat_status FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Biocide Usage Policies
DROP POLICY IF EXISTS "Users can view biocide usage in their farm" ON public.biocide_usage;
CREATE POLICY "Users can view biocide usage in their farm"
    ON public.biocide_usage FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage biocide usage in their farm" ON public.biocide_usage;
CREATE POLICY "Users can manage biocide usage in their farm"
    ON public.biocide_usage FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Medical Waste Policies
DROP POLICY IF EXISTS "Users can view medical waste in their farm" ON public.medical_waste;
CREATE POLICY "Users can view medical waste in their farm"
    ON public.medical_waste FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage medical waste in their farm" ON public.medical_waste;
CREATE POLICY "Users can manage medical waste in their farm"
    ON public.medical_waste FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Batch Waste Tracking Policies
DROP POLICY IF EXISTS "Users can view batch waste tracking in their farm" ON public.batch_waste_tracking;
CREATE POLICY "Users can view batch waste tracking in their farm"
    ON public.batch_waste_tracking FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage batch waste tracking in their farm" ON public.batch_waste_tracking;
CREATE POLICY "Users can manage batch waste tracking in their farm"
    ON public.batch_waste_tracking FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Invoices Policies
DROP POLICY IF EXISTS "Users can view invoices in their farm" ON public.invoices;
CREATE POLICY "Users can view invoices in their farm"
    ON public.invoices FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage invoices in their farm" ON public.invoices;
CREATE POLICY "Users can manage invoices in their farm"
    ON public.invoices FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- Invoice Items Policies
DROP POLICY IF EXISTS "Users can view invoice items in their farm" ON public.invoice_items;
CREATE POLICY "Users can view invoice items in their farm"
    ON public.invoice_items FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage invoice items in their farm" ON public.invoice_items;
CREATE POLICY "Users can manage invoice items in their farm"
    ON public.invoice_items FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- System Settings Policies
DROP POLICY IF EXISTS "Users can view settings in their farm" ON public.system_settings;
CREATE POLICY "Users can view settings in their farm"
    ON public.system_settings FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Admins can manage settings in their farm" ON public.system_settings;
CREATE POLICY "Admins can manage settings in their farm"
    ON public.system_settings FOR ALL
    USING (farm_id = public.get_user_farm_id() AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- Shared Notepad Policies
DROP POLICY IF EXISTS "Users can view shared notepad in their farm" ON public.shared_notepad;
CREATE POLICY "Users can view shared notepad in their farm"
    ON public.shared_notepad FOR SELECT
    USING (farm_id = public.get_user_farm_id());

DROP POLICY IF EXISTS "Users can manage shared notepad in their farm" ON public.shared_notepad;
CREATE POLICY "Users can manage shared notepad in their farm"
    ON public.shared_notepad FOR ALL
    USING (farm_id = public.get_user_farm_id());

-- User Audit Logs Policies
DROP POLICY IF EXISTS "Admins can view audit logs in their farm" ON public.user_audit_logs;
CREATE POLICY "Admins can view audit logs in their farm"
    ON public.user_audit_logs FOR SELECT
    USING (farm_id = public.get_user_farm_id() AND EXISTS (
        SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
    ));

-- =====================================================================
-- 18. GRANTS AND PERMISSIONS
-- =====================================================================

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO postgres;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant table permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Grant service_role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- =====================================================================
-- END OF BASELINE SCHEMA
-- =====================================================================




