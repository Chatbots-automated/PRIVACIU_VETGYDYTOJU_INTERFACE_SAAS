# Fix Login Issue (409 Error)

## Problem

Getting a 409 error and "Invalid email or password" when trying to log in, even though the credentials are correct.

## Root Cause

The `verify_password()` database function is returning the wrong number of columns. The app expects 4 columns (including `user_farm_id`), but the function only returns 3.

## Solution

Apply the SQL fix to update the `verify_password` function.

---

## Quick Fix (2 minutes)

### Step 1: Fix the Auth Function

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/oxzfztimfabzzqjmsihl/sql/new
   ```

2. Copy the file: **`fix-auth-function.sql`**

3. Paste into SQL Editor and click **"Run"**

4. You should see: "Success. No rows returned"

### Step 2: Try Logging In

Use either of these credentials:

**User 1:**
- Email: `gratasgedraitis@gmail.com`
- Password: `123456`

**User 2:**
- Email: `daumantas.jatautas@rvac.lt`
- Password: `Daumantas123-`

Both users are **admin** role with full access.

---

## What the Fix Does

Updates the `verify_password()` function to return 4 columns:
1. `user_id` (uuid)
2. `user_email` (text)
3. `user_role` (text)
4. `user_farm_id` (uuid) ← **This was missing!**

The function also checks that the user is not frozen (`is_frozen = false`).

---

## Verification

After applying the fix, you can verify it worked by running this in SQL Editor:

```sql
-- Test the function
SELECT * FROM verify_password('gratasgedraitis@gmail.com', '123456');
```

You should see one row with 4 columns:
- user_id: (some uuid)
- user_email: gratasgedraitis@gmail.com
- user_role: admin
- user_farm_id: (farm uuid)

---

## If You Still Can't Log In

### Check 1: Users Exist
```sql
SELECT email, role, full_name, is_frozen FROM users;
```

If no users, run: **`add-users.sql`**

### Check 2: Farm Exists
```sql
SELECT id, name, code FROM farms;
```

If no farms, the `add-users.sql` script will create one.

### Check 3: Function Returns Correct Columns
```sql
SELECT * FROM verify_password('your@email.com', 'yourpassword');
```

Should return 4 columns. If not, run `fix-auth-function.sql` again.

### Check 4: Clear Browser Cache
- Clear localStorage
- Hard refresh (Ctrl+Shift+R)
- Try incognito mode

---

## Summary

1. **Run**: `fix-auth-function.sql` in Supabase SQL Editor
2. **Login with**: `gratasgedraitis@gmail.com` / `123456`
3. **Done!**

The 409 error should be gone and login should work!
