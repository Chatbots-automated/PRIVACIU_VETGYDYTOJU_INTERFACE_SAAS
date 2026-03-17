# Quick Deploy to Netlify

## 🚀 Fast Track Deployment

### Step 1: Push to Git
```bash
git add .
git commit -m "Prepare for Netlify deployment"
git push origin main
```

### Step 2: Connect to Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose your Git provider and select this repository
4. Netlify will auto-detect settings from `netlify.toml`

### Step 3: Add Environment Variables

In Netlify Dashboard → **Site settings** → **Environment variables**

Add these 3 variables:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://oxzfztimfabzzqjmsihl.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzc0MTIsImV4cCI6MjA4ODgxMzQxMn0._fJnKP48APEekQ80E_QcUhYapZM9C3vsEaoqVax9OC8` |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzNzQxMiwiZXhwIjoyMDg4ODEzNDEyfQ.DCTDHl-aPpEajGndU69nvp-ZHeYv5sIVR1gU_XW_Edk` |

### Step 4: Deploy

Click **"Deploy site"** and wait 2-3 minutes.

Your site will be live at: `https://[your-site-name].netlify.app`

---

## ✅ What's Configured

- ✅ Build command: `npm run build`
- ✅ Publish directory: `dist`
- ✅ Node version: 18
- ✅ SPA routing (all routes work)
- ✅ Security headers
- ✅ Asset caching
- ✅ Auto-deploy on git push

## 🔧 Files Created

- `netlify.toml` - Main configuration
- `.nvmrc` - Node version
- `_redirects` - SPA routing fallback
- `netlify-env-template.txt` - Environment variables reference
- `NETLIFY_DEPLOYMENT.md` - Full documentation

## 📝 Notes

- Environment variables are **NOT** in the code (secure ✅)
- `.env.local` stays local only (in `.gitignore`)
- Auto-deploys on every push to main branch
- Free SSL certificate included

## 🆘 Troubleshooting

### Error: "Missing Supabase environment variables"

This means environment variables are not set in Netlify. **You MUST add them manually:**

1. Go to Netlify Dashboard
2. Select your site
3. Click **Site settings** → **Environment variables**
4. Click **"Add a variable"** button
5. Add each variable one by one:
   - Key: `VITE_SUPABASE_URL`
   - Value: `https://oxzfztimfabzzqjmsihl.supabase.co`
   - Click "Create variable"
6. Repeat for `VITE_SUPABASE_ANON_KEY` and `VITE_SUPABASE_SERVICE_ROLE_KEY`
7. After adding all 3 variables, click **"Trigger deploy"** → **"Deploy site"**

**Important**: Environment variables are NOT read from `netlify.toml` - they must be set in the Netlify UI!

### Build fails?
- Run `npm run check-env` locally to verify variables
- Check Netlify build logs for specific errors
- Verify Node version is 18

### 404 on page refresh?
- Redirects should work automatically
- Check `netlify.toml` is committed

### Variables not working after adding them?
- Make sure you triggered a NEW deploy after adding variables
- Old deploys don't have the new variables
- Go to **Deploys** → **Trigger deploy** → **Deploy site**

### Need help?
- See `NETLIFY_DEPLOYMENT.md` for detailed guide
- Check Netlify build logs for errors
- Run `npm run check-env` to verify local setup

---

**Ready to deploy?** Just follow the 4 steps above! 🎉
