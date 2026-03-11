# Schema Changes: Old vs New Baseline

## Overview

This document compares the old baseline (`20240101000000_baseline_public_schema.sql`) with the new RVAC baseline (`20260312000001_rvac_baseline_schema.sql`).

## Major Changes

### ✅ Added: Multi-Tenancy Support

**New Table:**
- `farms` - Root table for multi-tenant architecture

**Changes to ALL Data Tables:**
- Added `farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL`
- 29 tables modified (all except `hoof_condition_codes` reference table)

**New RLS Policies:**
- 61 policies added for complete farm isolation
- Helper function: `get_user_farm_id()`

### ❌ Removed: GEA Integration

**Deleted Tables:**
- `gea_daily_imports`
- `gea_daily_ataskaita1`
- `gea_daily_ataskaita2`
- `gea_daily_ataskaita3`

**Deleted Views:**
- `gea_daily_cows_joined`

**Deleted Functions:**
- `gea_daily_upload()`
- `on_gea_daily_status_change()`
- `parse_milk_date()`
- `determine_session_type()`

### ❌ Removed: Milk Production Module

**Deleted Tables:**
- `milk_production`
- `milk_weights`
- `milk_tests`
- `milk_composition_tests`
- `milk_quality_tests`
- `milk_test_summaries`
- `milk_producers`
- `milk_scrape_sessions`

**Deleted Views:**
- `milk_data_combined`
- `vw_milk_analytics`

**Deleted Functions:**
- `import_milk_data()`
- `link_past_milk_tests_to_weights()`
- `auto_link_milk_test_to_weight()`
- `calculate_average_daily_milk()`
- `get_animal_avg_milk_at_date()`
- `calculate_milk_loss_for_synchronization()`
- `calculate_treatment_milk_loss()`

**Deleted Views:**
- `treatment_milk_loss_summary`
- `animal_milk_loss_by_synchronization`

### ❌ Removed: Equipment Management Module

**Deleted Tables:**
- `equipment_products`
- `equipment_categories`
- `equipment_batches`
- `equipment_suppliers`
- `equipment_invoices`
- `equipment_invoice_items`
- `equipment_invoice_item_assignments`
- `equipment_issuances`
- `equipment_issuance_items`
- `equipment_locations`
- `equipment_stock_movements`
- `farm_equipment`
- `farm_equipment_items`
- `farm_equipment_service_records`
- `farm_equipment_service_parts`
- `tools`
- `tool_movements`

**Deleted Views:**
- `equipment_warehouse_stock`
- `equipment_items_on_loan`
- `equipment_unassigned_invoice_items`
- `farm_equipment_summary`
- `farm_equipment_items_detail`
- `farm_equipment_cost_overview`
- `farm_equipment_service_details`
- `farm_equipment_service_cost_summary`
- `tool_parts_usage`

**Deleted Functions:**
- `generate_equipment_issuance_number()`
- `deduct_equipment_stock()`
- `deduct_farm_equipment_service_stock()`
- `update_farm_equipment_item_next_service_date()`
- `update_last_service_date_on_new_record()`

### ❌ Removed: Vehicle Management Module

**Deleted Tables:**
- `vehicles`
- `vehicle_assignments`
- `vehicle_service_visits`
- `vehicle_visit_parts`
- `vehicle_documents`
- `vehicle_fuel_records`
- `maintenance_schedules`
- `maintenance_work_orders`
- `work_order_parts`
- `work_order_labor`

**Deleted Views:**
- `vehicle_cost_overview`
- `vehicle_service_history`
- `vehicle_service_visit_details`
- `vehicle_maintenance_cost_summary`
- `vehicle_work_order_details`
- `vehicle_parts_usage`

**Deleted Functions:**
- `generate_work_order_number()`
- `calculate_next_service_date()`
- `deduct_work_order_parts()`
- `handle_vehicle_visit_part_stock()`
- `set_work_order_number_trigger()`

### ❌ Removed: Worker Portal Module

**Deleted Tables:**
- `worker_schedules`
- `ppe_items`
- `ppe_issuance_records`

**Deleted Views:**
- None specific to workers

**Deleted Functions:**
- None specific to workers

### ❌ Removed: Cost Accumulation Module

**Deleted Tables:**
- `cost_centers`
- `cost_accumulation_projects`
- `cost_accumulation_documents`
- `cost_accumulation_items`

**Deleted Views:**
- `cost_center_summary`
- `cost_center_summary_with_children`
- `cost_center_direct_summary`
- `cost_center_parts_usage`
- `cost_accumulation_project_summary`

