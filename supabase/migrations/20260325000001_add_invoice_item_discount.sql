-- Per-line discount (nuolaida) as percentage, e.g. 5.00 = 5%
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS discount_percent numeric(5, 2);

COMMENT ON COLUMN public.invoice_items.discount_percent IS 'Line discount as percentage (0–100), from invoice Nuolaida column';
