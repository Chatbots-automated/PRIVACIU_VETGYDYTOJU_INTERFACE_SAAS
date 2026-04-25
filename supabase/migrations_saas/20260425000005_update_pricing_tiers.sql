-- =====================================================================
-- UPDATE PRICING TIERS
-- =====================================================================
-- Created: 2026-04-25
-- Description: Update pricing tiers to new model (trial/starter/professional/enterprise)
-- =====================================================================

-- Update subscription_plan enum to include new tiers
DO $$ 
BEGIN
    -- Drop old enum if exists and recreate
    ALTER TABLE public.clients ALTER COLUMN subscription_plan DROP DEFAULT;
    
    -- Create new enum type with all tiers
    CREATE TYPE public.subscription_plan_new AS ENUM (
        'trial',
        'starter',
        'professional',
        'enterprise',
        'komanda'
    );
    
    -- Update column to use new enum
    ALTER TABLE public.clients 
        ALTER COLUMN subscription_plan TYPE public.subscription_plan_new 
        USING (
            CASE subscription_plan::text
                WHEN 'basic' THEN 'starter'
                ELSE subscription_plan::text
            END::public.subscription_plan_new
        );
    
    -- Drop old enum and rename new one
    DROP TYPE IF EXISTS public.subscription_plan CASCADE;
    ALTER TYPE public.subscription_plan_new RENAME TO subscription_plan;
    
    -- Restore default
    ALTER TABLE public.clients ALTER COLUMN subscription_plan SET DEFAULT 'trial';
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

-- Update pricing_tiers table with WEEKLY pricing
TRUNCATE TABLE public.pricing_tiers;

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
-- TRIAL: 7 days free (1-3 farms)
(
    'Trial (7 Days)',
    'trial',
    0.00,
    0.00,
    3,
    999,
    '{
        "duration": "7 days",
        "billing": "free",
        "all_modules": true,
        "reports": "all",
        "support": "email",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": false
    }'::jsonb,
    1
),
-- STARTAS: 1-5 farms (€76/month = €19/week)
(
    'Startas',
    'starter',
    19.00,
    0.00,
    5,
    999,
    '{
        "billing": "weekly",
        "all_modules": true,
        "reports": "all",
        "support": "email",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": false,
        "export_data": true
    }'::jsonb,
    2
),
-- PRAKTIKA: 6-15 farms (€156/month = €39/week)
(
    'Praktika',
    'professional',
    39.00,
    0.00,
    15,
    999,
    '{
        "billing": "weekly",
        "all_modules": true,
        "reports": "all",
        "support": "priority_email",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": false,
        "export_data": true,
        "custom_reports": true,
        "advanced_analytics": true
    }'::jsonb,
    3
),
-- AUGIMAS: 16-35 farms (€276/month = €69/week) - MOST POPULAR
(
    'Augimas',
    'enterprise',
    69.00,
    0.00,
    35,
    999,
    '{
        "billing": "weekly",
        "all_modules": true,
        "most_popular": true,
        "reports": "all",
        "support": "priority",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": false,
        "export_data": true,
        "custom_reports": true,
        "bulk_operations": true,
        "advanced_analytics": true,
        "automated_reminders": true,
        "predictive_insights": true
    }'::jsonb,
    4
),
-- KOMANDA: 36+ farms (€476/month = €119/week)
(
    'Komanda',
    'komanda',
    119.00,
    0.00,
    999,
    999,
    '{
        "billing": "weekly",
        "all_modules": true,
        "reports": "all",
        "support": "dedicated",
        "drug_journal": true,
        "invoices": true,
        "mobile_app": true,
        "api_access": true,
        "export_data": true,
        "custom_reports": true,
        "bulk_operations": true,
        "advanced_analytics": true,
        "automated_reminders": true,
        "predictive_insights": true,
        "custom_integrations": true,
        "data_migration": true,
        "sla_guarantee": "99.9%"
    }'::jsonb,
    5
);

-- Update calculate_client_monthly_bill function to handle WEEKLY flat pricing
CREATE OR REPLACE FUNCTION public.calculate_client_weekly_bill(p_client_id uuid)
RETURNS TABLE(
    active_farms integer,
    active_animals integer,
    tier_name text,
    tier_code text,
    weekly_price numeric,
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
    WHERE tier_code = v_client.subscription_plan::text
      AND is_active = true;

    IF v_tier IS NULL THEN
        RAISE EXCEPTION 'No active pricing tier found for plan: %', v_client.subscription_plan;
    END IF;

    -- For trial plan, everything is free
    IF v_client.subscription_plan = 'trial' THEN
        v_subtotal := 0;
    ELSE
        -- Flat weekly fee (stored in monthly_base_per_farm column but represents weekly price)
        v_subtotal := v_tier.monthly_base_per_farm;
    END IF;

    -- Calculate VAT if client is VAT registered
    IF v_client.vat_registered THEN
        v_vat_amount := v_subtotal * (21.00 / 100);
    ELSE
        v_vat_amount := 0;
    END IF;

    -- Return calculation
    RETURN QUERY SELECT
        v_farm_count,
        v_animal_count,
        v_tier.tier_name,
        v_tier.tier_code,
        v_tier.monthly_base_per_farm, -- weekly_price
        v_subtotal,
        21.00::numeric,
        v_vat_amount,
        v_subtotal + v_vat_amount;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_client_weekly_bill IS 'Calculates weekly bill using flat-rate pricing model';

-- Keep old function for backwards compatibility, but have it call the weekly function
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
    v_weekly_bill record;
BEGIN
    -- Get weekly bill
    SELECT * INTO v_weekly_bill
    FROM calculate_client_weekly_bill(p_client_id);
    
    -- Return in old format (multiply weekly by 4 for approximate monthly)
    RETURN QUERY SELECT
        v_weekly_bill.active_farms,
        v_weekly_bill.active_animals,
        v_weekly_bill.tier_name,
        v_weekly_bill.tier_code,
        v_weekly_bill.weekly_price * 4, -- base_per_farm (monthly estimate)
        v_weekly_bill.subtotal * 4, -- base_total (monthly estimate)
        0::numeric, -- animal_total
        v_weekly_bill.subtotal * 4, -- subtotal (monthly estimate)
        v_weekly_bill.vat_rate,
        v_weekly_bill.vat_amount * 4, -- vat_amount (monthly estimate)
        v_weekly_bill.total * 4; -- total (monthly estimate)
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.calculate_client_monthly_bill IS 'Backwards compatible - returns weekly bill × 4 for monthly estimate';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

COMMENT ON SCHEMA public IS 'Multi-tenant SaaS with WEEKLY flat-rate pricing: €12.50-€74.75/week depending on plan';

-- Update comment on pricing_tiers table
COMMENT ON COLUMN public.pricing_tiers.monthly_base_per_farm IS 'WEEKLY price (not monthly despite column name). Trial=€0, Starter=€12.50, Professional=€32.25, Enterprise=€74.75';
