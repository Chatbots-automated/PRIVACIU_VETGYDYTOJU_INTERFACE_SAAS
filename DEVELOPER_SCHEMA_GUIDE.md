# RVAC Schema Developer Guide

## Quick Start

### Understanding Multi-Tenancy

Every data table has a `farm_id` column that links to the `farms` table:

```sql
farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE NOT NULL
```

**Exception:** `hoof_condition_codes` is a shared reference table.

### User Context

Users are associated with a farm:

```sql
SELECT farm_id FROM public.users WHERE id = auth.uid();
```

The helper function `get_user_farm_id()` returns the current user's farm.

## Common Queries

### 1. Get All Animals for Current User's Farm

```sql
SELECT * FROM public.animals
WHERE farm_id = public.get_user_farm_id();
```

RLS automatically filters this, so you can also just:

```sql
SELECT * FROM public.animals;
```

### 2. Create a Treatment

```sql
INSERT INTO public.treatments (
    farm_id,
    animal_id,
    disease_id,
    reg_date,
    clinical_diagnosis,
    vet_name
) VALUES (
    public.get_user_farm_id(),
    'animal-uuid',
    'disease-uuid',
    CURRENT_DATE,
    'Mastitis',
    'Dr. Veterinaras'
);
```

### 3. Record Product Usage (with FIFO)

```sql
-- Get the next batch to use (FIFO)
SELECT public.fn_fifo_batch('product-uuid', public.get_user_farm_id());

-- Create usage record (auto-deducts from batch)
INSERT INTO public.usage_items (
    farm_id,
    treatment_id,
    product_id,
    batch_id,
    qty,
    unit,
    purpose
) VALUES (
    public.get_user_farm_id(),
    'treatment-uuid',
    'product-uuid',
    'batch-uuid',
    10,
    'ml',
    'treatment'
);
```

**Note:** If the batch doesn't have enough stock, the system will automatically split across multiple batches (FIFO order).

### 4. Check Current Stock

```sql
-- By batch
SELECT * FROM public.stock_by_batch
WHERE farm_id = public.get_user_farm_id()
  AND product_id = 'product-uuid';

-- By product (aggregated)
SELECT * FROM public.stock_by_product
WHERE farm_id = public.get_user_farm_id();
```

### 5. Create a Treatment Course

```sql
INSERT INTO public.treatment_courses (
    farm_id,
    treatment_id,
    product_id,
    batch_id,
    total_dose,
    daily_dose,
    days,
    unit,
    start_date
) VALUES (
    public.get_user_farm_id(),
    'treatment-uuid',
    'product-uuid',
    'batch-uuid',
    100,
    10,
    10,
    'ml',
    CURRENT_DATE
);
```

**Result:** Automatically creates 10 `course_doses` records and calculates withdrawal dates.

### 6. Record a Vaccination

```sql
INSERT INTO public.vaccinations (
    farm_id,
    animal_id,
    product_id,
    batch_id,
    vaccination_date,
    dose_amount,
    unit,
    administered_by
) VALUES (
    public.get_user_farm_id(),
    'animal-uuid',
    'vaccine-product-uuid',
    'batch-uuid',
    CURRENT_DATE,
    2,
    'ml',
    'Tech Name'
);
```

**Result:** Automatically creates a `usage_items` record and deducts from batch.

### 7. Start a Synchronization Protocol

```sql
SELECT public.initialize_animal_synchronization(
    'animal-uuid',
    'protocol-uuid',
    CURRENT_DATE,
    public.get_user_farm_id()
);
```

**Result:** Creates `animal_synchronizations` record and all `synchronization_steps` based on protocol template.

### 8. Check Withdrawal Status

```sql
SELECT * FROM public.vw_withdrawal_status
WHERE farm_id = public.get_user_farm_id()
  AND animal_id = 'animal-uuid';
```

### 9. View Drug Usage Journal (Regulatory)

```sql
SELECT * FROM public.vw_vet_drug_journal
WHERE farm_id = public.get_user_farm_id()
  AND use_date BETWEEN '2026-01-01' AND '2026-12-31'
ORDER BY use_date DESC;
```

### 10. Track Medical Waste

```sql
-- View all waste
SELECT * FROM public.vw_medical_waste
WHERE farm_id = public.get_user_farm_id()
ORDER BY date DESC;

-- Auto-generated waste (from depleted batches)
SELECT * FROM public.vw_medical_waste
WHERE farm_id = public.get_user_farm_id()
  AND auto_generated = true;
```

## Automatic Behaviors

### 1. FIFO Inventory Management

When you insert a `usage_items` record:

