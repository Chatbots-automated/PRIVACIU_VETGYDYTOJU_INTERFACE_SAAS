import { supabase } from './supabase';
import { Animal } from './types';

/**
 * Format animal display with tag number only
 * The collar number is displayed separately in the "Kaklo Nr." field
 */
export function formatAnimalDisplay(animal: Animal | null | undefined): string {
  if (!animal) return '-';
  return animal.tag_no || '-';
}

/**
 * Compare strings using Lithuanian locale for alphabetical sorting
 */
export function compareLithuanian(a: string, b: string): number {
  return a.localeCompare(b, 'lt');
}

/**
 * Sort array of objects by a string property using Lithuanian alphabet
 */
export function sortByLithuanian<T>(array: T[], property: keyof T): T[] {
  return [...array].sort((a, b) => {
    const aVal = String(a[property] || '');
    const bVal = String(b[property] || '');
    return compareLithuanian(aVal, bVal);
  });
}

/**
 * Format date for Lithuanian date input (yyyy-MM-dd)
 */
export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Translate product category from English to Lithuanian
 */
export function translateCategory(category: string | undefined): string {
  const translations: Record<string, string> = {
    'medicines': 'Vaistai',
    'prevention': 'Prevencija',
    'vakcina': 'Vakcina',
    'bolusas': 'Bolusas',
    'svirkstukai': 'Švirkštukai',
    'hygiene': 'Higiena',
    'biocide': 'Biocidas',
    'technical': 'Techniniai',
    'treatment_materials': 'Gydymo medžiagos',
    'reproduction': 'Reprodukcija',
  };

  return translations[category || ''] || category || '';
}

/**
 * Fetch all rows from a Supabase table, bypassing the 1000 row limit
 * by using pagination under the hood
 */
export async function fetchAllRows<T>(
  table: string,
  select: string = '*',
  orderBy?: string | string[],
  filters?: { column: string; value: any; operator?: string }[]
): Promise<T[]> {
  let allRows: T[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);

    // Apply filters
    if (filters) {
      filters.forEach(filter => {
        const operator = filter.operator || 'eq';
        query = (query as any)[operator](filter.column, filter.value);
      });
    }

    // Apply ordering (support single or multiple columns)
    if (orderBy) {
      if (Array.isArray(orderBy)) {
        orderBy.forEach(col => {
          query = query.order(col);
        });
      } else {
        query = query.order(orderBy);
      }
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data && data.length > 0) {
      allRows = [...allRows, ...data as T[]];
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

/**
 * Normalize number input by replacing comma with decimal point
 * This allows users to enter numbers using comma (European style)
 */
export function normalizeNumberInput(value: string): string {
  return value.replace(',', '.');
}

/**
 * Parse a number from user input, handling both comma and decimal
 */
export function parseNumberInput(value: string): number {
  const normalized = normalizeNumberInput(value);
  return parseFloat(normalized);
}

// GEA-related functions removed - no longer needed

const REGISTRATION_LOOKBACK_MONTHS = 2;

function subtractCalendarMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  d.setMonth(d.getMonth() - months);
  return d;
}

function toLocalYYYYMMDD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Local date (YYYY-MM-DD): earliest calendar day allowed for registrations (today minus months). */
export function getRegistrationDateMinYYYYMMDD(reference = new Date()): string {
  return toLocalYYYYMMDD(subtractCalendarMonths(reference, REGISTRATION_LOOKBACK_MONTHS));
}

/** Local datetime-local value (YYYY-MM-DDTHH:mm): cutoff for visit registration timestamps. */
export function getRegistrationDatetimeCutoffLocal(reference = new Date()): string {
  const d = subtractCalendarMonths(reference, REGISTRATION_LOOKBACK_MONTHS);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

/**
 * Earliest selectable datetime-local for a visit: 2‑month cutoff, unless editing an older saved visit (grandfathered).
 */
export function getVisitDatetimeInputMin(existingVisitDatetimeIso?: string | null, reference = new Date()): string {
  const cutoff = getRegistrationDatetimeCutoffLocal(reference);
  if (!existingVisitDatetimeIso) return cutoff;
  const slice = existingVisitDatetimeIso.slice(0, 16);
  return slice < cutoff ? slice : cutoff;
}

/** Validates registration date-only field (YYYY-MM-DD). Returns Lithuanian error or null if OK. */
export function validateRegistrationDateNotTooOld(dateOnly: string, reference = new Date()): string | null {
  if (!dateOnly) return null;
  const min = getRegistrationDateMinYYYYMMDD(reference);
  if (dateOnly < min) {
    return 'Registracijos data negali būti senesnė nei 2 mėnesiai nuo šios dienos.';
  }
  return null;
}

/**
 * Validates `datetime-local` string for visit registration. Honors grandfathered edits when `existingVisitDatetimeIso` is set.
 */
export function validateVisitDatetimeNotTooOld(
  localDatetime: string,
  existingVisitDatetimeIso?: string | null,
  reference = new Date(),
): string | null {
  if (!localDatetime) return null;
  const trimmed = localDatetime.slice(0, 16);
  const chosen = new Date(trimmed);
  if (Number.isNaN(chosen.getTime())) {
    return 'Neteisinga data.';
  }
  const floorSlice = getVisitDatetimeInputMin(existingVisitDatetimeIso, reference);
  const floor = new Date(floorSlice);
  if (Number.isNaN(floor.getTime())) return null;
  if (chosen.getTime() < floor.getTime()) {
    return 'Registracijos data negali būti senesnė nei 2 mėnesiai nuo šios dienos.';
  }
  return null;
}
