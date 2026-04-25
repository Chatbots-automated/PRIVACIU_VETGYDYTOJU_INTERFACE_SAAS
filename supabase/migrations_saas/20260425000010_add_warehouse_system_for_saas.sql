-- =====================================================================
-- ADD WAREHOUSE SYSTEM FOR SAAS MULTI-TENANT
-- =====================================================================
-- Created: 2026-04-25
-- Description: Two-tier inventory: Warehouse (client-wide) → Farm (specific)
-- =====================================================================

-- =====================================================================
-- 1. WAREHOUSE BATCHES TABLE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.warehouse_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE,
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
    currency text DEFAULT 'EUR',
    received_qty numeric NOT NULL,
    qty_left numeric(10,2),
    qty_allocated numeric(10,2) DEFAULT 0,
    package_size numeric(10,2),
    package_count numeric(10,2),
    batch_number text,
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT warehouse_batches_received_qty_check CHECK (received_qty >= 0),
    CONSTRAINT warehouse_batches_qty_allocated_check CHECK (qty_allocated >= 0),
    CONSTRAINT warehouse_batches_status_check CHECK (status = ANY (ARRAY['active', 'depleted', 'expired', 'fully_allocated']))
);

CREATE INDEX idx_warehouse_batches_client_id ON public.warehouse_batches(client_id);
CREATE INDEX idx_warehouse_batches_farm_id ON public.warehouse_batches(farm_id);
CREATE INDEX idx_warehouse_batches_product_id ON public.warehouse_batches(product_id);
CREATE INDEX idx_warehouse_batches_expiry ON public.warehouse_batches(expiry_date);
CREATE INDEX idx_warehouse_batches_status ON public.warehouse_batches(status);
CREATE INDEX idx_warehouse_batches_qty_left ON public.warehouse_batches(qty_left) WHERE qty_left > 0;

COMMENT ON TABLE public.warehouse_batches IS 'Client-wide or farm-specific warehouse inventory (farm_id=NULL for shared warehouse)';
COMMENT ON COLUMN public.warehouse_batches.client_id IS 'Client who owns this warehouse stock';
COMMENT ON COLUMN public.warehouse_batches.farm_id IS 'NULL for client-wide shared warehouse, specific farm ID for farm warehouse';

-- =====================================================================
-- 2. FARM STOCK ALLOCATIONS TABLE
-- =====================================================================

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

CREATE INDEX idx_farm_stock_allocations_client_id ON public.farm_stock_allocations(client_id);
CREATE INDEX idx_farm_stock_allocations_warehouse_batch ON public.farm_stock_allocations(warehouse_batch_id);
CREATE INDEX idx_farm_stock_allocations_farm_id ON public.farm_stock_allocations(farm_id);
CREATE INDEX idx_farm_stock_allocations_product_id ON public.farm_stock_allocations(product_id);
CREATE INDEX idx_farm_stock_allocations_date ON public.farm_stock_allocations(allocation_date);

COMMENT ON TABLE public.farm_stock_allocations IS 'Tracks stock allocation from warehouse to specific farms';

-- =====================================================================
-- 3. ADD ALLOCATION LINK TO BATCHES
-- =====================================================================

ALTER TABLE public.batches 
ADD COLUMN IF NOT EXISTS allocation_id uuid REFERENCES public.farm_stock_allocations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_batches_allocation_id ON public.batches(allocation_id);

COMMENT ON COLUMN public.batches.allocation_id IS 'Links farm batch to its warehouse allocation source';

-- =====================================================================
-- 4. VIEWS
-- =====================================================================

CREATE OR REPLACE VIEW public.vw_warehouse_inventory AS
SELECT 
    wb.id AS warehouse_batch_id,
    wb.client_id,
    wb.farm_id,
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
    wb.unit_price,
    wb.currency,
    wb.doc_number,
    wb.doc_date,
    s.name AS supplier_name,
    wb.created_at
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
ORDER BY wb.created_at DESC;

COMMENT ON VIEW public.vw_warehouse_inventory IS 'Warehouse inventory with product details and allocation status';

CREATE OR REPLACE VIEW public.vw_stock_allocation_history AS
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
    fsa.allocated_by AS allocated_by_name,
    fsa.notes,
    fsa.warehouse_batch_id,
    fsa.farm_id,
    fsa.product_id
FROM public.farm_stock_allocations fsa
JOIN public.farms f ON fsa.farm_id = f.id
JOIN public.products p ON fsa.product_id = p.id
JOIN public.warehouse_batches wb ON fsa.warehouse_batch_id = wb.id
ORDER BY fsa.allocation_date DESC;

COMMENT ON VIEW public.vw_stock_allocation_history IS 'Complete history of stock allocations from warehouse to farms';

-- =====================================================================
-- 5. TRIGGERS
-- =====================================================================

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

-- =====================================================================
-- 6. RLS POLICIES
-- =====================================================================

ALTER TABLE public.warehouse_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farm_stock_allocations ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated users
CREATE POLICY "Enable all for authenticated users" ON public.warehouse_batches
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for authenticated users" ON public.farm_stock_allocations
    FOR ALL USING (true) WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.warehouse_batches TO authenticated;
GRANT ALL ON public.farm_stock_allocations TO authenticated;
GRANT SELECT ON public.vw_warehouse_inventory TO authenticated;
GRANT SELECT ON public.vw_stock_allocation_history TO authenticated;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
