# Database Cleanup Scripts

## ⚠️ WARNING: These scripts DELETE DATA! ⚠️

These scripts are for **TESTING PURPOSES ONLY**. Do not run in production!

## Available Scripts

### 1. Reset All Data for Testing
**File:** `scripts/MANUAL_reset_data_for_testing.sql`

Deletes all:
- Products
- Invoices
- Treatments
- Visits
- Batches
- Finance records (service prices, invoices, charges)
- Vaccinations, prevention, hoof care, teat status

**Usage (Windows):**
```bash
# Double-click or run from command line
reset_for_testing.bat
```

**Usage (Manual SQL):**
```bash
cd supabase
npx supabase db execute --file scripts/MANUAL_reset_data_for_testing.sql --db-url "postgresql://postgres.vlfjmffbwrmblvlsbsnz:Obelis2018!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

### 2. Merge Duplicate Products
**File:** `20260426000004_merge_duplicate_products.sql`

Merges duplicate products that have the same name in the same farm.

**Usage:**
```bash
cd supabase
npx supabase migration up --db-url "postgresql://postgres.vlfjmffbwrmblvlsbsnz:Obelis2018!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
```

## Testing Workflow

1. Run `reset_for_testing.bat` to clean the database
2. Create fresh products in warehouse
3. Allocate products to farms
4. Verify no duplicates are created
5. Run `20260426000004_merge_duplicate_products.sql` to clean up any remaining duplicates

## Safety Notes

- These scripts require explicit confirmation before running
- They DO NOT delete:
  - Clients
  - Users
  - Farms
  - Animals
  - Suppliers
- They preserve the structure of your database, only removing transactional data
