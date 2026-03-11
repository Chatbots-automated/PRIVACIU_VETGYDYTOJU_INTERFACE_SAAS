# RVAC Schema Quick Reference

## 🏗️ Architecture

**Multi-Tenant:** 60+ farms, isolated by `farm_id`  
**Modules:** Veterinarija (Veterinary) + Išlaidos (Expenses)  
**Security:** Row Level Security (RLS) on all 31 tables

## 📊 Tables (31)

### Core System (5)
| Table | Purpose |
|-------|---------|
| `farms` | Tenant root |
| `users` | User accounts |
| `user_audit_logs` | Audit trail |
| `system_settings` | Configuration |
| `shared_notepad` | Team notes |

### Veterinary (9)
| Table | Purpose |
|-------|---------|
| `animals` | Animal registry |
| `treatments` | Treatment records |
| `animal_visits` | Visit scheduling |
| `diseases` | Disease catalog |
| `vaccinations` | Vaccination records |
| `usage_items` | Product usage |
| `treatment_courses` | Multi-day treatments |
| `course_doses` | Course schedule |
| `course_medication_schedules` | Flexible dosing |
| `teat_status` | Disabled teats |

### Inventory (5)
| Table | Purpose |
|-------|---------|
| `products` | Product catalog |
| `batches` | Inventory batches |
| `suppliers` | Supplier registry |
| `invoices` | Invoice records |
| `invoice_items` | Invoice lines |

### Synchronization (6)
| Table | Purpose |
|-------|---------|
| `synchronization_protocols` | Protocol templates |
| `animal_synchronizations` | Active protocols |
| `synchronization_steps` | Protocol steps |
| `insemination_products` | Sperm/gloves |
| `insemination_inventory` | Insem. stock |
| `insemination_records` | Insemination log |

### Health (3)
| Table | Purpose |
|-------|---------|
| `hoof_records` | Hoof examinations |
| `hoof_condition_codes` | Condition reference |
| `biocide_usage` | Prevention tracking |

### Waste (2)
| Table | Purpose |
|-------|---------|
| `medical_waste` | Waste tracking |
| `batch_waste_tracking` | Waste deduplication |

## 🔍 Key Views (9)

| View | Purpose |
|------|---------|
| `stock_by_batch` | Batch inventory + status |
| `stock_by_product` | Product inventory (aggregated) |
| `treatment_history_view` | Complete treatment details |
| `vw_withdrawal_status` | Current withdrawal periods |
| `animal_visit_summary` | Visit overview |
| `vw_vet_drug_journal` | Drug usage (regulatory) |
| `vw_biocide_journal` | Biocide usage (regulatory) |
| `vw_medical_waste` | Waste tracking |
| `hoof_analytics_summary` | Hoof health metrics |

## ⚙️ Key Functions (22)

### Inventory
- `fn_fifo_batch(product_id, farm_id)` - Get next batch (FIFO)
- `auto_split_usage_items()` - Split across batches
- `update_batch_qty_left()` - Deduct stock
- `auto_generate_medical_waste(batch_id)` - Create waste

### Treatment
- `calculate_withdrawal_dates(treatment_id)` - Compute withdrawal
- `create_course_doses()` - Generate dose schedule
- `check_course_completion()` - Update course status

### Synchronization
- `initialize_animal_synchronization(...)` - Start protocol
- `complete_synchronization_step(...)` - Mark step done
- `deduct_sync_step_medication()` - Deduct meds

### User Management
- `freeze_user(user_id, admin_id)` - Freeze account
- `unfreeze_user(user_id, admin_id)` - Unfreeze account
- `log_user_action(...)` - Audit logging

### Utility
- `get_user_farm_id()` - Get current user's farm
- `trigger_set_timestamp()` - Update updated_at

## 🔐 Security

### RLS Enabled: All 31 tables

### Policy Pattern:
```sql
-- View data in your farm
USING (farm_id = public.get_user_farm_id())

-- Modify data in your farm
WITH CHECK (farm_id = public.get_user_farm_id())
```

### Exceptions:
- `hoof_condition_codes` - All can view (reference table)
- `user_audit_logs` - Admins only
- `system_settings` - Admins can modify

## 🚀 Common Operations

### Get FIFO Batch
```sql
SELECT public.fn_fifo_batch('product-uuid', 'farm-uuid');
```

### Record Treatment
```sql
INSERT INTO treatments (farm_id, animal_id, clinical_diagnosis, vet_name)
VALUES ('farm-uuid', 'animal-uuid', 'Mastitis', 'Dr. Smith');
```

### Use Medication
```sql
INSERT INTO usage_items (farm_id, treatment_id, product_id, batch_id, qty, unit)
VALUES ('farm-uuid', 'treatment-uuid', 'product-uuid', 'batch-uuid', 10, 'ml');
-- Auto: deducts stock, calculates withdrawal, may split batches, generates waste
```

### Create Course
```sql
INSERT INTO treatment_courses (farm_id, treatment_id, product_id, days, daily_dose, unit)
VALUES ('farm-uuid', 'treatment-uuid', 'product-uuid', 5, 10, 'ml');
-- Auto: creates 5 course_doses, calculates withdrawal
```

### Start Synchronization
```sql
SELECT initialize_animal_synchronization(
    'animal-uuid', 'protocol-uuid', CURRENT_DATE, 'farm-uuid'
);
-- Auto: creates all protocol steps
```

### Check Stock
```sql
SELECT * FROM stock_by_product WHERE farm_id = 'farm-uuid';
```

