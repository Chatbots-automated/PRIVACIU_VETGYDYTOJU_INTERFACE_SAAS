# 🔴 ACTION REQUIRED: Apply User Tracking Migration

## Problem
The "14. Veterinarijos gydytojas" field in reports shows "Nenurodyta" instead of the actual user's name.

## Solution
Apply the migration file: `supabase/migrations/20260312000005_add_user_tracking.sql`

---

## 📋 Step-by-Step Instructions

### Step 1: Open Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy the Migration SQL

1. Open the file: `supabase/migrations/20260312000005_add_user_tracking.sql`
2. Select all content (`Ctrl+A`)
3. Copy (`Ctrl+C`)

### Step 3: Run the Migration

1. Paste the SQL into the Supabase SQL Editor (`Ctrl+V`)
2. Click **Run** or press `Ctrl+Enter`
3. Wait for "Success. No rows returned" message

### Step 4: Verify the Migration

Run this verification query in the SQL Editor:

```sql
-- Check if columns were added
SELECT 
  table_name, 
  column_name,
  data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND column_name = 'created_by_user_id'
ORDER BY table_name;
```

**Expected result:** You should see 3 rows:
- `animal_visits` | `created_by_user_id` | `uuid`
- `treatments` | `created_by_user_id` | `uuid`
- `vaccinations` | `created_by_user_id` | `uuid`

### Step 5: Test the Fix

1. **Hard refresh your app** (`Ctrl+Shift+R` or `Ctrl+F5`)
2. Go to **Gyvūnai** → Click on any animal
3. Click **Vizitai** tab → **Naujas vizitas**
4. Select **Gydymas** procedure
5. Fill in treatment details and save
6. Go to **Ataskaitos** tab
7. Select **Gydomų gyvūnų registracijos žurnalas**
8. Check column **14. Veterinarijos gydytojas**

**✅ Expected:** You should see your user's full name (e.g., "ADMIN", "John Doe", etc.)

---

## ⚠️ Important Notes

### This Only Affects NEW Treatments
- ✅ **New treatments** (created after migration): Will show user's name
- ❌ **Old treatments** (created before migration): Will still show "Nenurodyta"

This is expected behavior. The migration cannot retroactively add user information to treatments that were created before the `created_by_user_id` column existed.

### Works for All User Roles
This fix works for **all user roles**:
- ✅ Admin
- ✅ Vet
- ✅ Tech
- ✅ Viewer
- ✅ Custom roles

Whoever is logged in when creating the treatment will have their name displayed.

---

## 🐛 Troubleshooting

### Still showing "Nenurodyta"?

**1. Did you hard refresh the browser?**
- Press `Ctrl+Shift+R` or `Ctrl+F5`
- Or clear browser cache

**2. Are you testing with a NEW treatment?**
- Create a brand new treatment after applying the migration
- Old treatments will still show "Nenurodyta"

**3. Does the user have a full_name set?**
Run this query to check:
```sql
SELECT id, email, full_name FROM users;
```
If `full_name` is NULL or empty, update it:
```sql
UPDATE users 
SET full_name = 'User Name' 
WHERE email = 'user@example.com';
```

**4. Was the migration applied successfully?**
Run the verification query from Step 4 above to confirm the columns exist.

---

## 📚 Additional Documentation

- **Migration Details:** See `supabase/migrations/README.md`
- **Full Guide:** See `FIX_VETERINARIJOS_GYDYTOJAS_FIELD.md`
- **Schema Info:** See `BASELINE_SCHEMA_SUMMARY.md`

---

## ✅ Done!

After completing these steps, the "Veterinarijos gydytojas" field should display the logged-in user's name for all new treatments.
