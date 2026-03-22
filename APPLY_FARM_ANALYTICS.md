# Farm Comprehensive Analytics - Setup Instructions

## What's New

I've created a comprehensive farm analytics system that allows you to click on any farm in the Analytics tab and see **everything** that's been done there:

### New Features:
- **Overview Tab**: Summary cards + top products + recent activity + disease stats + vet activity
- **Treatments Tab**: All treatments with details (animal, disease, outcome, vet, medications, cost)
- **Vaccinations Tab**: All vaccinations with product details
- **Visits Tab**: All animal visits with status, temperature, procedures
- **Products Tab**: Product usage statistics (times used, quantities, costs)
- **Animals Tab**: All animals with their activity summary
- **Allocated Stock Tab**: Stock allocated from warehouse to this farm (allocated vs used vs remaining)
- **Diseases Tab**: Disease statistics with recovery rates and costs
- **Veterinarians Tab**: Activity breakdown per veterinarian

### How It Works:
1. In the **Vetpraktika Module** → **Analitika** tab
2. Click on any farm row in the farms table
3. See comprehensive farm details with all tabs

## Setup Steps

### Step 1: Apply Database Migration

The new analytics views need to be created in your database.

**Option A: Via Supabase SQL Editor (Recommended)**

1. Go to: https://supabase.com/dashboard/project/oxzfztimfabzzqjmsihl/sql/new
2. Open the file: `supabase/migrations/20260322000001_add_farm_comprehensive_analytics.sql`
3. Copy all contents and paste into the SQL Editor
4. Click "Run" to execute

**Option B: Via Supabase CLI (if you have direct DB access)**

```bash
supabase db push
```

### Step 2: Test the Analytics

1. Start your development server if not running:
   ```bash
   npm run dev
   ```

2. Navigate to **Vetpraktika Module** → **Analitika**

3. Click on any farm in the table to see comprehensive details

### Step 3: Export Data (Optional)

Each tab has an "Eksportuoti" button that exports the current view to Excel format.

## Database Views Created

The migration creates 10 new views:

1. **vw_farm_summary_analytics** - High-level summary stats per farm
2. **vw_farm_treatment_details** - Detailed treatment records with medications
3. **vw_farm_vaccination_details** - Detailed vaccination records
4. **vw_farm_visit_details** - Detailed visit records
5. **vw_farm_product_usage_summary** - Product usage aggregated per farm
6. **vw_farm_animal_activity** - Animal activity with costs and health indicators
7. **vw_farm_disease_statistics** - Disease occurrence and recovery rates
8. **vw_farm_veterinarian_activity** - Veterinarian activity statistics
9. **vw_farm_allocated_stock_summary** - Stock allocation vs usage per farm
10. **vw_farm_monthly_activity** - Monthly timeline of activities

## Files Modified/Created

### New Files:
- `src/components/FarmDetailAnalytics.tsx` - Main farm detail component
- `supabase/migrations/20260322000001_add_farm_comprehensive_analytics.sql` - Database views

### Modified Files:
- `src/components/AllocationAnalytics.tsx` - Added clickable farm rows and navigation to detail view

## Troubleshooting

If you see "Could not find the table/view in the schema cache" errors:
1. Make sure the migration was applied successfully
2. Refresh your Supabase schema cache
3. Check that all referenced tables exist in your database

If data is not showing:
1. Ensure you have data in the `farms` table
2. Check that animals, treatments, and other tables have the `farm_id` column
3. Verify RLS policies are not blocking access
