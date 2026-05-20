-- Add 'Tiekėjo išlaidos' (Supplier Costs) category - Part 2: Views and Functions
-- Run this AFTER part 1 has been committed

-- Create function to calculate proportional supplier costs for a usage item
CREATE OR REPLACE FUNCTION public.calculate_proportional_supplier_cost(
    p_batch_id uuid,
    p_is_warehouse_batch boolean,
    p_product_quantity numeric,
    p_product_unit_cost numeric
) RETURNS numeric
LANGUAGE plpgsql
AS $$
DECLARE
    v_batch_group TEXT;
    v_total_product_value numeric;
    v_total_supplier_cost numeric;
    v_product_value numeric;
    v_proportional_cost numeric;
BEGIN
    -- Get the batch group for this batch
    IF p_is_warehouse_batch THEN
        SELECT linked_batch_group INTO v_batch_group
        FROM public.warehouse_batches
        WHERE id = p_batch_id;
    ELSE
        SELECT linked_batch_group INTO v_batch_group
        FROM public.batches
        WHERE id = p_batch_id;
    END IF;

    -- If no batch group, no supplier costs to allocate
    IF v_batch_group IS NULL THEN
        RETURN 0;
    END IF;

    -- Calculate total value of products in this batch group (excluding supplier_costs)
    IF p_is_warehouse_batch THEN
        SELECT COALESCE(SUM(
            wb.received_qty * 
            COALESCE(wb.purchase_price_net, wb.purchase_price_gross, wb.purchase_price, 0)
        ), 0) INTO v_total_product_value
        FROM public.warehouse_batches wb
        JOIN public.products p ON wb.product_id = p.id
        WHERE wb.linked_batch_group = v_batch_group
          AND p.category != 'supplier_costs';
    ELSE
        SELECT COALESCE(SUM(
            b.qty_received * 
            COALESCE(b.purchase_price_net, b.purchase_price_gross, b.purchase_price, 0)
        ), 0) INTO v_total_product_value
        FROM public.batches b
        JOIN public.products p ON b.product_id = p.id
        WHERE b.linked_batch_group = v_batch_group
          AND p.category != 'supplier_costs';
    END IF;

    -- Calculate total supplier costs in this batch group
    IF p_is_warehouse_batch THEN
        SELECT COALESCE(SUM(
            wb.received_qty * 
            COALESCE(wb.purchase_price_net, wb.purchase_price_gross, wb.purchase_price, 0)
        ), 0) INTO v_total_supplier_cost
        FROM public.warehouse_batches wb
        JOIN public.products p ON wb.product_id = p.id
        WHERE wb.linked_batch_group = v_batch_group
          AND p.category = 'supplier_costs';
    ELSE
        SELECT COALESCE(SUM(
            b.qty_received * 
            COALESCE(b.purchase_price_net, b.purchase_price_gross, b.purchase_price, 0)
        ), 0) INTO v_total_supplier_cost
        FROM public.batches b
        JOIN public.products p ON b.product_id = p.id
        WHERE b.linked_batch_group = v_batch_group
          AND p.category = 'supplier_costs';
    END IF;

    -- If no products or no supplier costs, return 0
    IF v_total_product_value = 0 OR v_total_supplier_cost = 0 THEN
        RETURN 0;
    END IF;

    -- Calculate this product's value
    v_product_value := p_product_quantity * p_product_unit_cost;

    -- Calculate proportional supplier cost: (product_value / total_product_value) * total_supplier_cost
    v_proportional_cost := (v_product_value / v_total_product_value) * v_total_supplier_cost;

    RETURN COALESCE(v_proportional_cost, 0);
END;
$$;

COMMENT ON FUNCTION public.calculate_proportional_supplier_cost IS 'Calculates proportional supplier costs (transport, etc.) for a product based on its value relative to total invoice value';

-- Update warehouse stock view to EXCLUDE supplier_costs category
DROP VIEW IF EXISTS public.vw_warehouse_stock_available CASCADE;

CREATE VIEW public.vw_warehouse_stock_available AS
SELECT 
    wb.id,
    wb.client_id,
    wb.product_id,
    p.name as product_name,
    p.category,
    p.primary_pack_unit as unit,
    wb.lot,
    wb.expiry_date,
    wb.mfg_date,
    wb.received_qty,
    wb.qty_left,
    wb.qty_allocated,
    wb.status,
    wb.supplier_id,
    s.name as supplier_name,
    wb.doc_number,
    wb.purchase_price,
    wb.purchase_price_net,
    wb.purchase_price_gross,
    wb.created_at
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE wb.qty_left > 0 
  AND p.category != 'supplier_costs'
  AND wb.status = 'active';

-- Update warehouse inventory view to EXCLUDE supplier_costs
DROP VIEW IF EXISTS public.vw_warehouse_inventory CASCADE;

CREATE VIEW public.vw_warehouse_inventory AS
SELECT 
    wb.id as warehouse_batch_id,
    wb.client_id,
    wb.product_id,
    p.name as product_name,
    p.category,
    p.primary_pack_unit as unit,
    wb.lot,
    wb.expiry_date,
    wb.mfg_date,
    wb.received_qty,
    wb.qty_left,
    wb.qty_allocated,
    wb.status,
    wb.supplier_id,
    s.name as supplier_name,
    wb.doc_number,
    wb.purchase_price,
    wb.purchase_price_net,
    wb.purchase_price_gross,
    wb.created_at,
    COUNT(*) OVER (PARTITION BY wb.product_id, wb.client_id) as batch_count
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE p.category != 'supplier_costs'
ORDER BY p.name, wb.expiry_date NULLS LAST;

COMMENT ON VIEW public.vw_warehouse_inventory IS 'Warehouse inventory excluding supplier costs (which are proportionally allocated)';

-- Add helper view to see supplier costs per batch group
CREATE OR REPLACE VIEW public.vw_supplier_costs_by_group AS
SELECT 
    wb.linked_batch_group,
    wb.client_id,
    SUM(wb.received_qty * COALESCE(wb.purchase_price_net, wb.purchase_price_gross, wb.purchase_price, 0)) as total_supplier_costs,
    json_agg(json_build_object(
        'product_name', p.name,
        'amount', wb.received_qty * COALESCE(wb.purchase_price_net, wb.purchase_price_gross, wb.purchase_price, 0),
        'doc_number', wb.doc_number,
        'supplier', s.name
    )) as cost_details
FROM public.warehouse_batches wb
JOIN public.products p ON wb.product_id = p.id
LEFT JOIN public.suppliers s ON wb.supplier_id = s.id
WHERE p.category = 'supplier_costs'
  AND wb.linked_batch_group IS NOT NULL
GROUP BY wb.linked_batch_group, wb.client_id;

COMMENT ON VIEW public.vw_supplier_costs_by_group IS 'Summary of supplier costs (transport, handling) grouped by invoice/delivery batch';
