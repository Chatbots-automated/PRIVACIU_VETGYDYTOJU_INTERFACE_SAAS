// =====================================================================
// TypeScript interfaces for Lithuanian veterinary journals
// =====================================================================
// These interfaces match the official Lithuanian veterinary journal formats
// ALL labels, column names, and field names MUST match the original documents exactly

// =====================================================================
// TEMPLATE 1: GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS
// =====================================================================

export interface TreatedAnimalRegistrationJournal {
  veterinaryProviderName: string;
  periodStart: string; // YYYY.MM.DD
  periodEnd: string; // YYYY.MM.DD
  officialFormText: string; // "Forma patvirtinta..." text
  responsibleVetName: string;
  pageNumber?: number;
  totalPages?: number;
  rows: TreatedAnimalRegistrationRow[];
}

export interface TreatedAnimalRegistrationRow {
  rowNo: number | string; // Eil. Nr.
  registrationDate: string; // Reg. data, YYYY.MM.DD
  animalHolderAndAddress: string; // Gyvūno laikytojas, adresas
  animalIdentifier: string; // Ženklinimo (tag number or name)
  animalAge: string; // Amžius (can be birth date YYYY.MM.DD or number)
  animalSpecies: string; // Rūšis
  treatmentPeriod: string; // Gydymo laikotarpis
  animalCondition: string; // Gyvūno būklė
  labTests: string; // Lab. tyrimai
  clinicalDiagnosis: string; // Klinikinė diagnozė
  treatment: string; // Gydymas (can be multi-line)
  dose: string; // Dozė
  withdrawal: string; // Išlauka (format: p-X;m-Y)
  outcome: string; // Baigtis
}

// =====================================================================
// TEMPLATE 2: VETERINARINĖS MEDICINOS PRODUKTŲ IR VAISTINIŲ PAŠARŲ 
//            NAUDOJAMŲ PRODUKCIJOS GYVŪNAMS APSKAITOS IR NAUDOJIMO 
//            KONTROLĖS ŽURNALAS
// =====================================================================

export interface ProductionAnimalMedicineUsageJournal {
  veterinaryProviderName: string;
  animalOwnerName: string;
  officialReferenceText: string; // "Vadovaujantis..." text
  pageNumber?: number;
  totalPages?: number;
  rows: ProductionAnimalMedicineUsageRow[];
}

export interface ProductionAnimalMedicineUsageRow {
  rowNo: number | string; // Eil. Nr.
  registrationDate: string; // Reg. data
  animalIdentifier: string; // Ženklinimo Nr
  animalSpecies: string; // Rūšis
  animalAge: string; // Amžius
  treatmentPeriod: string; // Gydymo laikotarpis
  clinicalDiagnosis: string; // Klinikinė diagnozė
  medicationName: string; // Medikamento pavadinimas
  usedAmount: string; // Sunaudota
  withdrawal: string; // Išlauka (format: p-X;m-Y)
  ownerSignature: string; // Savininko parašas
  vetSignature: string; // Vet.gydytojo parašas
}

// =====================================================================
// TEMPLATE 3: VETERINARINIŲ VAISTŲ, BIOCIDŲ LIKUTIS
// =====================================================================

export interface VeterinaryMedicineBiocideStockBalance {
  veterinaryProviderName: string;
  officialFormText: string; // "Forma patvirtinta..." text
  responsibleVetName: string;
  responsibleVetSignature?: string;
  rows: VeterinaryMedicineBiocideStockBalanceRow[];
}

export interface VeterinaryMedicineBiocideStockBalanceRow {
  // Row A (description row)
  itemCategoryText: string; // "Veterinarinio vaisto, biopreparato"
  packageLabel: string; // "Pirminė pakuotė (mato vnt.)"
  packageUnit: string; // But, Tab, Tab., vnt, etc.
  productName: string; // Dokumento pavadinimas (visual product name)
  registrationNumberText: string; // e.g., "Registracijos Nr60"
  
  // Row B (quantity row)
  documentNumber: string; // Source document number (UC1702, 0747144, etc.)
  expiryDate: string; // Galiojimo laikas
  batchSeries: string; // Serija
  receivedQuantity: string; // Gauta
  usedQuantity: string; // Sunaudota
  remainingQuantity: string; // Likutis
}

// =====================================================================
// TEMPLATE 4: SUNAUDOTŲ VETERINARINIŲ VAISTŲ, BIOCIDŲ NURAŠYMO AKTAS
// =====================================================================

export interface UsedVeterinaryMedicineBiocideWriteOffAct {
  veterinaryProviderName: string;
  place: string; // e.g., "Miežiškiai"
  periodText: string; // e.g., "2024 m. lapkritis 1 d. - 2024 m. lapkritis 30 d."
  documentDateText: string; // e.g., "2024 m. lapkritis 30 d."
  documentNumber?: string;
  officialFormText: string; // "Forma patvirtinta..." text
  responsibleVetName: string;
  responsibleVetSignature?: string;
  rows: UsedVeterinaryMedicineBiocideWriteOffRow[];
}

export interface UsedVeterinaryMedicineBiocideWriteOffRow {
  rowNo: number | string; // EilNr (no dot)
  productName: string; // Veterinarinio vaisto,biocido pavadinimas
  batchSeries: string; // Serija
  measurementUnit: string; // Matavimo vnt. (Fl., Tab, Tab., But)
  usedQuantity: string; // Sunaudotas kiekis
}

// =====================================================================
// TEMPLATE 5: VETERINARINIŲ DARBŲ ATLIKIMO AKTAS
// =====================================================================

export interface VeterinaryWorkCompletionAct {
  veterinaryProviderName: string;
  farmOwnerName: string;
  farmOwnerAddress: string;
  documentDate: string; // YYYY.MM.DD
  documentNumber?: string;
  totalIncome: string; // Sum of all income
  acceptedByName: string;
  acceptedBySignature?: string;
  performedByName: string;
  performedBySignature?: string;
  rows: VeterinaryWorkCompletionActRow[];
}

export interface VeterinaryWorkCompletionActRow {
  rowNo: number | string; // Eil.
  date: string; // Data
  workName: string; // Darbo pavadinimas
  documentNo: string; // Dokumento Nr
  income: string; // Įplaukos
}

// =====================================================================
// Helper types
// =====================================================================

export type JournalType = 
  | 'treated_animals_registration'
  | 'production_animal_medicine_usage'
  | 'medicine_biocide_stock_balance'
  | 'medicine_biocide_write_off'
  | 'veterinary_work_completion';

export interface JournalExportOptions {
  format: 'pdf' | 'print';
  orientation?: 'portrait' | 'landscape';
  includeSignatures?: boolean;
}
