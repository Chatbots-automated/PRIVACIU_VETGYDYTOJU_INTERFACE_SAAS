# Fix: Veterinarijos Gydytojas Field Shows "Nenurodyta"

## Problem
The "14. Veterinarijos gydytojas" field in the GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS report was showing "Nenurodyta" (not specified) instead of the actual user's name who created the treatment.

## Root Cause
The `created_by_user_id` column was missing from the `animal_visits`, `treatments`, and `vaccinations` tables in your **remote database**. The migration file exists locally but hasn't been applied to your Supabase database yet.

## Solution

### Step 1: Apply the Database Migration

1. Open your **Supabase Dashboard** (https://supabase.com/dashboard)
2. Go to your project
3. Click on **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of the file `supabase/migrations/20260312000005_add_user_tracking.sql`
6. Paste it into the SQL editor
7. Click **Run** or press `Ctrl+Enter`

### Step 2: Verify the Migration

After running the SQL, verify that the columns were added:

```sql
-- Run this to check if columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'animal_visits' 
  AND column_name = 'created_by_user_id';

SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'treatments' 
  AND column_name = 'created_by_user_id';
```

You should see results showing the `created_by_user_id` column exists.

### Step 3: Test the Fix

1. **Refresh your application** (hard refresh: `Ctrl+Shift+R` or `Ctrl+F5`)
2. Go to **Gyvūnai** → Click on an animal
3. Click **Vizitai** tab
4. Click **Naujas vizitas**
5. Select **Gydymas** procedure
6. Choose **Vienkartinis gydymas** (or **Kurso planavimas**)
7. Fill in the treatment details and save
8. Go to **Ataskaitos** tab
9. Select **Gydomų gyvūnų registracijos žurnalas**
10. Check the **14. Veterinarijos gydytojas** column

**Expected Result:** You should now see the full name of the user who created the treatment (e.g., "ADMIN" or whatever the user's `full_name` is in the database).

## What Was Changed

### Frontend Changes (Already Applied)
- `src/components/AnimalDetailSidebar.tsx`:
  - Added `user` from `useAuth()` hook
  - Added `created_by_user_id: user?.id || null` to all `animal_visits` inserts (4 locations)

### Database Changes (Need to Apply via SQL Editor)
1. **Added columns:**
   - `animal_visits.created_by_user_id`
   - `treatments.created_by_user_id`
   - `vaccinations.created_by_user_id`

2. **Updated view:**
   - `vw_treated_animals_detailed` now joins with `users` table and uses `COALESCE(u.full_name, t.vet_name, 'Nenurodyta')`

3. **Updated function:**
   - `process_visit_medications()` now copies `created_by_user_id` from visit to treatment

## How It Works

1. When you create a visit, the app now saves `created_by_user_id` (the logged-in user's ID)
2. When the visit is completed, the `process_visit_medications()` trigger function automatically creates a treatment and copies the `created_by_user_id` from the visit
3. The report view (`vw_treated_animals_detailed`) joins with the `users` table to get the user's `full_name`
4. The report displays the user's name in the "Veterinarijos gydytojas" column

## Works for All Roles
This solution works for **all user roles**:
- Admin
- Vet
- Tech
- Viewer
- Custom roles

Whoever is logged in when creating the treatment will have their name displayed in the report.

## Troubleshooting

### Still showing "Nenurodyta"?
1. Make sure you ran the SQL migration in Supabase SQL Editor
2. Hard refresh your browser (`Ctrl+Shift+R`)
3. Create a **new** treatment (old treatments won't have the user info)
4. Check that the user has a `full_name` set in the database:
   ```sql
   SELECT id, email, full_name FROM users;
   ```

### Old treatments still show "Nenurodyta"
This is expected. Only **new treatments** created after applying the migration will show the user's name. Old treatments will continue to show "Nenurodyta" or the old `vet_name` text field value.
