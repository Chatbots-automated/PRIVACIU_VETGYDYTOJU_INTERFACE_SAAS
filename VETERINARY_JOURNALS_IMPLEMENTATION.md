# Lithuanian Veterinary Journals Implementation

## Summary

I've successfully implemented all 5 official Lithuanian veterinary journal templates as requested. These journals match the exact structure, labels, and field names from the official forms.

## Implemented Journals

### 1. GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS (Treated Animals Registration Journal)
- **Template**: PRZ11.pdf reference
- **Official Form**: B1-735 (2005-12-29)
- **Layout**: Landscape A4
- **Data Source**: `vw_treated_animals_detailed`
- **Key Features**:
  - 14-column table with animal details
  - Treatment tracking with withdrawal periods (p-X;m-Y format)
  - Sequential row numbering (Eil. Nr.)
  - Supports multi-line treatment names and diagnoses

### 2. Veterinarinės medicinos produktų ir vaistinių pašarų žurnalas
(Production Animal Medicine Usage Control Journal)
- **Template**: irena zurnalas.pdf reference
- **Official Reference**: B1-390 (2003-04-18)
- **Layout**: Landscape A4
- **Data Source**: `vw_treated_animals_detailed` (filtered for production animals)
- **Key Features**:
  - Specific farm owner tracking
  - Medicine usage per animal
  - Signature fields for owner and veterinarian

### 3. VETERINARINIŲ VAISTŲ, BIOCIDŲ LIKUTIS (Stock Balance)
- **Template**: likutis11.pdf reference
- **Official Form**: B1-735 (2005-12-29)
- **Layout**: Portrait A4
- **Data Source**: `vw_vet_drug_journal`
- **Key Features**:
  - Two-row format (description + data)
  - Tracks received, used, and remaining quantities
  - Batch/series tracking
  - Registration number display

### 4. SUNAUDOTŲ VETERINARINIŲ VAISTŲ, BIOCIDŲ NURAŠYMO AKTAS
(Used Medicines Write-off Act)
- **Template**: nurasymas11.pdf reference
- **Official Form**: B1-735 (2005-12-29)
- **Layout**: Portrait A4
- **Data Source**: `vw_vet_drug_journal` (filtered for used items)
- **Key Features**:
  - Monthly usage summary
  - Lithuanian date formatting
  - Write-off documentation

### 5. Veterinarinių darbų atlikimo aktas (Work Completion Act)
- **Template**: irena darbai.pdf reference
- **Layout**: Portrait A4
- **Data Source**: treatments table (can be extended to charges table)
- **Key Features**:
  - Service/work listing
  - Income tracking
  - Dual signature section (accepted by / performed by)

## File Structure

```
src/
├── types/
│   └── veterinaryJournals.ts          # TypeScript interfaces for all journals
├── components/
│   └── journals/
│       ├── TreatedAnimalRegistrationJournal.tsx
│       ├── ProductionAnimalMedicineUsageJournal.tsx
│       ├── MedicineBiocideStockBalance.tsx
│       ├── MedicineBiocideWriteOffAct.tsx
│       ├── VeterinaryWorkCompletionAct.tsx
│       ├── JournalReports.tsx         # Report wrapper components
│       ├── JournalStyles.css          # Print-friendly CSS
│       └── index.ts                   # Exports
└── utils/
    └── journalAdapters.ts             # Data transformation functions
```

## How to Use

### In the Ataskaitos Tab

1. Navigate to the Ataskaitos (Reports) tab
2. Select one of the new journal report types:
   - **GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS**
   - **Produkcijos gyvūnų vaistų žurnalas**
   - **Vaistų, biocidų likutis**
   - **Vaistų nurašymo aktas**
   - **Veterinarinių darbų atlikimo aktas**

3. Apply filters (date range, products, animals, etc.)
4. Click "Spausdinti / PDF" to print or save as PDF

### Programmatic Usage

```typescript
import {
  TreatedAnimalRegistrationReport,
  ProductionAnimalMedicineUsageReport,
  MedicineBiocideStockBalanceReport,
  MedicineBiocideWriteOffActReport,
  VeterinaryWorkCompletionActReport
} from './components/journals/JournalReports';

// Example: Treated Animal Registration Journal
<TreatedAnimalRegistrationReport 
  data={treatedAnimalsData}
  periodStart="2024.11.01"
  periodEnd="2024.11.30"
  veterinaryProviderName="Artūro Abromaičio Veterinarija"
  responsibleVetName="Artūras Abromaitis"
/>
```

## Key Implementation Details

### 1. Exact Label Matching
All Lithuanian labels, column names, and official text blocks match the original forms exactly:
- "Forma patvirtinta..." blocks
- Column headers (Eil. Nr., Reg. data, etc.)
- Field labels
- Date formats

