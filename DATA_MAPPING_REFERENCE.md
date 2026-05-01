# Data Mapping Reference for Veterinary Journals

## Database View Fields → Journal Fields Mapping

### Template 1: GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS

| Journal Column | Database Field | Transformation | Notes |
|----------------|----------------|----------------|-------|
| Eil. Nr. | - | Sequential numbering by treatment_id | Assigned during transformation |
| Reg. data | registration_date | YYYY.MM.DD format | From view |
| Gyvūno laikytojas, adresas | owner_name + owner_address | Concatenate with newline | Both from animals table |
| Ženklinimo | animal_tag | Direct | Tag number or animal name |
| Amžius | age_months OR birth_date | Calculate from months or show date | "X m. Y mėn." or birth date |
| Rūšis | species | Direct | Karvė, Katė, Šuo, etc. |
| Gydymo laikotarpis | medicine_days | Show days | "1" or "X d." |
| Gyvūno būklė | animal_condition | Direct or default | Default: "Patenkinama" |
| Lab. tyrimai | tests | Direct | Can include temperature |
| Klinikinė diagnozė | disease_name OR clinical_diagnosis | Use disease_name first | Can be multi-line |
| Gydymas | services + medicine_name | Concatenate | Can be multi-line |
| Dozė | medicine_dose + medicine_unit | Concatenate | "X ml" format |
| Išlauka | withdrawal_days_meat + withdrawal_days_milk | Format as p-X;m-Y | Lithuanian format |
| Baigtis | treatment_outcome | Direct | May be empty |

### Template 2: Production Animal Medicine Usage Journal

| Journal Column | Database Field | Transformation | Notes |
|----------------|----------------|----------------|-------|
| Eil. Nr. | - | Sequential row number | 1, 2, 3... |
| Reg. data | registration_date | YYYY.MM.DD | From view |
| Ženklinimo Nr | animal_tag | Direct | Production animal ID |
| Rūšis | species | Direct | Karvė, Kiaulė, etc. |
| Amžius | age_months OR birth_date | Show months or date | Can be numeric or date |
| Gydymo laikotarpis | medicine_days | Days as string | "1" or larger |
| Klinikinė diagnozė | disease_name OR clinical_diagnosis | Direct | Diagnosis text |
| Medikamento pavadinimas | medicine_name | Direct | Medicine product name |
| Sunaudota | medicine_dose | String | Used amount |
| Išlauka | withdrawal_days_meat + withdrawal_days_milk | Format as p-X;m-Y | Withdrawal format |
| Savininko parašas | - | Empty (to be signed) | Blank field |
| Vet.gydytojo parašas | - | Empty (to be signed) | Blank field |

**Filtering**: Only production animals (species: karvė, bulius, kiaulė, avis, ožka)

### Template 3: VETERINARINIŲ VAISTŲ, BIOCIDŲ LIKUTIS

Uses `vw_vet_drug_journal` view.

#### Row A (Description Row)
| Journal Field | Database Field | Transformation | Notes |
|---------------|----------------|----------------|-------|
| itemCategoryText | - | Fixed: "Veterinarinio vaisto, biopreparato" | Hardcoded |
| packageLabel | - | Fixed: "Pirminė pakuotė (mato vnt.)" | Hardcoded |
| packageUnit | unit OR primary_pack_unit | Direct | But, Tab, vnt, etc. |
| productName | product_name | Direct | Medicine name |
| registrationNumberText | registration_code | Format: "Registracijos NrXX" | Prefix added |

#### Row B (Data Row)
| Journal Field | Database Field | Transformation | Notes |
|---------------|----------------|----------------|-------|
| documentNumber | invoice_number OR doc_number | Direct | Source document |
| expiryDate | expiry_date | YYYY.MM.DD | Expiration date |
| batchSeries | batch_number OR lot | Direct | Batch/LOT number |
| receivedQuantity | quantity_received | String | Received qty |
| usedQuantity | quantity_used | String | Used qty |
| remainingQuantity | quantity_remaining | String | Remaining qty |

### Template 4: SUNAUDOTŲ VETERINARINIŲ VAISTŲ, BIOCIDŲ NURAŠYMO AKTAS

Uses `vw_vet_drug_journal` view, filtered for `quantity_used > 0`.

| Journal Column | Database Field | Transformation | Notes |
|----------------|----------------|----------------|-------|
| EilNr | - | Sequential row number | 1, 2, 3... |
| Veterinarinio vaisto,biocido pavadinimas | product_name | Direct | Product name |
| Serija | batch_number OR lot | Direct | Batch series |
| Matavimo vnt. | unit OR primary_pack_unit | Direct | Fl., Tab, But, etc. |
| Sunaudotas kiekis | quantity_used | String | Used amount |

**Header Fields**:
- `periodText`: Lithuanian date format (formatLithuanianDate)
- `documentDateText`: Lithuanian date format
- `place`: Default "Miežiškiai" or custom

### Template 5: Veterinarinių darbų atlikimo aktas

Currently uses `treatments` table as placeholder. Should use charges/billing table.

