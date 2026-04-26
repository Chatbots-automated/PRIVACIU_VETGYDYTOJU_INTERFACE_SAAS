-- =====================================================
-- FINANCES SYSTEM - Invoice and Service Billing
-- Created: 2026-04-26
-- =====================================================
-- This migration adds tables for service pricing, visit charges, and invoice generation

-- =====================================================
-- 1. SERVICE PRICES TABLE
-- =====================================================
-- Stores pricing for each vet and procedure type
CREATE TABLE IF NOT EXISTS public.service_prices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    vet_user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    procedure_type text NOT NULL,
    base_price numeric(10,2) NOT NULL DEFAULT 0,
    description text,
    active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT service_prices_procedure_check CHECK (
        procedure_type = ANY (ARRAY[
            'Gydymas',
            'Vakcina',
            'Profilaktika',
            'Temperatūra',
            'Apžiūra',
            'Konsultacija',
            'Skubus iškvietimas',
            'Sinchronizacijos protokolas',
            'Diagnostika'
        ])
    )
);

CREATE INDEX IF NOT EXISTS idx_service_prices_client_id ON public.service_prices(client_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_vet_user_id ON public.service_prices(vet_user_id);
CREATE INDEX IF NOT EXISTS idx_service_prices_active ON public.service_prices(active);

COMMENT ON TABLE public.service_prices IS 'Kainų lentelė veterinarinėms paslaugoms pagal gydytoją';

-- =====================================================
-- 2. SERVICE INVOICES TABLE
-- =====================================================
-- Generated invoices to send to farms
CREATE TABLE IF NOT EXISTS public.service_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    invoice_number text NOT NULL,
    invoice_date date NOT NULL DEFAULT CURRENT_DATE,
    date_from date NOT NULL,
    date_to date NOT NULL,
    subtotal numeric(10,2) DEFAULT 0,
    vat_rate numeric(5,2) DEFAULT 21.00,
    vat_amount numeric(10,2) DEFAULT 0,
    total_amount numeric(10,2) DEFAULT 0,
    status text DEFAULT 'juodraštis' NOT NULL,
    payment_date date,
    pdf_path text,
    notes text,
    created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT service_invoices_status_check CHECK (
        status = ANY (ARRAY['juodraštis', 'išsiųsta', 'apmokėta', 'atšaukta'])
    ),
    CONSTRAINT service_invoices_dates_check CHECK (date_to >= date_from)
);

