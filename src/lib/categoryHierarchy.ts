/**
 * Product Category Hierarchy
 *
 * Defines the hierarchical structure of product categories and subcategories
 */

export interface CategoryHierarchy {
  [key: string]: {
    subcategories: string[];
    nestedSubcategories?: {
      [key: string]: string[];
    };
  };
}

export const CATEGORY_HIERARCHY: CategoryHierarchy = {
  medicines: {
    subcategories: ['Gydomieji preparatai', 'Gydymo medziagos', 'Vakcinos'],
    nestedSubcategories: {
      'Gydomieji preparatai': [
        'Antimikrobines medziagos',
        'Gydomieji papildai',
        'Hormoniniai preparatai',
        'Kiti medikamentai',
      ],
      'Gydymo medziagos': [
        'Antimikrobines medziagos',
        'Gydomieji papildai',
        'Hormoniniai preparatai',
        'Kiti medikamentai',
      ],
    },
  },
  reproduction: {
    subcategories: ['Buliai', 'Seklinimo priemones'],
  },
  hygiene: {
    subcategories: ['Biocidai', 'Kitos priemones'],
  },
  supplier_costs: {
    subcategories: [], // No subcategories - simple cost entries
  },
};

/**
 * Get subcategories for a given category
 */
export function getSubcategories(category: string): string[] {
  return CATEGORY_HIERARCHY[category]?.subcategories || [];
}

/**
 * Get nested subcategories for a given category and subcategory
 */
export function getNestedSubcategories(category: string, subcategory: string): string[] {
  return CATEGORY_HIERARCHY[category]?.nestedSubcategories?.[subcategory] || [];
}

/**
 * Check if a category has subcategories
 */
export function hasSubcategories(category: string): boolean {
  return !!CATEGORY_HIERARCHY[category]?.subcategories?.length;
}

/**
 * Check if a subcategory has nested subcategories
 */
export function hasNestedSubcategories(category: string, subcategory: string): boolean {
  return !!CATEGORY_HIERARCHY[category]?.nestedSubcategories?.[subcategory]?.length;
}

/**
 * Get all categories that have subcategories
 */
export function getCategoriesWithSubcategories(): string[] {
  return Object.keys(CATEGORY_HIERARCHY);
}
