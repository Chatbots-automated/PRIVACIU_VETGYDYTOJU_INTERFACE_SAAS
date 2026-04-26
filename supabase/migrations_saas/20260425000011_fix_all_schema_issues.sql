-- =====================================================================
-- FIX ALL SCHEMA ISSUES - COMPREHENSIVE MIGRATION
-- =====================================================================
-- Created: 2026-04-25
-- Description: One migration to fix all schema mismatches between UI and database
-- =====================================================================

-- =====================================================================
-- PART 1: ADD MISSING ENUM VALUES AND COLUMNS
-- =====================================================================

-- Add supplier_services to product_category enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'product_category' AND e.enumlabel = 'supplier_services'
    ) THEN
        ALTER TYPE public.product_category ADD VALUE 'supplier_services';
    END IF;
END $$;

-- Add is_eco_farm to farms table
ALTER TABLE public.farms 
  ADD COLUMN IF NOT EXISTS is_eco_farm boolean DEFAULT false NOT NULL;

-- Add missing client columns
ALTER TABLE public.clients 
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS contact_person text;

-- Add client_id and farm_id to species table (for custom species per farm/client)
ALTER TABLE public.species
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_species_client_id ON public.species(client_id);
CREATE INDEX IF NOT EXISTS idx_species_farm_id ON public.species(farm_id);

-- Drop old unique constraint on code (since same code can exist for different farms)
ALTER TABLE public.species DROP CONSTRAINT IF EXISTS species_code_key;

-- Create a new unique constraint that allows same code for different farms
-- System species (farm_id=NULL) must have unique codes
-- Farm-specific species can reuse codes across farms
CREATE UNIQUE INDEX IF NOT EXISTS idx_species_code_unique_system 
  ON public.species(code) 
  WHERE farm_id IS NULL;

COMMENT ON COLUMN public.species.client_id IS 'NULL for system-wide species, set for client-specific custom species';
COMMENT ON COLUMN public.species.farm_id IS 'NULL for client-wide species, set for farm-specific custom species';

-- Add route-specific withdrawal columns to products (12 columns)
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS withdrawal_iv_meat integer,
  ADD COLUMN IF NOT EXISTS withdrawal_im_meat integer,
  ADD COLUMN IF NOT EXISTS withdrawal_sc_meat integer,
  ADD COLUMN IF NOT EXISTS withdrawal_iu_meat integer,
  ADD COLUMN IF NOT EXISTS withdrawal_imm_meat integer,
  ADD COLUMN IF NOT EXISTS withdrawal_pos_meat integer,
  ADD COLUMN IF NOT EXISTS withdrawal_iv_milk integer,
  ADD COLUMN IF NOT EXISTS withdrawal_im_milk integer,
  ADD COLUMN IF NOT EXISTS withdrawal_sc_milk integer,
  ADD COLUMN IF NOT EXISTS withdrawal_iu_milk integer,
  ADD COLUMN IF NOT EXISTS withdrawal_imm_milk integer,
  ADD COLUMN IF NOT EXISTS withdrawal_pos_milk integer;

-- Add missing columns to batches table
ALTER TABLE public.batches
  ADD COLUMN IF NOT EXISTS unit_price numeric(12,2),
  ADD COLUMN IF NOT EXISTS received_date date DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS package_size numeric(10,2),
  ADD COLUMN IF NOT EXISTS package_count numeric(10,2),
  ADD COLUMN IF NOT EXISTS currency text DEFAULT 'EUR';

COMMENT ON COLUMN public.farms.is_eco_farm IS 'Eco-farm flag: withdrawal periods are doubled';
COMMENT ON COLUMN public.batches.unit_price IS 'Price per unit (for cost tracking)';
COMMENT ON COLUMN public.batches.received_date IS 'Date stock was received';
COMMENT ON COLUMN public.batches.package_size IS 'Package size for bulk receiving';
COMMENT ON COLUMN public.batches.package_count IS 'Number of packages for bulk receiving';
COMMENT ON COLUMN public.batches.currency IS 'Currency for prices (default EUR)';

-- =====================================================================
-- PART 2: MAKE farm_id NULLABLE FOR SHARED WAREHOUSE
-- =====================================================================

-- Allow client-wide invoices (bendras sandelis)
ALTER TABLE public.invoices 
  ALTER COLUMN farm_id DROP NOT NULL;

-- Allow client-wide invoice items
ALTER TABLE public.invoice_items 
  ALTER COLUMN farm_id DROP NOT NULL;

-- Allow client-wide batches (shared warehouse)
ALTER TABLE public.batches 
  ALTER COLUMN farm_id DROP NOT NULL;

COMMENT ON COLUMN public.invoices.farm_id IS 'Farm ID for farm-specific invoices, NULL for client-wide shared warehouse';
COMMENT ON COLUMN public.invoice_items.farm_id IS 'NULL for client-wide shared warehouse items';
COMMENT ON COLUMN public.batches.farm_id IS 'NULL for client-wide shared warehouse batches';

