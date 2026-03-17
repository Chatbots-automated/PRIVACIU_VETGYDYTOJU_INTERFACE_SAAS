# 📋 Netlify Deployment Checklist

Use this checklist to ensure a successful deployment.

## Before Deploying

- [ ] Code is committed and pushed to Git
- [ ] `.env.local` is in `.gitignore` (should already be there)
- [ ] `netlify.toml` is committed
- [ ] `.nvmrc` is committed
- [ ] Run `npm run build` locally to verify it works

## Netlify Setup

- [ ] Created account at https://netlify.com
- [ ] Connected Git repository to Netlify
- [ ] Build settings detected automatically from `netlify.toml`
  - Build command: `npm run build`
  - Publish directory: `dist`
  - Node version: 18

## Environment Variables (CRITICAL!)

Go to: **Site settings** → **Environment variables** → **Add a variable**

- [ ] Added `VITE_SUPABASE_URL`
  - Value: `https://oxzfztimfabzzqjmsihl.supabase.co`
  
- [ ] Added `VITE_SUPABASE_ANON_KEY`
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyMzc0MTIsImV4cCI6MjA4ODgxMzQxMn0._fJnKP48APEekQ80E_QcUhYapZM9C3vsEaoqVax9OC8`
  
- [ ] Added `VITE_SUPABASE_SERVICE_ROLE_KEY`
  - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94emZ6dGltZmFienpxam1zaWhsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzIzNzQxMiwiZXhwIjoyMDg4ODEzNDEyfQ.DCTDHl-aPpEajGndU69nvp-ZHeYv5sIVR1gU_XW_Edk`

- [ ] All 3 variables show "All" under Scopes
- [ ] Triggered a new deploy after adding variables

## First Deploy

- [ ] Clicked "Deploy site"
- [ ] Build completed successfully (green checkmark)
- [ ] No errors in build log
- [ ] Site URL is accessible

## Post-Deploy Testing

- [ ] Site loads without errors
- [ ] No "Missing Supabase environment variables" error
- [ ] Can log in successfully
- [ ] Can switch between modules
- [ ] Can switch between farms
- [ ] Data loads correctly
- [ ] All routes work (test by refreshing on different pages)

## Optional: Custom Domain

- [ ] Added custom domain in Netlify
- [ ] DNS configured correctly
- [ ] SSL certificate is active (automatic)
- [ ] Site accessible via custom domain

## Continuous Deployment

- [ ] Verified auto-deploy works (push to main branch)
- [ ] Set up deploy notifications (optional)
- [ ] Configured branch deploys (optional)

## Security Check

- [ ] `.env.local` is NOT committed to Git
- [ ] Environment variables are set in Netlify UI only
- [ ] No sensitive keys in code
- [ ] HTTPS is enabled (automatic with Netlify)

## Performance

- [ ] Lighthouse score checked (optional)
- [ ] Assets are cached properly
- [ ] Page load time is acceptable

## Documentation

- [ ] Team knows how to access Netlify dashboard
- [ ] Team knows where environment variables are set
- [ ] Deployment process is documented

---

## If Something Goes Wrong

### Error: "Missing Supabase environment variables"
→ See `NETLIFY_ENV_SETUP.md` for detailed fix

### Build fails
→ Check build logs in Netlify dashboard
→ Run `npm run check-env` locally
→ Verify Node version is 18

### 404 on page refresh
→ Check `netlify.toml` redirects are configured
→ Verify publish directory is `dist`

### Changes not showing
→ Clear browser cache
→ Check if deploy completed successfully
→ Verify correct branch is deployed

---

## Quick Links

- **Netlify Dashboard**: https://app.netlify.com
- **Environment Variables Setup**: See `NETLIFY_ENV_SETUP.md`
- **Quick Deploy Guide**: See `QUICK_DEPLOY.md`
- **Full Documentation**: See `NETLIFY_DEPLOYMENT.md`

---

**Status**: Ready for deployment! ✅

Last updated: 2026-03-15
