# Multi-Tenancy Implementation Guide for RVAC

**Target:** Support 60+ farms in a single system  
**Current Status:** Single-farm system (no multi-tenancy)  
**Priority:** HIGH - Required before production deployment

---

## 🎯 Overview

This guide outlines the complete implementation plan for adding multi-tenancy support to the RVAC Veterinarija system to support 60 farms.

---

## 📋 Implementation Phases

### **Phase 1: Database Schema Design**

#### 1.1 Create Farms Table

```sql
CREATE TABLE public.farms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_code text UNIQUE NOT NULL,
  farm_name text NOT NULL,
  legal_name text,
  company_code text,
  vat_code text,
  address text,
  city text,
  postal_code text,
  phone text,
  email text,
  contact_person text,
  contact_phone text,
  is_active boolean DEFAULT true,
  onboarded_at timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_farms_farm_code ON public.farms(farm_code);
CREATE INDEX idx_farms_is_active ON public.farms(is_active);

COMMENT ON TABLE public.farms IS 'Registry of all farms managed by RVAC';
```

#### 1.2 Add farm_id to Core Tables

**Tables requiring farm_id:**

```sql
-- Animals
ALTER TABLE public.animals ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_animals_farm_id ON public.animals(farm_id);

-- Treatments
ALTER TABLE public.treatments ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_treatments_farm_id ON public.treatments(farm_id);

-- Vaccinations
ALTER TABLE public.vaccinations ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_vaccinations_farm_id ON public.vaccinations(farm_id);

-- Animal Visits
ALTER TABLE public.animal_visits ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_animal_visits_farm_id ON public.animal_visits(farm_id);

-- Synchronizations
ALTER TABLE public.synchronization_protocols ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.animal_synchronizations ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_sync_protocols_farm_id ON public.synchronization_protocols(farm_id);
CREATE INDEX idx_animal_syncs_farm_id ON public.animal_synchronizations(farm_id);

-- Insemination
ALTER TABLE public.insemination_records ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_insemination_records_farm_id ON public.insemination_records(farm_id);

-- Hoof Records
ALTER TABLE public.hoof_records ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_hoof_records_farm_id ON public.hoof_records(farm_id);

-- Biocide Usage
ALTER TABLE public.biocide_usage ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_biocide_usage_farm_id ON public.biocide_usage(farm_id);

-- Invoices
ALTER TABLE public.invoices ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_invoices_farm_id ON public.invoices(farm_id);
```

#### 1.3 Shared vs Farm-Specific Data

**Decision needed:** Should these be shared across all farms or farm-specific?

**Recommend SHARED (no farm_id):**
- `products` - Product catalog (shared across all farms)
- `suppliers` - Supplier registry (shared)
- `diseases` - Disease codes (standardized)
- `hoof_condition_codes` - Hoof conditions (standardized)

**Recommend FARM-SPECIFIC (add farm_id):**
- `batches` - Inventory is farm-specific
- `synchronization_protocols` - Protocols may differ per farm
- `insemination_products` - Inventory is farm-specific
- `insemination_inventory` - Stock is farm-specific

```sql
-- Batches (farm-specific inventory)
ALTER TABLE public.batches ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
CREATE INDEX idx_batches_farm_id ON public.batches(farm_id);

-- Insemination Products (if farm-specific)
ALTER TABLE public.insemination_products ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
ALTER TABLE public.insemination_inventory ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE CASCADE;
```

#### 1.4 User-Farm Relationships

**Option A: Single Farm per User**
```sql
ALTER TABLE public.users ADD COLUMN farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL;
CREATE INDEX idx_users_farm_id ON public.users(farm_id);
```