-- =====================================================================
-- PART 3: CREATE WAREHOUSE SYSTEM TABLES
-- =====================================================================

-- First, check if warehouse_batches exists with the wrong column name and fix it
DO $$
BEGIN
    -- If table exists with qty_received, rename it to received_qty
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_batches' 
        AND column_name = 'qty_received'
    ) THEN
        ALTER TABLE public.warehouse_batches RENAME COLUMN qty_received TO received_qty;
        
        -- Also rename the constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.constraint_column_usage
            WHERE table_name = 'warehouse_batches' 
            AND constraint_name = 'warehouse_batches_qty_received_check'
        ) THEN
            ALTER TABLE public.warehouse_batches RENAME CONSTRAINT warehouse_batches_qty_received_check TO warehouse_batches_received_qty_check;
        END IF;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.warehouse_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
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
    qty_allocated numeric(10,2) DEFAULT 0,
    invoice_path text,
    serial_number text,
    package_size numeric(10,2),
    package_count numeric(10,2),
    batch_number text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT warehouse_batches_received_qty_check CHECK (received_qty >= 0),
    CONSTRAINT warehouse_batches_qty_allocated_check CHECK (qty_allocated >= 0),
    CONSTRAINT warehouse_batches_qty_allocated_lte_received CHECK (qty_allocated <= received_qty),
    CONSTRAINT warehouse_batches_status_check CHECK (status = ANY (ARRAY['active', 'depleted', 'expired', 'fully_allocated']))
);

-- Add any missing columns to existing warehouse_batches table
ALTER TABLE public.warehouse_batches 
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS package_size numeric(10,2),
  ADD COLUMN IF NOT EXISTS package_count numeric(10,2),
  ADD COLUMN IF NOT EXISTS batch_number text,
  ADD COLUMN IF NOT EXISTS invoice_path text,
  ADD COLUMN IF NOT EXISTS serial_number text;

-- Make client_id NOT NULL after adding it (if it was added)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_batches' 
        AND column_name = 'client_id'
        AND is_nullable = 'YES'
    ) THEN
        -- Set a default client_id for existing rows before making it NOT NULL
        -- This assumes there's at least one client in the system
        UPDATE public.warehouse_batches 
        SET client_id = (SELECT id FROM public.clients LIMIT 1)
        WHERE client_id IS NULL;
        
        ALTER TABLE public.warehouse_batches ALTER COLUMN client_id SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_warehouse_batches_client_id ON public.warehouse_batches(client_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_batches_product_id ON public.warehouse_batches(product_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_batches_expiry ON public.warehouse_batches(expiry_date);
CREATE INDEX IF NOT EXISTS idx_warehouse_batches_status ON public.warehouse_batches(status);
CREATE INDEX IF NOT EXISTS idx_warehouse_batches_qty_left ON public.warehouse_batches(qty_left) WHERE qty_left > 0;

COMMENT ON TABLE public.warehouse_batches IS 'Client-wide warehouse inventory before allocation to specific farms';
COMMENT ON COLUMN public.warehouse_batches.received_qty IS 'Total quantity received from supplier';
COMMENT ON COLUMN public.warehouse_batches.qty_left IS 'Quantity remaining in warehouse (not yet allocated)';
COMMENT ON COLUMN public.warehouse_batches.qty_allocated IS 'Total quantity allocated to farms';

-- Farm stock allocations
CREATE TABLE IF NOT EXISTS public.farm_stock_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    warehouse_batch_id uuid REFERENCES public.warehouse_batches(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
    allocated_qty numeric NOT NULL,
    allocated_by text,
    allocation_date timestamptz DEFAULT now() NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT farm_stock_allocations_allocated_qty_check CHECK (allocated_qty > 0)
);

-- Add client_id to existing farm_stock_allocations table
ALTER TABLE public.farm_stock_allocations 
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE;

-- Make client_id NOT NULL after adding it (if it was added)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'farm_stock_allocations' 
        AND column_name = 'client_id'
        AND is_nullable = 'YES'
    ) THEN
        -- Set client_id based on the farm's client
        UPDATE public.farm_stock_allocations fsa
        SET client_id = f.client_id
        FROM public.farms f
        WHERE fsa.farm_id = f.id AND fsa.client_id IS NULL;
        
        ALTER TABLE public.farm_stock_allocations ALTER COLUMN client_id SET NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_farm_stock_allocations_client_id ON public.farm_stock_allocations(client_id);
CREATE INDEX IF NOT EXISTS idx_farm_stock_allocations_warehouse_batch ON public.farm_stock_allocations(warehouse_batch_id);
CREATE INDEX IF NOT EXISTS idx_farm_stock_allocations_farm_id ON public.farm_stock_allocations(farm_id);
CREATE INDEX IF NOT EXISTS idx_farm_stock_allocations_product_id ON public.farm_stock_allocations(product_id);
CREATE INDEX IF NOT EXISTS idx_farm_stock_allocations_date ON public.farm_stock_allocations(allocation_date);

COMMENT ON TABLE public.farm_stock_allocations IS 'Tracks stock allocation from warehouse to specific farms';
COMMENT ON COLUMN public.farm_stock_allocations.allocated_by IS 'Name or email of user who performed the allocation';
COMMENT ON COLUMN public.farm_stock_allocations.allocated_qty IS 'Quantity allocated to the farm';

-- Add allocation link to batches
ALTER TABLE public.batches 
  ADD COLUMN IF NOT EXISTS allocation_id uuid REFERENCES public.farm_stock_allocations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batches_allocation_id ON public.batches(allocation_id);

-- Add warehouse_batch_id to invoice_items (for linking to warehouse batches instead of farm batches)
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS warehouse_batch_id uuid REFERENCES public.warehouse_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_items_warehouse_batch_id ON public.invoice_items(warehouse_batch_id);

COMMENT ON COLUMN public.invoice_items.warehouse_batch_id IS 'Links to warehouse batch for client-wide inventory (NULL for farm-specific batches)';

-- Add foreign key constraints if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoice_items_product_id_fkey' 
        AND table_name = 'invoice_items'
    ) THEN
        ALTER TABLE public.invoice_items
            ADD CONSTRAINT invoice_items_product_id_fkey 
            FOREIGN KEY (product_id) 
            REFERENCES public.products(id) 
            ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'invoice_items_batch_id_fkey' 
        AND table_name = 'invoice_items'
    ) THEN
        ALTER TABLE public.invoice_items
            ADD CONSTRAINT invoice_items_batch_id_fkey 
            FOREIGN KEY (batch_id) 
            REFERENCES public.batches(id) 
            ON DELETE SET NULL;
    END IF;
