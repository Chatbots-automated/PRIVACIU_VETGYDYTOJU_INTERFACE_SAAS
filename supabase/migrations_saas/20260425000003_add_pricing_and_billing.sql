-- =====================================================================
-- PRICING AND BILLING SYSTEM
-- =====================================================================
-- Created: 2026-04-25
-- Description: Hybrid pricing model (Per-Farm Base + Per-Animal Variable)
--              Perfect for private vets managing multiple farms
-- =====================================================================

-- =====================================================================
-- 1. PRICING TIERS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.pricing_tiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    tier_name text NOT NULL UNIQUE,
    tier_code text NOT NULL UNIQUE,
    monthly_base_per_farm numeric(10,2) NOT NULL,
    price_per_animal numeric(5,3) NOT NULL,
    max_farms integer NOT NULL,
    max_users integer NOT NULL,
    features jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    display_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_pricing_tiers_tier_code ON public.pricing_tiers(tier_code);
CREATE INDEX idx_pricing_tiers_is_active ON public.pricing_tiers(is_active);

COMMENT ON TABLE public.pricing_tiers IS 'Pricing tiers for subscription plans';
COMMENT ON COLUMN public.pricing_tiers.monthly_base_per_farm IS 'Base price per farm per month (EUR)';
COMMENT ON COLUMN public.pricing_tiers.price_per_animal IS 'Price per active animal per month (EUR)';

-- Insert default pricing tiers (Hybrid Model: Base per farm + Per animal)
INSERT INTO public.pricing_tiers (
    tier_name,
    tier_code,
    monthly_base_per_farm,
    price_per_animal,
    max_farms,
    max_users,
    features,
    display_order
) VALUES
-- STARTER: Small practice (1-3 farms)
(
    'Starter',
    'starter',
    5.00,   -- €5 per farm base
    0.25,   -- €0.25 per animal
    3,
    2,
    '{
        "reports": "basic",
        "support": "email",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": false,
        "api_access": false
    }'::jsonb,
    1
),
-- PROFESSIONAL: Medium practice (4-10 farms)
(
    'Professional',
    'professional',
    4.00,   -- €4 per farm base
    0.18,   -- €0.18 per animal
    10,
    5,
    '{
        "reports": "advanced",
        "support": "priority_email",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": false,
        "export_data": true,
        "custom_reports": true
    }'::jsonb,
    2
),
-- BUSINESS: Large practice (11-25 farms)
(
    'Business',
    'business',
    3.00,   -- €3 per farm base
    0.15,   -- €0.15 per animal
    25,
    15,
    '{
        "reports": "all",
        "support": "priority_email_phone",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": true,
        "export_data": true,
        "custom_reports": true,
        "bulk_operations": true,
        "advanced_analytics": true
    }'::jsonb,
    3
),
-- ENTERPRISE: Very large practice (25+ farms)
(
    'Enterprise',
    'enterprise',
    2.00,   -- €2 per farm base
    0.12,   -- €0.12 per animal
    999,
    50,
    '{
        "reports": "all",
        "support": "dedicated_account_manager",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": true,
        "export_data": true,
        "custom_reports": true,
        "bulk_operations": true,
        "advanced_analytics": true,
        "white_label": true,
        "custom_integrations": true,
        "sla_guarantee": "99.9%"
    }'::jsonb,
    4
);

-- =====================================================================
-- 2. UPDATE CLIENTS TABLE FOR BILLING
-- =====================================================================

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_email text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_address text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_city text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_postal_code text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_country text DEFAULT 'Lithuania';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS vat_registered boolean DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_method text; -- 'card', 'bank_transfer', 'direct_debit', 'invoice'
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS billing_cycle text DEFAULT 'monthly'; -- 'monthly', 'yearly'
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_billed_at timestamptz;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS next_billing_date date;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_failed_at timestamptz;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS payment_failure_count integer DEFAULT 0;

CREATE INDEX idx_clients_next_billing_date ON public.clients(next_billing_date) WHERE subscription_status = 'active';
CREATE INDEX idx_clients_stripe_customer_id ON public.clients(stripe_customer_id);

COMMENT ON COLUMN public.clients.billing_email IS 'Email for invoices and billing notifications';
COMMENT ON COLUMN public.clients.vat_registered IS 'If true, client is VAT registered (include VAT in invoices)';
COMMENT ON COLUMN public.clients.stripe_customer_id IS 'Stripe customer ID for payment processing';

