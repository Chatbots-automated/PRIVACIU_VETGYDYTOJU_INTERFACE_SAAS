/**
 * VAT (PVM) Helper Functions
 * Utilities for determining VAT registration status and calculating VAT rates
 */

export interface ClientVatInfo {
  vat_code?: string | null;
  vat_rate?: number | null;
  vat_registered?: boolean | null;
}

/**
 * Check if a client is VAT registered
 * A client is considered VAT registered if they have a non-empty vat_code
 * @param client - Client object with vat_code field
 * @returns true if client is VAT registered
 */
export function isClientVatRegistered(client: ClientVatInfo | null | undefined): boolean {
  if (!client) return false;
  return !!(client.vat_code && client.vat_code.trim());
}

/**
 * Get the default VAT rate for Lithuania
 * @returns Standard Lithuanian PVM rate (21%)
 */
export function getDefaultVatRate(): number {
  return 21.00;
}

/**
 * Get the VAT rate for a specific client
 * Falls back to default if not specified
 * @param client - Client object with vat_rate field
 * @returns VAT rate as a percentage (e.g., 21.00 for 21%)
 */
export function getClientVatRate(client: ClientVatInfo | null | undefined): number {
  if (!client || !client.vat_rate) {
    return getDefaultVatRate();
  }
  return client.vat_rate;
}

/**
 * Calculate gross price from net price
 * @param netPrice - Price without VAT
 * @param vatRate - VAT rate as percentage (e.g., 21 for 21%)
 * @returns Price with VAT included
 */
export function calculateGrossFromNet(netPrice: number, vatRate: number): number {
  return netPrice * (1 + vatRate / 100);
}

/**
 * Calculate net price from gross price
 * @param grossPrice - Price with VAT
 * @param vatRate - VAT rate as percentage (e.g., 21 for 21%)
 * @returns Price without VAT
 */
export function calculateNetFromGross(grossPrice: number, vatRate: number): number {
  return grossPrice / (1 + vatRate / 100);
}

/**
 * Calculate VAT amount from net price
 * @param netPrice - Price without VAT
 * @param vatRate - VAT rate as percentage (e.g., 21 for 21%)
 * @returns VAT amount
 */
export function calculateVatAmount(netPrice: number, vatRate: number): number {
  return netPrice * (vatRate / 100);
}

/**
 * Format VAT rate for display
 * @param vatRate - VAT rate as number (e.g., 21.00)
 * @returns Formatted string (e.g., "21%")
 */
export function formatVatRate(vatRate: number): string {
  return `${vatRate.toFixed(0)}%`;
}
