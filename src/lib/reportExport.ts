import * as XLSX from 'xlsx';
import { formatDateLT } from './formatters';

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  format?: (value: any) => any;
}

export function exportReportToExcel(
  data: any[],
  reportType: string,
  columns: ExportColumn[],
  reportTitle: string
) {
  if (data.length === 0) {
    alert('Nėra duomenų eksportavimui');
    return;
  }

  const workbook = XLSX.utils.book_new();
  
  const exportData = data.map(row => {
    const exportRow: any = {};
    columns.forEach(col => {
      const value = row[col.key];
      exportRow[col.header] = col.format ? col.format(value) : value;
    });
    return exportRow;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  if (columns.some(col => col.width)) {
    worksheet['!cols'] = columns.map(col => ({ wch: col.width || 15 }));
  }

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1';
    if (!worksheet[address]) continue;
    worksheet[address].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4B5563" } },
      alignment: { horizontal: "center", vertical: "center" }
    };
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, reportTitle);

  const timestamp = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${reportType}_${timestamp}.xlsx`);
}

export const DRUG_JOURNAL_COLUMNS: ExportColumn[] = [
  { key: 'product_name', header: 'Produkto pavadinimas', width: 30 },
  { key: 'registration_code', header: 'Registracijos kodas', width: 20 },
  { key: 'active_substance', header: 'Veiklioji medžiaga', width: 25 },
  { key: 'unit', header: 'Vienetas', width: 12 },
  { 
    key: 'receipt_date', 
    header: 'Gavimo data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'supplier_name', header: 'Tiekėjas', width: 25 },
  { key: 'invoice_number', header: 'Sąskaitos Nr.', width: 18 },
  { 
    key: 'invoice_date', 
    header: 'Sąskaitos data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { 
    key: 'quantity_received', 
    header: 'Gautas kiekis', 
    width: 15,
    format: (val: number) => val ? parseFloat(val.toString()).toFixed(2) : '0'
  },
  { 
    key: 'expiry_date', 
    header: 'Galioja iki', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'batch_number', header: 'Serija', width: 15 },
  { 
    key: 'quantity_used', 
    header: 'Sunaudotas kiekis', 
    width: 18,
    format: (val: number) => val ? parseFloat(val.toString()).toFixed(2) : '0'
  },
  { 
    key: 'quantity_remaining', 
    header: 'Likutis', 
    width: 15,
    format: (val: number) => val ? parseFloat(val.toString()).toFixed(2) : '0'
  },
];

export const TREATED_ANIMALS_COLUMNS: ExportColumn[] = [
  { 
    key: 'registration_date', 
    header: 'Registracijos data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'animal_tag', header: 'Gyvūno numeris', width: 18 },
  { key: 'species', header: 'Rūšis', width: 12 },
  { key: 'sex', header: 'Lytis', width: 10 },
  { 
    key: 'age_months', 
    header: 'Amžius', 
    width: 12,
    format: (val: number) => {
      if (!val) return '-';
      const years = Math.floor(val / 12);
      const months = val % 12;
      if (years > 0 && months > 0) return `${years} m. ${months} mėn.`;
      if (years > 0) return `${years} m.`;
      return `${months} mėn.`;
    }
  },
  { key: 'owner_name', header: 'Laikytojas', width: 25 },
  { key: 'owner_address', header: 'Adresas', width: 30 },
  { 
    key: 'first_symptoms_date', 
    header: 'Pirmųjų simptomų data', 
    width: 18,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'animal_condition', header: 'Gyvūno būklė', width: 20 },
  { key: 'tests', header: 'Atlikti tyrimai', width: 25 },
  { key: 'disease_name', header: 'Diagnozė', width: 25 },
  { key: 'clinical_diagnosis', header: 'Klinikinė diagnozė', width: 25 },
  { key: 'services', header: 'Paslaugos', width: 25 },
  { key: 'medicine_name', header: 'Vaistas', width: 25 },
  { 
    key: 'medicine_dose', 
    header: 'Dozė', 
    width: 12,
    format: (val: number) => val ? `${val}` : '-'
  },
  { key: 'medicine_unit', header: 'Vienetas', width: 12 },
  { key: 'medicine_days', header: 'Dienų', width: 10 },
  { 
    key: 'withdrawal_until_meat', 
    header: 'Išlauka mėsai', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { 
    key: 'withdrawal_until_milk', 
    header: 'Išlauka pienui', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'treatment_outcome', header: 'Baigtis', width: 15 },
  { key: 'veterinarian', header: 'Veterinaras', width: 25 },
  { key: 'notes', header: 'Pastabos', width: 30 },
];

export const BIOCIDE_JOURNAL_COLUMNS: ExportColumn[] = [
  { key: 'biocide_name', header: 'Biocido pavadinimas', width: 30 },
  { key: 'registration_code', header: 'Reg. kodas', width: 20 },
  { key: 'active_substance', header: 'Veiklioji medžiaga', width: 25 },
  { key: 'unit', header: 'Vienetas', width: 12 },
  { 
    key: 'use_date', 
    header: 'Panaudojimo data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'purpose', header: 'Paskirtis', width: 25 },
  { key: 'work_scope', header: 'Darbų apimtis', width: 20 },
  { 
    key: 'quantity_used', 
    header: 'Sunaudotas kiekis', 
    width: 18,
    format: (val: number) => val ? parseFloat(val.toString()).toFixed(2) : '0'
  },
  { key: 'batch_number', header: 'Serija', width: 15 },
  { 
    key: 'batch_expiry', 
    header: 'Galioja iki', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'applied_by', header: 'Naudojo', width: 25 },
];

export const INSEMINATION_JOURNAL_COLUMNS: ExportColumn[] = [
  { 
    key: 'insemination_date', 
    header: 'Sėklinimo data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'animal', header: 'Gyvūnas', width: 20, format: (val: any) => val?.tag_no || '-' },
  { key: 'animal', header: 'Rūšis', width: 15, format: (val: any) => val?.species || '-' },
  { key: 'sperm_product', header: 'Spermos produktas', width: 25, format: (val: any) => val?.name || '-' },
  { 
    key: 'sperm_quantity', 
    header: 'Spermos kiekis', 
    width: 15,
    format: (val: number) => val ? `${val}` : '-'
  },
  { key: 'glove_product', header: 'Pirštinės', width: 20, format: (val: any) => val?.name || '-' },
  { 
    key: 'glove_quantity', 
    header: 'Pirštinių kiekis', 
    width: 15,
    format: (val: number) => val ? `${val}` : '-'
  },
  { 
    key: 'pregnancy_confirmed', 
    header: 'Nėštumas', 
    width: 15,
    format: (val: boolean | null) => {
      if (val === true) return 'Patvirtintas';
      if (val === false) return 'Nepatvirtintas';
      return 'Laukiama';
    }
  },
  { 
    key: 'pregnancy_check_date', 
    header: 'Patikrinimo data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'notes', header: 'Pastabos', width: 30 },
];

export const MEDICAL_WASTE_COLUMNS: ExportColumn[] = [
  { key: 'waste_code', header: 'Atliekų kodas', width: 15 },
  { key: 'waste_type', header: 'Atliekų pavadinimas', width: 30 },
  { key: 'reporting_period', header: 'Periodas', width: 20 },
  { 
    key: 'record_date', 
    header: 'Data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { 
    key: 'quantity_generated', 
    header: 'Susidarymo kiekis', 
    width: 18,
    format: (val: number) => val ? parseFloat(val.toString()).toFixed(2) : '0'
  },
  { 
    key: 'quantity_transferred', 
    header: 'Perduotas kiekis', 
    width: 18,
    format: (val: number) => val ? parseFloat(val.toString()).toFixed(2) : '0'
  },
  { key: 'waste_carrier', header: 'Vežėjas', width: 25 },
  { key: 'waste_processor', header: 'Tvarkytojas', width: 25 },
  { 
    key: 'transfer_date', 
    header: 'Perdavimo data', 
    width: 15,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  { key: 'transfer_document', header: 'Dokumentas', width: 20 },
  { key: 'responsible_person', header: 'Atsakingas asmuo', width: 25 },
];

const INVOICES_COLUMNS: ExportColumn[] = [
  {
    key: 'invoice_number',
    header: 'Sąskaitos Nr.',
    width: 15
  },
  {
    key: 'invoice_date',
    header: 'Data',
    width: 12,
    format: (val: string) => val ? formatDateLT(val) : '-'
  },
  {
    key: 'farm_name',
    header: 'Ūkis/Sandėlis',
    width: 20,
    format: (val: string, row: any) => row.farm?.name || 'Sandėlis'
  },
  {
    key: 'supplier_name',
    header: 'Tiekėjas',
    width: 25
  },
  {
    key: 'total_net',
    header: 'Suma be PVM',
    width: 15,
    format: (val: number) => `€${val.toFixed(2)}`
  },
  {
    key: 'total_vat',
    header: 'PVM',
    width: 12,
    format: (val: number) => `€${val.toFixed(2)}`
  },
  {
    key: 'total_gross',
    header: 'Suma su PVM',
    width: 15,
    format: (val: number) => `€${val.toFixed(2)}`
  }
];

export function getColumnsForReportType(reportType: string): ExportColumn[] {
  switch (reportType) {
    case 'drug_journal':
      return DRUG_JOURNAL_COLUMNS;
    case 'treated_animals':
      return TREATED_ANIMALS_COLUMNS;
    case 'biocide_journal':
      return BIOCIDE_JOURNAL_COLUMNS;
    case 'insemination_journal':
      return INSEMINATION_JOURNAL_COLUMNS;
    case 'medical_waste':
      return MEDICAL_WASTE_COLUMNS;
    case 'invoices':
      return INVOICES_COLUMNS;
    default:
      return [];
  }
}

export function getReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    drug_journal: 'Vaistų žurnalas',
    treated_animals: 'Gydomų gyvūnų registras',
    biocide_journal: 'Biocidų žurnalas',
    insemination_journal: 'Sėklinimo žurnalas',
    medical_waste: 'Medicininių atliekų žurnalas',
    invoices: 'Sąskaitos',
  };
  return titles[reportType] || 'Ataskaita';
}
