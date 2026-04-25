-- =====================================================================
-- ADD ROUTE-SPECIFIC WITHDRAWAL COLUMNS
-- =====================================================================
-- Created: 2026-04-25
-- Description: Add administration route-specific withdrawal period columns
--              to products table (i.v., i.m., s.c., i.u., i.mm., pos.)
-- =====================================================================

-- Add route-specific withdrawal columns for meat
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS withdrawal_iv_meat integer,     -- intravenous
  ADD COLUMN IF NOT EXISTS withdrawal_im_meat integer,     -- intramuscular
  ADD COLUMN IF NOT EXISTS withdrawal_sc_meat integer,     -- subcutaneous
  ADD COLUMN IF NOT EXISTS withdrawal_iu_meat integer,     -- intrauterine
  ADD COLUMN IF NOT EXISTS withdrawal_imm_meat integer,    -- intramammary
  ADD COLUMN IF NOT EXISTS withdrawal_pos_meat integer;    -- pour-on/spot-on

-- Add route-specific withdrawal columns for milk
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS withdrawal_iv_milk integer,     -- intravenous
  ADD COLUMN IF NOT EXISTS withdrawal_im_milk integer,     -- intramuscular
  ADD COLUMN IF NOT EXISTS withdrawal_sc_milk integer,     -- subcutaneous
  ADD COLUMN IF NOT EXISTS withdrawal_iu_milk integer,     -- intrauterine
  ADD COLUMN IF NOT EXISTS withdrawal_imm_milk integer,    -- intramammary
  ADD COLUMN IF NOT EXISTS withdrawal_pos_milk integer;    -- pour-on/spot-on

-- Add comments explaining the columns
COMMENT ON COLUMN public.products.withdrawal_iv_meat IS 'Withdrawal period for meat when administered intravenously (i.v.)';
COMMENT ON COLUMN public.products.withdrawal_iv_milk IS 'Withdrawal period for milk when administered intravenously (i.v.)';
COMMENT ON COLUMN public.products.withdrawal_im_meat IS 'Withdrawal period for meat when administered intramuscularly (i.m.)';
COMMENT ON COLUMN public.products.withdrawal_im_milk IS 'Withdrawal period for milk when administered intramuscularly (i.m.)';
COMMENT ON COLUMN public.products.withdrawal_sc_meat IS 'Withdrawal period for meat when administered subcutaneously (s.c.)';
COMMENT ON COLUMN public.products.withdrawal_sc_milk IS 'Withdrawal period for milk when administered subcutaneously (s.c.)';
COMMENT ON COLUMN public.products.withdrawal_iu_meat IS 'Withdrawal period for meat when administered intrauterine (i.u.)';
COMMENT ON COLUMN public.products.withdrawal_iu_milk IS 'Withdrawal period for milk when administered intrauterine (i.u.)';
COMMENT ON COLUMN public.products.withdrawal_imm_meat IS 'Withdrawal period for meat when administered intramammary (i.mm.)';
COMMENT ON COLUMN public.products.withdrawal_imm_milk IS 'Withdrawal period for milk when administered intramammary (i.mm.)';
COMMENT ON COLUMN public.products.withdrawal_pos_meat IS 'Withdrawal period for meat when administered pour-on/spot-on';
COMMENT ON COLUMN public.products.withdrawal_pos_milk IS 'Withdrawal period for milk when administered pour-on/spot-on';

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================

-- Note: withdrawal_days_meat and withdrawal_days_milk remain as the default/general withdrawal periods
-- Route-specific columns are used when the medication has different withdrawal periods based on administration route
