/**
 * Helper functions for client_id (multi-tenant SaaS)
 * Use these in all database operations to ensure proper data isolation
 */

import type { User } from '../contexts/AuthContext';

/**
 * Gets client_id from user object
 * Throws error if user is not logged in or doesn't have client_id
 */
export function requireClientId(user: User | null): string {
  if (!user) {
    throw new Error('User not logged in');
  }
  if (!user.client_id) {
    throw new Error('User does not have a client_id');
  }
  return user.client_id;
}

/**
 * Gets client_id from user object (returns null if not available)
 */
export function getClientId(user: User | null): string | null {
  return user?.client_id || null;
}

/**
 * Checks if user can access all farms in their client
 */
export function canAccessAllFarms(user: User | null): boolean {
  return user?.can_access_all_farms || false;
}

/**
 * Gets user's default farm ID
 */
export function getDefaultFarmId(user: User | null): string | null {
  return user?.default_farm_id || null;
}