**Option B: Multiple Farms per User (Recommended for RVAC)**
```sql
CREATE TABLE public.user_farm_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  farm_id uuid NOT NULL REFERENCES public.farms(id) ON DELETE CASCADE,
  is_default boolean DEFAULT false,
  granted_at timestamptz DEFAULT now(),
  granted_by uuid REFERENCES public.users(id),
  UNIQUE(user_id, farm_id)
);

CREATE INDEX idx_user_farm_access_user_id ON public.user_farm_access(user_id);
CREATE INDEX idx_user_farm_access_farm_id ON public.user_farm_access(farm_id);

COMMENT ON TABLE public.user_farm_access IS 'Many-to-many relationship between users and farms';
```

---

### **Phase 2: Update Database Views**

All views need to be updated to include `farm_id` filtering.

#### Example: Update vw_vet_drug_journal

```sql
CREATE OR REPLACE VIEW vw_vet_drug_journal AS
SELECT
  b.id as batch_id,
  b.farm_id,  -- ADD THIS
  p.name as product_name,
  -- ... rest of columns
FROM batches b
JOIN products p ON p.id = b.product_id
-- ... rest of query
ORDER BY b.farm_id, b.created_at DESC;  -- ADD farm_id to ordering
```

**Views to update:**
- `vw_vet_drug_journal`
- `vw_treated_animals_detailed`
- `vw_biocide_journal`
- `vw_medical_waste`
- `vw_medical_waste_with_details`
- `stock_by_batch`
- `stock_by_product`
- `hoof_analytics_summary`
- `hoof_condition_trends`
- `hoof_followup_needed`
- `hoof_recurring_problems`

---

### **Phase 3: Update RLS Policies**

**Critical:** Implement farm-level data isolation!

#### Example: Animals Table

```sql
-- Drop existing permissive policy
DROP POLICY IF EXISTS "Allow all operations" ON public.animals;

-- Create farm-specific policies
CREATE POLICY "Users can view animals from their farms"
  ON public.animals FOR SELECT
  TO authenticated
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert animals to their farms"
  ON public.animals FOR INSERT
  TO authenticated
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update animals in their farms"
  ON public.animals FOR UPDATE
  TO authenticated
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_access WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_access WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete animals from their farms"
  ON public.animals FOR DELETE
  TO authenticated
  USING (
    farm_id IN (
      SELECT farm_id FROM public.user_farm_access WHERE user_id = auth.uid()
    )
  );
```

**Apply similar policies to all farm-specific tables!**

---

### **Phase 4: Frontend Implementation**

#### 4.1 Update AuthContext

Add farm selection to authentication context:

```typescript
// src/contexts/AuthContext.tsx

interface AuthContextType {
  // ... existing fields
  currentFarmId: string | null;
  availableFarms: Farm[];
  switchFarm: (farmId: string) => void;
}

// Add to context provider:
const [currentFarmId, setCurrentFarmId] = useState<string | null>(null);
const [availableFarms, setAvailableFarms] = useState<Farm[]>([]);

// Load user's farms on login
useEffect(() => {
  if (user) {
    loadUserFarms();
  }
}, [user]);

const loadUserFarms = async () => {
  const { data } = await supabase
    .from('user_farm_access')
    .select('farm_id, farms(*)')
    .eq('user_id', user.id);
  
  if (data) {
    setAvailableFarms(data.map(d => d.farms));
    
    // Set default farm
    const defaultFarm = data.find(d => d.is_default);
    if (defaultFarm) {
      setCurrentFarmId(defaultFarm.farm_id);
    } else if (data.length > 0) {
      setCurrentFarmId(data[0].farm_id);
    }
  }
};

const switchFarm = (farmId: string) => {
  setCurrentFarmId(farmId);
  // Optionally save to localStorage
  localStorage.setItem('currentFarmId', farmId);
};
```

#### 4.2 Create Farm Selector Component

