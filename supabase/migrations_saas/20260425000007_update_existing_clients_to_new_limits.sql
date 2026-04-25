-- =====================================================================
-- UPDATE EXISTING CLIENTS TO NEW PRICING LIMITS
-- =====================================================================
-- Created: 2026-04-25
-- Description: Update existing clients to match new pricing tier limits
-- =====================================================================

-- Update Trial clients to new limits (3 farms, unlimited users)
UPDATE public.clients
SET 
    max_farms = 3,
    max_users = 999,
    updated_at = now()
WHERE subscription_plan = 'trial';

-- Update Starter clients to new limits (5 farms, unlimited users)
UPDATE public.clients
SET 
    max_farms = 5,
    max_users = 999,
    updated_at = now()
WHERE subscription_plan = 'starter';

-- Update Professional clients to new limits (15 farms, unlimited users)
UPDATE public.clients
SET 
    max_farms = 15,
    max_users = 999,
    updated_at = now()
WHERE subscription_plan = 'professional';

-- Update Enterprise/Augimas clients to new limits (35 farms, unlimited users)
UPDATE public.clients
SET 
    max_farms = 35,
    max_users = 999,
    updated_at = now()
WHERE subscription_plan = 'enterprise';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
