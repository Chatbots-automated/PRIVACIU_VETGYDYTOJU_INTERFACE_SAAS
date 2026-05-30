# Quick Verification Guide - Visit Edit Fix

## 🚀 Quick Test (5 minutes)

### Test 1: Create and Edit a Simple Visit
1. Go to an animal's detail page
2. Click "Naujas vizitas"
3. Select procedure: **Gydymas**
4. Add one medication:
   - Select product (e.g., "Baytril")
   - Select batch
   - Enter quantity (e.g., 5 ml)
   - Select administration route (e.g., i.m)
5. Save as "Planuojamas"
6. ✅ **Verify:** Visit appears in list
7. Click "Redaguoti vizita" on that visit
8. ✅ **Verify:** All fields appear correctly:
   - Product name shows
   - Batch is selected
   - Quantity is filled
   - Administration route button is highlighted (e.g., "i.m")
9. Change status to "Baigtas"
10. Save
11. ✅ **Verify:** Stock decreased in Inventory

---

## ⚡ Critical Checks

### ✅ No Blank Screen
- When editing visit with Gydymas
- When changing procedures
- When adding/removing medications

### ✅ Data Loads Correctly
- Disease name
- Medications with all fields
- Administration routes (buttons highlighted)
- Quantities and units
- Batch selections

### ✅ Stock Deduction Works
- Check before/after qty_left in batches
- Verify usage_items record created
- Correct administered_date
- Correct batch_id or warehouse_batch_id

### ✅ Removed Procedures
- "Vakcina" NOT in dropdown
- "Nagai" NOT in dropdown
- Filter dropdown updated
- Old visits still viewable

---

## 🐛 Known Good Behaviors

### When Creating New Visit:
- Stock does NOT deduct for "Planuojamas"
- Stock DOES deduct for "Baigtas"
- Administration route is optional (can be empty)

### When Editing Existing Visit:
- All data loads correctly
- Can modify any field
- Changing to "Baigtas" deducts stock
- Can add/remove medications

### Multi-Day Courses:
- Future visits created with "Planuojamas"
- Each visit tracks medications separately
- Stock deducts only when each visit completed

---

## 🔍 Debugging Tips

### If medications don't show when editing:
1. Open browser console (F12)
2. Look for errors
3. Check: `loadExistingData` function executed?
4. Check: Animal data loaded? (should see in console)
5. Check: Products/batches loaded?

### If stock doesn't deduct:
1. Check visit status is "Baigtas"
2. Check usage_items table in database
3. Look for console errors during save
4. Verify batch_id exists and is valid

### If administration route doesn't show:
1. Check if animal is production type
2. Check if product has withdrawal periods
3. Verify administration_route field in database

---

## 📊 Database Verification

### Check usage_items:
```sql
SELECT * FROM usage_items 
WHERE treatment_id = 'YOUR_TREATMENT_ID'
ORDER BY created_at DESC;
```

### Check batch stock:
```sql
SELECT id, lot, qty_left, product_id 
FROM batches 
WHERE id = 'YOUR_BATCH_ID';
```

### Check animal visits:
```sql
SELECT id, status, procedures, planned_medications 
FROM animal_visits 
WHERE id = 'YOUR_VISIT_ID';
```

---

## ✨ Success Indicators

### When Everything Works:
- ✅ No console errors
- ✅ All fields populate correctly
- ✅ Can edit and save without issues
- ✅ Stock deducts accurately
- ✅ Administration routes save and display
- ✅ "Vakcina" and "Nagai" not visible
- ✅ Old visits with these procedures still work

---

## 🎯 Edge Cases to Test (Optional)

### Advanced Testing:
- [ ] Edit completed visit (status already "Baigtas")
- [ ] Edit visit with course medications
- [ ] Edit visit with multiple medications
- [ ] Mix farm and warehouse batches in same visit
- [ ] Product without withdrawal periods
- [ ] Teat-specific medications (mastitis)
- [ ] Very old visit (6+ months ago)

---

## 📞 Need Help?

### Common Issues:

**Blank screen when editing:**
- Clear browser cache
- Check console for errors
- Verify animal data exists in database

**Stock not deducting:**
- Verify visit status is "Baigtas"
- Check batch has sufficient qty_left
- Look for database constraint errors

**Fields not populating:**
- Check database for planned_medications
- Verify treatment_medications records exist
- Ensure animal_id is valid

---

## 🎉 All Tests Pass?

If everything works:
1. Test with 2-3 different animals
2. Test with different medications
3. Test with farm vs warehouse batches
4. Test creating and editing multiple visits

**You're good to go!** 🚀