```typescript
// src/components/FarmSelector.tsx

export function FarmSelector() {
  const { currentFarmId, availableFarms, switchFarm } = useAuth();
  
  if (availableFarms.length <= 1) return null;
  
  return (
    <select
      value={currentFarmId || ''}
      onChange={(e) => switchFarm(e.target.value)}
      className="px-4 py-2 bg-white border border-gray-300 rounded-lg"
    >
      {availableFarms.map(farm => (
        <option key={farm.id} value={farm.id}>
          {farm.farm_name}
        </option>
      ))}
    </select>
  );
}
```

#### 4.3 Add Farm Filter to All Queries

**Example - Update Dashboard.tsx:**

```typescript
// Before:
const { data: animals } = await supabase
  .from('animals')
  .select('*');

// After:
const { data: animals } = await supabase
  .from('animals')
  .select('*')
  .eq('farm_id', currentFarmId);  // ADD THIS TO EVERY QUERY
```

**Files requiring updates (~30+ files):**
- All components that query farm-specific data
- All helper functions that fetch data

#### 4.4 Update Insert Operations

When creating new records, always include farm_id:

```typescript
// Before:
await supabase.from('animals').insert({
  tag_no: '12345',
  species: 'Galvijas'
});

// After:
await supabase.from('animals').insert({
  tag_no: '12345',
  species: 'Galvijas',
  farm_id: currentFarmId  // ADD THIS
});
```

#### 4.5 Add Farm Selector to Layout

```typescript
// src/components/Layout.tsx

import { FarmSelector } from './FarmSelector';

// Add to sidebar header:
<div className="p-4 border-b border-emerald-700/50">
  <div className="mb-4">
    {/* Existing logo and title */}
  </div>
  <FarmSelector />  {/* ADD THIS */}
</div>
```

---

### **Phase 5: Data Migration**

#### 5.1 Create Default Farm

```sql
-- Create a default farm for existing data
INSERT INTO public.farms (
  farm_code,
  farm_name,
  legal_name,
  is_active
) VALUES (
  'LEGACY',
  'Pradiniai Duomenys',
  'Legacy Data from Berčiūnai System',
  true
) RETURNING id;

-- Save the returned ID for next step
```

#### 5.2 Assign Existing Data to Default Farm

```sql
-- Get the default farm ID
DO $$
DECLARE
  default_farm_id uuid;
BEGIN
  SELECT id INTO default_farm_id FROM public.farms WHERE farm_code = 'LEGACY';
  
  -- Update all tables with farm_id
  UPDATE public.animals SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.treatments SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.vaccinations SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.animal_visits SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.batches SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.synchronization_protocols SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.animal_synchronizations SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.insemination_records SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.hoof_records SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.biocide_usage SET farm_id = default_farm_id WHERE farm_id IS NULL;
  UPDATE public.invoices SET farm_id = default_farm_id WHERE farm_id IS NULL;
END $$;
```

#### 5.3 Make farm_id NOT NULL

After data migration:

```sql
-- Make farm_id required
ALTER TABLE public.animals ALTER COLUMN farm_id SET NOT NULL;
ALTER TABLE public.treatments ALTER COLUMN farm_id SET NOT NULL;
ALTER TABLE public.vaccinations ALTER COLUMN farm_id SET NOT NULL;
ALTER TABLE public.animal_visits ALTER COLUMN farm_id SET NOT NULL;
ALTER TABLE public.batches ALTER COLUMN farm_id SET NOT NULL;
-- ... repeat for all tables
```

---

### **Phase 6: Bulk Farm Import**

#### 6.1 Create Farm Import Template

Create Excel template with columns:
- farm_code (unique identifier)
- farm_name (display name)
- legal_name (full legal name)
- company_code (įmonės kodas)
- vat_code (PVM kodas)
- address
- city
- postal_code
- phone
- email
- contact_person
- contact_phone

#### 6.2 Create Import Function

