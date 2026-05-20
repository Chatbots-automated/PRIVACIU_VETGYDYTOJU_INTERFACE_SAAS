import { Batch, ProductUnitCost } from './types';
import { isClientVatRegistered, ClientVatInfo } from './vatHelpers';

/**
 * Extended batch interface with VAT-aware pricing fields
 */
export interface VatAwareBatch extends Batch {
  purchase_price_net?: number | null;
  purchase_price_gross?: number | null;
  client_has_vat_code?: boolean;
}

/**
 * Calculate the unit cost from a batch (LEGACY - use calculateVatAwareUnitCost instead)
 * Unit cost = purchase_price / received_qty
 * @deprecated Use calculateVatAwareUnitCost for VAT-aware calculations
 */
export function calculateUnitCostFromBatch(batch: Batch): number {
  if (!batch.purchase_price || !batch.received_qty || batch.received_qty === 0) {
    return 0;
  }

  return batch.purchase_price / batch.received_qty;
}

/**
 * Calculate VAT-aware unit cost from a batch
 * Uses NET price for VAT-registered clients, GROSS price for non-VAT clients
 * @param batch - Batch with net/gross pricing
 * @param clientVatInfo - Client VAT registration info (or boolean flag)
 * @returns Unit cost based on client's VAT status
 */
export function calculateVatAwareUnitCost(
  batch: VatAwareBatch,
  clientVatInfo: ClientVatInfo | boolean
): number {
  // Determine if client is VAT registered
  const isVatRegistered = typeof clientVatInfo === 'boolean' 
    ? clientVatInfo 
    : isClientVatRegistered(clientVatInfo);

  // Get the appropriate price based on VAT registration
  const priceToUse = isVatRegistered
    ? (batch.purchase_price_net || batch.purchase_price || 0)
    : (batch.purchase_price_gross || batch.purchase_price || 0);

  // Handle both qty_received and received_qty field names
  const qtyReceived = batch.received_qty || (batch as any).qty_received || 0;

  if (qtyReceived === 0) {
    return 0;
  }

  return priceToUse / qtyReceived;
}

/**
 * Calculate the total cost for a quantity of product from a batch
 * @deprecated Use calculateVatAwareTotalCost for VAT-aware calculations
 */
export function calculateTotalCost(quantity: number, batch: Batch): number {
  const unitCost = calculateUnitCostFromBatch(batch);
  return quantity * unitCost;
}

/**
 * Calculate VAT-aware total cost for a quantity of product
 * @param quantity - Quantity used
 * @param batch - Batch with net/gross pricing
 * @param clientVatInfo - Client VAT registration info
 * @returns Total cost based on client's VAT status
 */
export function calculateVatAwareTotalCost(
  quantity: number,
  batch: VatAwareBatch,
  clientVatInfo: ClientVatInfo | boolean
): number {
  const unitCost = calculateVatAwareUnitCost(batch, clientVatInfo);
  return quantity * unitCost;
}

/**
 * Format cost as EUR currency
 */
export function formatCost(cost: number): string {
  return `€${cost.toFixed(2)}`;
}

/**
 * Format unit cost with appropriate precision
 * Shows more decimals for small unit costs to avoid confusion
 */
export function formatUnitCost(unitCost: number): string {
  // If cost is very small (< 0.01), show 4 decimals
  if (unitCost < 0.01 && unitCost > 0) {
    return `€${unitCost.toFixed(4)}`;
  }
  // If cost is small (< 0.10), show 3 decimals
  if (unitCost < 0.10) {
    return `€${unitCost.toFixed(3)}`;
  }
  // Otherwise show 2 decimals
  return `€${unitCost.toFixed(2)}`;
}

/**
 * Calculate unit cost with fallback for missing data (LEGACY)
 * @deprecated Use calculateVatAwareSafeUnitCost for VAT-aware calculations
 */
export function calculateSafeUnitCost(
  purchasePrice: number | null,
  receivedQty: number | null
): number {
  if (!purchasePrice || !receivedQty || receivedQty === 0) {
    return 0;
  }

  return purchasePrice / receivedQty;
}

/**
 * Calculate VAT-aware unit cost with safe fallbacks for missing data
 * @param purchasePriceNet - Net price (excluding VAT)
 * @param purchasePriceGross - Gross price (including VAT)
 * @param receivedQty - Quantity received
 * @param clientVatInfo - Client VAT registration info
 * @returns Unit cost based on client's VAT status
 */
export function calculateVatAwareSafeUnitCost(
  purchasePriceNet: number | null | undefined,
  purchasePriceGross: number | null | undefined,
  receivedQty: number | null | undefined,
  clientVatInfo: ClientVatInfo | boolean
): number {
  if (!receivedQty || receivedQty === 0) {
    return 0;
  }

  // Determine if client is VAT registered
  const isVatRegistered = typeof clientVatInfo === 'boolean'
    ? clientVatInfo
    : isClientVatRegistered(clientVatInfo);

  // Get the appropriate price based on VAT registration
  const priceToUse = isVatRegistered
    ? (purchasePriceNet || 0)
    : (purchasePriceGross || 0);

  if (!priceToUse) {
    return 0;
  }

  return priceToUse / receivedQty;
}

/**
 * Configuration for treatment costs
 */
export const TREATMENT_COST_CONFIG = {
  VISIT_BASE_COST: 10, // EUR per visit
  MASTITIS_GROUP_NUMBER: 5, // Group number for mastitis tracking
  SHOW_ZERO_COSTS: false, // Whether to show items with zero cost
};

/**
 * Calculate total costs from different components
 */
export function calculateTotalTreatmentCost(
  visitCount: number,
  medicationCost: number,
  vaccinationCost: number = 0,
  materialCost: number = 0
): number {
  const visitCost = visitCount * TREATMENT_COST_CONFIG.VISIT_BASE_COST;
  return visitCost + medicationCost + vaccinationCost + materialCost;
}