1. **Stock Check:** Validates sufficient stock exists
2. **Auto-Split:** If single batch insufficient, splits across multiple batches (FIFO order)
3. **Deduction:** Updates `batches.qty_left`
4. **Status Update:** Marks batch as 'depleted' when qty_left reaches 0
5. **Waste Generation:** Auto-creates medical waste entry for depleted batches

### 2. Withdrawal Period Calculation

When medications are used (via `usage_items` or `treatment_courses`):

1. **Automatic Calculation:** Computes withdrawal dates for milk and meat
2. **Course Consideration:** Adds course duration to withdrawal period
3. **Maximum Selection:** Uses longest withdrawal period if multiple meds used
4. **Real-time Updates:** Immediately updates `treatments` table

### 3. Treatment Courses

When you create a `treatment_courses` record:

1. **Dose Schedule:** Automatically creates `course_doses` for each day
2. **Withdrawal Calc:** Triggers withdrawal date calculation
3. **Progress Tracking:** Updates `doses_administered` as doses are given
4. **Auto-Completion:** Marks course as 'completed' when all doses administered

### 4. Batch Management

When you create a `batches` record:

1. **Received Qty:** Auto-calculates from `package_size × package_count`
2. **Qty Left:** Initializes to `received_qty`
3. **Batch Number:** Auto-generates from lot or date
4. **Status:** Sets to 'active'

### 5. Synchronization Protocols

When you initialize a synchronization:

1. **Step Creation:** All protocol steps created automatically
2. **Date Calculation:** Scheduled dates computed from start_date + day_offset
3. **Completion Tracking:** Protocol status updates when all steps complete
4. **Medication Deduction:** Stock deducted when steps marked complete

## Important Constraints

### Usage Items Source Constraint

A `usage_items` record must link to EXACTLY ONE of:
- `treatment_id`
- `vaccination_id`
- `biocide_usage_id`

```sql
CONSTRAINT usage_items_source_check CHECK (
    (treatment_id IS NOT NULL AND vaccination_id IS NULL AND biocide_usage_id IS NULL) OR
    (treatment_id IS NULL AND vaccination_id IS NOT NULL AND biocide_usage_id IS NULL) OR
    (treatment_id IS NULL AND vaccination_id IS NULL AND biocide_usage_id IS NOT NULL)
)
```

### Batch Status Values

- `active` - Available for use
- `depleted` - Qty_left = 0
- `expired` - Past expiry_date

### Treatment Course Status

- `active` - In progress
- `completed` - All doses administered
- `cancelled` - Discontinued

### Synchronization Status

- `Active` - In progress
- `Completed` - All steps done
- `Cancelled` - Discontinued

### Visit Status

- `Planuojamas` - Planned
- `Vykdomas` - In progress
- `Baigtas` - Completed
- `Atšauktas` - Cancelled
- `Neįvykęs` - Did not occur

## TypeScript Integration

### Example Types

```typescript
export interface Farm {
  id: string;
  name: string;
  code?: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Animal {
  id: string;
  farm_id: string;
  tag_no?: string;
  species?: string;
  sex?: string;
  age_months?: number;
  holder_name?: string;
  holder_address?: string;
  breed?: string;
  birth_date?: string;
  active: boolean;
  updated_from_vic_at?: string;
  source?: string;
  created_at: string;
  updated_at: string;
}

export interface Treatment {
  id: string;
  farm_id: string;
  animal_id?: string;
  disease_id?: string;
  visit_id?: string;
  reg_date: string;
  first_symptoms_date?: string;
  animal_condition?: string;
  tests?: string;
  clinical_diagnosis?: string;
  outcome?: string;
  services?: string;
  withdrawal_until?: string;
  withdrawal_until_milk?: string;
  withdrawal_until_meat?: string;
  vet_name?: string;
  vet_signature_path?: string;
  notes?: string;
  mastitis_teat?: 'LF' | 'RF' | 'LR' | 'RR';
  mastitis_type?: 'new' | 'recurring';
  syringe_count?: number;
  creates_future_visits?: boolean;
  affected_teats?: any[];
  sick_teats?: any[];
  disabled_teats?: string[];
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  farm_id: string;
  product_id: string;
  supplier_id?: string;
  invoice_id?: string;
  lot?: string;
  mfg_date?: string;
  expiry_date?: string;
  doc_title?: string;
  doc_number?: string;
  doc_date?: string;
  purchase_price?: number;
  currency?: string;
  received_qty: number;
  qty_left?: number;
  invoice_path?: string;
  serial_number?: string;
  package_size?: number;
  package_count?: number;
  batch_number?: string;
  status?: 'active' | 'depleted' | 'expired';
  created_at: string;
  updated_at: string;
}

export type ProductCategory = 
  | 'medicines'
  | 'prevention'
  | 'reproduction'
  | 'treatment_materials'
  | 'hygiene'
  | 'biocide'
  | 'technical'
  | 'svirkstukai'
  | 'bolusas'
  | 'vakcina';

export type Unit = 
  | 'ml'
  | 'l'
  | 'g'
  | 'kg'
  | 'pcs'
  | 'vnt'
  | 'tablet'
  | 'bolus'
  | 'syringe';
```

