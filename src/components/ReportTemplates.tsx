import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateLT } from '../lib/formatters';
import { FileText, X, ExternalLink, ChevronDown, ChevronUp, Edit2, Check, XCircle, Trash2, RefreshCw } from 'lucide-react';

function translateUnit(unit: string): string {
  const translations: Record<string, string> = {
    'syringe': 'švirkštukas',
    'tablet': 'tabletkė',
    'bolus': 'bolusas',
  };
  return translations[unit] || unit;
}

interface TreatedAnimalsReportProps {
  data: any[];
}

export function TreatedAnimalsReport({ data }: TreatedAnimalsReportProps) {
  // Helper function to calculate animal age
  const calculateAge = (ageMonths: number | null, birthDate: string | null): string => {
    if (ageMonths) {
      const years = Math.floor(ageMonths / 12);
      const months = ageMonths % 12;
      if (years > 0 && months > 0) return `${years} m. ${months} mėn.`;
      if (years > 0) return `${years} m.`;
      return `${months} mėn.`;
    }
    if (birthDate) {
      const birth = new Date(birthDate);
      const now = new Date();
      const months = Math.floor((now.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;
      if (years > 0 && remainingMonths > 0) return `${years} m. ${remainingMonths} mėn.`;
      if (years > 0) return `${years} m.`;
      return `${months} mėn.`;
    }
    return '-';
  };

  // Sort data by registration_date ASC, created_at ASC, treatment_id ASC
  // This ensures display order is: 1, 2, 3, ... (oldest to newest)
  const sortedData = [...data].sort((a, b) => {
    if (a.registration_date !== b.registration_date) {
      return a.registration_date < b.registration_date ? -1 : 1;
    }
    if (a.created_at !== b.created_at) {
      return a.created_at < b.created_at ? -1 : 1;
    }
    return a.treatment_id < b.treatment_id ? -1 : 1;
  });

  // Calculate Eil. Nr. based on position in sorted array
  // Track unique treatment IDs to assign sequential numbers
  const treatmentNumbers = new Map<string, number>();
  let currentNumber = 1;
  
  const dataWithEilNr = sortedData.map((row) => {
    if (!treatmentNumbers.has(row.treatment_id)) {
      treatmentNumbers.set(row.treatment_id, currentNumber);
      currentNumber++;
    }
    
    return {
      ...row,
      eil_nr: treatmentNumbers.get(row.treatment_id)!
    };
  });

  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            {/* Single header row with all 14 columns */}
            <tr className="bg-gradient-to-r from-blue-100 to-blue-50">
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 text-center align-top" style={{minWidth: '40px'}}>
                1.<br/>Eil.<br/>Nr.
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '80px'}}>
                2.<br/>Registracijos<br/>data
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '120px'}}>
                3.<br/>Gyvūno laikytojo<br/>duomenys
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '80px'}}>
                4.<br/>Gyvūno rūšis,<br/>lytis
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '65px'}}>
                5.<br/>Gyvūno<br/>amžius
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '95px'}}>
                6.<br/>Gyvūno<br/>ženklinimo<br/>numeris
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '80px'}}>
                7.<br/>Pirmųjų ligos<br/>požymių data
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '100px'}}>
                8.<br/>Gyvūno būklė
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '100px'}}>
                9.<br/>Atlikti tyrimai
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '120px'}}>
                10.<br/>Klinikinė<br/>diagnozė
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '120px'}}>
                11.<br/>Gydymas
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '90px'}}>
                12.<br/>Išlauka
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '100px'}}>
                13.<br/>Ligos baigtis
              </th>
              <th className="border-2 border-gray-300 px-2 py-3 text-[11px] font-bold text-gray-700 align-top" style={{minWidth: '100px'}}>
                14.<br/>Veterinarijos<br/>gydytojas
              </th>
            </tr>
          </thead>
          <tbody>
            {dataWithEilNr.map((row, idx) => (
              <tr key={idx} className="hover:bg-blue-50 transition-colors print-break-avoid">
                {/* Column 1: Eil. Nr. - Sequential number based on registration date */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-center font-bold text-gray-900 bg-yellow-50">
                  {row.eil_nr}
                </td>
                
                {/* Column 2: Registration date */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900">
                  {row.registration_date ? formatDateLT(row.registration_date) : '-'}
                </td>
                
                {/* Column 3: Owner details */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px]">
                  {row.owner_name && <div className="font-semibold text-gray-900">{row.owner_name}</div>}
                  {row.owner_address && <div className="text-gray-600 text-[10px] mt-0.5">{row.owner_address}</div>}
                  {!row.owner_name && !row.owner_address && <span className="text-gray-400">-</span>}
                </td>
                
                {/* Column 4: Species, sex */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900">
                  <div>{row.species || '-'}</div>
                  {row.sex && <div className="text-gray-600 text-[10px] mt-0.5">{row.sex}</div>}
                </td>
                
                {/* Column 5: Age */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900 text-center">
                  {calculateAge(row.age_months, row.birth_date)}
                </td>
                
                {/* Column 6: Animal tag number */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-center">
                  <span className="font-bold text-gray-900">{row.animal_tag || '-'}</span>
                </td>
                
                {/* Column 7: First symptoms date */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900">
                  {row.first_symptoms_date ? formatDateLT(row.first_symptoms_date) : '-'}
                </td>
                
                {/* Column 8: Animal condition */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900">
                  {row.animal_condition || '-'}
                </td>
                
                {/* Column 9: Tests performed */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900 whitespace-pre-line">
                  {row.tests || '-'}
                </td>
                
                {/* Column 10: Clinical diagnosis */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px]">
                  <div className="font-semibold text-gray-900">{row.disease_name || '-'}</div>
                  {row.clinical_diagnosis && row.clinical_diagnosis !== row.disease_name && (
                    <div className="text-gray-600 text-[10px] mt-0.5">{row.clinical_diagnosis}</div>
                  )}
                </td>
                
                {/* Column 11: Veterinary services provided - Prescription format */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px]">
                  {row.services && <div className="text-gray-900 mb-1">{row.services}</div>}
                  {row.prescription_text ? (
                    <div className="text-gray-900 whitespace-pre-line font-mono text-[10px]">
                      {row.prescription_text}
                    </div>
                  ) : row.medicine_name ? (
                    <div className="text-gray-900 font-medium">
                      {row.medicine_name}
                      {row.medicine_dose && (
                        <div className="text-gray-700 text-[10px] mt-0.5">
                          Dozė: {row.medicine_dose} {row.medicine_unit}
                          {row.medicine_days && ` × ${row.medicine_days} d.`}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                
                {/* Column 12: Withdrawal period - Show both meat and milk */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px]">
                  {row.withdrawal_until_meat ? (
                    <div className="text-red-700 text-[10px]">🥩 {formatDateLT(row.withdrawal_until_meat)}</div>
                  ) : (
                    <div className="text-gray-500 text-[10px]">🥩 Nėra</div>
                  )}
                  {row.withdrawal_until_milk ? (
                    <div className="text-blue-700 text-[10px] mt-0.5">🥛 {formatDateLT(row.withdrawal_until_milk)}</div>
                  ) : (
                    <div className="text-gray-500 text-[10px] mt-0.5">🥛 Nėra</div>
                  )}
                </td>
                
                {/* Column 13: Outcome with date */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900">
                  {row.treatment_outcome && row.outcome_date 
                    ? `${row.treatment_outcome} ${formatDateLT(row.outcome_date)}`
                    : row.treatment_outcome || '-'}
                </td>
                
                {/* Column 14: Veterinarian name */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] font-medium text-gray-900">
                  {row.veterinarian || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface MedicalWasteReportProps {
  data: any[];
}

export function MedicalWasteReport({ data }: MedicalWasteReportProps) {
  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VETERINARINIŲ MEDICININIŲ ATLIEKŲ SUSIDARYMO APSKAITOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-orange-50 to-red-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinarinių medicininių atliekų kodas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinarinių medicininių atliekų pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Susidarymo periodas ir data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Susidarymo kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Perduotas kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Atliekų vežėjas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Atliekų tvarkytojas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Perdavimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dokumento numeris ir data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Atsakingo asmens vardas, pavardė</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-orange-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-red-100 text-red-700">
                    {row.waste_code || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.waste_type || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-gray-900">{row.reporting_period || '-'}</div>
                    <div className="text-gray-600 text-[10px]">{row.record_date ? formatDateLT(row.record_date) : '-'}</div>
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-gray-900">{row.quantity_generated || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-blue-700">{row.quantity_transferred || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.waste_carrier || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.waste_processor || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.transfer_date ? formatDateLT(row.transfer_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.transfer_document || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.responsible_person || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface DrugJournalReportProps {
  data: any[];
}

export function DrugJournalReport({ data }: DrugJournalReportProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceDetails, setInvoiceDetails] = useState<any>(null);
  const [invoiceItems, setInvoiceItems] = useState<any[]>([]);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // Group data by product (medicine)
  const groupedData = data.reduce((acc, row) => {
    const productKey = row.product_id || row.product_name;
    if (!acc[productKey]) {
      acc[productKey] = {
        product_name: row.product_name,
        unit: row.unit,
        registration_code: row.registration_code,
        active_substance: row.active_substance,
        batches: []
      };
    }
    acc[productKey].batches.push(row);
    return acc;
  }, {} as Record<string, any>);

  const medicines = Object.values(groupedData);

  const loadInvoiceDetails = async (invoiceId: string) => {
    setLoadingInvoice(true);
    try {
      const [invoiceRes, itemsRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('id', invoiceId).single(),
        supabase.from('invoice_items').select('*, product:products(name, category)').eq('invoice_id', invoiceId).order('line_no')
      ]);

      if (invoiceRes.data) setInvoiceDetails(invoiceRes.data);
      if (itemsRes.data) setInvoiceItems(itemsRes.data);
      setSelectedInvoiceId(invoiceId);
    } catch (error) {
      console.error('Error loading invoice:', error);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const closeInvoiceModal = () => {
    setSelectedInvoiceId(null);
    setInvoiceDetails(null);
    setInvoiceItems([]);
  };

  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VETERINARINIŲ VAISTŲ IR VAISTINIŲ PREPARATŲ APSKAITOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {medicines.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {medicines.map((medicine, medIdx) => (
        <div key={medIdx} className="mb-8 page-break-inside-avoid">
          {/* Medicine Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-gray-300 rounded-t-lg p-4 mb-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Veterinarinio vaisto / vaistinio preparato pavadinimas</p>
                <p className="text-base font-bold text-gray-900">{medicine.product_name || '-'}</p>
                {medicine.registration_code && (
                  <p className="text-xs text-blue-700 mt-1">📋 Reg. kodas: {medicine.registration_code}</p>
                )}
                {medicine.active_substance && (
                  <p className="text-xs text-gray-600 mt-1">💊 Veiklioji medžiaga: {medicine.active_substance}</p>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Pirminė pakuotė (mato vnt.)</p>
                <p className="text-base font-bold text-gray-900">{translateUnit(medicine.unit) || '-'}</p>
              </div>
            </div>
          </div>

          {/* Medicine Batches Table */}
          <div className="overflow-x-auto rounded-b-lg border-2 border-t-0 border-gray-300 shadow-sm">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gavimo data</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dokumento, pagal kurį gautas vaistas, pavadinimas, numeris, data</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gautas kiekis</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Tinkamumo naudoti laikas</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Serija</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sunaudotas kiekis</th>
                  <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Likutis</th>
                </tr>
              </thead>
              <tbody>
                {medicine.batches.map((batch: any, batchIdx: number) => (
                  <tr key={batchIdx} className="hover:bg-blue-50 transition-colors print-break-avoid">
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">
                      {batch.receipt_date ? formatDateLT(batch.receipt_date) : '-'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                      <div className="space-y-1">
                        {batch.supplier_name && <div className="font-bold text-gray-900">{batch.supplier_name}</div>}
                        {batch.doc_title && batch.doc_title.toLowerCase() !== 'invoice' && <div className="font-medium text-gray-900">{batch.doc_title}</div>}
                        <div className="flex items-center gap-2">
                          {batch.invoice_number && <div className="font-medium text-gray-900">Sąskaita faktūra Nr. {batch.invoice_number}</div>}
                          {batch.invoice_id && (
                            <button
                              onClick={() => loadInvoiceDetails(batch.invoice_id)}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-xs font-medium transition-colors no-print"
                              title="Peržiūrėti sąskaitą"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Peržiūrėti
                            </button>
                          )}
                        </div>
                        {batch.invoice_date && <div className="text-gray-600">{formatDateLT(batch.invoice_date)}</div>}
                        {!batch.supplier_name && !batch.doc_title && !batch.invoice_number && !batch.invoice_date && <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">
                        {batch.quantity_received || '-'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                      <span className={`font-medium ${batch.expiry_date && new Date(batch.expiry_date) < new Date() ? 'text-red-700' : 'text-gray-900'}`}>
                        {batch.expiry_date ? formatDateLT(batch.expiry_date) : '-'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                        {batch.batch_number || batch.lot || '-'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-red-700">
                      {Math.abs(parseFloat(batch.quantity_used) || 0) < 0.01 ? '0' : (parseFloat(batch.quantity_used) || 0).toFixed(2)}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-bold ${
                        (parseFloat(batch.quantity_remaining) || 0) > 0.01 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {Math.abs(parseFloat(batch.quantity_remaining) || 0) < 0.01 ? '0' : (parseFloat(batch.quantity_remaining) || 0).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
                {/* Summary row for this medicine */}
                <tr className="bg-gray-50 font-bold">
                  <td colSpan={2} className="border-2 border-gray-300 px-3 py-3 text-xs text-right text-gray-700">
                    Viso ({medicine.product_name}):
                  </td>
                  <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-bold text-blue-900">
                    {(() => {
                      const total = medicine.batches.reduce((sum: number, b: any) => sum + (parseFloat(b.quantity_received) || 0), 0);
                      return Math.abs(total) < 0.01 ? '0.00' : total.toFixed(2);
                    })()}
                  </td>
                  <td colSpan={2} className="border-2 border-gray-300 px-3 py-3"></td>
                  <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-bold text-red-900">
                    {(() => {
                      const total = medicine.batches.reduce((sum: number, b: any) => sum + (parseFloat(b.quantity_used) || 0), 0);
                      return Math.abs(total) < 0.01 ? '0.00' : total.toFixed(2);
                    })()}
                  </td>
                  <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-bold text-blue-900">
                    {(() => {
                      const total = medicine.batches.reduce((sum: number, b: any) => sum + (parseFloat(b.quantity_remaining) || 0), 0);
                      return Math.abs(total) < 0.01 ? '0.00' : total.toFixed(2);
                    })()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {medicines.length > 0 && (
        <div className="mt-4 space-y-2 text-sm text-gray-600 no-print">
          <p>Viso vaistų: <span className="font-semibold text-gray-900">{medicines.length}</span></p>
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
          <p>Tiekėjai: <span className="font-medium text-gray-800">{Array.from(new Set(data.map(d => d.supplier_name).filter(Boolean))).join(', ') || 'Nenurodyta'}</span></p>
        </div>
      )}

      {/* Invoice Details Modal */}
      {selectedInvoiceId && invoiceDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-white" />
                <div>
                  <h2 className="text-xl font-bold text-white">Sąskaita faktūra</h2>
                  <p className="text-blue-100 text-sm">{invoiceDetails.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={closeInvoiceModal}
                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Tiekėjas</p>
                  <p className="font-bold text-gray-900">{invoiceDetails.supplier_name}</p>
                  {invoiceDetails.supplier_code && (
                    <p className="text-sm text-gray-600 mt-1">Kodas: {invoiceDetails.supplier_code}</p>
                  )}
                  {invoiceDetails.supplier_vat && (
                    <p className="text-sm text-gray-600">PVM: {invoiceDetails.supplier_vat}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Sąskaitos informacija</p>
                  <p className="font-bold text-gray-900">Nr. {invoiceDetails.invoice_number}</p>
                  <p className="text-sm text-gray-600 mt-1">Data: {formatDateLT(invoiceDetails.invoice_date)}</p>
                </div>
              </div>

              {/* Invoice Items */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Produktai</h3>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-3 py-2 text-left text-xs font-bold text-gray-700">Produktas</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold text-gray-700">Kiekis</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold text-gray-700">Vnt. kaina (be nuol.)</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold text-gray-700">Nuolaida %</th>
                        <th className="border border-gray-300 px-3 py-2 text-right text-xs font-bold text-gray-700">Viso (su nuol.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-3 py-2 text-sm">
                            <div className="font-medium text-gray-900">{item.product?.name || item.description}</div>
                            {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right">{item.quantity}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right">
                            {(() => {
                              const qty = parseFloat(item.quantity) || 0;
                              const totalPrice = parseFloat(item.total_price) || 0;
                              const discount = parseFloat(item.discount_percent) || 0;
                              
                              if (discount > 0 && qty > 0) {
                                const priceAfterDiscount = totalPrice / qty;
                                const priceBeforeDiscount = priceAfterDiscount / (1 - discount / 100);
                                return `${priceBeforeDiscount.toFixed(4)} ${invoiceDetails.currency}`;
                              }
                              return `${item.unit_price.toFixed(4)} ${invoiceDetails.currency}`;
                            })()}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right text-amber-700 font-medium">
                            {item.discount_percent != null && item.discount_percent > 0 ? `${Number(item.discount_percent).toFixed(2)}%` : '—'}
                          </td>
                          <td className="border border-gray-300 px-3 py-2 text-sm text-right font-medium">{item.total_price.toFixed(2)} {invoiceDetails.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-50 font-bold">
                        <td colSpan={4} className="border border-gray-300 px-3 py-2 text-sm text-right">Suma prieš nuolaidą:</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right text-gray-700">
                          {(() => {
                            const totalBeforeDiscount = invoiceItems.reduce((sum, item) => {
                              const qty = parseFloat(item.quantity) || 0;
                              const totalPrice = parseFloat(item.total_price) || 0;
                              const discount = parseFloat(item.discount_percent) || 0;
                              
                              if (discount > 0 && qty > 0) {
                                const priceAfterDiscount = totalPrice / qty;
                                const priceBeforeDiscount = priceAfterDiscount / (1 - discount / 100);
                                return sum + (priceBeforeDiscount * qty);
                              }
                              return sum + totalPrice;
                            }, 0);
                            return `${totalBeforeDiscount.toFixed(2)} ${invoiceDetails.currency}`;
                          })()}
                        </td>
                      </tr>
                      <tr className="bg-amber-50 font-bold">
                        <td colSpan={4} className="border border-gray-300 px-3 py-2 text-sm text-right">Nuolaida:</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right text-amber-700">
                          {(() => {
                            const totalBeforeDiscount = invoiceItems.reduce((sum, item) => {
                              const qty = parseFloat(item.quantity) || 0;
                              const totalPrice = parseFloat(item.total_price) || 0;
                              const discount = parseFloat(item.discount_percent) || 0;
                              
                              if (discount > 0 && qty > 0) {
                                const priceAfterDiscount = totalPrice / qty;
                                const priceBeforeDiscount = priceAfterDiscount / (1 - discount / 100);
                                return sum + (priceBeforeDiscount * qty);
                              }
                              return sum + totalPrice;
                            }, 0);
                            const totalDiscount = totalBeforeDiscount - invoiceDetails.total_net;
                            return `- ${totalDiscount.toFixed(2)} ${invoiceDetails.currency}`;
                          })()}
                        </td>
                      </tr>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={4} className="border border-gray-300 px-3 py-2 text-sm text-right">Tarpinė suma (su nuolaida):</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{invoiceDetails.total_net.toFixed(2)} {invoiceDetails.currency}</td>
                      </tr>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="border border-gray-300 px-3 py-2 text-sm text-right">PVM ({invoiceDetails.vat_rate}%):</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm text-right">{invoiceDetails.total_vat.toFixed(2)} {invoiceDetails.currency}</td>
                      </tr>
                      <tr className="bg-blue-50 font-bold text-lg">
                        <td colSpan={4} className="border-2 border-gray-400 px-3 py-3 text-right">VISO:</td>
                        <td className="border-2 border-gray-400 px-3 py-3 text-right text-blue-900">{invoiceDetails.total_gross.toFixed(2)} {invoiceDetails.currency}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            <div className="border-t px-6 py-4 bg-gray-50 flex justify-end">
              <button
                onClick={closeInvoiceModal}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Uždaryti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface BiocideJournalReportProps {
  data: any[];
}

export function BiocideJournalReport({ data }: BiocideJournalReportProps) {
  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">BIOCIDINIŲ PRODUKTŲ APSKAITOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Biocidinio produkto pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirminė pakuotė (mato vnt.)</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gavimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dokumento pavadinimas, numeris, data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gautas kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pagaminimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Tinkamumo naudoti laikas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Serija / partija</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Panaudojimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Panaudojimo paskirtis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Darbų apimtis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sunaudotas kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Biocidinį produktą naudojusio asmens vardas, pavardė</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-purple-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.biocide_name || '-'}</div>
                    {row.registration_code && <div className="text-purple-700 text-[10px] font-medium">📋 Reg: {row.registration_code}</div>}
                    {row.active_substance && <div className="text-gray-600 text-[10px]">🧪 Veikl. med.: {row.active_substance}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-medium text-gray-700">{translateUnit(row.unit) || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-400">-</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.batch_expiry ? formatDateLT(row.batch_expiry) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                    {row.batch_number || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.use_date ? formatDateLT(row.use_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.purpose || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.work_scope || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-700">
                    {row.quantity_used || '-'} {row.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.applied_by || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface OwnerMedsReportProps {
  data: any[];
}

export function OwnerMedsReport({ data }: OwnerMedsReportProps) {
  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SAVININKO DUODAMI VAISTAI</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-sky-50 to-blue-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Recepto data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirmo davimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gyvūno duomenys</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Liga</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Vaisto pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Paros dozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydymo trukmė (dienos)</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Bendra dozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Duota dozių</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Statusas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinarijos gydytojas</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-sky-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">{row.prescription_date ? formatDateLT(row.prescription_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.first_admin_date ? formatDateLT(row.first_admin_date) : '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.animal_tag || '-'}</div>
                    <div className="text-gray-600">{row.species || '-'}</div>
                    {row.owner_name && <div className="text-gray-500 text-[10px]">{row.owner_name}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.disease_name || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.product_name || '-'}</div>
                    {row.registration_code && <div className="text-sky-700 text-[10px] font-medium">📋 Reg: {row.registration_code}</div>}
                    {row.batch_number && <div className="text-gray-600 text-[10px]">📦 Serija: {row.batch_number}</div>}
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-semibold text-gray-900">{row.daily_dose || '-'} {row.unit || ''}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {row.treatment_days || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-purple-100 text-purple-700">
                    {row.total_dose || '-'} {row.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-semibold text-blue-700">{row.doses_administered || '0'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  <span className={`inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold ${
                    row.course_status === 'completed' ? 'bg-blue-100 text-blue-700' :
                    row.course_status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {row.course_status === 'completed' ? '✓ Baigtas' :
                     row.course_status === 'active' ? '⟳ Aktyvus' :
                     row.course_status || '-'}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">{row.prescribing_vet || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface InseminationJournalReportProps {
  data: any[];
}

export function InseminationJournalReport({ data }: InseminationJournalReportProps) {
  const pregnancyStats = {
    total: data.length,
    confirmed: data.filter(r => r.pregnancy_confirmed === true).length,
    notConfirmed: data.filter(r => r.pregnancy_confirmed === false).length,
    pending: data.filter(r => r.pregnancy_confirmed === null).length,
  };

  const successRate = pregnancyStats.total > 0
    ? ((pregnancyStats.confirmed / pregnancyStats.total) * 100).toFixed(1)
    : '0';

  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SĖKLINIMO ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {data.length > 0 && (
        <div className="grid grid-cols-4 gap-4 mb-6 no-print">
          <div className="bg-rose-50 border-2 border-rose-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-rose-600 uppercase">Viso sėklinimų</p>
            <p className="text-2xl font-bold text-rose-900 mt-1">{pregnancyStats.total}</p>
          </div>
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-green-600 uppercase">Patvirtinti nėštumai</p>
            <p className="text-2xl font-bold text-green-900 mt-1">{pregnancyStats.confirmed}</p>
          </div>
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-600 uppercase">Nepatvirtinti</p>
            <p className="text-2xl font-bold text-red-900 mt-1">{pregnancyStats.notConfirmed}</p>
          </div>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-blue-600 uppercase">Sėkmės rodiklis</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{successRate}%</p>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-rose-50 to-pink-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Eil. Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sėklinimo data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gyvūno duomenys</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Spermos produktas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Spermos kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirštinės</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pirštinių kiekis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Nėštumas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Pastabos</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="hover:bg-rose-50 transition-colors print-break-avoid">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-semibold text-gray-600">{idx + 1}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">
                  {row.insemination_date ? formatDateLT(row.insemination_date) : '-'}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs">
                  <div className="space-y-1">
                    <div className="font-bold text-gray-900">{row.animal?.tag_no || '-'}</div>
                    <div className="text-gray-600">{row.animal?.species || '-'}</div>
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs font-medium text-gray-900">
                  {row.sperm_product?.name || '-'}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-rose-100 text-rose-700">
                    {row.sperm_quantity || '-'} {row.sperm_product?.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">
                  {row.glove_product?.name || '-'}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">
                    {row.glove_quantity || '-'} {row.glove_product?.unit || ''}
                  </span>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                  {row.pregnancy_confirmed === true && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                      ✓ Patvirtintas
                    </span>
                  )}
                  {row.pregnancy_confirmed === false && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      ✗ Nepatvirtintas
                    </span>
                  )}
                  {row.pregnancy_confirmed === null && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                      ⏳ Laukiama
                    </span>
                  )}
                  {row.pregnancy_check_date && (
                    <div className="text-[10px] text-gray-500 mt-1">
                      {formatDateLT(row.pregnancy_check_date)}
                    </div>
                  )}
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">
                  {row.notes || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra duomenų</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso įrašų: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface WithdrawalReportProps {
  data: any[];
  onDataChange?: () => void;
}

export function WithdrawalReport({ data, onDataChange }: WithdrawalReportProps) {
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    withdrawal_until_meat: string;
    withdrawal_until_milk: string;
  }>({ withdrawal_until_meat: '', withdrawal_until_milk: '' });
  const [saving, setSaving] = useState(false);

  const handleEdit = (row: any) => {
    setEditingRow(row.treatment_id);
    setEditValues({
      withdrawal_until_meat: row.withdrawal_until_meat || '',
      withdrawal_until_milk: row.withdrawal_until_milk || '',
    });
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValues({ withdrawal_until_meat: '', withdrawal_until_milk: '' });
  };

  const handleSave = async (treatmentId: string) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('treatments')
        .update({
          withdrawal_until_meat: editValues.withdrawal_until_meat || null,
          withdrawal_until_milk: editValues.withdrawal_until_milk || null,
        })
        .eq('id', treatmentId);

      if (error) throw error;

      setEditingRow(null);
      if (onDataChange) {
        onDataChange();
      }
    } catch (error) {
      console.error('Error updating withdrawal dates:', error);
      alert('Klaida atnaujinant karencijos datas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white">
      <div className="text-center mb-6 no-print">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">IŠLAUKŲ ATASKAITA</h1>
        <p className="text-sm text-gray-500">Gyvūnai su karencijos laikotarpiu</p>
        <p className="text-sm text-gray-500">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {data.length === 0 && (
        <div className="text-center py-16">
          <p className="text-lg text-gray-500">Nėra gyvūnų su aktyvia karencija</p>
        </div>
      )}

      {data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-red-50 to-orange-50">
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Eilės Nr.</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Ūkis</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gyvūno žymė</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Rūšis</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydymo data</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Liga</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Panaudoti vaistai</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Karencija (mėsa)</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Karencija (pienas)</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinaras</th>
                <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700 no-print">Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, idx) => {
                const isEditing = editingRow === row.treatment_id;
                return (
                  <tr key={idx} className="hover:bg-red-50 transition-colors print-break-avoid">
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-bold text-gray-900">
                      {idx + 1}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">
                      <div className="flex items-center gap-1">
                        <span>{row.farm_name || '-'}</span>
                        {row.is_eco_farm && (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">
                            ECO
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">
                        {row.animal_tag || '-'}
                      </span>
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">
                      {row.species || '-'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-900">
                      {row.treatment_date ? formatDateLT(row.treatment_date) : '-'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-900">
                      {row.disease_name || '-'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">
                      {row.medicines_used || '-'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editValues.withdrawal_until_meat}
                          onChange={(e) => setEditValues({ ...editValues, withdrawal_until_meat: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      ) : row.withdrawal_until_meat ? (
                        <div className="space-y-1">
                          <div className={`font-bold ${row.withdrawal_days_meat > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {row.withdrawal_days_meat > 0 ? `${row.withdrawal_days_meat} d.` : 'Pasibaigė'}
                          </div>
                          <div className="text-[10px] text-gray-600">
                            iki {formatDateLT(row.withdrawal_until_meat)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Nėra</span>
                      )}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center">
                      {isEditing ? (
                        <input
                          type="date"
                          value={editValues.withdrawal_until_milk}
                          onChange={(e) => setEditValues({ ...editValues, withdrawal_until_milk: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                        />
                      ) : row.withdrawal_until_milk ? (
                        <div className="space-y-1">
                          <div className={`font-bold ${row.withdrawal_days_milk > 0 ? 'text-red-700' : 'text-green-700'}`}>
                            {row.withdrawal_days_milk > 0 ? `${row.withdrawal_days_milk} d.` : 'Pasibaigė'}
                          </div>
                          <div className="text-[10px] text-gray-600">
                            iki {formatDateLT(row.withdrawal_until_milk)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Nėra</span>
                      )}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">
                      {row.veterinarian || '-'}
                    </td>
                    <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center no-print">
                      {isEditing ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleSave(row.treatment_id)}
                            disabled={saving}
                            className="p-1 text-green-600 hover:bg-green-50 rounded disabled:opacity-50"
                            title="Išsaugoti"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="p-1 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                            title="Atšaukti"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEdit(row)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Redaguoti karencijos datas"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {data.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 no-print">
          <p>Viso gyvūnų su karencija: <span className="font-semibold text-gray-900">{data.length}</span></p>
        </div>
      )}
    </div>
  );
}

interface InvoicesReportProps {
  data: any[];
  onInvoiceDeleted?: () => void;
}

export function InvoicesReport({ data, onInvoiceDeleted }: InvoicesReportProps) {
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  const [deletingInvoice, setDeletingInvoice] = useState<string | null>(null);

  const toggleInvoice = (invoiceId: string) => {
    const newExpanded = new Set(expandedInvoices);
    if (newExpanded.has(invoiceId)) {
      newExpanded.delete(invoiceId);
    } else {
      newExpanded.add(invoiceId);
    }
    setExpandedInvoices(newExpanded);
  };

  const handleDeleteInvoice = async (invoice: any, event: React.MouseEvent) => {
    event.stopPropagation();
    
    const confirmMessage = `Ar tikrai norite ištrinti sąskaitą ${invoice.invoice_number}?\n\nBus ištrinta:\n- Sąskaita\n- Visi sąskaitos produktai\n- Visi atsargų įrašai\n- Visi panaudojimo įrašai\n\nŠis veiksmas negrįžtamas!`;
    
    if (!confirm(confirmMessage)) return;
    
    try {
      setDeletingInvoice(invoice.id);
      
      // Step 1: Get batch IDs first
      const batchIds = invoice.items
        ?.filter((item: any) => item.batch_id)
        .map((item: any) => item.batch_id) || [];
      
      if (batchIds.length === 0) {
        throw new Error('Sąskaita neturi susietų atsargų įrašų');
      }
      
      // Step 2: Return stock from usage_items
      const { data: usageItems } = await supabase
        .from('usage_items')
        .select('id, qty, batch_id')
        .in('batch_id', batchIds);
      
      if (usageItems && usageItems.length > 0) {
        // Group by batch and sum quantities
        const batchReturns = usageItems.reduce((acc: any, item: any) => {
          if (!acc[item.batch_id]) acc[item.batch_id] = 0;
          acc[item.batch_id] += item.qty;
          return acc;
        }, {});
        
        // Return stock to each batch
        for (const [batchId, qtyToReturn] of Object.entries(batchReturns)) {
          // Get current qty_left
          const { data: batch } = await supabase
            .from('batches')
            .select('qty_left')
            .eq('id', batchId)
            .single();
          
          if (batch) {
            const newQtyLeft = (batch.qty_left || 0) + (qtyToReturn as number);
            
            const { error: updateError } = await supabase
              .from('batches')
              .update({ 
                qty_left: newQtyLeft,
                status: 'active'
              })
              .eq('id', batchId);
            
            if (updateError) {
              console.warn(`Failed to return stock to batch ${batchId}:`, updateError);
            }
          }
        }
      }
      
      // Step 3: Delete usage_items
      if (usageItems && usageItems.length > 0) {
        const { error: deleteUsageError } = await supabase
          .from('usage_items')
          .delete()
          .in('id', usageItems.map((item: any) => item.id));
        
        if (deleteUsageError) throw deleteUsageError;
      }
      
      // Step 4: Delete batches
      if (batchIds.length > 0) {
        const { error: deleteBatchesError } = await supabase
          .from('batches')
          .delete()
          .in('id', batchIds);
        
        if (deleteBatchesError) throw deleteBatchesError;
      }
      
      // Step 5: Delete invoice items (CASCADE should handle this, but be explicit)
      const { error: deleteItemsError } = await supabase
        .from('invoice_items')
        .delete()
        .eq('invoice_id', invoice.id);
      
      if (deleteItemsError) throw deleteItemsError;
      
      // Step 6: Delete invoice
      const { error: deleteInvoiceError } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoice.id);
      
      if (deleteInvoiceError) throw deleteInvoiceError;
      
      alert(`Sąskaita ${invoice.invoice_number} sėkmingai ištrinta!`);
      
      // Refresh the list
      if (onInvoiceDeleted) {
        onInvoiceDeleted();
      }
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      alert(`Klaida trinant sąskaitą: ${error.message}`);
    } finally {
      setDeletingInvoice(null);
    }
  };

  const calculateTotals = () => {
    const totalNet = data.reduce((sum, inv) => sum + (inv.total_net || 0), 0);
    const totalVat = data.reduce((sum, inv) => sum + (inv.total_vat || 0), 0);
    const totalGross = data.reduce((sum, inv) => sum + (inv.total_gross || 0), 0);
    return { totalNet, totalVat, totalGross };
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Sąskaitų nerasta</p>
          <p className="text-sm text-gray-500 mt-1">Pakeiskite filtrus arba datos intervalą</p>
        </div>
      ) : (
        <>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div key="count">
                <p className="text-sm text-gray-600 mb-1">Sąskaitų skaičius</p>
                <p className="text-2xl font-bold text-gray-900">{data.length}</p>
              </div>
              <div key="net">
                <p className="text-sm text-gray-600 mb-1">Suma be PVM</p>
                <p className="text-2xl font-bold text-blue-700">€{totals.totalNet.toFixed(2)}</p>
              </div>
              <div key="vat">
                <p className="text-sm text-gray-600 mb-1">PVM suma</p>
                <p className="text-2xl font-bold text-gray-700">€{totals.totalVat.toFixed(2)}</p>
              </div>
              <div key="gross">
                <p className="text-sm text-gray-600 mb-1">Suma su PVM</p>
                <p className="text-2xl font-bold text-green-700">€{totals.totalGross.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {data.map((invoice) => {
              const isExpanded = expandedInvoices.has(invoice.id);
              const itemsCount = invoice.items?.length || 0;
              
              return (
                <div
                  key={invoice.id}
                  className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition-colors"
                >
                  <button
                    onClick={() => toggleInvoice(invoice.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <div className="bg-blue-100 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1 flex-wrap">
                          <span key={`num-${invoice.id}`} className="font-bold text-gray-900">#{invoice.invoice_number}</span>
                          <span key={`date-${invoice.id}`} className="text-sm text-gray-500">
                            {formatDateLT(invoice.invoice_date)}
                          </span>
                          <span key={`badge-${invoice.id}`} className={`text-xs px-2 py-0.5 rounded font-medium ${
                            invoice.farm_id 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-purple-100 text-purple-700'
                          }`}>
                            {invoice.farm_id ? invoice.farm?.name || 'Ūkis' : 'Sandėlis'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span key={`supp-${invoice.id}`} className="font-medium">{invoice.supplier_name || invoice.supplier?.name}</span>
                          {(invoice.supplier_code || invoice.supplier?.code) && (
                            <span key={`code-${invoice.id}`} className="text-xs text-gray-500">({invoice.supplier_code || invoice.supplier?.code})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div key={`total-${invoice.id}`} className="text-xl font-bold text-blue-700">
                          {invoice.currency} {(invoice.total_gross || 0).toFixed(2)}
                        </div>
                        <div key={`count-${invoice.id}`} className="text-xs text-gray-500">
                          {itemsCount} produktai
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => handleDeleteInvoice(invoice, e)}
                        disabled={deletingInvoice === invoice.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Ištrinti sąskaitą"
                      >
                        {deletingInvoice === invoice.id ? (
                          <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {isExpanded && invoice.items && (
                    <div className="border-t-2 border-gray-200 bg-gray-50 p-4">
                      <div className="space-y-3">
                        {invoice.items.map((item: any) => {
                          const warehouseBatch = item.warehouse_batch;
                          const farmBatch = item.batch;
                          const batchLot = warehouseBatch?.lot || farmBatch?.lot;
                          
                          // Determine target farms: if invoice is for a farm, show that farm
                          // If warehouse invoice, check allocations to see which farms received this product
                          let targetFarms: any[] = [];
                          if (invoice.farm_id && invoice.farm) {
                            targetFarms = [invoice.farm];
                          } else if (warehouseBatch?.allocations && warehouseBatch.allocations.length > 0) {
                            targetFarms = warehouseBatch.allocations.map((alloc: any) => ({
                              name: alloc.farm?.name,
                              qty: alloc.allocated_qty
                            }));
                          } else if (farmBatch?.farm) {
                            targetFarms = [farmBatch.farm];
                          }

                          return (
                            <div
                              key={item.id}
                              className="bg-white p-4 rounded-lg border border-gray-200"
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs font-medium text-gray-500">#{item.line_no}</span>
                                    <span className="font-semibold text-gray-900">
                                      {item.product?.name || item.description}
                                    </span>
                                    {item.product && (
                                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                        {item.product.category}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {item.sku && (
                                    <div className="text-xs text-gray-500 mb-2">SKU: {item.sku}</div>
                                  )}
                                  {item.discount_percent != null && (
                                    <div className="text-xs text-amber-700 font-medium mb-2">
                                      Nuolaida: {Number(item.discount_percent).toFixed(2)}%
                                    </div>
                                  )}

                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div key={`qty-${item.id}`}>
                                      <span className="text-gray-600">Kiekis:</span>
                                      <span className="ml-2 font-medium text-gray-900">{item.quantity}</span>
                                    </div>
                                    <div key={`price-${item.id}`}>
                                      <span className="text-gray-600">Vnt. kaina (be nuol.):</span>
                                      <span className="ml-2 font-medium text-gray-900">
                                        {(() => {
                                          const qty = parseFloat(item.quantity) || 1;
                                          const totalPrice = parseFloat(item.total_price) || 0;
                                          const discount = parseFloat(item.discount_percent) || 0;
                                          
                                          if (discount > 0) {
                                            // Calculate total before discount, then derive unit price
                                            const totalBeforeDiscount = totalPrice / (1 - discount / 100);
                                            const unitPriceBeforeDiscount = totalBeforeDiscount / qty;
                                            return `${invoice.currency} ${unitPriceBeforeDiscount.toFixed(2)}`;
                                          }
                                          return `${invoice.currency} ${(item.unit_price || 0).toFixed(2)}`;
                                        })()}
                                      </span>
                                    </div>
                                    {item.discount_percent != null && item.discount_percent > 0 && (
                                      <div key={`price-after-${item.id}`}>
                                        <span className="text-gray-600">Vnt. kaina (su nuol.):</span>
                                        <span className="ml-2 font-medium text-green-700">
                                          {invoice.currency} {(item.unit_price || 0).toFixed(2)}
                                        </span>
                                      </div>
                                    )}
                                    {batchLot && (
                                      <div key={`batch-${item.id}`}>
                                        <span className="text-gray-600">Serija:</span>
                                        <span className="ml-2 font-medium text-gray-900">{batchLot}</span>
                                      </div>
                                    )}
                                    <div key={`farm-${item.id}`} className="col-span-2">
                                      <span className="text-gray-600">Vieta:</span>
                                      {targetFarms.length > 0 ? (
                                        <div className="ml-2 inline-flex flex-wrap gap-2">
                                          {targetFarms.map((farm: any, idx: number) => (
                                            <span key={`farm-${item.id}-${idx}`} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-sm font-bold">
                                              {farm.name}
                                              {farm.qty && ` (${farm.qty})`}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <span className="ml-2 font-bold text-purple-700">Sandėlis</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="text-right">
                                  <div className="font-bold text-blue-700 text-lg">
                                    {invoice.currency} {(item.total_price || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-4 pt-4 border-t-2 border-gray-300 bg-white rounded-lg p-4">
                        <div className="space-y-2">
                          {/* Subtotal before discount (sum of item total_price without discount) */}
                          <div className="flex justify-between items-center py-2 border-b border-gray-200">
                            <span className="text-sm font-semibold text-gray-700">Tarpinė suma (be nuolaidos):</span>
                            <span className="text-base font-bold text-gray-900">
                              {invoice.currency} {(() => {
                                const totalBeforeDiscount = (invoice.items || []).reduce((sum: number, item: any) => {
                                  const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                                  if (hasDiscount) {
                                    // Calculate what the total_price would have been without discount
                                    const totalWithDiscount = parseFloat(item.total_price) || 0;
                                    const totalBeforeDiscount = totalWithDiscount / (1 - item.discount_percent / 100);
                                    return sum + totalBeforeDiscount;
                                  }
                                  return sum + (parseFloat(item.total_price) || 0);
                                }, 0);
                                return totalBeforeDiscount.toFixed(2);
                              })()}
                            </span>
                          </div>

                          {/* Discount amount - only show if there's a discount */}
                          {(invoice.items || []).some((item: any) => item.discount_percent != null && item.discount_percent > 0) && (
                            <div className="flex justify-between items-center py-2 bg-amber-50 px-3 rounded">
                              <span className="text-sm font-semibold text-amber-700">Nuolaida:</span>
                              <span className="text-base font-bold text-amber-700">
                                -{invoice.currency} {(() => {
                                  const discountAmount = (invoice.items || []).reduce((sum: number, item: any) => {
                                    const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                                    if (hasDiscount) {
                                      const totalWithDiscount = parseFloat(item.total_price) || 0;
                                      const totalBeforeDiscount = totalWithDiscount / (1 - item.discount_percent / 100);
                                      return sum + (totalBeforeDiscount - totalWithDiscount);
                                    }
                                    return sum;
                                  }, 0);
                                  return discountAmount.toFixed(2);
                                })()}
                              </span>
                            </div>
                          )}

                          {/* Sum of item total_price (after discount, this is what invoice.total_net should be based on) */}
                          <div className="flex justify-between items-center py-2 bg-blue-50 px-3 rounded">
                            <span className="text-sm font-semibold text-blue-900">Suma su nuolaida (be PVM):</span>
                            <span className="text-lg font-bold text-blue-700">
                              {invoice.currency} {(() => {
                                const totalAfterDiscount = (invoice.items || []).reduce((sum: number, item: any) => {
                                  return sum + (parseFloat(item.total_price) || 0);
                                }, 0);
                                return totalAfterDiscount.toFixed(2);
                              })()}
                            </span>
                          </div>

                          {/* VAT */}
                          <div className="flex justify-between items-center py-2 bg-gray-100 px-3 rounded">
                            <span className="text-sm font-semibold text-gray-700">PVM ({invoice.vat_rate || 0}%):</span>
                            <span className="text-base font-bold text-gray-900">
                              {invoice.currency} {(() => {
                                const totalAfterDiscount = (invoice.items || []).reduce((sum: number, item: any) => {
                                  return sum + (parseFloat(item.total_price) || 0);
                                }, 0);
                                const vat = totalAfterDiscount * ((invoice.vat_rate || 0) / 100);
                                return vat.toFixed(2);
                              })()}
                            </span>
                          </div>

                          {/* Final total WITHOUT discount (with VAT) */}
                          <div className="flex justify-between items-center py-3 bg-blue-50 px-3 rounded border-t-2 border-blue-300">
                            <span className="text-base font-bold text-blue-900">IŠ VISO MOKĖTI (be nuolaidos, su PVM):</span>
                            <span className="text-xl font-bold text-blue-700">
                              {invoice.currency} {(() => {
                                const totalBeforeDiscount = (invoice.items || []).reduce((sum: number, item: any) => {
                                  const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                                  if (hasDiscount) {
                                    const totalWithDiscount = parseFloat(item.total_price) || 0;
                                    const totalBeforeDiscount = totalWithDiscount / (1 - item.discount_percent / 100);
                                    return sum + totalBeforeDiscount;
                                  }
                                  return sum + (parseFloat(item.total_price) || 0);
                                }, 0);
                                const totalWithVAT = totalBeforeDiscount * (1 + (invoice.vat_rate || 0) / 100);
                                return totalWithVAT.toFixed(2);
                              })()}
                            </span>
                          </div>

                          {/* Discounted price - only show if there's a discount */}
                          {(invoice.items || []).some((item: any) => item.discount_percent != null && item.discount_percent > 0) && (
                            <div className="flex justify-between items-center py-2 bg-green-50 px-3 rounded">
                              <span className="text-sm font-semibold text-green-700">Su pritaikyta nuolaida:</span>
                              <span className="text-lg font-bold text-green-700">
                                {invoice.currency} {(() => {
                                  const totalAfterDiscount = (invoice.items || []).reduce((sum: number, item: any) => {
                                    return sum + (parseFloat(item.total_price) || 0);
                                  }, 0);
                                  const totalWithVAT = totalAfterDiscount * (1 + (invoice.vat_rate || 0) / 100);
                                  return totalWithVAT.toFixed(2);
                                })()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
