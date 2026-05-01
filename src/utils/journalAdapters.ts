// =====================================================================
// Data Adapter Functions for Veterinary Journals
// =====================================================================
// These functions transform database records into journal-ready formats

import {
  TreatedAnimalRegistrationJournal,
  TreatedAnimalRegistrationRow,
  ProductionAnimalMedicineUsageJournal,
  ProductionAnimalMedicineUsageRow,
  VeterinaryMedicineBiocideStockBalance,
  VeterinaryMedicineBiocideStockBalanceRow,
  UsedVeterinaryMedicineBiocideWriteOffAct,
  UsedVeterinaryMedicineBiocideWriteOffRow,
  VeterinaryWorkCompletionAct,
  VeterinaryWorkCompletionActRow
} from '../../types/veterinaryJournals';

// =====================================================================
// Template 1: GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS
// =====================================================================

export function transformToTreatedAnimalRegistrationJournal(
  data: any[],
  periodStart: string,
  periodEnd: string,
  veterinaryProviderName: string,
  responsibleVetName: string
): TreatedAnimalRegistrationJournal {
  // Sort data by registration_date ASC
  const sortedData = [...data].sort((a, b) => {
    if (a.registration_date !== b.registration_date) {
      return a.registration_date < b.registration_date ? -1 : 1;
    }
    return a.treatment_id < b.treatment_id ? -1 : 1;
  });

  // Assign sequential row numbers to unique treatments
  const treatmentNumbers = new Map<string, number>();
  let currentNumber = 1;
  
  const rows: TreatedAnimalRegistrationRow[] = sortedData.map((record) => {
    // Get or assign Eil. Nr.
    if (!treatmentNumbers.has(record.treatment_id)) {
      treatmentNumbers.set(record.treatment_id, currentNumber);
      currentNumber++;
    }
    const eilNr = treatmentNumbers.get(record.treatment_id)!;

    // Format age from age_months or birth_date
    let age = '-';
    if (record.age_months) {
      const years = Math.floor(record.age_months / 12);
      const months = record.age_months % 12;
      if (years > 0 && months > 0) {
        age = `${years} m. ${months} mėn.`;
      } else if (years > 0) {
        age = `${years} m.`;
      } else {
        age = `${months} mėn.`;
      }
    } else if (record.birth_date) {
      age = record.birth_date; // Show as birth date
    }

    // Format holder and address
    const holderAndAddress = [record.owner_name, record.owner_address]
      .filter(Boolean)
      .join('\n');

    // Format treatment period
    const treatmentPeriod = record.medicine_days && record.medicine_days > 1 
      ? `${record.medicine_days} d.` 
      : '1';

    // Format treatment text
    let treatment = '';
    if (record.services) treatment += record.services + '\n';
    if (record.medicine_name) {
      treatment += record.medicine_name;
    }

    // Format dose
    const dose = record.medicine_dose && record.medicine_unit
      ? `${record.medicine_dose} ${record.medicine_unit}`
      : '-';

    // Format withdrawal (Išlauka) as dates
    let withdrawal = '';
    if (record.withdrawal_until_meat || record.withdrawal_until_milk) {
      const dates = [];
      if (record.withdrawal_until_meat) {
        dates.push(`M: ${record.withdrawal_until_meat}`);
      }
      if (record.withdrawal_until_milk) {
        dates.push(`P: ${record.withdrawal_until_milk}`);
      }
      withdrawal = dates.join('\n');
    }

    return {
      rowNo: eilNr,
      registrationDate: record.registration_date || '',
      animalHolderAndAddress: holderAndAddress,
      animalIdentifier: record.animal_tag || '-',
      animalAge: age,
      animalSpecies: record.species || '-',
      treatmentPeriod: treatmentPeriod,
      animalCondition: record.animal_condition || 'Patenkinama',
      labTests: record.tests || '',
      clinicalDiagnosis: record.disease_name || record.clinical_diagnosis || '-',
      treatment: treatment.trim() || '-',
      dose: dose,
      withdrawal: withdrawal,
      outcome: record.treatment_outcome || ''
    };
  });

  return {
    veterinaryProviderName,
    periodStart,
    periodEnd,
    officialFormText: 'Forma patvirtinta\nValstybinės maisto ir veterinarijos tarnybos\ndirektoriaus 2005 m. gruodžio 29 d.\nįsakymu Nr. B1-735',
    responsibleVetName,
    rows
  };
}

// =====================================================================
// Template 2: PRODUCTION ANIMAL MEDICINE USAGE JOURNAL
// =====================================================================

