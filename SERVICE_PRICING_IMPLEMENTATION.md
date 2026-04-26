# Service-Based Pricing Implementation

## Overview

Visit costs are now calculated dynamically based on actual service prices configured in the **Finansai → Kainų valdymas** (Finances → Price Management) section, instead of using a hardcoded 10 EUR per visit.

## How It Works

### 1. Service Prices Table

The `service_prices` table stores procedure prices per client:

```sql
CREATE TABLE public.service_prices (
    id uuid PRIMARY KEY,
    client_id uuid REFERENCES public.clients(id),
    procedure_type text NOT NULL,
    base_price numeric(10,2) NOT NULL DEFAULT 0,
    active boolean DEFAULT true,
    ...
)
```

**Procedure Types:**
- Gydymas (Treatment)
- Vakcina (Vaccination)
- Profilaktika (Prevention)
- Temperatūra (Temperature)
- Apžiūra (Examination)
- Konsultacija (Consultation)
- Skubus iškvietimas (Emergency call)
- Sinchronizacijos protokolas (Synchronization protocol)
- Diagnostika (Diagnostics)

### 2. Animal Visits Store Procedures

When a visit is created (e.g., through Bulk Treatment), the `procedures` array is stored in `animal_visits`:

```typescript
await supabase.from('animal_visits').insert({
  client_id: clientId,
  farm_id: selectedFarm.id,
  animal_id: animal.id,
  procedures: ['Gydymas', 'Vakcina'], // Array of procedure types
  status: 'Baigtas',
  ...
});
```

### 3. Cost Calculation (TreatmentCostAnalysis)

The **Gydymų kaštai** (Treatment Cost Analysis) tab:

1. **Loads service prices** on component mount:
   ```typescript
   const { data: servicePricesData } = await supabase
     .from('service_prices')
     .select('procedure_type, base_price')
     .eq('client_id', clientId)
     .eq('active', true);
   ```

2. **Creates a lookup map**:
   ```typescript
   const servicePricesMap = new Map<string, number>();
   // Example: { 'Gydymas' => 15.00, 'Vakcina' => 5.00, ... }
   ```

3. **Calculates visit cost** based on procedures:
   ```typescript
   const calculateVisitServiceCost = (procedures: string[] | null): number => {
     if (!procedures || procedures.length === 0) return 0;
     
     let totalCost = 0;
     for (const procedure of procedures) {
       const price = servicePrices.get(procedure) || 0;
       totalCost += price;
     }
     return totalCost;
   };
   ```

## Examples

### Example 1: Single Procedure Visit
- Visit has procedures: `['Gydymas']`
- Service price for Gydymas: 15 EUR
- **Visit cost: 15 EUR**

### Example 2: Multiple Procedures Visit
- Visit has procedures: `['Gydymas', 'Vakcina']`
- Service price for Gydymas: 15 EUR
- Service price for Vakcina: 5 EUR
- **Visit cost: 20 EUR**

### Example 3: Bulk Treatment - 5 Cows Vaccinated
When using **Masinis gydymas** to vaccinate 5 cows:
- Creates 5 separate visits, each with procedures: `['Vakcina']`
- Service price for Vakcina: 5 EUR
- Each visit cost: 5 EUR
- **Total service cost: 5 × 5 = 25 EUR**

## Benefits

1. **Flexible Pricing**: Each client can set their own service prices
2. **Accurate Costing**: Reflects actual prices charged to farmers
3. **Multi-Procedure Support**: Visits can have multiple procedures with correct total cost
4. **Easy Price Updates**: Change prices in one place (Finansai → Kainų valdymas), applies everywhere
5. **No Hardcoded Values**: System adapts to any pricing structure

## UI Changes

### Before
- "Vizitų bazinė kaina: €10.00 / vizitas" (hardcoded)
- "Vizitai (2 × €10): €20.00"

### After
- "Vizitų kainos: Pagal paslaugų kainas (Finansai → Kainų valdymas)"
- "Paslaugos (2 vizitai): €30.00" (calculated from actual procedures and prices)

## Where Prices Are Used

1. **TreatmentCostAnalysis** (`src/components/TreatmentCostAnalysis.tsx`)
   - Main treatment cost analysis and reporting
   - Per-animal cost breakdown
   - Visit detail views

2. **Future Integration Points**
   - Invoice generation (when implemented)
   - Financial reports
   - Profitability analysis

## Configuration

To set service prices:

1. Navigate to **Finansai** (Finances) module
2. Go to **Kainų valdymas** (Price Management)
3. Set prices for each procedure type
4. Prices are applied immediately to all cost calculations

## Database Schema

```sql
-- Service prices are per client
SELECT procedure_type, base_price 
FROM service_prices 
WHERE client_id = :client_id 
  AND active = true;

-- Animal visits store procedures array
SELECT id, procedures 
FROM animal_visits 
WHERE animal_id = :animal_id 
  AND status = 'Baigtas';

-- Example procedures value: ['Gydymas', 'Vakcina', 'Profilaktika']
```

## Technical Notes

- **Client-level pricing**: Prices are stored per `client_id`, not per `farm_id`
- **Active prices only**: Only `active = true` prices are used in calculations
- **Zero cost handling**: If a procedure has no price configured, it contributes 0 EUR to the total
- **Array support**: PostgreSQL array type is used for `procedures` column
- **Dynamic calculation**: Costs are calculated on-demand, not stored with visits

## Migration Path

### Old System
- Hardcoded `VISIT_BASE_COST = 10` EUR
- All visits cost the same regardless of procedures

### New System
- Load prices from `service_prices` table
- Calculate based on actual procedures performed
- Supports multiple procedures per visit

### Backward Compatibility
- If no service prices are configured, visits will have 0 EUR service cost
- Medication and product costs continue to work as before
- Only the service/procedure portion of visit costs changed

---

**Implementation Date:** April 26, 2026
**Status:** ✅ Complete
**Impact:** All treatment cost calculations now use configured service prices
