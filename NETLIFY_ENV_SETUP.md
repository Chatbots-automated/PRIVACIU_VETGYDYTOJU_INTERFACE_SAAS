# How to Set Environment Variables in Netlify

## The Error You're Seeing

```
Uncaught Error: Missing Supabase environment variables
```

This happens because **environment variables must be set in the Netlify Dashboard**, not in code.

## Step-by-Step Fix

### 1. Go to Your Netlify Site

1. Open https://app.netlify.com
2. Click on your deployed site
3. You should see your site dashboard

### 2. Navigate to Environment Variables

1. Click **"Site settings"** (in the top navigation)
2. In the left sidebar, click **"Environment variables"** (under "Build & deploy")
3. You'll see a page titled "Environment variables"

### 3. Add Each Variable

Click the **"Add a variable"** button and add these THREE variables:

#### Variable 1: Supabase URL
- **Key**: `VITE_SUPABASE_URL`
- **Value**: `https://oxzfztimfabzzqjmsihl.supabase.co`
- **Scopes**: All (default)
- Click **"Create variable"**

#### Variable 2: Supabase Anon Key
- **Key**: `VITE_SUPABASE_ANON_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzc0MTIsImV4cCI6MjA4ODgxMzQxMn0._fJnKP48APEekQ80E_QcUhYapZM9C3vsEaoqVax9OC8`
- **Scopes**: All (default)
- Click **"Create variable"**

#### Variable 3: Supabase Service Role Key
- **Key**: `VITE_SUPABASE_SERVICE_ROLE_KEY`
- **Value**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzNzQxMiwiZXhwIjoyMDg4ODEzNDEyfQ.DCTDHl-aPpEajGndU69nvp-ZHeYv5sIVR1gU_XW_Edk`
- **Scopes**: All (default)
- Click **"Create variable"**

### 4. Trigger a New Deploy

**IMPORTANT**: After adding all variables, you MUST deploy again!

1. Go to **"Deploys"** tab (top navigation)
2. Click **"Trigger deploy"** button (top right)
3. Select **"Deploy site"**
4. Wait 2-3 minutes for the build to complete

### 5. Verify It Works

1. Once deploy is complete, click on the site URL
2. The app should load without errors
3. If you still see the error, check the browser console for details

## Common Mistakes

❌ **Setting variables in `netlify.toml`** - This doesn't work! Variables must be in the UI.

❌ **Not redeploying after adding variables** - Old builds don't have new variables.

❌ **Typos in variable names** - Must be exactly: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_SERVICE_ROLE_KEY`

❌ **Missing `VITE_` prefix** - Vite requires this prefix for client-side variables.

## Quick Copy-Paste

For easy copy-pasting, here are all three variables:

```
VITE_SUPABASE_URL
https://oxzfztimfabzzqjmsihl.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzc0MTIsImV4cCI6MjA4ODgxMzQxMn0._fJnKP48APEekQ80E_QcUhYapZM9C3vsEaoqVax9OC8

VITE_SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzNzQxMiwiZXhwIjoyMDg4ODEzNDEyfQ.DCTDHl-aPpEajGndU69nvp-ZHeYv5sIVR1gU_XW_Edk
```

## Still Having Issues?

### Check Build Logs
1. Go to **Deploys** tab
2. Click on the latest deploy
3. Scroll down to see the build log
4. Look for errors or warnings

### Verify Variables Are Set
1. Go to **Site settings** → **Environment variables**
2. You should see all 3 variables listed
3. Each should show "All" under Scopes

### Contact Support
If nothing works:
- Check Netlify status: https://www.netlifystatus.com/
- Netlify support: https://answers.netlify.com/

---

**Remember**: Environment variables are set in the Netlify UI, not in your code! 🔑