**Deleted Functions:**
- `update_cost_center_updated_at()`
- `update_cost_accumulation_project_updated_at()`

### ❌ Removed: Fire Safety Module

**Deleted Tables:**
- `fire_extinguishers`

**Deleted Functions:**
- `update_fire_extinguishers_updated_at()`

### ❌ Removed: Product Quality Module

**Deleted Tables:**
- `product_quality_schedules`
- `product_quality_reviews`

## Retained & Enhanced

### ✅ Veterinary Core (Enhanced with farm_id)

**Tables Retained:**
- `animals` ✓
- `treatments` ✓
- `animal_visits` ✓
- `diseases` ✓
- `vaccinations` ✓
- `usage_items` ✓
- `treatment_courses` ✓
- `course_doses` ✓
- `course_medication_schedules` ✓
- `teat_status` ✓

**Views Retained:**
- `treatment_history_view` ✓
- `vw_withdrawal_status` ✓
- `animal_visit_summary` ✓
- `vw_vet_drug_journal` ✓

**Functions Retained:**
- `calculate_withdrawal_dates()` ✓
- `trigger_calculate_withdrawal_on_usage()` ✓
- `check_course_completion()` ✓
- `create_course_doses()` ✓

### ✅ Inventory Management (Enhanced with farm_id)

**Tables Retained:**
- `products` ✓
- `batches` ✓
- `suppliers` ✓
- `invoices` ✓
- `invoice_items` ✓

**Views Retained:**
- `stock_by_batch` ✓
- `stock_by_product` ✓

**Functions Retained:**
- `fn_fifo_batch()` ✓ (updated with farm_id parameter)
- `calculate_received_qty()` ✓
- `initialize_batch_fields()` ✓
- `update_batch_qty_left()` ✓
- `check_batch_stock()` ✓ (updated with farm_id filtering)
- `auto_split_usage_items()` ✓ (updated with farm_id filtering)

### ✅ Waste Management (Enhanced with farm_id)

**Tables Retained:**
- `medical_waste` ✓
- `batch_waste_tracking` ✓

**Views Retained:**
- `vw_medical_waste` ✓

**Functions Retained:**
- `auto_generate_medical_waste()` ✓ (updated with farm_id)
- `check_batch_depletion()` ✓

### ✅ Biocide Tracking (Enhanced with farm_id)

**Tables Retained:**
- `biocide_usage` ✓

**Views Retained:**
- `vw_biocide_journal` ✓

### ✅ Hoof Health (Enhanced with farm_id)

**Tables Retained:**
- `hoof_records` ✓
- `hoof_condition_codes` ✓ (reference table, no farm_id)

**Views Retained:**
- `hoof_analytics_summary` ✓

### ✅ Synchronization/Breeding (Enhanced with farm_id)

**Tables Retained:**
- `synchronization_protocols` ✓
- `animal_synchronizations` ✓
- `synchronization_steps` ✓
- `insemination_products` ✓
- `insemination_inventory` ✓
- `insemination_records` ✓

**Functions Retained:**
- `initialize_animal_synchronization()` ✓ (updated with farm_id parameter)
- `complete_synchronization_step()` ✓
- `deduct_sync_step_medication()` ✓ (updated with farm_id)
- `cancel_animal_synchronization_protocols()` ✓

### ✅ User Management (Enhanced)

**Tables Retained:**
- `users` ✓ (modified to include farm_id)
- `user_audit_logs` ✓ (modified to include farm_id)

**Functions Retained:**
- `freeze_user()` ✓
- `unfreeze_user()` ✓
- `log_user_action()` ✓ (updated with farm_id)

**Deleted Functions:**
- `create_user()` - Use direct INSERT instead
- `get_user_role()` - Use direct SELECT instead
- `is_admin()` - Use role check in queries

### ✅ System Configuration (Enhanced with farm_id)

**Tables Retained:**
- `system_settings` ✓ (modified to include farm_id)
- `shared_notepad` ✓ (modified to include farm_id)

## Statistics

### Table Count

| Category | Old Baseline | New Baseline | Change |
|----------|--------------|--------------|--------|
| Total Tables | 80+ | 31 | -49+ |
| Core Veterinary | 10 | 10 | 0 |
| Inventory | 5 | 5 | 0 |
| Synchronization | 6 | 6 | 0 |
| Health Tracking | 3 | 3 | 0 |
| Expenses | 2 | 2 | 0 |
| System | 5 | 5 | 0 |
| Multi-Tenancy | 0 | 1 | +1 |
| **Removed** | - | - | **-51** |

