# Quick Start: Farm Comprehensive Analytics

## 🎯 What You Asked For

> "In the analitika tab we need to make it so we can click on a specific farm and we can see literally everything thats been done there like all of the treatments (simplified), all of the products assigned and etc literally everything"

## ✅ What Was Built

A complete farm analytics system with **9 detailed tabs** showing everything done at each farm.

---

## 🚀 Quick Setup (2 Steps)

### Step 1: Apply Database Migration (REQUIRED)

1. Open: https://supabase.com/dashboard/project/oxzfztimfabzzqjmsihl/sql/new

2. Copy file: `supabase/migrations/20260322000001_add_farm_comprehensive_analytics.sql`

3. Paste all contents into SQL Editor and click "Run"

4. Wait for "Success. No rows returned"

### Step 2: Use the Feature

1. Go to **Vetpraktika Module** → **Analitika**

2. Click on any farm row (it will highlight blue on hover)

3. See comprehensive farm details!

---

## 📊 What You Can See

### Summary Cards (Top)
- Animals (active/total)
- Treatments + diseases
- Vaccinations
- Total costs
- Visits
- Unique products

### Tab 1: Apžvalga (Overview)
- Top 5 products used
- Recent 5 treatments
- Top 6 diseases with recovery rates
- Top 4 veterinarians

### Tab 2: Gydymai (Treatments)
All treatments with:
- Date, animal, disease, outcome
- Veterinarian, medications, cost
- Up to 100 records

### Tab 3: Vakcinacijos (Vaccinations)
All vaccinations with:
- Date, animal, product, dose
- Administered by
- Up to 100 records

### Tab 4: Vizitai (Visits)
All visits with:
- Date, animal, status
- Temperature, procedures, vet
- Up to 100 records

### Tab 5: Produktai (Products)
Product usage stats:
- Times used, quantities, costs
- All products ever used

### Tab 6: Gyvūnai (Animals)
All active animals with:
- Treatment/vaccination/visit counts
- Cost per animal
- Last activity date

### Tab 7: Paskirstytos atsargos (Allocated Stock)
Stock from warehouse:
- Allocated vs Used vs Remaining
- Allocation history

### Tab 8: Ligos (Diseases)
Disease statistics:
- Cases, animals affected
- Recovery rates (color-coded)
- Treatment costs

### Tab 9: Veterinarai (Veterinarians)
Vet activity:
- Treatments, vaccinations, visits
- Animals treated

---

## 💾 Export to Excel

Every tab has an "Eksportuoti" button that downloads the data as Excel.

Filename: `{FARM_CODE}_analitika_{DATE}.xlsx`

---

## 🎨 Visual Features

- **Clickable farm rows** with hover effect (blue background)
- **Color-coded outcomes**: Green (recovered), Red (deceased), Orange (ongoing)
- **Color-coded recovery rates**: Green (≥80%), Yellow (50-79%), Red (<50%)
- **Status badges** for visits: Blue (in progress), Green (completed), Red (cancelled)
- **Summary cards** with icons and color themes
- **Responsive design** works on all screen sizes

---

## 📁 Files Created

1. `src/components/FarmDetailAnalytics.tsx` - Main component (1,229 lines)
2. `supabase/migrations/20260322000001_add_farm_comprehensive_analytics.sql` - Database views (466 lines)
3. `scripts/truncate-database.js` - Database cleanup utility
4. `scripts/apply-farm-analytics.js` - Migration helper
5. Documentation files (this file + 2 others)

## 📝 Files Modified

1. `src/components/AllocationAnalytics.tsx` - Added clickable rows and navigation

---

## ✨ That's It!

After applying the migration, you can immediately:
1. Go to Vetpraktika → Analitika
2. Click any farm
3. See everything that's been done there

**No additional configuration needed!**