### View Withdrawal Status
```sql
SELECT * FROM vw_withdrawal_status WHERE farm_id = 'farm-uuid';
```

## 🎯 Auto-Behaviors

### When you INSERT usage_items:
1. ✅ Validates stock exists
2. ✅ Auto-splits across batches if needed (FIFO)
3. ✅ Deducts from batch.qty_left
4. ✅ Updates batch.status to 'depleted' if empty
5. ✅ Generates medical_waste if depleted
6. ✅ Calculates withdrawal dates (if treatment)

### When you INSERT treatment_courses:
1. ✅ Creates course_doses for each day
2. ✅ Calculates withdrawal dates

### When you INSERT vaccinations:
1. ✅ Creates usage_items record
2. ✅ Deducts from batch

### When you INSERT batches:
1. ✅ Calculates received_qty (package_size × package_count)
2. ✅ Sets qty_left = received_qty
3. ✅ Generates batch_number
4. ✅ Sets status = 'active'

### When you UPDATE course_doses (administer):
1. ✅ Updates doses_administered count
2. ✅ Marks course 'completed' when all doses given

### When you UPDATE synchronization_steps (complete):
1. ✅ Deducts medication from inventory
2. ✅ Marks protocol 'Completed' when all steps done

## 📝 Enums

### product_category
`medicines`, `prevention`, `reproduction`, `treatment_materials`, `hygiene`, `biocide`, `technical`, `svirkstukai`, `bolusas`, `vakcina`

### unit
`ml`, `l`, `g`, `kg`, `pcs`, `vnt`, `tablet`, `bolus`, `syringe`

### User Roles
`admin`, `vet`, `tech`, `viewer`

### Batch Status
`active`, `depleted`, `expired`

### Course Status
`active`, `completed`, `cancelled`

### Sync Status
`Active`, `Completed`, `Cancelled`

### Visit Status
`Planuojamas`, `Vykdomas`, `Baigtas`, `Atšauktas`, `Neįvykęs`

## 🔗 Key Relationships

```
farms (1) ──→ (N) users
farms (1) ──→ (N) animals
farms (1) ──→ (N) products

animals (1) ──→ (N) treatments
animals (1) ──→ (N) vaccinations
animals (1) ──→ (N) animal_visits
animals (1) ──→ (N) hoof_records
animals (1) ──→ (N) insemination_records

treatments (1) ──→ (N) usage_items
treatments (1) ──→ (N) treatment_courses

treatment_courses (1) ──→ (N) course_doses
treatment_courses (1) ──→ (N) animal_visits

products (1) ──→ (N) batches
batches (1) ──→ (N) usage_items

synchronization_protocols (1) ──→ (N) animal_synchronizations
animal_synchronizations (1) ──→ (N) synchronization_steps
```

## 📈 Indexes

All tables indexed on:
- ✅ `farm_id` (tenant isolation)
- ✅ Foreign keys (join performance)
- ✅ Date columns (temporal queries)
- ✅ Status columns (filtering)

Unique indexes:
- `animals(farm_id, tag_no)` - No duplicate tags per farm
- `diseases(farm_id, name)` - No duplicate disease names per farm
- `system_settings(farm_id, setting_key)` - One value per setting per farm

## ⚡ Performance Tips

1. **Use views** for complex queries
2. **Batch inserts** when adding multiple records
3. **Let RLS filter** - don't add redundant WHERE clauses
4. **Use FIFO function** - don't manually select batches
5. **Trust triggers** - they handle stock/withdrawal automatically

## 🐛 Common Errors

### "Nepakanka atsargų"
**Cause:** Insufficient stock  
**Fix:** Add more batches or reduce quantity

### "Serija nerasta"
**Cause:** Invalid batch_id  
**Fix:** Use `fn_fifo_batch()` to get valid batch

### RLS Permission Denied
**Cause:** User not authenticated or wrong farm  
**Fix:** Check `auth.uid()` and user's `farm_id`

### Foreign Key Violation
**Cause:** Referenced record doesn't exist  
**Fix:** Create parent record first

## 📞 Quick Checks

### Am I authenticated?
```sql
SELECT auth.uid();
```

### What's my farm?
```sql
SELECT farm_id FROM users WHERE id = auth.uid();
```

### How much stock?
```sql
SELECT * FROM stock_by_product WHERE farm_id = get_user_farm_id();
```

### Any withdrawals active?
```sql
SELECT * FROM vw_withdrawal_status 
WHERE farm_id = get_user_farm_id() 
  AND (milk_active OR meat_active);
```

### Recent treatments?
```sql
SELECT * FROM treatment_history_view 
WHERE farm_id = get_user_farm_id() 
ORDER BY reg_date DESC 
LIMIT 10;
```

## 📚 Documentation

- **Full Schema:** `20260312000001_rvac_baseline_schema.sql`
- **Summary:** `BASELINE_SCHEMA_SUMMARY.md`
- **Developer Guide:** `DEVELOPER_SCHEMA_GUIDE.md`
- **Migration Checklist:** `SCHEMA_MIGRATION_CHECKLIST.md`
- **Changes Summary:** `SCHEMA_CHANGES_SUMMARY.md`

## 🎯 Migration File

**Location:** `supabase/migrations/20260312000001_rvac_baseline_schema.sql`  
**Lines:** 2,584  
**Apply:** `supabase db reset` (fresh) or `supabase migration up` (incremental)

---

**Last Updated:** 2026-03-12  
**Schema Version:** 20260312000001
