-- =====================================================================
-- ADD 7-DAY TRIAL PLAN
-- =====================================================================
-- Description: Add plan_7d to the subscription_plan enum for trial periods
-- Created: 2026-05-23
-- =====================================================================

-- Step 1: Add plan_7d to the subscription_plan enum
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'plan_7d';

-- Step 2: Update comment
COMMENT ON TYPE public.subscription_plan IS 'Subscription plans: plan_7d (7-day trial), plan_30d (30 days), plan_180d (180 days)';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Successfully added plan_7d to subscription_plan enum';
END $$;