CREATE INDEX IF NOT EXISTS idx_service_invoices_client_id ON public.service_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_service_invoices_farm_id ON public.service_invoices(farm_id);
CREATE INDEX IF NOT EXISTS idx_service_invoices_invoice_date ON public.service_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_service_invoices_status ON public.service_invoices(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_service_invoices_number_client ON public.service_invoices(client_id, invoice_number);

COMMENT ON TABLE public.service_invoices IS 'Išsiųstos paslaugų sąskaitos ūkiams';

-- =====================================================
-- 3. VISIT CHARGES TABLE
-- =====================================================
-- Stores charges for each completed visit (services and products)
CREATE TABLE IF NOT EXISTS public.visit_charges (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL,
    visit_id uuid REFERENCES public.animal_visits(id) ON DELETE CASCADE NOT NULL,
    animal_id uuid REFERENCES public.animals(id) ON DELETE CASCADE,
    invoice_id uuid REFERENCES public.service_invoices(id) ON DELETE SET NULL,
    charge_type text NOT NULL,
    procedure_type text,
    product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
    product_name text,
    description text,
    quantity numeric(10,3) NOT NULL DEFAULT 1,
    unit_price numeric(10,2) NOT NULL DEFAULT 0,
    total_price numeric(10,2) NOT NULL DEFAULT 0,
    invoiced boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT visit_charges_charge_type_check CHECK (
        charge_type = ANY (ARRAY['paslauga', 'produktas'])
    )
);

CREATE INDEX IF NOT EXISTS idx_visit_charges_client_id ON public.visit_charges(client_id);
CREATE INDEX IF NOT EXISTS idx_visit_charges_farm_id ON public.visit_charges(farm_id);
CREATE INDEX IF NOT EXISTS idx_visit_charges_visit_id ON public.visit_charges(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_charges_invoice_id ON public.visit_charges(invoice_id);
CREATE INDEX IF NOT EXISTS idx_visit_charges_invoiced ON public.visit_charges(invoiced);

COMMENT ON TABLE public.visit_charges IS 'Mokesčiai už vizitus (paslaugos ir produktai)';

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.service_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_charges ENABLE ROW LEVEL SECURITY;

-- Service Prices Policies
CREATE POLICY "service_prices_select_policy" ON public.service_prices
    FOR SELECT USING (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "service_prices_insert_policy" ON public.service_prices
    FOR INSERT WITH CHECK (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "service_prices_update_policy" ON public.service_prices
    FOR UPDATE USING (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "service_prices_delete_policy" ON public.service_prices
    FOR DELETE USING (client_id = current_setting('app.current_client_id', true)::uuid);

-- Service Invoices Policies
CREATE POLICY "service_invoices_select_policy" ON public.service_invoices
    FOR SELECT USING (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "service_invoices_insert_policy" ON public.service_invoices
    FOR INSERT WITH CHECK (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "service_invoices_update_policy" ON public.service_invoices
    FOR UPDATE USING (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "service_invoices_delete_policy" ON public.service_invoices
    FOR DELETE USING (client_id = current_setting('app.current_client_id', true)::uuid);

-- Visit Charges Policies
CREATE POLICY "visit_charges_select_policy" ON public.visit_charges
    FOR SELECT USING (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "visit_charges_insert_policy" ON public.visit_charges
    FOR INSERT WITH CHECK (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "visit_charges_update_policy" ON public.visit_charges
    FOR UPDATE USING (client_id = current_setting('app.current_client_id', true)::uuid);

CREATE POLICY "visit_charges_delete_policy" ON public.visit_charges
    FOR DELETE USING (client_id = current_setting('app.current_client_id', true)::uuid);

-- =====================================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER set_timestamp_service_prices
    BEFORE UPDATE ON public.service_prices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_service_invoices
    BEFORE UPDATE ON public.service_invoices
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_timestamp_visit_charges
    BEFORE UPDATE ON public.visit_charges
    FOR EACH ROW
    EXECUTE FUNCTION trigger_set_timestamp();

-- =====================================================
-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function to generate next invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number(p_client_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    v_year text;
    v_count integer;
    v_invoice_number text;
BEGIN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
    
    -- Get count of invoices this year
    SELECT COUNT(*) INTO v_count
    FROM public.service_invoices
    WHERE client_id = p_client_id
      AND EXTRACT(YEAR FROM invoice_date) = EXTRACT(YEAR FROM CURRENT_DATE);
    
    v_count := v_count + 1;
    
    -- Format: SF-2026-0001 (SF = Service/Paslauga)
    v_invoice_number := 'SF-' || v_year || '-' || LPAD(v_count::text, 4, '0');
    
    RETURN v_invoice_number;
END;
$$;

COMMENT ON FUNCTION generate_invoice_number IS 'Generuoja kitą sąskaitos numerį klientui';

-- =====================================================
-- 7. VIEWS FOR ANALYTICS
-- =====================================================

-- View: Unpaid charges by farm
CREATE OR REPLACE VIEW vw_unpaid_charges_by_farm AS
SELECT 
    vc.client_id,
    vc.farm_id,
    f.name as farm_name,
    f.contact_person,
    COUNT(DISTINCT vc.visit_id) as visit_count,
    COUNT(vc.id) as charge_count,
    SUM(vc.total_price) as total_amount,
    MIN(av.visit_datetime) as earliest_visit,
    MAX(av.visit_datetime) as latest_visit
FROM public.visit_charges vc
JOIN public.farms f ON f.id = vc.farm_id
JOIN public.animal_visits av ON av.id = vc.visit_id
WHERE vc.invoiced = false
GROUP BY vc.client_id, vc.farm_id, f.name, f.contact_person;

COMMENT ON VIEW vw_unpaid_charges_by_farm IS 'Neapmokėti mokesčiai pagal ūkį';

-- View: Invoice summary
CREATE OR REPLACE VIEW vw_invoice_summary AS
SELECT 
    si.id,
    si.client_id,
    si.farm_id,
    f.name as farm_name,
    si.invoice_number,
    si.invoice_date,
    si.date_from,
    si.date_to,
    si.total_amount,
    si.status,
    si.payment_date,
    COUNT(vc.id) as charge_count,
    u.full_name as created_by_name
FROM public.service_invoices si
JOIN public.farms f ON f.id = si.farm_id
LEFT JOIN public.visit_charges vc ON vc.invoice_id = si.id
LEFT JOIN public.users u ON u.id = si.created_by
GROUP BY si.id, f.name, u.full_name;

COMMENT ON VIEW vw_invoice_summary IS 'Sąskaitų suvestinė';

-- View: Revenue by vet
CREATE OR REPLACE VIEW vw_revenue_by_vet AS
SELECT 
    av.client_id,
    av.vet_name,
    COUNT(DISTINCT av.id) as visit_count,
    COUNT(vc.id) as charge_count,
    SUM(CASE WHEN vc.charge_type = 'paslauga' THEN vc.total_price ELSE 0 END) as service_revenue,
    SUM(CASE WHEN vc.charge_type = 'produktas' THEN vc.total_price ELSE 0 END) as product_revenue,
    SUM(vc.total_price) as total_revenue,
    DATE_TRUNC('month', av.visit_datetime) as month
FROM public.animal_visits av
JOIN public.visit_charges vc ON vc.visit_id = av.id
WHERE av.status = 'Baigtas'
GROUP BY av.client_id, av.vet_name, DATE_TRUNC('month', av.visit_datetime);

COMMENT ON VIEW vw_revenue_by_vet IS 'Pajamos pagal veterinarą';