## Testing the Schema

### 1. Create a Test Farm

```sql
INSERT INTO public.farms (name, code, is_active)
VALUES ('Test Farm', 'TEST001', true)
RETURNING id;
```

### 2. Create a Test User

```sql
INSERT INTO public.users (farm_id, email, role, full_name)
VALUES ('farm-uuid', 'test@example.com', 'admin', 'Test Admin')
RETURNING id;
```

### 3. Add Test Products

```sql
INSERT INTO public.products (farm_id, name, category, primary_pack_unit, primary_pack_size, withdrawal_days_milk, withdrawal_days_meat)
VALUES 
    ('farm-uuid', 'Penicilinas', 'medicines', 'ml', 100, 4, 7),
    ('farm-uuid', 'Vakcina BVD', 'vakcina', 'ml', 10, 0, 0);
```

### 4. Add Test Batches

```sql
INSERT INTO public.batches (farm_id, product_id, lot, expiry_date, received_qty, package_size, package_count)
VALUES 
    ('farm-uuid', 'product-uuid', 'LOT123', '2027-12-31', 1000, 100, 10);
```

### 5. Create Test Animal

```sql
INSERT INTO public.animals (farm_id, tag_no, species, sex, active)
VALUES ('farm-uuid', 'LT001234567', 'bovine', 'F', true)
RETURNING id;
```

### 6. Test Treatment Flow

```sql
-- Create treatment
INSERT INTO public.treatments (farm_id, animal_id, reg_date, clinical_diagnosis, vet_name)
VALUES ('farm-uuid', 'animal-uuid', CURRENT_DATE, 'Mastitis', 'Dr. Test')
RETURNING id;

-- Use medication (auto-deducts from batch, calculates withdrawal)
INSERT INTO public.usage_items (farm_id, treatment_id, product_id, batch_id, qty, unit)
VALUES ('farm-uuid', 'treatment-uuid', 'product-uuid', 'batch-uuid', 10, 'ml');

-- Check withdrawal status
SELECT * FROM public.vw_withdrawal_status
WHERE animal_id = 'animal-uuid';
```

## Common Patterns

### Pattern 1: FIFO Batch Selection

```typescript
// Get next batch to use
const { data: batchId } = await supabase
  .rpc('fn_fifo_batch', { 
    p_product_id: productId,
    p_farm_id: farmId 
  });

// Use the batch
await supabase.from('usage_items').insert({
  farm_id: farmId,
  treatment_id: treatmentId,
  product_id: productId,
  batch_id: batchId,
  qty: 10,
  unit: 'ml'
});
```

### Pattern 2: Treatment with Course

```typescript
// 1. Create treatment
const { data: treatment } = await supabase
  .from('treatments')
  .insert({
    farm_id: farmId,
    animal_id: animalId,
    disease_id: diseaseId,
    reg_date: new Date().toISOString().split('T')[0],
    clinical_diagnosis: 'Mastitis',
    vet_name: 'Dr. Smith'
  })
  .select()
  .single();

// 2. Create treatment course (auto-creates doses)
const { data: course } = await supabase
  .from('treatment_courses')
  .insert({
    farm_id: farmId,
    treatment_id: treatment.id,
    product_id: productId,
    batch_id: batchId,
    total_dose: 100,
    daily_dose: 10,
    days: 10,
    unit: 'ml',
    start_date: new Date().toISOString().split('T')[0]
  })
  .select()
  .single();

// 3. Withdrawal dates are automatically calculated
```

### Pattern 3: Synchronization Protocol

```typescript
// Initialize synchronization
const { data: syncId } = await supabase
  .rpc('initialize_animal_synchronization', {
    p_animal_id: animalId,
    p_protocol_id: protocolId,
    p_start_date: startDate,
    p_farm_id: farmId
  });

// Get all steps
const { data: steps } = await supabase
  .from('synchronization_steps')
  .select('*')
  .eq('synchronization_id', syncId)
  .order('step_number');

// Complete a step
const { data: success } = await supabase
  .rpc('complete_synchronization_step', {
    p_step_id: stepId,
    p_batch_id: batchId,
    p_actual_dosage: 5,
    p_actual_unit: 'ml',
    p_notes: 'Completed successfully'
  });
```