```sql
CREATE OR REPLACE FUNCTION public.import_farms(farms_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  farm_record jsonb;
  inserted_count int := 0;
  failed_count int := 0;
  result jsonb;
BEGIN
  FOR farm_record IN SELECT * FROM jsonb_array_elements(farms_data)
  LOOP
    BEGIN
      INSERT INTO public.farms (
        farm_code,
        farm_name,
        legal_name,
        company_code,
        vat_code,
        address,
        city,
        postal_code,
        phone,
        email,
        contact_person,
        contact_phone
      ) VALUES (
        farm_record->>'farm_code',
        farm_record->>'farm_name',
        farm_record->>'legal_name',
        farm_record->>'company_code',
        farm_record->>'vat_code',
        farm_record->>'address',
        farm_record->>'city',
        farm_record->>'postal_code',
        farm_record->>'phone',
        farm_record->>'email',
        farm_record->>'contact_person',
        farm_record->>'contact_phone'
      );
      inserted_count := inserted_count + 1;
    EXCEPTION WHEN OTHERS THEN
      failed_count := failed_count + 1;
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'inserted', inserted_count,
    'failed', failed_count
  );
  
  RETURN result;
END;
$$;
```

#### 6.3 Create Farm Management UI

```typescript
// src/components/FarmManagement.tsx

export function FarmManagement() {
  const [farms, setFarms] = useState<Farm[]>([]);
  
  const handleImportExcel = async (file: File) => {
    // Parse Excel file
    const workbook = XLSX.read(await file.arrayBuffer());
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    // Call import function
    const { data: result } = await supabase.rpc('import_farms', {
      farms_data: data
    });
    
    console.log('Import result:', result);
  };
  
  return (
    <div>
      <h2>Ūkių Valdymas</h2>
      <input type="file" accept=".xlsx" onChange={(e) => {
        if (e.target.files?.[0]) handleImportExcel(e.target.files[0]);
      }} />
      {/* Farm list, edit, deactivate */}
    </div>
  );
}
```

---

### **Phase 7: Testing Strategy**

#### 7.1 Create Test Farms

```sql
-- Create 3 test farms
INSERT INTO public.farms (farm_code, farm_name) VALUES
  ('TEST001', 'Testinis Ūkis 1'),
  ('TEST002', 'Testinis Ūkis 2'),
  ('TEST003', 'Testinis Ūkis 3');
```

#### 7.2 Create Test Data

```sql
-- Create test animals for each farm
INSERT INTO public.animals (farm_id, tag_no, species) 
SELECT id, 'TEST-' || farm_code, 'Galvijas' 
FROM public.farms 
WHERE farm_code LIKE 'TEST%';
```

#### 7.3 Test Data Isolation

1. Login as user assigned to TEST001
2. Verify only TEST001 animals visible
3. Try to access TEST002 data (should fail)
4. Switch to TEST002
5. Verify TEST002 animals visible, TEST001 not visible

---

### **Phase 8: Performance Optimization**

#### 8.1 Composite Indexes

```sql
-- Optimize common queries
CREATE INDEX idx_animals_farm_tag ON public.animals(farm_id, tag_no);
CREATE INDEX idx_treatments_farm_date ON public.treatments(farm_id, reg_date DESC);
CREATE INDEX idx_batches_farm_product ON public.batches(farm_id, product_id);
```

#### 8.2 Materialized Views (if needed)

For expensive cross-farm analytics:

```sql
CREATE MATERIALIZED VIEW mv_farm_statistics AS
SELECT
  farm_id,
  COUNT(DISTINCT id) as animal_count,
  COUNT(DISTINCT id) FILTER (WHERE active = true) as active_animals
FROM public.animals
GROUP BY farm_id;

CREATE UNIQUE INDEX idx_mv_farm_stats_farm_id ON mv_farm_statistics(farm_id);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_farm_statistics;
```

---

### **Phase 9: Automated Farm Onboarding**

#### 9.1 Farm Onboarding Workflow

