-- Add 'supplier_services' to product_category enum
ALTER TYPE product_category ADD VALUE IF NOT EXISTS 'supplier_services';
