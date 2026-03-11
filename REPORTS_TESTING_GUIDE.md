# Reports Tab Testing Guide

## Prerequisites

Before testing the Reports tab, ensure:
1. ✅ The migration `20260312000004_update_report_views.sql` has been applied
2. ✅ At least one farm exists in the `farms` table
3. ✅ Test data exists (animals, treatments, products, batches, etc.)
4. ✅ The application is running (`npm run dev`)

## Step-by-Step Testing

### 1. Farm Selection
1. Open the application
2. Click on the farm selector in the top navigation
3. Select a farm from the dropdown
4. Verify the selection persists when navigating between pages

### 2. Analytics Dashboard

Navigate to **Veterinary Module → Reports → Analytics**

**Test the following cards:**
- [ ] **Gyvūnai (Animals)** - Shows total and active count
- [ ] **Gydymai (Treatments)** - Shows count for last 6 months
- [ ] **Atsargų vertė (Inventory Value)** - Shows total value in EUR
- [ ] **Įspėjimai (Warnings)** - Shows low stock + expiring items

**Test the following charts:**
- [ ] **Dažniausios ligos (Top Diseases)** - Top 5 diseases with counts
- [ ] **Populiariausi produktai (Top Products)** - Top 5 products with usage
- [ ] **Gydymai per mėnesį (Treatments per Month)** - Bar chart for last 6 months
- [ ] **Vakcinacijos per mėnesį (Vaccinations per Month)** - Bar chart for last 6 months
- [ ] **Gydymo rezultatai (Treatment Outcomes)** - Recovered/Ongoing/Died counts
- [ ] **Atsargos pagal kategoriją (Inventory by Category)** - Value breakdown

**Expected Behavior:**
- All numbers should be accurate
- Charts should display properly
- No data leaks from other farms

### 3. Drug Journal (Veterinarinių vaistų žurnalas)

Navigate to **Veterinary Module → Reports → Veterinarinių vaistų žurnalas**

**Test filters:**
- [ ] Date range filter (from/to)
- [ ] Product filter (searchable dropdown)
- [ ] Batch number filter (text input)
- [ ] Invoice number filter (text input)
- [ ] "Generuoti ataskaitą" button loads data
- [ ] "Išvalyti" button clears all filters

**Test report display:**
- [ ] Products are grouped by medicine name
- [ ] Each medicine shows:
  - Product name and registration code
  - Active substance
  - Primary package unit
- [ ] Each batch shows:
  - Receipt date
  - Supplier name and invoice details
  - Quantity received
  - Expiry date (red if expired)
  - Batch/lot number
  - Quantity used
  - Quantity remaining (green if > 0)
- [ ] Summary row shows totals per medicine
- [ ] Total count shown at bottom

**Test export:**
- [ ] "Eksportuoti" button downloads CSV
- [ ] "Spausdinti" button opens print dialog
- [ ] Print preview looks correct

### 4. Treated Animals Register (Gydomų gyvūnų registras)

Navigate to **Veterinary Module → Reports → Gydomų gyvūnų registras**

**Test filters:**
- [ ] Date range defaults to current month
- [ ] Animal filter (searchable dropdown)
- [ ] Product filter (searchable dropdown)
- [ ] Disease filter (searchable dropdown)
- [ ] Veterinarian filter (text input)
- [ ] Filters persist until cleared

**Test report display (14 columns):**
1. [ ] **Eil. Nr.** - Sequential number (oldest = 1)
2. [ ] **Registracijos data** - Treatment registration date
3. [ ] **Gyvūno laikytojo duomenys** - Owner name and address
4. [ ] **Gyvūno rūšis, lytis** - Species and sex
5. [ ] **Gyvūno amžius** - Age in years and months
6. [ ] **Gyvūno ženklinimo numeris** - Animal tag number
7. [ ] **Pirmųjų ligos požymių data** - First symptoms date
8. [ ] **Gyvūno būklė** - Animal condition
9. [ ] **Atlikti tyrimai** - Tests performed
10. [ ] **Klinikinė diagnozė** - Disease name and diagnosis
11. [ ] **Suteiktos veterinarijos paslaugos** - Services and medications
12. [ ] **Išlauka** - Withdrawal periods (meat 🥩 / milk 🥛)
13. [ ] **Ligos baigtis** - Treatment outcome
14. [ ] **Veterinarijos gydytojas** - Veterinarian name

**Expected Behavior:**
- One row per medication (treatments with multiple meds show multiple rows)
- Eil. Nr. is sequential based on registration date (oldest first)
- Withdrawal periods show only dates (not days)
- All 14 columns are populated

