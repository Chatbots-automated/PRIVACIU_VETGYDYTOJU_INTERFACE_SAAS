-- =====================================================================
-- CREATE WAREHOUSE-AWARE JOURNAL VIEW
-- =====================================================================
-- Created: 2026-05-19
-- Description: Create a comprehensive view that includes both farm batches
-- and warehouse batches for journal reports (stock balance, write-off act)
-- =====================================================================

-- Drop existing view if it exists
DROP VIEW IF EXISTS vw_vet_drug_journal_complete CASCADE;

-- Create comprehensive view combining farm and warehouse batches
CREATE OR REPLACE VIEW vw_vet_drug_journal_complete AS
-- =====================================================================
-- FARM BATCHES
-- =====================================================================
SELECT 
  b.id as batch_id,
  b.product_id,
  b.farm_id,
  b.client_id,
  p.name as product_name,
  p.registration_code,
  p.primary_pack_unit,
  b.lot as batch_number,
  b.expiry_date,
  b.received_date,
  b.qty_received as quantity_received,
  b.qty_left as quantity_left,
  b.purchase_price,
  b.purchase_price as purchase_price_with_vat, -- No VAT column, using same value
  COALESCE(s.name, '') as supplier,
  COALESCE(b.doc_number, i.invoice_number) as document_number,
  'farm' as source,
  -- Calculate usage from usage_items, biocide_usage, vaccinations
  COALESCE(
    (SELECT SUM(quantity) FROM usage_items WHERE batch_id = b.id),
    0
  ) +
  COALESCE(
    (SELECT SUM(quantity_used) FROM biocide_usage WHERE batch_id = b.id),
    0
  ) +
  COALESCE(
    (SELECT SUM(dose_amount) FROM vaccinations WHERE batch_id = b.id),
    0
  ) as quantity_used
FROM batches b
JOIN products p ON b.product_id = p.id
LEFT JOIN suppliers s ON b.supplier_id = s.id
LEFT JOIN invoices i ON b.invoice_id = i.id

UNION ALL

-- =====================================================================
-- WAREHOUSE BATCHES
-- =====================================================================
SELECT 
  wb.id as batch_id,
  wb.product_id,
  NULL as farm_id,  -- Warehouse batches are client-wide, not farm-specific
  wb.client_id,
  p.name as product_name,
  p.registration_code,
  p.primary_pack_unit,
  wb.lot as batch_number,
  wb.expiry_date,
  wb.doc_date as received_date,
  wb.received_qty as quantity_received,
  wb.qty_left as quantity_left,
  wb.purchase_price,
  wb.purchase_price as purchase_price_with_vat, -- No VAT column, using same value
  COALESCE(s.name, '') as supplier,
  COALESCE(wb.doc_number, i.invoice_number) as document_number,
  'warehouse' as source,
  -- Calculate usage from warehouse_batch_id columns
  COALESCE(
    (SELECT SUM(quantity) FROM usage_items WHERE warehouse_batch_id = wb.id),
    0
  ) +
  COALESCE(
    (SELECT SUM(quantity_used) FROM biocide_usage WHERE warehouse_batch_id = wb.id),
    0
  ) +
  COALESCE(
    (SELECT SUM(dose_amount) FROM vaccinations WHERE warehouse_batch_id = wb.id),
    0
  ) as quantity_used
FROM warehouse_batches wb
JOIN products p ON wb.product_id = p.id
LEFT JOIN suppliers s ON wb.supplier_id = s.id
LEFT JOIN invoices i ON wb.invoice_id = i.id;

-- Add comment
COMMENT ON VIEW vw_vet_drug_journal_complete IS 'Comprehensive view of both farm and warehouse batches with usage calculations for journal reports';

-- =====================================================================
-- GRANT PERMISSIONS
-- =====================================================================
-- Grant access to authenticated users
GRANT SELECT ON vw_vet_drug_journal_complete TO authenticated;

-- =====================================================================
-- MIGRATION COMPLETE
-- =====================================================================