### Pattern 4: Stock Alerts

```typescript
// Get low stock items
const { data: lowStock } = await supabase
  .from('stock_by_batch')
  .select('*')
  .eq('farm_id', farmId)
  .eq('stock_status', 'Low Stock');

// Get expired batches
const { data: expired } = await supabase
  .from('stock_by_batch')
  .select('*')
  .eq('farm_id', farmId)
  .eq('stock_status', 'Expired');
```

### Pattern 5: Regulatory Reports

```typescript
// Drug usage journal
const { data: drugJournal } = await supabase
  .from('vw_vet_drug_journal')
  .select('*')
  .eq('farm_id', farmId)
  .gte('use_date', '2026-01-01')
  .lte('use_date', '2026-12-31')
  .order('use_date', { ascending: false });

// Biocide usage
const { data: biocideJournal } = await supabase
  .from('vw_biocide_journal')
  .select('*')
  .eq('farm_id', farmId)
  .gte('use_date', '2026-01-01')
  .lte('use_date', '2026-12-31');

// Medical waste
const { data: waste } = await supabase
  .from('vw_medical_waste')
  .select('*')
  .eq('farm_id', farmId)
  .gte('date', '2026-01-01')
  .lte('date', '2026-12-31');
```

## Security Notes

### Row Level Security (RLS)

All tables have RLS enabled. Policies ensure:

1. **Farm Isolation:** Users can only access their farm's data
2. **Role-Based Access:**
   - `admin` - Full access to farm data + user management
   - `vet` - Full access to veterinary operations
   - `tech` - Full access to veterinary operations
   - `viewer` - Read-only access

3. **Automatic Filtering:** No need to manually add farm_id filters in most queries

### Admin-Only Operations

These functions require admin role:
- `freeze_user(user_id, admin_id)`
- `unfreeze_user(user_id, admin_id)`
- Managing `system_settings`
- Viewing `user_audit_logs`

## Performance Tips

### 1. Use Indexes

All foreign keys and farm_id columns are indexed. Queries filtering by these are fast.

### 2. Use Views for Complex Queries

Instead of joining multiple tables, use the provided views:
- `treatment_history_view` - Complete treatment details
- `stock_by_batch` - Inventory with usage
- `vw_withdrawal_status` - Current withdrawal periods

### 3. Batch Operations

When inserting multiple records, use batch inserts:

```typescript
await supabase.from('animals').insert([
  { farm_id: farmId, tag_no: 'LT001', ... },
  { farm_id: farmId, tag_no: 'LT002', ... },
  // ... more animals
]);
```

### 4. Avoid N+1 Queries

Use joins or views instead of multiple queries:

```typescript
// Bad: N+1 queries
const treatments = await getTreatments();
for (const t of treatments) {
  const animal = await getAnimal(t.animal_id);
  const disease = await getDisease(t.disease_id);
}

// Good: Single query with joins
const { data } = await supabase
  .from('treatment_history_view')
  .select('*')
  .eq('farm_id', farmId);
```

## Troubleshooting

### Error: "Nepakanka atsargų" (Insufficient stock)

**Cause:** Trying to use more product than available across all batches.

**Solution:** 
1. Check stock: `SELECT * FROM stock_by_product WHERE product_id = 'xxx'`
2. Add more inventory via `batches` table
3. Verify batch status is 'active' and not expired

### Error: "Serija nerasta" (Batch not found)

**Cause:** Invalid batch_id or batch belongs to different farm.

**Solution:**
1. Verify batch exists and belongs to your farm
2. Use `fn_fifo_batch()` to get valid batch_id

### Withdrawal Dates Not Calculating

**Cause:** Medications don't have withdrawal periods set.

**Solution:**
1. Check `products.withdrawal_days_milk` and `withdrawal_days_meat`
2. Only medicines with withdrawal_days > 0 affect withdrawal dates

### RLS Blocking Queries

**Cause:** User not properly authenticated or farm_id mismatch.

**Solution:**
1. Ensure user is authenticated: `SELECT auth.uid()`
2. Verify user has farm_id: `SELECT farm_id FROM users WHERE id = auth.uid()`
3. Check RLS policies are correctly configured

## Migration from Old Schema

If you have existing data:

1. **Backup everything**
2. **Create farms table and populate**
3. **Update users with farm_id**
4. **Migrate data with farm_id assignments**
5. **Verify data integrity**
6. **Test RLS policies**
7. **Update application code**

## Support

For issues or questions:
1. Check this guide first
2. Review the schema comments in the migration file
3. Test queries in Supabase SQL Editor
4. Verify RLS policies are working as expected