| Journal Column | Database Field | Transformation | Notes |
|----------------|----------------|----------------|-------|
| Eil. | - | Sequential row number | 1, 2, 3... |
| Data | reg_date (or service_date) | YYYY.MM.DD | Service date |
| Darbo pavadinimas | clinical_diagnosis (or service_name) | Direct | Work/service name |
| Dokumento Nr | id (or invoice_no) | Direct | Document reference |
| Įplaukos | charge_amount (or income) | String | Income amount |

**Footer**:
- `totalIncome`: Sum of all income values
- `acceptedByName`: Farm owner name
- `performedByName`: Veterinarian name

## Database Views Structure

### vw_treated_animals_detailed

Key fields used:
```sql
- farm_id
- treatment_id
- animal_id
- animal_tag
- species
- sex
- birth_date
- age_months
- owner_name
- owner_address
- registration_date
- animal_condition
- tests
- clinical_diagnosis
- disease_name
- medicine_name
- medicine_dose
- medicine_unit
- medicine_days
- services
- withdrawal_until_meat
- withdrawal_until_milk
- withdrawal_days_meat
- withdrawal_days_milk
- treatment_outcome
- veterinarian (vet_name)
```

### vw_vet_drug_journal

Key fields used:
```sql
- farm_id
- batch_id
- product_id
- product_name
- registration_code
- active_substance
- supplier_name
- unit (primary_pack_unit)
- receipt_date
- expiry_date
- batch_number (lot)
- quantity_received (received_qty)
- quantity_used
- quantity_remaining (qty_left)
- invoice_number (doc_number)
- invoice_date (doc_date)
```

## Age Calculation Logic

```typescript
if (age_months) {
  const years = Math.floor(age_months / 12);
  const months = age_months % 12;
  
  if (years > 0 && months > 0) {
    return `${years} m. ${months} mėn.`;  // e.g., "2 m. 3 mėn."
  } else if (years > 0) {
    return `${years} m.`;  // e.g., "2 m."
  } else {
    return `${months} mėn.`;  // e.g., "3 mėn."
  }
} else if (birth_date) {
  return birth_date;  // Show as YYYY.MM.DD
}
```

## Withdrawal Format Logic

```typescript
const meatDays = withdrawal_days_meat || 0;
const milkDays = withdrawal_days_milk || 0;
const withdrawal = `p-${meatDays};m-${milkDays}`;
// Examples:
// p-0;m-0 (no withdrawal)
// p-3;m-8 (3 days milk, 8 days meat)
// p-0;m-10 (10 days meat only)
```

## Lithuanian Date Formatting

```typescript
function formatLithuanianDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('lt-LT', { month: 'long' });
  const day = date.getDate();
  
  return `${year} m. ${month} ${day} d.`;
}

// Examples:
// "2024-11-01" → "2024 m. lapkritis 1 d."
// "2024-11-30" → "2024 m. lapkritis 30 d."
```

## Production Animal Filter

```typescript
result = result.filter(r => {
  const species = r.species?.toLowerCase() || '';
  return ['karvė', 'bulius', 'kiaulė', 'avis', 'ožka'].some(s => 
    species.includes(s)
  );
});
```

## Sequential Row Numbering (Template 1)

```typescript
const treatmentNumbers = new Map<string, number>();
let currentNumber = 1;

sortedData.forEach((record) => {
  if (!treatmentNumbers.has(record.treatment_id)) {
    treatmentNumbers.set(record.treatment_id, currentNumber);
    currentNumber++;
  }
  const eilNr = treatmentNumbers.get(record.treatment_id);
  // Use eilNr for this row
});
```

This ensures that:
- Each unique treatment gets a sequential number
- Multiple medicine entries for the same treatment share the same Eil. Nr.
- Numbers are assigned in chronological order (oldest first)

## Empty vs. Dash Handling

| Scenario | Display | Notes |
|----------|---------|-------|
| Field is null/undefined | '-' | Placeholder |
| Field is empty string '' | '-' | Placeholder |
| Field has value | Display value | Actual data |
| Numeric field is 0 | '0' | Show zero explicitly |
| Array/list is empty | '-' | Empty list |

Special case for withdrawal:
- If both meat and milk are 0: display 'p-0;m-0'
- If both are null/undefined: display empty string ''

## Report Type Identifiers

In Reports.tsx:
```typescript
'treated_animal_registration' // Template 1
'production_animal_medicine'  // Template 2
'stock_balance'              // Template 3
'write_off_act'              // Template 4
'work_completion_act'        // Template 5
```

## Future Data Source Improvements

### Work Completion Act (Template 5)
Should use a dedicated charges table:
```sql
CREATE TABLE vet_charges (
  id UUID PRIMARY KEY,
  farm_id UUID REFERENCES farms(id),
  service_date DATE,
  service_name TEXT,
  document_no TEXT,
  amount DECIMAL(10,2),
  treatment_id UUID REFERENCES treatments(id),
  paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

This would provide proper income tracking for the Work Completion Act journal.
