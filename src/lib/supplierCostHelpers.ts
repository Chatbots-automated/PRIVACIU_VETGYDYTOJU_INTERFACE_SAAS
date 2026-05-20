/**
 * Supplier Costs Calculation Helper
 * 
 * Functions to calculate proportional supplier costs (transport, handling, etc.)
 * that should be allocated to products based on their value.
 */

import { supabase } from './supabase';

export interface BatchWithSupplierCosts {
  batch_id: string;
  is_warehouse_batch: boolean;
  linked_batch_group: string | null;
  proportional_supplier_cost: number;
}

/**
 * Calculate proportional supplier costs for a product usage
 * 
 * @param batchId - The batch ID of the product being used
 * @param isWarehouseBatch - Whether this is a warehouse batch or farm batch
 * @param productQuantity - Quantity of product being used
 * @param productUnitCost - Unit cost of the product (NET or GROSS depending on VAT registration)
 * @param clientId - Client ID for filtering
 * @returns Proportional supplier cost to add to this product's cost
 */
export async function calculateProportionalSupplierCost(
  batchId: string,
  isWarehouseBatch: boolean,
  productQuantity: number,
  productUnitCost: number,
  clientId: string
): Promise<number> {
  try {
    // Get the batch group for this batch
    let batchGroup: string | null = null;
    
    if (isWarehouseBatch) {
      const { data: batch, error } = await supabase
        .from('warehouse_batches')
        .select('linked_batch_group')
        .eq('id', batchId)
        .single();
      
      if (error) throw error;
      batchGroup = batch?.linked_batch_group || null;
    } else {
      const { data: batch, error } = await supabase
        .from('batches')
        .select('linked_batch_group')
        .eq('id', batchId)
        .single();
      
      if (error) throw error;
      batchGroup = batch?.linked_batch_group || null;
    }

    // If no batch group, no supplier costs to allocate
    if (!batchGroup) {
      return 0;
    }

    // Fetch all batches in this group
    const tableName = isWarehouseBatch ? 'warehouse_batches' : 'batches';
    const qtyField = isWarehouseBatch ? 'received_qty' : 'qty_received';
    
    const { data: groupBatches, error: batchesError } = await supabase
      .from(tableName)
      .select(`
        id,
        product_id,
        ${qtyField},
        purchase_price,
        purchase_price_net,
        purchase_price_gross,
        products!inner(id, category)
      `)
      .eq('linked_batch_group', batchGroup)
      .eq('client_id', clientId);

    if (batchesError) throw batchesError;
    if (!groupBatches || groupBatches.length === 0) return 0;

    // Calculate total product value (excluding supplier_costs)
    let totalProductValue = 0;
    let totalSupplierCost = 0;

    for (const batch of groupBatches) {
      const product = (batch as any).products;
      const quantity = (batch as any)[qtyField] || 0;
      const price = (batch as any).purchase_price_net || (batch as any).purchase_price_gross || (batch as any).purchase_price || 0;
      const value = quantity * price;

      if (product.category === 'supplier_costs') {
        totalSupplierCost += value;
      } else {
        totalProductValue += value;
      }
    }

    // If no products or no supplier costs, return 0
    if (totalProductValue === 0 || totalSupplierCost === 0) {
      return 0;
    }

    // Calculate this product's value
    const productValue = productQuantity * productUnitCost;

    // Calculate proportional supplier cost: (product_value / total_product_value) * total_supplier_cost
    const proportionalCost = (productValue / totalProductValue) * totalSupplierCost;

    return proportionalCost;
  } catch (error) {
    console.error('Error calculating proportional supplier cost:', error);
    return 0;
  }
}

/**
 * Get supplier costs breakdown for a batch group
 * Useful for displaying detailed cost information
 * 
 * @param batchGroup - The batch group identifier
 * @param isWarehouseBatch - Whether to look in warehouse_batches or batches
 * @param clientId - Client ID for filtering
 * @returns Array of supplier cost items with details
 */
export async function getSupplierCostsForBatchGroup(
  batchGroup: string,
  isWarehouseBatch: boolean,
  clientId: string
): Promise<Array<{ product_name: string; amount: number; doc_number: string | null }>> {
  try {
    const tableName = isWarehouseBatch ? 'warehouse_batches' : 'batches';
    const qtyField = isWarehouseBatch ? 'received_qty' : 'qty_received';
    
    const { data, error } = await supabase
      .from(tableName)
      .select(`
        ${qtyField},
        purchase_price,
        purchase_price_net,
        purchase_price_gross,
        doc_number,
        products!inner(id, name, category)
      `)
      .eq('linked_batch_group', batchGroup)
      .eq('client_id', clientId);

    if (error) throw error;
    if (!data) return [];

    return data
      .filter((batch: any) => batch.products.category === 'supplier_costs')
      .map((batch: any) => {
        const quantity = batch[qtyField] || 0;
        const price = batch.purchase_price_net || batch.purchase_price_gross || batch.purchase_price || 0;
        return {
          product_name: batch.products.name,
          amount: quantity * price,
          doc_number: batch.doc_number,
        };
      });
  } catch (error) {
    console.error('Error fetching supplier costs for batch group:', error);
    return [];
  }
}
