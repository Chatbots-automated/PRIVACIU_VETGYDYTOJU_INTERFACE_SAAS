-- =====================================================================
-- UPDATE TO DAILY PLANS - REMOVE LIMITS
-- =====================================================================
-- Changes:
-- 1. Update subscription_plan enum to use daily plans (plan_30d, plan_180d)
-- 2. Set max_farms and max_users to 999999 (effectively unlimited)
-- 3. Remove limit checks from functions
-- =====================================================================

-- Step 1: Update the subscription_plan enum
ALTER TYPE public.subscription_plan RENAME TO subscription_plan_old;

CREATE TYPE public.subscription_plan AS ENUM (
    'plan_30d',
    'plan_180d'
);

-- Step 2: Update clients table to use new enum (default to plan_30d)
ALTER TABLE public.clients 
    ALTER COLUMN subscription_plan DROP DEFAULT;

ALTER TABLE public.clients 
    ALTER COLUMN subscription_plan TYPE public.subscription_plan 
    USING 'plan_30d'::public.subscription_plan;

ALTER TABLE public.clients 
    ALTER COLUMN subscription_plan SET DEFAULT 'plan_30d';

DROP TYPE public.subscription_plan_old;

-- Step 3: Set unlimited farms and users for all clients
UPDATE public.clients 
SET 
    max_farms = 999999,
    max_users = 999999;

-- Step 4: Update default values for new clients
ALTER TABLE public.clients 
    ALTER COLUMN max_farms SET DEFAULT 999999;

ALTER TABLE public.clients 
    ALTER COLUMN max_users SET DEFAULT 999999;

-- Step 5: Drop/Recreate functions that check limits (make them always return true)

-- Farm limit check - now always allows
CREATE OR REPLACE FUNCTION public.check_farm_limit(p_client_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- No limits anymore, always return true
    RETURN true;
END;
$$;

COMMENT ON FUNCTION public.check_farm_limit IS 'Always returns true - no farm limits in daily plans';

-- User limit check - now always allows (during registration)
CREATE OR REPLACE FUNCTION public.check_user_limit_before_registration(p_client_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- No limits anymore, do nothing
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.check_user_limit_before_registration IS 'No user limits in daily plans';

-- Update comments
COMMENT ON COLUMN public.clients.max_farms IS 'No limit enforced - set to 999999 for daily plans';
COMMENT ON COLUMN public.clients.max_users IS 'No limit enforced - set to 999999 for daily plans';
COMMENT ON COLUMN public.clients.subscription_plan IS 'Daily plan: plan_30d (30 days €30) or plan_180d (180 days €150)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_farm_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_user_limit_before_registration(uuid) TO authenticated;
