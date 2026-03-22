# Farm Comprehensive Analytics - User Guide

## Overview

The Farm Analytics feature provides a complete view of all activities performed at each farm. You can now click on any farm to see detailed breakdowns of treatments, vaccinations, visits, product usage, and more.

## How to Access

1. **Navigate to Vetpraktika Module**
   - From the main dashboard, select "Vetpraktika UAB"

2. **Open Analytics**
   - Click on "Analitika" in the left sidebar

3. **View Farm List**
   - You'll see a table with all farms and their allocation statistics

4. **Click on a Farm**
   - Click on any farm row to open the comprehensive farm analytics view
   - The row will highlight on hover with a blue background
   - A chevron icon (→) appears on the right

## Farm Detail View

### Summary Cards (Top Section)

Six key metrics displayed as cards:
- **Gyvūnai** (Animals): Active animals / Total animals
- **Gydymai** (Treatments): Total treatments + unique diseases
- **Vakcinacijos** (Vaccinations): Total vaccinations performed
- **Išlaidos** (Costs): Total cost of all medications and treatments
- **Vizitai** (Visits): Total animal visits
- **Produktai** (Products): Unique products used

### Tabs

#### 1. **Apžvalga** (Overview)
- **Dažniausiai naudojami produktai**: Top 5 products by usage
- **Paskutiniai gydymai**: Recent 5 treatments with costs
- **Dažniausios ligos**: Top 6 diseases with recovery rates
- **Veterinarų veikla**: Activity breakdown per veterinarian

#### 2. **Gydymai** (Treatments)
Comprehensive treatment table showing:
- Date of treatment
- Animal tag number
- Disease name
- Treatment outcome (Pasveiko/Gydoma/Kritęs)
- Veterinarian name
- Number of medications used
- Total treatment cost

Shows up to 100 most recent treatments.

#### 3. **Vakcinacijos** (Vaccinations)
Vaccination records showing:
- Vaccination date
- Animal tag number
- Product/vaccine name
- Dose amount and unit
- Administered by (veterinarian)

Shows up to 100 most recent vaccinations.

#### 4. **Vizitai** (Visits)
Animal visit records showing:
- Visit date and time
- Animal tag number
- Status (Planuojamas/Vykdomas/Baigtas/Atšauktas)
- Temperature measurement
- Procedures performed
- Veterinarian name

Shows up to 100 most recent visits.

#### 5. **Produktai** (Products)
Product usage statistics showing:
- Product name and category
- Times used (number of applications)
- Total quantity used
- Total cost

Sorted by most frequently used products.

#### 6. **Gyvūnai** (Animals)
Active animals with activity summary:
- Tag number (Ausies Nr.)
- Species and sex
- Treatment count
- Vaccination count
- Visit count
- Total cost spent on this animal
- Last activity date

Sorted by most recent activity.

#### 7. **Paskirstytos atsargos** (Allocated Stock)
Stock allocated from warehouse to this farm:
- Product name and category
- Quantity allocated (Paskirta)
- Quantity used (Panaudota)
- Remaining quantity (Likutis)
- Number of allocations
- Last allocation date

Shows the balance of what was allocated vs what was actually used.

#### 8. **Ligos** (Diseases)
Disease statistics and outcomes:
- Disease name and code
- Total cases
- Number of animals affected
- Recovered cases
- Ongoing cases
- Deceased cases
- Recovery rate percentage (color-coded)
- Total treatment cost

Sorted by most common diseases.

#### 9. **Veterinarai** (Veterinarians)
Veterinarian activity breakdown:
- Veterinarian name
- Number of treatments performed
- Number of vaccinations administered
- Number of visits conducted
- Total activities
- Number of unique animals treated

Sorted by most active veterinarians.

## Export to Excel

Each tab has an "Eksportuoti" button in the top-right corner that exports the current view to an Excel file.

**Export filename format**: `{FARM_CODE}_analitika_{DATE}.xlsx`

Example: `LT825_analitika_2026-03-22.xlsx`

## Navigation

- **Back Button**: Click "Grįžti į visų ūkių analitiką" to return to the farm list
- **Tab Switching**: Click any tab to switch views
- **Export**: Click "Eksportuoti" to download current view as Excel

## Data Refresh

Data is loaded when:
- You first open the farm detail view
- The component automatically fetches the latest data from the database

To refresh data:
- Navigate back to the farm list and click on the farm again

## Performance Notes

- Treatment, vaccination, and visit tabs show up to 100 most recent records
- Product usage shows all products used (no limit)
- Animal list shows only active animals
- All data is efficiently loaded using optimized database views

## Color Coding

### Treatment Outcomes:
- 🟢 Green: Pasveiko (Recovered)
- 🔴 Red: Kritęs (Deceased)
- 🟠 Orange: Gydoma (Ongoing)

### Visit Status:
- 🔵 Blue: Vykdomas (In Progress)
- 🟢 Green: Baigtas (Completed)
- 🔴 Red: Atšauktas (Cancelled)
- ⚪ Gray: Planuojamas (Planned)

### Recovery Rates:
- 🟢 Green: ≥80% recovery rate
- 🟡 Yellow: 50-79% recovery rate
- 🔴 Red: <50% recovery rate

## Technical Details

### Database Views Used:
- `vw_farm_summary_analytics` - Summary statistics
- `vw_farm_treatment_details` - Treatment details with medications
- `vw_farm_vaccination_details` - Vaccination records
- `vw_farm_visit_details` - Visit records
- `vw_farm_product_usage_summary` - Product usage aggregation
- `vw_farm_animal_activity` - Animal activity summary
- `vw_farm_disease_statistics` - Disease statistics
- `vw_farm_veterinarian_activity` - Veterinarian activity
- `vw_farm_allocated_stock_summary` - Stock allocation summary

### Component Files:
- `src/components/FarmDetailAnalytics.tsx` - Main detail view
- `src/components/AllocationAnalytics.tsx` - Farm list with clickable rows

## Support

If you encounter any issues or have questions about the analytics, check:
1. Migration was applied successfully
2. Database views exist
3. Data exists in the relevant tables
4. Farm has a valid `farm_id` in all related tables
