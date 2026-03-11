/**
 * Helper to ensure farm_id is available for database operations
 * Throws an error if no farm is selected
 */
export function requireFarmId(selectedFarm: { id: string } | null): string {
  if (!selectedFarm) {
    throw new Error('Pasirinkite ūkį prieš atliekant šią operaciją');
  }
  return selectedFarm.id;
}

/**
 * Helper to get farm_id or null (for optional farm_id fields)
 */
export function getFarmId(selectedFarm: { id: string } | null): string | null {
  return selectedFarm?.id || null;
}
