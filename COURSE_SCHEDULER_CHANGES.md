# Course Medication Scheduler Changes - April 26, 2026

## Summary

Changed the course medication scheduler workflow so that only TODAY's dose is entered during setup, and future days create separate planned visits that must be completed individually.

---

## Changes Made

### 1. CourseMedicationScheduler.tsx

#### UI Changes
- **Updated instruction text**:
  - OLD: "✅ Įveskite visų dienų vaistų kiekius iš karto. Visi vizitai bus automatiškai užbaigti ir atsargos nurašytos."
  - NEW: "📅 Įveskite šiandienos dozę. Kitos dienos bus suplanuotos kaip atskiri vizitai."

- **Visual distinction between today and future dates**:
  - Today: Purple background/border
  - Future dates: Gray background/border with "(Planuojama)" label

#### Functionality Changes
- **Today (Day 1)**:
  - Shows batch selector (Serija)
  - Shows quantity input (Kiekis)
  - Requires batch and quantity to be filled

- **Future Dates (Day 2+)**:
  - Hides batch selector
  - Hides quantity input
  - Shows message: "⏳ Kiekis bus įvestas vėliau, kai bus užbaigtas vizitas"
  - Only product and purpose are configured

### 2. AnimalDetailSidebar.tsx

#### Visit Creation Logic
- **Removed `allHaveQuantities` check** - No longer checks if all medications have quantities
- **Future visits always created as "Planuojamas"** - Never auto-completed
- **Simplified medication data for future visits**:
  ```typescript
  {
    product_id: med.product_id,
    batch_id: null, // Will be selected when completing
    qty: null, // Will be entered when completing
    unit: med.unit,
    purpose: med.purpose || 'Gydymas',
    teat: med.teat || null
  }
  ```

#### Today's Visit Logic
- Only processes today's medications if:
  1. Visit is being auto-completed (`autoComplete === true`)
  2. AND medications have batch_id and qty filled
- Otherwise stores as planned medications

---

## New Workflow

### Creating a Course
1. User selects dates (e.g., 3 days)
2. **Step 2 - Medications**:
   - **Day 1 (Today)**:
     - Select product
     - Select batch
     - Enter quantity
     - Enter purpose
   - **Day 2 & 3 (Future)**:
     - Select product
     - Enter purpose
     - NO batch/quantity required

3. Confirm and save
4. System creates:
   - Today's visit: "Baigtas" (if auto-completed) or "Planuojamas"
   - Future visits: "Planuojamas" with `planned_medications`

### Completing Future Visits
1. User clicks on a future visit
2. VisitDetailModal opens
3. Shows medication entry form with:
   - Pre-filled product from `planned_medications`
   - Empty batch selector
   - Empty quantity input
4. User enters batch and quantity
5. User clicks "Užbaigti" (Complete)
6. System:
   - Creates `usage_items` entries
   - Deducts stock from selected batch
   - Marks visit as "Baigtas"
   - Updates `medications_processed: true`

---

## Benefits

### Before
- ❌ Required all doses to be entered upfront
- ❌ Could create confusion about which batches to use days in advance
- ❌ Stock deducted immediately for future dates
- ❌ No flexibility to adjust doses based on animal response

### After
- ✅ Only enter today's dose initially
- ✅ Future visits remain flexible
- ✅ Stock only deducted when each visit is actually completed
- ✅ Can adjust future doses based on treatment progress
- ✅ More realistic workflow matching actual veterinary practice

---

## Files Modified

1. `src/components/CourseMedicationScheduler.tsx` - UI and logic changes
2. `src/components/AnimalDetailSidebar.tsx` - Visit creation logic

---

## Existing Features Still Work

- ✅ VisitDetailModal already supports completing planned visits
- ✅ Medication entry form already exists
- ✅ Stock deduction logic already works
- ✅ Withdrawal calculation still functions correctly

---

**Status:** ✅ Complete
**Date:** April 26, 2026, 7:00 PM
**Impact:** Better workflow, more flexible, matches veterinary practice
