# Restore Users After Database Truncation

## Problem

After truncating the database, all users were deleted and nobody can log in!

## Solution

Run the SQL script to recreate the users.

## Steps

### Option 1: Quick Fix (Recommended)

1. Open Supabase SQL Editor:
   ```
   https://supabase.com/dashboard/project/oxzfztimfabzzqjmsihl/sql/new
   ```

2. Copy the file: `add-users.sql`

3. Paste all contents into SQL Editor

4. Click "Run"

5. You should see output showing:
   - Farm created/found
   - User 1 created: gratasgedraitis@gmail.com
   - User 2 created: daumantas.jatautas@rvac.lt

6. Try logging in!

### What the Script Does

1. **Checks for existing farms**
   - Looks for RVAC farm
   - Creates one if it doesn't exist

2. **Creates 2 users:**
   - **gratasgedraitis@gmail.com**
     - Password: `123456`
     - Role: admin
     - Full name: Gratas Gedraitis

   - **daumantas.jatautas@rvac.lt**
     - Password: `Daumantas123-`
     - Role: admin
     - Full name: Daumantas Jatautas

3. **Verifies creation**
   - Shows the created users with their details

## After Running

You should be able to log in with either:
- Email: `gratasgedraitis@gmail.com` / Password: `123456`
- Email: `daumantas.jatautas@rvac.lt` / Password: `Daumantas123-`

## Notes

- Both users are created as **admin** role
- Both users are assigned to the RVAC farm
- Passwords are securely hashed using bcrypt
- Users are NOT frozen (can log in immediately)

## If You Need More Users

To add more users, modify the SQL script and add additional INSERT statements:

```sql
INSERT INTO public.users (
  email, 
  password_hash, 
  role, 
  farm_id, 
  full_name, 
  is_frozen
)
VALUES (
  'email@example.com',
  crypt('password', gen_salt('bf')),
  'admin',  -- or 'vet', 'tech', 'viewer'
  rvac_farm_id,
  'Full Name',
  false
);
```

## Troubleshooting

### "Farm not found" error
- The script will automatically create an RVAC farm
- If you need a specific farm, check the farms table first

### Still can't log in
- Verify users were created: `SELECT * FROM users;`
- Check password is correct (case-sensitive!)
- Clear browser cache and try again
- Check browser console for errors

### Need to reset password
Use the `change_user_password()` function:
```sql
SELECT change_user_password('user-id-here', 'newpassword');
```
