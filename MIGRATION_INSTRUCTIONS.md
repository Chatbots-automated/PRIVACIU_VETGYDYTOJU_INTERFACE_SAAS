# Apply VIC Data Migration to Supabase

## Migration File Created
- **File**: `supabase/migrations_saas/20260518000001_add_vic_data_to_farms.sql`
- **Purpose**: Add columns to store VIC lookup data in the farms table

## What the Migration Does

Adds the following columns to the `farms` table:
- `vic_data` (JSONB) - Complete VIC response payload
- `vic_personal_code` (TEXT) - Personal or company code from VIC
- `vic_vet_license` (TEXT) - Veterinary license number
- `vic_is_vet_doctor` (BOOLEAN) - Is registered vet doctor
- `vic_is_marker` (BOOLEAN) - Is registered marker
- `vic_holdings_count` (INTEGER) - Number of holdings in VIC
- `vic_last_synced_at` (TIMESTAMPTZ) - Last sync timestamp

## How to Apply the Migration

### Option 1: Using Supabase CLI (Recommended for Remote DB)

```bash
# Navigate to project directory
cd c:\Projects\PRIVACIU_VETGYDYTOJU_INTERFACE_SAAS

# Apply the specific migration to remote database
supabase db push --include-all
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations_saas/20260518000001_add_vic_data_to_farms.sql`
4. Paste and run the SQL in the editor

### Option 3: Using Local Development

```bash
# If running local Supabase
supabase db reset --local
```

## Verification

After applying the migration, verify it worked:

```sql
-- Check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'farms' 
AND column_name LIKE 'vic_%';

-- Should return all 7 new columns
```

## What Data Gets Stored

When a user completes registration and loads VIC data, the system will store:

```json
{
  "vic_data": {
    "ok": true,
    "jobType": "holder_lookup",
    "data": {
      "basic": {
        "personalOrCompanyCode": "38210260551",
        "firstName": "ARTŪRAS",
        "lastNameOrCompanyName": "ABROMAITIS"
      },
      "contact": {
        "email": "veterinaras@inbox.lt",
        "mobilePhone": "+37067703446"
      },
      "address": { ... },
      "holdings": [ ... ],
      "additional": {
        "isVetDoctor": true,
        "vetLicenseNumber": "vp1369"
      }
    }
  },
  "vic_personal_code": "38210260551",
  "vic_vet_license": "vp1369",
  "vic_is_vet_doctor": true,
  "vic_is_marker": true,
  "vic_holdings_count": 0,
  "vic_last_synced_at": "2026-05-18T19:00:00Z"
}
```

This data will be used for:
1. Auto-populating registration forms
2. Verifying veterinary credentials
3. Tracking VIC synchronization status
4. Future features requiring VIC data