-- =====================================================================
-- 3. BILLING INVOICES
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.billing_invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    invoice_number text UNIQUE NOT NULL,
    invoice_date date DEFAULT CURRENT_DATE NOT NULL,
    billing_period_start date NOT NULL,
    billing_period_end date NOT NULL,
    
    -- Billing details
    active_farms_count integer NOT NULL,
    active_animals_count integer NOT NULL,
    tier_name text NOT NULL,
    tier_code text NOT NULL,
    
    -- Pricing breakdown
    base_amount_per_farm numeric(10,2) NOT NULL,
    base_amount_total numeric(10,2) NOT NULL, -- farms × base_per_farm
    animal_amount_total numeric(10,2) NOT NULL, -- animals × price_per_animal
    subtotal numeric(10,2) NOT NULL,
    
    -- Tax
    vat_rate numeric(5,2) DEFAULT 21.00, -- Lithuania VAT 21%
    vat_amount numeric(10,2) DEFAULT 0,
    
    -- Total
    total_amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'EUR' NOT NULL,
    
    -- Payment status
    status text DEFAULT 'pending' NOT NULL,
    paid_at timestamptz,
    payment_method text,
    stripe_invoice_id text,
    
    -- Notes
    notes text,
    
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    
    CONSTRAINT billing_invoices_status_check CHECK (status = ANY (ARRAY['pending', 'paid', 'overdue', 'cancelled', 'refunded']))
);

CREATE INDEX idx_billing_invoices_client_id ON public.billing_invoices(client_id);
CREATE INDEX idx_billing_invoices_invoice_date ON public.billing_invoices(invoice_date);
CREATE INDEX idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX idx_billing_invoices_stripe_invoice_id ON public.billing_invoices(stripe_invoice_id);

COMMENT ON TABLE public.billing_invoices IS 'Monthly billing invoices for clients';
COMMENT ON COLUMN public.billing_invoices.base_amount_total IS 'Total base amount: farms × base_per_farm';
COMMENT ON COLUMN public.billing_invoices.animal_amount_total IS 'Total animal amount: animals × price_per_animal';

-- =====================================================================
-- 4. PAYMENT HISTORY
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.payment_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    invoice_id uuid REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
    payment_date timestamptz DEFAULT now() NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency text DEFAULT 'EUR' NOT NULL,
    payment_method text NOT NULL,
    transaction_id text,
    stripe_payment_intent_id text,
    status text DEFAULT 'completed' NOT NULL,
    failure_reason text,
    notes text,
    created_at timestamptz DEFAULT now(),
    
    CONSTRAINT payment_history_status_check CHECK (status = ANY (ARRAY['completed', 'failed', 'refunded', 'pending']))
);

CREATE INDEX idx_payment_history_client_id ON public.payment_history(client_id);
CREATE INDEX idx_payment_history_invoice_id ON public.payment_history(invoice_id);
CREATE INDEX idx_payment_history_payment_date ON public.payment_history(payment_date);

COMMENT ON TABLE public.payment_history IS 'Payment transaction history';

-- =====================================================================
-- 5. BILLING FUNCTIONS
-- =====================================================================

-- Function to calculate current monthly bill for a client
CREATE OR REPLACE FUNCTION public.calculate_client_monthly_bill(p_client_id uuid)
RETURNS TABLE(
    active_farms integer,
    active_animals integer,
    tier_name text,
    tier_code text,
    base_per_farm numeric,
    base_total numeric,
    animal_total numeric,
    subtotal numeric,
    vat_rate numeric,
    vat_amount numeric,
    total numeric
) AS $$
DECLARE
    v_farm_count integer;
    v_animal_count integer;
    v_tier record;
    v_client record;
    v_subtotal numeric;
    v_vat_amount numeric;
BEGIN
    -- Get client info
    SELECT * INTO v_client
    FROM clients
    WHERE id = p_client_id;

    -- Count active farms and animals
    SELECT 
        COUNT(DISTINCT f.id),
        COUNT(DISTINCT a.id)
    INTO v_farm_count, v_animal_count
    FROM clients c
    LEFT JOIN farms f ON c.id = f.client_id AND f.is_active = true
    LEFT JOIN animals a ON c.id = a.client_id AND a.active = true
    WHERE c.id = p_client_id;

    -- Get pricing tier for client's subscription plan
    SELECT * INTO v_tier
    FROM pricing_tiers
    WHERE tier_code = v_client.subscription_plan
      AND is_active = true;

    IF v_tier IS NULL THEN
        RAISE EXCEPTION 'No active pricing tier found for plan: %', v_client.subscription_plan;
    END IF;

    -- Calculate subtotal
    v_subtotal := (v_farm_count * v_tier.monthly_base_per_farm) + 
                  (v_animal_count * v_tier.price_per_animal);

    -- Calculate VAT if client is VAT registered
    IF v_client.vat_registered THEN
        v_vat_amount := v_subtotal * (21.00 / 100); -- 21% VAT for Lithuania
    ELSE
        v_vat_amount := 0;
    END IF;

    -- Return calculation
    RETURN QUERY SELECT
        v_farm_count,
        v_animal_count,
        v_tier.tier_name,
        v_tier.tier_code,
        v_tier.monthly_base_per_farm,
        v_farm_count * v_tier.monthly_base_per_farm, -- base_total
        v_animal_count * v_tier.price_per_animal,    -- animal_total
        v_subtotal,
        21.00::numeric,
        v_vat_amount,
        v_subtotal + v_vat_amount; -- total
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_client_monthly_bill IS 'Calculates monthly bill for a client based on active farms and animals';