export function transformToProductionAnimalMedicineUsageJournal(
  data: any[],
  animalOwnerName: string,
  veterinaryProviderName: string
): ProductionAnimalMedicineUsageJournal {
  // Filter for production animals if needed and sort
  const sortedData = [...data].sort((a, b) => {
    if (a.registration_date !== b.registration_date) {
      return a.registration_date < b.registration_date ? -1 : 1;
    }
    return a.treatment_id < b.treatment_id ? -1 : 1;
  });

  let rowNumber = 1;
  const rows: ProductionAnimalMedicineUsageRow[] = sortedData.map((record) => {
    // Format age
    let age = '-';
    if (record.age_months) {
      age = String(record.age_months);
    } else if (record.birth_date) {
      age = record.birth_date;
    }

    // Format treatment period
    const treatmentPeriod = record.medicine_days && record.medicine_days > 1 
      ? `${record.medicine_days}` 
      : '1';

    // Format withdrawal as dates
    let withdrawal = '';
    if (record.withdrawal_until_meat || record.withdrawal_until_milk) {
      const dates = [];
      if (record.withdrawal_until_meat) {
        dates.push(`M: ${record.withdrawal_until_meat}`);
      }
      if (record.withdrawal_until_milk) {
        dates.push(`P: ${record.withdrawal_until_milk}`);
      }
      withdrawal = dates.join('\n');
    }

    return {
      rowNo: rowNumber++,
      registrationDate: record.registration_date || '',
      animalIdentifier: record.animal_tag || '-',
      animalSpecies: record.species || '-',
      animalAge: age,
      treatmentPeriod: treatmentPeriod,
      clinicalDiagnosis: record.disease_name || record.clinical_diagnosis || '-',
      medicationName: record.medicine_name || '-',
      usedAmount: record.medicine_dose ? String(record.medicine_dose) : '-',
      withdrawal: withdrawal,
      ownerSignature: '',
      vetSignature: ''
    };
  });

  return {
    veterinaryProviderName,
    animalOwnerName,
    officialReferenceText: 'Vadovaujantis Valstybinės maisto ir\nveterinarijos tarnybos direktoriaus\n2003m.balandžio 18d. įsakymu NrB1-390',
    rows
  };
}

// =====================================================================
// Template 3: MEDICINE BIOCIDE STOCK BALANCE
// =====================================================================

export function transformToMedicineBiocideStockBalance(
  data: any[],
  veterinaryProviderName: string,
  responsibleVetName: string
): VeterinaryMedicineBiocideStockBalance {
  const rows: VeterinaryMedicineBiocideStockBalanceRow[] = data.map((record) => {
    // Format expiry date
    const expiryDate = record.expiry_date || '';

    // Extract unit or package unit
    const packageUnit = record.unit || record.primary_pack_unit || 'vnt';

    // Registration number text
    const registrationNumber = record.registration_code 
      ? `Registracijos Nr${record.registration_code}` 
      : '';

    return {
      itemCategoryText: 'Veterinarinio vaisto, biopreparato',
      packageLabel: 'Pirminė pakuotė (mato vnt.)',
      packageUnit: packageUnit,
      productName: record.product_name || '',
      registrationNumberText: registrationNumber,
      documentNumber: record.invoice_number || record.doc_number || '',
      expiryDate: expiryDate,
      batchSeries: record.batch_number || record.lot || '',
      receivedQuantity: record.quantity_received ? String(record.quantity_received) : '0',
      usedQuantity: record.quantity_used ? String(record.quantity_used) : '0',
      remainingQuantity: record.quantity_remaining ? String(record.quantity_remaining) : '0'
    };
  });

  return {
    veterinaryProviderName,
    officialFormText: 'Forma patvirtinta Valstybinės maisto\nir veterinarijos tarnybos direktoriaus\n2005 m. gruodžio 29 d. įsakymu\nNr.B1 - 735',
    responsibleVetName,
    rows
  };
}

// =====================================================================
// Template 4: MEDICINE BIOCIDE WRITE-OFF ACT
// =====================================================================

export function transformToMedicineBiocideWriteOffAct(
  data: any[],
  periodStart: string,
  periodEnd: string,
  place: string,
  veterinaryProviderName: string,
  responsibleVetName: string
): UsedVeterinaryMedicineBiocideWriteOffAct {
  // Format period text in Lithuanian
  const periodText = `${formatLithuanianDate(periodStart)} - ${formatLithuanianDate(periodEnd)}`;
  const documentDateText = formatLithuanianDate(periodEnd);

  let rowNumber = 1;
  const rows: UsedVeterinaryMedicineBiocideWriteOffRow[] = data.map((record) => {
    const measurementUnit = record.unit || record.primary_pack_unit || 'vnt';
    const usedQuantity = record.quantity_used ? String(record.quantity_used) : '0';

    return {
      rowNo: rowNumber++,
      productName: record.product_name || '',
      batchSeries: record.batch_number || record.lot || '',
      measurementUnit: measurementUnit,
      usedQuantity: usedQuantity
    };
  });

  return {
    veterinaryProviderName,
    place,
    periodText,
    documentDateText,
    documentNumber: '',
    officialFormText: 'Forma patvirtinta\nValstybinės maisto ir veterinarijos tarnybos\ndirektoriaus 2005 m. gruodžio 29 d.\nįsakymu Nr. B1-735',
    responsibleVetName,
    rows
  };
}

// =====================================================================
// Template 5: VETERINARY WORK COMPLETION ACT
// =====================================================================

export function transformToVeterinaryWorkCompletionAct(
  data: any[],
  farmOwnerName: string,
  farmOwnerAddress: string,
  documentDate: string,
  veterinaryProviderName: string,
  performedByName: string
): VeterinaryWorkCompletionAct {
  let rowNumber = 1;
  let totalIncome = 0;

  const rows: VeterinaryWorkCompletionActRow[] = data.map((record) => {
    const income = parseFloat(record.income || record.charge_amount || '0');
    totalIncome += income;

    return {
      rowNo: rowNumber++,
      date: record.date || record.service_date || '',
      workName: record.work_name || record.service_name || record.description || '',
      documentNo: record.document_no || record.invoice_no || '',
      income: income.toString()
    };
  });

  return {
    veterinaryProviderName,
    farmOwnerName,
    farmOwnerAddress,
    documentDate,
    documentNumber: '',
    totalIncome: totalIncome.toString(),
    acceptedByName: farmOwnerName,
    performedByName,
    rows
  };
}

// =====================================================================
// Helper Functions
// =====================================================================

function formatLithuanianDate(dateString: string): string {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('lt-LT', { month: 'long' });
  const day = date.getDate();
  
  return `${year} m. ${month} ${day} d.`;
}