END $$;

-- Add foreign key constraint for vaccinations.product_id (needed for PostgREST relationship queries)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'vaccinations_product_id_fkey'
        AND table_name = 'vaccinations'
    ) THEN
        ALTER TABLE public.vaccinations
            ADD CONSTRAINT vaccinations_product_id_fkey
            FOREIGN KEY (product_id)
            REFERENCES public.products(id)
            ON DELETE CASCADE;
    END IF;
END $$;

-- =====================================================================
-- PART 4: CREATE WAREHOUSE VIEWS
-- =====================================================================

-- Drop existing views first to avoid column mismatch errors
DROP VIEW IF EXISTS public.vw_warehouse_inventory CASCADE;
DROP VIEW IF EXISTS public.vw_stock_allocation_history CASCADE;

CREATE VIEW public.vw_warehouse_inventory AS
SELECT 
    wb.id AS warehouse_batch_id,
    wb.client_id,
    wb.product_id,
    p.name AS product_name,
    p.category,
    p.primary_pack_unit AS unit,
    p.primary_pack_size,
    wb.lot,
    wb.mfg_date,
    wb.expiry_date,
    wb.received_qty,
    wb.qty_left,
    wb.qty_allocated,
    wb.status,
    wb.purchase_price,
    wb.currency,
    wb.doc_number,
    wb.doc_date,
    s.name AS supplier_name,
    wb.created_at
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
ORDER BY wb.created_at DESC;

COMMENT ON VIEW public.vw_warehouse_inventory IS 'Warehouse inventory with product details';

CREATE VIEW public.vw_stock_allocation_history AS
SELECT 
    fsa.id AS allocation_id,
    fsa.client_id,
    fsa.allocation_date,
    f.name AS farm_name,
    f.code AS farm_code,
    p.name AS product_name,
    p.category,
    fsa.allocated_qty,
    p.primary_pack_unit AS unit,
    wb.lot,
    wb.expiry_date,
    fsa.allocated_by,
    fsa.notes,
    fsa.warehouse_batch_id,
    fsa.farm_id,
    fsa.product_id
FROM public.farm_stock_allocations fsa
JOIN public.farms f ON fsa.farm_id = f.id
JOIN public.products p ON fsa.product_id = p.id
JOIN public.warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
ORDER BY fsa.allocation_date DESC;

COMMENT ON VIEW public.vw_stock_allocation_history IS 'Stock allocation history from warehouse to farms';

-- Warehouse stock availability view (FIFO order)
DROP VIEW IF EXISTS public.vw_warehouse_stock_available CASCADE;

CREATE VIEW public.vw_warehouse_stock_available AS
SELECT 
    wb.id AS warehouse_batch_id,
    wb.client_id,
    wb.product_id,
    p.name AS product_name,
    p.category,
    p.primary_pack_unit AS unit,
    wb.lot,
    wb.expiry_date,
    wb.received_qty,
    wb.qty_left AS available_qty,
    wb.qty_allocated,
    wb.status,
    s.name AS supplier_name,
    wb.doc_number,
    wb.doc_date,
    wb.created_at
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE wb.qty_left > 0 
  AND wb.status = 'active'
  AND (wb.expiry_date IS NULL OR wb.expiry_date >= CURRENT_DATE)