```typescript
// src/lib/farmOnboarding.ts

export async function onboardNewFarm(farmData: {
  farm_code: string;
  farm_name: string;
  // ... other fields
}) {
  // 1. Create farm record
  const { data: farm, error } = await supabase
    .from('farms')
    .insert(farmData)
    .select()
    .single();
  
  if (error) throw error;
  
  // 2. Create default synchronization protocols for this farm
  await createDefaultProtocols(farm.id);
  
  // 3. Create default products/batches (if needed)
  await createDefaultInventory(farm.id);
  
  // 4. Assign admin users to farm
  await assignAdminUsers(farm.id);
  
  return farm;
}

async function createDefaultProtocols(farmId: string) {
  // Copy standard protocols to new farm
  const standardProtocols = [
    {
      name: 'Ovsynch',
      description: 'Standartinis sinchronizacijos protokolas',
      steps: [/* protocol steps */]
    }
  ];
  
  for (const protocol of standardProtocols) {
    await supabase.from('synchronization_protocols').insert({
      ...protocol,
      farm_id: farmId
    });
  }
}
```

#### 9.2 Bulk Farm Upload Feature

```typescript
// Add to FarmManagement component

const handleBulkUpload = async (file: File) => {
  const farms = await parseExcelFile(file);
  
  for (const farm of farms) {
    try {
      await onboardNewFarm(farm);
      console.log(`✅ Onboarded: ${farm.farm_name}`);
    } catch (error) {
      console.error(`❌ Failed: ${farm.farm_name}`, error);
    }
  }
};
```

---

### **Phase 10: Migration Checklist**

#### Pre-Migration:
- [ ] Backup entire database
- [ ] Test migration on staging environment
- [ ] Verify all queries include farm_id filter
- [ ] Test RLS policies thoroughly
- [ ] Document rollback procedure

#### Migration:
- [ ] Create farms table
- [ ] Add farm_id columns to all tables
- [ ] Create default farm
- [ ] Migrate existing data to default farm
- [ ] Make farm_id NOT NULL
- [ ] Update all views
- [ ] Update RLS policies
- [ ] Create user_farm_access records

#### Post-Migration:
- [ ] Verify data integrity
- [ ] Test all modules with farm filtering
- [ ] Import 60 farms
- [ ] Assign users to farms
- [ ] Train users on farm switching
- [ ] Monitor performance

---

## 🔍 Query Pattern Examples

### Before (Single Farm):
```typescript
const { data } = await supabase
  .from('animals')
  .select('*')
  .eq('active', true);
```

### After (Multi-Farm):
```typescript
const { currentFarmId } = useAuth();

const { data } = await supabase
  .from('animals')
  .select('*')
  .eq('farm_id', currentFarmId)  // ALWAYS ADD THIS
  .eq('active', true);
```

---

## 📊 Estimated Effort

- **Database Schema:** 2-3 days
- **RLS Policies:** 1-2 days
- **Frontend Updates:** 3-5 days
- **Testing:** 2-3 days
- **Farm Import:** 1 day
- **Total:** ~10-15 days

---

## ⚠️ Risks & Considerations

1. **Data Isolation Critical** - RLS policies must be perfect to prevent data leaks
2. **Performance Impact** - Additional farm_id filtering on every query
3. **Shared Resources** - Decide what's shared vs farm-specific
4. **User Experience** - Farm switching must be intuitive
5. **Migration Complexity** - 60 farms is significant data volume

---

## 🎯 Success Criteria

- [ ] Users can only see data from their assigned farms
- [ ] Farm switching works seamlessly
- [ ] All 60 farms onboarded successfully
- [ ] No performance degradation
- [ ] All existing features work with multi-tenancy
- [ ] Data isolation verified through testing

---

## 📚 Additional Resources

- Supabase RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
- Multi-tenancy Best Practices: https://supabase.com/docs/guides/database/multi-tenancy

---

**Document Version:** 1.0  
**Last Updated:** March 12, 2026  
**Status:** 🟡 Planning Phase - Implementation Required
