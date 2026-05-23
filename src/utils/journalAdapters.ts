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

    // Format withdrawal (Išlauka) with icons
    // Only show withdrawal dates if the product actually has withdrawal days > 0
    let withdrawal = '';
    const hasMeatWithdrawal = record.withdrawal_until_meat && record.withdrawal_days_meat && record.withdrawal_days_meat > 0;
    const hasMilkWithdrawal = record.withdrawal_until_milk && record.withdrawal_days_milk && record.withdrawal_days_milk > 0;
    
    if (hasMeatWithdrawal || hasMilkWithdrawal) {
      const dates = [];
      if (hasMeatWithdrawal) {
        dates.push(`🥩 ${record.withdrawal_until_meat}`);
      }
      if (hasMilkWithdrawal) {
        dates.push(`🥛 ${record.withdrawal_until_milk}`);
      }
      withdrawal = dates.join(' | ');
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

    // Format withdrawal with icons
    // Only show withdrawal dates if the product actually has withdrawal days > 0
    let withdrawal = '';
    const hasMeatWithdrawal = record.withdrawal_until_meat && record.withdrawal_days_meat && record.withdrawal_days_meat > 0;
    const hasMilkWithdrawal = record.withdrawal_until_milk && record.withdrawal_days_milk && record.withdrawal_days_milk > 0;
    
    if (hasMeatWithdrawal || hasMilkWithdrawal) {
      const dates = [];
      if (hasMeatWithdrawal) {
        dates.push(`🥩 ${record.withdrawal_until_meat}`);
      }
      if (hasMilkWithdrawal) {
        dates.push(`🥛 ${record.withdrawal_until_milk}`);
      }
      withdrawal = dates.join(' | ');
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

    // Simplify date format - just show date without time
    let simpleDate = record.date || record.service_date || '';
    if (simpleDate) {
      try {
        const date = new Date(simpleDate);
        simpleDate = date.toLocaleDateString('lt-LT'); // Just DD/MM/YYYY
      } catch {
        // Keep original if parsing fails
      }
    }

    // Simplify document number - take last 8 characters of UUID or show short ID
    let simpleDocNo = record.document_no || record.invoice_no || '';
    if (simpleDocNo && simpleDocNo.length > 12) {
      // If it's a UUID, take last 8 characters
      simpleDocNo = simpleDocNo.slice(-8).toUpperCase();
    }

    return {
      rowNo: rowNumber++,
      date: simpleDate,
      workName: record.work_name || record.service_name || record.description || '',
      documentNo: simpleDocNo || rowNumber.toString(),
      income: income.toFixed(2)
    };
  });

  return {
    veterinaryProviderName,
    farmOwnerName,
    farmOwnerAddress,
    documentDate,
    documentNumber: '',
    totalIncome: totalIncome.toFixed(2),
    acceptedByName: farmOwnerName,
    performedByName,
    rows
  };
}

// =====================================================================
// Template 6: BIOCIDINIŲ PRODUKTŲ APSKAITOS ŽURNALAS
// =====================================================================

export function transformToBiocideAccountingJournal(
  data: any[]
): any {
  // Group by product
  const productGroups = new Map<string, any[]>();
  
  data.forEach(record => {
    const key = `${record.product_name}_${record.unit}`;
    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }
    productGroups.get(key)!.push(record);
  });

  // Return first product (or empty if no data)
  if (productGroups.size === 0) {
    return {
      productName: '-',
      unit: '-',
      rows: []
    };
  }

  const [firstKey, firstRecords] = Array.from(productGroups.entries())[0];
  const sortedRecords = firstRecords.sort((a, b) => {
    const dateA = new Date(a.usage_date || a.receipt_date);
    const dateB = new Date(b.usage_date || b.receipt_date);
    return dateA.getTime() - dateB.getTime();
  });

  // Calculate running totals
  let runningTotal = 0;
  const rows = sortedRecords.map(record => {
    runningTotal += parseFloat(record.quantity_received || 0) - parseFloat(record.quantity_used || 0);
    
    const documentInfo = [
      record.document_title,
      record.document_number,
      record.document_date ? new Date(record.document_date).toLocaleDateString('lt-LT') : ''
    ].filter(Boolean).join(', ');

    return {
      receiptDate: record.receipt_date ? new Date(record.receipt_date).toLocaleDateString('lt-LT') : '-',
      documentInfo: documentInfo || '-',
      quantityReceived: record.quantity_received ? parseFloat(record.quantity_received).toFixed(2) : '0',
      manufacturingDate: record.manufacturing_date ? new Date(record.manufacturing_date).toLocaleDateString('lt-LT') : '-',
      expiryDate: record.expiry_date ? new Date(record.expiry_date).toLocaleDateString('lt-LT') : '-',
      batchNumber: record.batch_number || '-',
      usageDate: record.usage_date ? new Date(record.usage_date).toLocaleDateString('lt-LT') : '-',
      usagePurpose: record.usage_purpose || record.area_treated || '-',
      workScope: record.notes || '-',
      quantityUsed: record.quantity_used ? parseFloat(record.quantity_used).toFixed(2) : '0',
      remaining: runningTotal.toFixed(2),
      appliedBy: record.applied_by || '-'
    };
  });

  return {
    productName: sortedRecords[0]?.product_name || '-',
    unit: sortedRecords[0]?.unit || '-',
    rows
  };
}

// =====================================================================
// Helper Functions
// =====================================================================

function formatLithuanianDate(dateString: string): string {
  if (!dateString) return '-';
  
  const date = new Date(dateString);
  
  // Check if date is valid
  if (isNaN(date.getTime())) return '-';
  
  const year = date.getFullYear();
  const month = date.toLocaleString('lt-LT', { month: 'long' });
  const day = date.getDate();

  return `${year} m. ${month} ${day} d.`;
}