### View Count

| Category | Old Baseline | New Baseline | Change |
|----------|--------------|--------------|--------|
| Total Views | 48 | 9 | -39 |
| Veterinary | 8 | 5 | -3 |
| Inventory | 2 | 2 | 0 |
| Waste | 2 | 1 | -1 |
| Hoof Health | 4 | 1 | -3 |
| **Removed** | - | - | **-39** |

### Function Count

| Category | Old Baseline | New Baseline | Change |
|----------|--------------|--------------|--------|
| Total Functions | 70+ | 22 | -48+ |
| Inventory | 6 | 6 | 0 |
| Treatment | 4 | 4 | 0 |
| Synchronization | 4 | 4 | 0 |
| User Management | 5 | 3 | -2 |
| System | 3 | 1 | -2 |
| **Removed** | - | - | **-50+** |

### Trigger Count

| Category | Old Baseline | New Baseline | Change |
|----------|--------------|--------------|--------|
| Total Triggers | 80+ | 43 | -37+ |
| Updated At | 30 | 30 | 0 |
| Inventory | 5 | 5 | 0 |
| Treatment | 4 | 4 | 0 |
| Course | 2 | 2 | 0 |
| Vaccination | 1 | 1 | 0 |
| Synchronization | 1 | 1 | 0 |
| **Removed** | - | - | **-37+** |

## Key Improvements

### 1. Multi-Tenancy

**Before:** Single-tenant system  
**After:** 60+ farms supported with complete data isolation

**Impact:**
- ✅ Scalable to hundreds of farms
- ✅ Complete data security between tenants
- ✅ Simplified deployment (single instance)
- ✅ Centralized maintenance

### 2. Simplified Architecture

**Before:** 80+ tables covering many modules  
**After:** 31 focused tables for core operations

**Impact:**
- ✅ Easier to understand and maintain
- ✅ Faster queries (fewer joins)
- ✅ Reduced complexity
- ✅ Lower storage requirements

### 3. Enhanced Security

**Before:** Limited RLS, some tables open  
**After:** Complete RLS on all 31 tables

**Impact:**
- ✅ Farm data completely isolated
- ✅ Role-based access control
- ✅ Audit logging with farm context
- ✅ Admin-only operations protected

### 4. Maintained Core Features

All critical veterinary features preserved:
- ✅ FIFO inventory management
- ✅ Automatic batch splitting
- ✅ Withdrawal period calculation
- ✅ Medical waste auto-generation
- ✅ Treatment courses
- ✅ Synchronization protocols
- ✅ Hoof health tracking
- ✅ Regulatory reporting

### 5. Cleaner Function Signatures

**Before:**
```sql
fn_fifo_batch(p_product_id uuid) -- No farm context
```

**After:**
```sql
fn_fifo_batch(p_product_id uuid, p_farm_id uuid) -- Farm-aware
```

**Impact:**
- ✅ Explicit farm context
- ✅ Prevents cross-farm data leaks
- ✅ More testable

## Breaking Changes

### 1. All Queries Need farm_id

**Before:**
```sql
SELECT * FROM animals WHERE tag_no = 'LT001';
```

**After:**
```sql
SELECT * FROM animals WHERE farm_id = 'farm-uuid' AND tag_no = 'LT001';
-- Or rely on RLS:
SELECT * FROM animals WHERE tag_no = 'LT001';
```

### 2. All Inserts Need farm_id

**Before:**
```sql
INSERT INTO animals (tag_no, species) VALUES ('LT001', 'bovine');
```

**After:**
```sql
INSERT INTO animals (farm_id, tag_no, species) 
VALUES ('farm-uuid', 'LT001', 'bovine');
```

### 3. Function Signatures Changed

**Before:**
```sql
SELECT fn_fifo_batch('product-uuid');
```

**After:**
```sql
SELECT fn_fifo_batch('product-uuid', 'farm-uuid');
```

### 4. Users Table Changed

**Before:**
```sql
CREATE TABLE users (
    id uuid,
    email text NOT NULL,
    password_hash text NOT NULL,
    role text,
    ...
);
```

**After:**
```sql
CREATE TABLE users (
    id uuid,
    email text,  -- NOW NULLABLE
    password_hash text,  -- NOW NULLABLE
    role text NOT NULL,
    farm_id uuid NOT NULL,  -- NEW REQUIRED FIELD
    ...
);
```

**Impact:** Users without login (farm workers) can have NULL email/password.