**Test export:**
- [ ] CSV export includes all columns
- [ ] Print format matches official requirements

### 5. Biocide Journal (Biocidų žurnalas)

Navigate to **Veterinary Module → Reports → Biocidų žurnalas**

**Test filters:**
- [ ] Date range filter
- [ ] Product filter
- [ ] Batch number filter

**Test report display:**
- [ ] Product name with registration code
- [ ] Active substance
- [ ] Primary package unit
- [ ] Expiry date
- [ ] Batch/lot number
- [ ] Use date
- [ ] Purpose
- [ ] Work scope
- [ ] Quantity used
- [ ] Applied by (person name)

**Test export:**
- [ ] CSV export works
- [ ] Print format is correct

### 6. Insemination Journal (Sėklinimo žurnalas)

Navigate to **Veterinary Module → Reports → Sėklinimo žurnalas**

**Test filters:**
- [ ] Date range filter
- [ ] Animal filter

**Test statistics cards:**
- [ ] **Viso sėklinimų** - Total inseminations
- [ ] **Patvirtinti nėštumai** - Confirmed pregnancies
- [ ] **Nepatvirtinti** - Not confirmed
- [ ] **Sėkmės rodiklis** - Success rate percentage

**Test report display:**
- [ ] Sequential number (Eil. Nr.)
- [ ] Insemination date
- [ ] Animal tag and species
- [ ] Sperm product name and quantity
- [ ] Glove product name and quantity
- [ ] Pregnancy status (✓ Patvirtintas / ✗ Nepatvirtintas / ⏳ Laukiama)
- [ ] Pregnancy check date
- [ ] Notes

**Test export:**
- [ ] CSV export works
- [ ] Print format is correct

### 7. Medical Waste Journal (Medicininių atliekų žurnalas)

Navigate to **Veterinary Module → Reports → Medicininių atliekų žurnalas**

**Test filters:**
- [ ] Date range filter

**Test report display:**
- [ ] Waste code (badge format)
- [ ] Waste type name
- [ ] Reporting period and date
- [ ] Quantity generated
- [ ] Quantity transferred
- [ ] Waste carrier
- [ ] Waste processor
- [ ] Transfer date
- [ ] Transfer document number
- [ ] Responsible person

**Test export:**
- [ ] CSV export works
- [ ] Print format is correct

### 8. Invoices Assignment (Sąskaitų Priskirimas)

Navigate to **Veterinary Module → Reports → Sąskaitų Priskirimas**

**Test invoice list:**
- [ ] Shows all invoices for selected farm
- [ ] Displays invoice number, date, supplier
- [ ] Shows total amounts (net, VAT, gross)
- [ ] Click to expand invoice details

**Test invoice details:**
- [ ] Shows all line items
- [ ] Displays product name, SKU, quantity, prices
- [ ] Shows batch assignment if available
- [ ] Collapse/expand works correctly

## Common Issues & Troubleshooting

### No Data Showing
**Possible causes:**
1. Farm not selected → Select a farm from the dropdown
2. No data for selected farm → Add test data or select different farm
3. Date filters too restrictive → Clear filters or adjust date range
4. Views not updated → Apply migration `20260312000004_update_report_views.sql`

### Wrong Data Showing
**Possible causes:**
1. Farm filter not working → Check that all queries include `farm_id`
2. RLS policies not applied → Verify RLS policies on base tables and views
3. Data leakage → Check that views include `farm_id` in WHERE clause

### Performance Issues
**Possible causes:**
1. Large dataset → Add indexes on `farm_id`, `treatment_id`, etc.
2. Complex views → Consider materialized views for analytics
3. Missing indexes → Run EXPLAIN ANALYZE on slow queries

### Export/Print Issues
**Possible causes:**
1. CSV export fails → Check browser console for errors
2. Print preview blank → Verify `no-print` classes are correct
3. Print format wrong → Check CSS print media queries

## Success Criteria

The Reports tab is working correctly if:
- ✅ All report types load without errors
- ✅ Data is filtered correctly by selected farm
- ✅ No data leaks between farms
- ✅ All filters work as expected
- ✅ Export and print functions work
- ✅ Charts and statistics are accurate
- ✅ Official report formats match requirements
- ✅ Performance is acceptable (< 3 seconds load time)

## Next Steps After Testing

1. **Document any bugs found** - Create issues for any problems
2. **Performance optimization** - Add indexes if queries are slow
3. **User feedback** - Get feedback from actual users
4. **Additional reports** - Consider adding more report types if needed
5. **Localization** - Ensure all text is properly translated
6. **Accessibility** - Test with screen readers and keyboard navigation