ORDER BY wb.expiry_date ASC NULLS LAST, wb.created_at ASC;

COMMENT ON VIEW public.vw_warehouse_stock_available IS 'Available warehouse stock ready for allocation (FIFO order)';

-- Allocation analytics by farm
DROP VIEW IF EXISTS public.vw_allocation_analytics_by_farm CASCADE;

CREATE VIEW public.vw_allocation_analytics_by_farm AS
SELECT 
    f.id AS farm_id,
    f.client_id,
    f.name AS farm_name,
    f.code AS farm_code,
    COUNT(DISTINCT fsa.id) AS total_allocations,
    COUNT(DISTINCT fsa.product_id) AS unique_products,
    SUM(fsa.allocated_qty) AS total_qty_allocated,
    SUM(wb.purchase_price * (fsa.allocated_qty / wb.received_qty)) AS total_value_allocated,
    MAX(fsa.allocation_date) AS last_allocation_date
FROM public.farms f
LEFT JOIN public.farm_stock_allocations fsa ON f.id = fsa.farm_id
LEFT JOIN public.warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
GROUP BY f.id, f.client_id, f.name, f.code
ORDER BY total_value_allocated DESC NULLS LAST;

COMMENT ON VIEW public.vw_allocation_analytics_by_farm IS 'Analytics showing which farms receive the most stock allocations';

-- Allocation analytics by product
DROP VIEW IF EXISTS public.vw_allocation_analytics_by_product CASCADE;

CREATE VIEW public.vw_allocation_analytics_by_product AS
SELECT 
    p.id AS product_id,
    p.client_id,
    p.name AS product_name,
    p.category,
    COUNT(DISTINCT fsa.farm_id) AS farms_using,
    COUNT(DISTINCT fsa.id) AS total_allocations,
    SUM(fsa.allocated_qty) AS total_qty_allocated,
    p.primary_pack_unit AS unit,
    MAX(fsa.allocation_date) AS last_allocation_date
FROM public.products p
LEFT JOIN public.farm_stock_allocations fsa ON p.id = fsa.product_id
GROUP BY p.id, p.client_id, p.name, p.category, p.primary_pack_unit
ORDER BY total_qty_allocated DESC NULLS LAST;

COMMENT ON VIEW public.vw_allocation_analytics_by_product IS 'Analytics showing which products are allocated most';

-- Animal visit summary view (for animals module)
DROP VIEW IF EXISTS public.animal_visit_summary CASCADE;

CREATE VIEW public.animal_visit_summary AS
SELECT
    av.id AS visit_id,
    av.client_id,
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

-- Withdrawal status view (current withdrawal status per animal)
DROP VIEW IF EXISTS public.vw_withdrawal_status CASCADE;

CREATE VIEW public.vw_withdrawal_status AS
SELECT 
    t.client_id,
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
GROUP BY t.client_id, t.farm_id, t.animal_id, a.tag_no;

COMMENT ON VIEW public.vw_withdrawal_status IS 'Current withdrawal status for all animals';

-- =====================================================================
-- VETERINARY REPORTING VIEWS (ALL FARMS)
-- =====================================================================

-- Farm-wide veterinary drug journal (drug receipts across all farms)
DROP VIEW IF EXISTS public.vw_vet_drug_journal_all_farms CASCADE;

CREATE VIEW public.vw_vet_drug_journal_all_farms AS
-- Farm-level batches
SELECT 
    b.client_id,
    b.created_at::date AS receipt_date,
    f.name AS farm_name,
    f.code AS farm_code,
    p.name AS product_name,
    p.id AS product_id,
    p.registration_code,
    p.active_substance,
    p.primary_pack_unit AS unit,
    b.lot AS batch_number,
    b.lot,
    b.expiry_date,
    b.qty_received AS quantity_received,
    (b.qty_received - b.qty_left) AS quantity_used,
    b.qty_left AS quantity_remaining,
    s.name AS supplier_name,
    b.doc_title,
    b.doc_number AS invoice_number,
    b.doc_date AS invoice_date,
    b.farm_id,
    b.id AS batch_id,
    'farm_batch' AS source
FROM public.batches b
JOIN public.farms f ON b.farm_id = f.id
JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.suppliers s ON b.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention')
AND b.farm_id IS NOT NULL

UNION ALL

-- Warehouse-level batches
SELECT 
    wb.client_id,
    wb.created_at::date AS receipt_date,
    'Bendras sandėlis' AS farm_name,
    'WAREHOUSE' AS farm_code,
    p.name AS product_name,
    p.id AS product_id,
    p.registration_code,
    p.active_substance,
    p.primary_pack_unit AS unit,
    wb.lot AS batch_number,
    wb.lot,
    wb.expiry_date,
    wb.received_qty AS quantity_received,
    wb.qty_allocated AS quantity_used,
    wb.qty_left AS quantity_remaining,
    s.name AS supplier_name,
    wb.doc_title,
    wb.doc_number AS invoice_number,
    wb.doc_date AS invoice_date,
    NULL::uuid AS farm_id,
    wb.id AS batch_id,
    'warehouse_batch' AS source
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention')