-- Function to generate invoice for a client
CREATE OR REPLACE FUNCTION public.generate_invoice_for_client(
    p_client_id uuid,
    p_billing_period_start date,
    p_billing_period_end date
)
RETURNS uuid AS $$
DECLARE
    v_invoice_id uuid;
    v_invoice_number text;
    v_bill record;
BEGIN
    -- Calculate bill
    SELECT * INTO v_bill
    FROM calculate_client_monthly_bill(p_client_id);

    -- Generate invoice number (format: INV-YYYYMM-XXXXX)
    SELECT 'INV-' || 
           TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' ||
           LPAD((COUNT(*) + 1)::text, 5, '0')
    INTO v_invoice_number
    FROM billing_invoices
    WHERE invoice_date >= DATE_TRUNC('month', CURRENT_DATE);

    -- Create invoice
    INSERT INTO billing_invoices (
        client_id,
        invoice_number,
        invoice_date,
        billing_period_start,
        billing_period_end,
        active_farms_count,
        active_animals_count,
        tier_name,
        tier_code,
        base_amount_per_farm,
        base_amount_total,
        animal_amount_total,
        subtotal,
        vat_rate,
        vat_amount,
        total_amount,
        status
    ) VALUES (
        p_client_id,
        v_invoice_number,
        CURRENT_DATE,
        p_billing_period_start,
        p_billing_period_end,
        v_bill.active_farms,
        v_bill.active_animals,
        v_bill.tier_name,
        v_bill.tier_code,
        v_bill.base_per_farm,
        v_bill.base_total,
        v_bill.animal_total,
        v_bill.subtotal,
        v_bill.vat_rate,
        v_bill.vat_amount,
        v_bill.total,
        'pending'
    )
    RETURNING id INTO v_invoice_id;

    -- Update client's last billed date
    UPDATE clients
    SET last_billed_at = now(),
        next_billing_date = p_billing_period_end + INTERVAL '1 month'
    WHERE id = p_client_id;

    RETURN v_invoice_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.generate_invoice_for_client IS 'Generates a new invoice for a client for the specified billing period';

-- Function to mark invoice as paid
CREATE OR REPLACE FUNCTION public.mark_invoice_paid(
    p_invoice_id uuid,
    p_payment_method text DEFAULT NULL,
    p_transaction_id text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    v_invoice record;
BEGIN
    -- Get invoice
    SELECT * INTO v_invoice
    FROM billing_invoices
    WHERE id = p_invoice_id;

    IF v_invoice IS NULL THEN
        RAISE EXCEPTION 'Invoice not found: %', p_invoice_id;
    END IF;

    -- Update invoice status
    UPDATE billing_invoices
    SET status = 'paid',
        paid_at = now(),
        payment_method = COALESCE(p_payment_method, payment_method),
        updated_at = now()
    WHERE id = p_invoice_id;

    -- Record payment
    INSERT INTO payment_history (
        client_id,
        invoice_id,
        payment_date,
        amount,
        payment_method,
        transaction_id,
        status
    ) VALUES (
        v_invoice.client_id,
        p_invoice_id,
        now(),
        v_invoice.total_amount,
        p_payment_method,
        p_transaction_id,
        'completed'
    );

    -- Reset payment failure count
    UPDATE clients
    SET payment_failure_count = 0,
        payment_failed_at = NULL
    WHERE id = v_invoice.client_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.mark_invoice_paid IS 'Marks an invoice as paid and records payment';

-- =====================================================================
-- 6. ENABLE RLS
-- =====================================================================

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Pricing tiers are public (everyone can view)
CREATE POLICY "Anyone can view pricing tiers" ON public.pricing_tiers FOR SELECT USING (true);
CREATE POLICY "Allow all operations on pricing_tiers" ON public.pricing_tiers FOR ALL USING (true) WITH CHECK (true);

-- Billing invoices
CREATE POLICY "Allow all operations on billing_invoices" ON public.billing_invoices FOR ALL USING (true) WITH CHECK (true);

-- Payment history
CREATE POLICY "Allow all operations on payment_history" ON public.payment_history FOR ALL USING (true) WITH CHECK (true);

-- =====================================================================
-- 7. GRANT PERMISSIONS
-- =====================================================================

GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

COMMENT ON SCHEMA public IS 'Multi-tenant SaaS with Hybrid pricing: Base per farm + Variable per animal';