### 5. Unique Constraints Changed

**Before:**
```sql
CREATE UNIQUE INDEX animals_tag_no_uk ON animals (tag_no);
```

**After:**
```sql
CREATE UNIQUE INDEX animals_farm_tag_no_uk ON animals (farm_id, tag_no);
```

**Impact:** Same tag_no can exist across different farms.

## Migration Path

### For Existing Installations

1. **Phase 1: Cleanup** (Already done)
   - Apply `20260312000000_remove_gea_and_unwanted_modules.sql`
   - Removes GEA, milk, equipment, vehicle modules

2. **Phase 2: Schema Recreation** (This migration)
   - Apply `20260312000001_rvac_baseline_schema.sql`
   - Creates new schema with multi-tenancy

3. **Phase 3: Data Migration** (Custom script needed)
   - Create farms
   - Assign users to farms
   - Migrate existing data with farm_id assignments

4. **Phase 4: Application Updates**
   - Update all queries to include farm_id
   - Update TypeScript types
   - Test multi-tenancy

### For New Installations

Simply apply all migrations:

```bash
supabase db reset
```

## Compatibility Notes

### What Stays Compatible

- ✅ All table names (except removed modules)
- ✅ All column names in retained tables
- ✅ All data types
- ✅ All enums (product_category, unit)
- ✅ Core business logic (FIFO, withdrawal, waste)

### What Breaks Compatibility

- ❌ Queries without farm_id filtering
- ❌ Inserts without farm_id
- ❌ Function calls without farm_id parameter
- ❌ Unique constraints (now farm-scoped)
- ❌ Direct table access (now RLS-protected)

## Testing Checklist

After migration, verify:

- [ ] All 31 tables exist
- [ ] All tables have farm_id (except hoof_condition_codes)
- [ ] RLS enabled on all tables
- [ ] 61 policies created
- [ ] FIFO respects farm boundaries
- [ ] Withdrawal calculation works
- [ ] Medical waste auto-generation works
- [ ] Treatment courses work
- [ ] Synchronization protocols work
- [ ] Users can only see their farm's data
- [ ] Admins can't access other farms
- [ ] All views return correct data
- [ ] All functions execute without errors
- [ ] All triggers fire correctly

## Performance Impact

### Expected Improvements

- ✅ **Faster queries:** Fewer tables to scan
- ✅ **Better indexes:** Farm_id indexes added everywhere
- ✅ **Smaller result sets:** RLS filters at database level
- ✅ **Reduced complexity:** Simpler query plans

### Potential Concerns

- ⚠️ **RLS overhead:** Minimal (< 5ms per query typically)
- ⚠️ **Farm_id joins:** Mitigated by comprehensive indexing
- ⚠️ **View complexity:** Some views have farm_id in WHERE clauses

### Monitoring Recommendations

```sql
-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check index usage
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## Rollback Considerations

### Can Rollback If:
- Migration applied but no data entered
- Testing phase only
- Issues discovered immediately

### Cannot Easily Rollback If:
- Production data entered with farm_id
- Users created with farm associations
- Multi-farm data already segregated
- Application code already updated

### Rollback Steps:

```bash
# 1. Backup current state
supabase db dump -f backup_before_rollback.sql

# 2. Roll back migration
supabase migration down --version 20260312000001

# 3. Verify old schema restored
psql -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"

# 4. Restore old data if needed
psql -f backup_original.sql
```

## Summary

### Removed: 51+ tables, 39 views, 50+ functions
- GEA integration
- Milk production
- Equipment management
- Vehicle management
- Worker portal
- Cost accumulation
- Fire safety
- Product quality

### Added: 1 table, 61 RLS policies, farm_id to 29 tables
- Multi-tenancy support
- Complete farm isolation
- Enhanced security

### Retained: All core veterinary features
- Treatments and courses
- Vaccinations
- FIFO inventory
- Withdrawal tracking
- Medical waste
- Biocide tracking
- Hoof health
- Synchronization protocols
- Insemination records
- Regulatory reporting

### Result: Focused, secure, multi-tenant veterinary system

**Lines of Code:**
- Old baseline: 15,241 lines
- New baseline: 2,584 lines
- **Reduction: 83%**

**Complexity:**
- Old: 80+ tables, 48 views, 70+ functions
- New: 31 tables, 9 views, 22 functions
- **Reduction: ~60%**

**Maintainability: Significantly improved**  
**Security: Significantly enhanced**  
**Performance: Expected to improve**  
**Multi-Tenancy: Fully supported**