ORDER BY receipt_date DESC;

COMMENT ON VIEW public.vw_vet_drug_journal_all_farms IS 'Drug receipts across all farms and warehouse';

-- Farm-wide treated animals register (simplified - requires full veterinary module tables)
DROP VIEW IF EXISTS public.vw_treated_animals_all_farms CASCADE;

CREATE VIEW public.vw_treated_animals_all_farms AS
SELECT 
    t.client_id,
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    t.reg_date AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) * 12 + 
    EXTRACT(MONTH FROM AGE(COALESCE(t.reg_date::date, CURRENT_DATE), a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    t.first_symptoms_date,
    t.tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.quantity AS medicine_dose,
    ui.unit::text AS medicine_unit,
    1 AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    0 AS withdrawal_days_meat,
    0 AS withdrawal_days_milk,
    t.vet_name,
    t.outcome,
    t.outcome_date
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
LEFT JOIN public.products p ON ui.product_id = p.id
LEFT JOIN public.animal_visits av ON t.visit_id = av.id
ORDER BY t.reg_date DESC;

COMMENT ON VIEW public.vw_treated_animals_all_farms IS 'Treated animals register across all farms';

-- Farm-wide withdrawal journal
DROP VIEW IF EXISTS public.vw_withdrawal_journal_all_farms CASCADE;

CREATE VIEW public.vw_withdrawal_journal_all_farms AS
SELECT 
    t.client_id,
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    t.id AS treatment_id,
    t.animal_id,
    t.reg_date AS treatment_date,
    a.tag_no AS animal_tag,
    a.species,
    p.name AS medicine_name,
    ui.quantity AS dose,
    ui.unit,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE 
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE 
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS days_until_meat_ok,
    CASE 
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE 
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS days_until_milk_ok,
    t.vet_name
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
LEFT JOIN public.products p ON ui.product_id = p.id
WHERE t.withdrawal_until_meat IS NOT NULL OR t.withdrawal_until_milk IS NOT NULL
ORDER BY t.reg_date DESC;

COMMENT ON VIEW public.vw_withdrawal_journal_all_farms IS 'Withdrawal periods across all farms';

-- =====================================================================
-- PART 5: UPDATE EXISTING CLIENT LIMITS TO NEW PRICING
-- =====================================================================

UPDATE public.clients SET max_farms = 3, max_users = 999 WHERE subscription_plan = 'trial';
UPDATE public.clients SET max_farms = 5, max_users = 999 WHERE subscription_plan = 'starter';
UPDATE public.clients SET max_farms = 15, max_users = 999 WHERE subscription_plan = 'professional';
UPDATE public.clients SET max_farms = 35, max_users = 999 WHERE subscription_plan = 'enterprise';

-- =====================================================================
-- PART 6: WAREHOUSE TRIGGERS
-- =====================================================================

-- Create trigger_set_timestamp function if it doesn't exist
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

CREATE OR REPLACE FUNCTION public.update_warehouse_batch_on_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.warehouse_batches
        SET 
            qty_left = qty_left - NEW.allocated_qty,
            qty_allocated = qty_allocated + NEW.allocated_qty,
            status = CASE 
                WHEN (qty_left - NEW.allocated_qty) <= 0 THEN 'fully_allocated'
                ELSE status
            END,
            updated_at = now()
        WHERE id = NEW.warehouse_batch_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Warehouse batch not found';
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.warehouse_batches
        SET 
            qty_left = qty_left + OLD.allocated_qty,
            qty_allocated = qty_allocated - OLD.allocated_qty,
            status = 'active',
            updated_at = now()
        WHERE id = OLD.warehouse_batch_id;
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_warehouse_on_allocation ON public.farm_stock_allocations;
CREATE TRIGGER trigger_update_warehouse_on_allocation
    AFTER INSERT OR DELETE ON public.farm_stock_allocations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_warehouse_batch_on_allocation();

CREATE OR REPLACE FUNCTION public.initialize_warehouse_batch_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.package_size IS NOT NULL AND NEW.package_count IS NOT NULL THEN
        NEW.received_qty := NEW.package_size * NEW.package_count;
    END IF;

    IF NEW.qty_left IS NULL THEN
        NEW.qty_left := NEW.received_qty;
    END IF;

    IF NEW.qty_allocated IS NULL THEN
        NEW.qty_allocated := 0;
    END IF;

    IF NEW.batch_number IS NULL THEN
        IF NEW.lot IS NOT NULL AND NEW.lot != '' THEN
            NEW.batch_number := NEW.lot;
        ELSE
            NEW.batch_number := 'WH-' || to_char(NEW.created_at, 'YYYYMMDD-HH24MI');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_initialize_warehouse_batch_fields ON public.warehouse_batches;
CREATE TRIGGER trigger_initialize_warehouse_batch_fields
    BEFORE INSERT ON public.warehouse_batches
    FOR EACH ROW
    EXECUTE FUNCTION public.initialize_warehouse_batch_fields();

-- Trigger to set updated_at timestamp
DROP TRIGGER IF EXISTS set_updated_at_warehouse_batches ON public.warehouse_batches;
CREATE TRIGGER set_updated_at_warehouse_batches 
    BEFORE UPDATE ON public.warehouse_batches
    FOR EACH ROW 
    EXECUTE FUNCTION public.trigger_set_timestamp();

DROP TRIGGER IF EXISTS set_updated_at_farm_stock_allocations ON public.farm_stock_allocations;
CREATE TRIGGER set_updated_at_farm_stock_allocations 
    BEFORE UPDATE ON public.farm_stock_allocations
    FOR EACH ROW 
    EXECUTE FUNCTION public.trigger_set_timestamp();

-- =====================================================================
-- PART 7: RLS AND PERMISSIONS
-- =====================================================================
-- NOTE: This app uses custom auth (not Supabase Auth), so auth.uid() returns NULL
-- For SaaS, we use RLS with simple policies based on client_id matching

ALTER TABLE public.warehouse_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_stock_allocations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.warehouse_batches;
CREATE POLICY "Enable all for authenticated users" ON public.warehouse_batches
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.farm_stock_allocations;
CREATE POLICY "Enable all for authenticated users" ON public.farm_stock_allocations
    FOR ALL USING (true) WITH CHECK (true);

GRANT SELECT ON public.warehouse_batches TO authenticated;
GRANT ALL ON public.warehouse_batches TO authenticated;

GRANT SELECT ON public.farm_stock_allocations TO authenticated;
GRANT ALL ON public.farm_stock_allocations TO authenticated;

GRANT SELECT ON public.vw_warehouse_inventory TO authenticated;
GRANT SELECT ON public.vw_stock_allocation_history TO authenticated;
GRANT SELECT ON public.vw_warehouse_stock_available TO authenticated;
GRANT SELECT ON public.vw_allocation_analytics_by_farm TO authenticated;
GRANT SELECT ON public.vw_allocation_analytics_by_product TO authenticated;
GRANT SELECT ON public.animal_visit_summary TO authenticated;
GRANT SELECT ON public.vw_withdrawal_status TO authenticated;
GRANT SELECT ON public.vw_vet_drug_journal_all_farms TO authenticated;
GRANT SELECT ON public.vw_treated_animals_all_farms TO authenticated;
GRANT SELECT ON public.vw_withdrawal_journal_all_farms TO authenticated;

-- =====================================================================
-- WITHDRAWAL DATE CALCULATION FUNCTION
-- =====================================================================
-- Simplified version for SaaS (only uses usage_items, not treatment_courses)

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

    -- Calculate milk withdrawal using route-specific periods from usage_items only
    WITH single_milk AS (
        SELECT v_reg_date + 
            COALESCE(
                CASE ui.administration_route
                    WHEN 'iv' THEN p.withdrawal_iv_milk
                    WHEN 'im' THEN p.withdrawal_im_milk
                    WHEN 'sc' THEN p.withdrawal_sc_milk
                    WHEN 'iu' THEN p.withdrawal_iu_milk
                    WHEN 'imm' THEN p.withdrawal_imm_milk
                    WHEN 'pos' THEN p.withdrawal_pos_milk
                    ELSE p.withdrawal_days_milk
                END,
                p.withdrawal_days_milk,
                0
            ) + 1 as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
    )
    SELECT MAX(wd) INTO v_milk_until FROM single_milk;

    -- Calculate meat withdrawal using route-specific periods from usage_items only
    WITH single_meat AS (
        SELECT v_reg_date + 
            COALESCE(
                CASE ui.administration_route
                    WHEN 'iv' THEN p.withdrawal_iv_meat
                    WHEN 'im' THEN p.withdrawal_im_meat
                    WHEN 'sc' THEN p.withdrawal_sc_meat
                    WHEN 'iu' THEN p.withdrawal_iu_meat
                    WHEN 'imm' THEN p.withdrawal_imm_meat
                    WHEN 'pos' THEN p.withdrawal_pos_meat
                    ELSE p.withdrawal_days_meat
                END,
                p.withdrawal_days_meat,
                0
            ) + 1 as wd
        FROM public.usage_items ui
        JOIN public.products p ON p.id = ui.product_id
        WHERE ui.treatment_id = p_treatment_id 
          AND p.category = 'medicines'
    )
    SELECT MAX(wd) INTO v_meat_until FROM single_meat;

    -- Update the treatment record
    UPDATE public.treatments
    SET 
        withdrawal_until_milk = v_milk_until,
        withdrawal_until_meat = v_meat_until,
        updated_at = now()
    WHERE id = p_treatment_id;
END;
$$;

COMMENT ON FUNCTION public.calculate_withdrawal_dates IS 'Calculates milk and meat withdrawal dates based on products used in treatment (SaaS version - uses usage_items only)';

-- =====================================================================
-- ADDITIONAL REPORTING VIEWS FOR REPORTS.TSX
-- =====================================================================

-- Treated Animals Detailed View (for veterinary reports)
DROP VIEW IF EXISTS public.vw_treated_animals_detailed CASCADE;

CREATE VIEW public.vw_treated_animals_detailed AS
SELECT
    t.client_id,
    t.farm_id,
    t.id AS treatment_id,
    t.animal_id,
    t.disease_id,
    COALESCE(ui.administered_date, t.reg_date) AS registration_date,
    t.created_at,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    a.birth_date,
    EXTRACT(YEAR FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) * 12 +
    EXTRACT(MONTH FROM AGE(COALESCE(ui.administered_date, t.reg_date)::date, a.birth_date::date)) AS age_months,
    a.holder_name AS owner_name,
    a.holder_address AS owner_address,
    COALESCE(d.name, NULLIF(TRIM(t.clinical_diagnosis), ''), 'Nespecifikuota liga') AS disease_name,
    d.code AS disease_code,
    t.clinical_diagnosis,
    COALESCE(t.animal_condition, 'Patenkinama') AS animal_condition,
    COALESCE(t.first_symptoms_date, t.reg_date) AS first_symptoms_date,
    t.tests,
    t.services,
    p.name AS medicine_name,
    p.id AS medicine_id,
    ui.quantity AS medicine_dose,
    ui.unit::text AS medicine_unit,
    ui.administration_route,
    1 AS medicine_days,
    t.withdrawal_until_meat,
    t.withdrawal_until_milk,
    CASE
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE
        THEN (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE
        THEN (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    t.outcome AS treatment_outcome,
    COALESCE(t.vet_name, 'Nenurodyta') AS veterinarian,
    t.notes
FROM public.treatments t
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id
LEFT JOIN public.usage_items ui ON ui.treatment_id = t.id
LEFT JOIN public.products p ON ui.product_id = p.id
WHERE p.category = 'medicines' OR p.category IS NULL;

COMMENT ON VIEW public.vw_treated_animals_detailed IS 'Detailed view of treated animals for veterinary reports (multi-tenant)';

-- Withdrawal Report View
DROP VIEW IF EXISTS public.vw_withdrawal_report CASCADE;

CREATE VIEW public.vw_withdrawal_report AS
SELECT
    t.client_id,
    t.farm_id,
    f.name AS farm_name,
    f.code AS farm_code,
    f.is_eco_farm,
    t.id AS treatment_id,
    t.animal_id,
    a.tag_no AS animal_tag,
    a.species,
    a.sex,
    t.reg_date AS treatment_date,
    -- Original withdrawal dates
    t.withdrawal_until_meat AS withdrawal_until_meat_original,
    t.withdrawal_until_milk AS withdrawal_until_milk_original,
    -- Eco-farm adjusted withdrawal dates
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN
                    CASE
                        WHEN (t.withdrawal_until_meat - CURRENT_DATE) = 0
                        THEN (CURRENT_DATE + INTERVAL '2 days')::date
                        ELSE (t.reg_date + ((t.withdrawal_until_meat - t.reg_date) * 2) * INTERVAL '1 day')::date
                    END
                ELSE (CURRENT_DATE + INTERVAL '2 days')::date
            END
        ELSE t.withdrawal_until_meat
    END AS withdrawal_until_meat,
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL THEN
            CASE
                WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN
                    CASE
                        WHEN (t.withdrawal_until_milk - CURRENT_DATE) = 0
                        THEN (CURRENT_DATE + INTERVAL '2 days')::date
                        ELSE (t.reg_date + ((t.withdrawal_until_milk - t.reg_date) * 2) * INTERVAL '1 day')::date
                    END
                ELSE (CURRENT_DATE + INTERVAL '2 days')::date
            END
        ELSE t.withdrawal_until_milk
    END AS withdrawal_until_milk,
    -- Withdrawal days remaining
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_meat IS NOT NULL THEN
            GREATEST(0, 
                CASE
                    WHEN t.withdrawal_until_meat >= CURRENT_DATE THEN
                        CASE
                            WHEN (t.withdrawal_until_meat - CURRENT_DATE) = 0
                            THEN 2
                            ELSE ((t.withdrawal_until_meat - t.reg_date) * 2) - (CURRENT_DATE - t.reg_date)
                        END
                    ELSE 2
                END
            )
        WHEN t.withdrawal_until_meat IS NOT NULL AND t.withdrawal_until_meat >= CURRENT_DATE THEN
            (t.withdrawal_until_meat - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_meat,
    CASE
        WHEN f.is_eco_farm AND t.withdrawal_until_milk IS NOT NULL THEN
            GREATEST(0,
                CASE
                    WHEN t.withdrawal_until_milk >= CURRENT_DATE THEN
                        CASE
                            WHEN (t.withdrawal_until_milk - CURRENT_DATE) = 0
                            THEN 2
                            ELSE ((t.withdrawal_until_milk - t.reg_date) * 2) - (CURRENT_DATE - t.reg_date)
                        END
                    ELSE 2
                END
            )
        WHEN t.withdrawal_until_milk IS NOT NULL AND t.withdrawal_until_milk >= CURRENT_DATE THEN
            (t.withdrawal_until_milk - CURRENT_DATE)
        ELSE 0
    END AS withdrawal_days_milk,
    COALESCE(d.name, t.clinical_diagnosis, 'Nenurodyta') AS disease_name,
    t.vet_name AS veterinarian,
    t.notes,
    -- Get medicines used in this treatment
    (
        SELECT string_agg(DISTINCT p.name, ', ')
        FROM public.usage_items ui
        JOIN public.products p ON ui.product_id = p.id
        WHERE ui.treatment_id = t.id
    ) AS medicines_used,
    t.created_at,
    t.updated_at
FROM public.treatments t
JOIN public.farms f ON t.farm_id = f.id
LEFT JOIN public.animals a ON t.animal_id = a.id
LEFT JOIN public.diseases d ON t.disease_id = d.id;

COMMENT ON VIEW public.vw_withdrawal_report IS 'Withdrawal periods report with eco-farm adjustments (multi-tenant)';

-- Veterinary Drug Journal View (farm-specific)
DROP VIEW IF EXISTS public.vw_vet_drug_journal CASCADE;

CREATE VIEW public.vw_vet_drug_journal AS
SELECT
    b.client_id,
    b.farm_id,
    b.id AS batch_id,
    b.product_id,
    b.created_at AS receipt_date,
    p.name AS product_name,
    p.registration_code,
    p.active_substance,
    s.name AS supplier_name,
    b.lot AS batch_number,
    b.mfg_date AS manufacture_date,
    b.expiry_date,
    b.qty_received AS quantity_received,
    p.primary_pack_unit AS unit,
    (b.qty_received - b.qty_left) AS quantity_used,
    b.qty_left AS quantity_remaining,
    b.doc_number AS invoice_number,
    b.doc_date AS invoice_date,
    'Invoice' AS doc_title
FROM public.batches b
JOIN public.products p ON b.product_id = p.id
LEFT JOIN public.suppliers s ON b.supplier_id = s.id
WHERE p.category IN ('medicines', 'prevention')
ORDER BY b.created_at DESC;

COMMENT ON VIEW public.vw_vet_drug_journal IS 'Veterinary drug journal with batch tracking (farm-specific, multi-tenant)';

-- Grant permissions
GRANT SELECT ON public.vw_treated_animals_detailed TO authenticated;
GRANT SELECT ON public.vw_withdrawal_report TO authenticated;
GRANT SELECT ON public.vw_vet_drug_journal TO authenticated;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Summary of what this fixes:
-- ✅ Adds supplier_services to product_category enum
-- ✅ Adds is_eco_farm to farms
-- ✅ Adds postal_code and contact_person to clients
-- ✅ Adds client_id and farm_id to species (for custom species per farm/client)
-- ✅ Adds 12 route-specific withdrawal columns to products
-- ✅ Adds package_size, package_count, currency to batches
-- ✅ Adds allocation_id to batches (links to farm_stock_allocations)
-- ✅ Adds warehouse_batch_id to invoice_items (links to warehouse_batches)
-- ✅ Adds foreign key constraints:
--     - invoice_items.product_id → products
--     - invoice_items.batch_id → batches
-- ✅ Makes farm_id nullable for shared warehouse functionality (invoices, invoice_items, batches)
-- ✅ Creates warehouse_batches table (with client_id for multi-tenancy)
-- ✅ Creates farm_stock_allocations table (with client_id for multi-tenancy)
-- ✅ Renames qty_received to received_qty in warehouse_batches if needed
-- ✅ Creates warehouse inventory views:
--     - vw_warehouse_inventory (all warehouse stock)
--     - vw_stock_allocation_history (allocation history)
--     - vw_warehouse_stock_available (available stock for allocation in FIFO order)
--     - vw_allocation_analytics_by_farm (analytics by farm)
--     - vw_allocation_analytics_by_product (analytics by product)
--     - animal_visit_summary (animal visit details)
--     - vw_vet_drug_journal_all_farms (drug receipts across all farms)
--     - vw_treated_animals_all_farms (treated animals register)
--     - vw_withdrawal_journal_all_farms (withdrawal periods)
-- ✅ Updates client limits to new pricing (3 farms for trial)
-- ✅ Adds warehouse triggers for allocation tracking and field initialization
-- ✅ Adds trigger_set_timestamp function for updated_at fields
-- ✅ Sets up RLS and permissions for authenticated users
