-- Add 'ovules' to the product_category ENUM
-- This is needed for the BulkTreatment and other components that filter by ovules category

ALTER TYPE public.product_category ADD VALUE IF NOT EXISTS 'ovules';

COMMENT ON TYPE public.product_category IS 'Product categories including medicines, prevention, reproduction, treatment materials, hygiene, biocide, technical, svirkstukai, bolusas, vakcina, and ovules';
