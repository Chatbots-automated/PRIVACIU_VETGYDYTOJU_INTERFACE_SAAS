# 🚀 RVAC Veterinarija - Deployment Guide

## Quick Start

**Getting the "Missing Supabase environment variables" error?**
→ See [`NETLIFY_ENV_SETUP.md`](NETLIFY_ENV_SETUP.md) for the fix!

## 📚 Documentation Files

| File | Purpose | When to Use |
|------|---------|-------------|
| **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)** | 4-step deployment guide | First time deploying |
| **[NETLIFY_ENV_SETUP.md](NETLIFY_ENV_SETUP.md)** | Fix environment variable errors | Getting env errors |
| **[DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)** | Complete deployment checklist | Before & after deploy |
| **[NETLIFY_DEPLOYMENT.md](NETLIFY_DEPLOYMENT.md)** | Full documentation | Deep dive / reference |
| **[netlify-env-template.txt](netlify-env-template.txt)** | Copy-paste env variables | Quick reference |

## 🔧 Configuration Files

- **`netlify.toml`** - Main Netlify configuration
- **`.nvmrc`** - Node version (18)
- **`_redirects`** - SPA routing fallback
- **`check-env.js`** - Environment variable checker

## ⚡ Quick Commands

```bash
# Check if environment variables are set locally
npm run check-env

# Build locally to test
npm run build

# Preview production build locally
npm run preview
```

## 🎯 Most Common Issue: Environment Variables

The error `"Missing Supabase environment variables"` means you need to:

1. Go to Netlify Dashboard
2. Click **Site settings** → **Environment variables**
3. Add these 3 variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
4. Trigger a new deploy

**See [`NETLIFY_ENV_SETUP.md`](NETLIFY_ENV_SETUP.md) for detailed instructions with values!**

## 📋 Deployment Checklist

- [ ] Push code to Git
- [ ] Connect repository to Netlify
- [ ] Add 3 environment variables in Netlify UI
- [ ] Deploy site
- [ ] Test that it works

Full checklist: [`DEPLOYMENT_CHECKLIST.md`](DEPLOYMENT_CHECKLIST.md)

## 🆘 Troubleshooting

| Problem | Solution |
|---------|----------|
| Missing env variables error | See [`NETLIFY_ENV_SETUP.md`](NETLIFY_ENV_SETUP.md) |
| Build fails | Check build logs, run `npm run check-env` |
| 404 on refresh | Verify `netlify.toml` is committed |
| Changes not showing | Clear cache, check deploy status |

## 📞 Support

- **Netlify Docs**: https://docs.netlify.com
- **Netlify Status**: https://www.netlifystatus.com
- **Supabase Docs**: https://supabase.com/docs

---

## 🎉 Ready to Deploy?

Start here: **[QUICK_DEPLOY.md](QUICK_DEPLOY.md)**

Need help with env variables? **[NETLIFY_ENV_SETUP.md](NETLIFY_ENV_SETUP.md)**

---

**Note**: This is a Vite + React + TypeScript + Supabase application configured for Netlify deployment with automatic builds and SPA routing.