### 2. Data Transformation
The `journalAdapters.ts` file contains functions that transform database records into journal-ready formats:
- `transformToTreatedAnimalRegistrationJournal()`
- `transformToProductionAnimalMedicineUsageJournal()`
- `transformToMedicineBiocideStockBalance()`
- `transformToMedicineBiocideWriteOffAct()`
- `transformToVeterinaryWorkCompletionAct()`

### 3. Print-Friendly Styling
The `JournalStyles.css` includes:
- A4 portrait and landscape page formats
- Print-specific CSS (@media print)
- Table border styling matching official forms
- Page break controls
- Lithuanian date formatting

### 4. Withdrawal Format
Withdrawal periods are displayed in the official format: `p-X;m-Y`
- `p` = pienas (milk) days
- `m` = mėsa (meat) days
- Example: `p-3;m-8` means 3 days milk withdrawal, 8 days meat withdrawal

### 5. Sequential Row Numbering
The Treated Animal Registration Journal uses proper sequential numbering:
- Each unique treatment gets a sequential Eil. Nr.
- Multiple medicine rows for the same treatment share the same number
- Numbers are assigned based on registration date (oldest first)

## Database Views Used

1. **vw_treated_animals_detailed**: 
   - Used by journals 1 and 2
   - Contains treatment, animal, disease, and medicine data
   - Includes withdrawal calculations

2. **vw_vet_drug_journal**:
   - Used by journals 3 and 4
   - Contains medicine stock data (received, used, remaining)
   - Includes batch and expiry tracking

3. **treatments table**:
   - Used by journal 5 (can be extended to use a charges/billing table)
   - Contains service/work records

## Customization

### Provider Information
Default values are set in `journalAdapters.ts`:
```typescript
veterinaryProviderName = 'Artūro Abromaičio Artūro Abromaičio Veterinarija'
responsibleVetName = 'Artūras Abromaitis'
place = 'Miežiškiai'
```

These can be overridden when calling the report components.

### Date Formats
- Database format: YYYY-MM-DD or YYYY.MM.DD
- Lithuanian format: "2024 m. lapkritis 1 d."
- Conversion handled by `formatLithuanianDate()` function

## Print Settings

### Landscape (Journals 1 & 2)
- Page size: A4 landscape (297mm × 210mm)
- Margin: 10mm
- Font size: 8-9px for tables

### Portrait (Journals 3, 4 & 5)
- Page size: A4 portrait (210mm × 297mm)
- Margin: 10mm
- Font size: 8-10px for tables

### Browser Print Dialog
Use the browser's print dialog (Ctrl+P / Cmd+P) to:
- Save as PDF
- Adjust margins
- Print directly

## Compliance Notes

✅ **Official Form References**: All "Forma patvirtinta" blocks match official requirements
✅ **Column Names**: Exact Lithuanian labels preserved (no translation or simplification)
✅ **Date Formats**: Support both YYYY.MM.DD and Lithuanian text formats
✅ **Multi-line Support**: Treatment and diagnosis fields support wrapping
✅ **Empty Cells**: Empty cells remain visibly empty (not replaced with dashes)
✅ **Decimal Format**: Lithuanian format preserved (comma for decimals if needed)

## Future Enhancements

1. **Work Completion Act Data Source**: 
   - Currently uses treatments table as placeholder
   - Should be extended to use a dedicated charges/billing table with income amounts

2. **Digital Signatures**:
   - Add support for digital signature capture
   - Store signature images with journal records

3. **Batch Printing**:
   - Print multiple periods/months at once
   - Automatic page numbering across multiple reports

4. **Export Options**:
   - PDF generation with proper metadata
   - Excel export with formatting preserved

5. **Archive System**:
   - Save generated journals as permanent records
   - Version control for historical journals

## Testing Checklist

- [x] All 5 journal components render without errors
- [x] Print/PDF output maintains proper formatting
- [x] Landscape orientation works (journals 1 & 2)
- [x] Portrait orientation works (journals 3, 4 & 5)
- [x] Lithuanian labels display correctly
- [x] Data transformation functions work
- [x] Empty data states handled gracefully
- [x] Date filters apply correctly
- [x] Sequential numbering works (journal 1)
- [x] Withdrawal format correct (p-X;m-Y)

## Questions for User

1. **Work Completion Act Income Data**: Do you have a charges/billing table, or should we create one? Currently using treatments as placeholder.

2. **Provider Name Configuration**: Would you like these to be configurable per farm in the settings, or keep as parameters?

3. **Archive/Save Feature**: Should generated journals be saved to the database for historical records?

4. **Digital Signatures**: Do you need digital signature capture for the signature fields?

5. **Language Consistency**: Some field values (like animal species, diseases) - should these always be in Lithuanian, or support both languages?
