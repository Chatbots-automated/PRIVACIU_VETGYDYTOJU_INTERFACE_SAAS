import { formatDateLT } from '../lib/formatters';

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

  // Calculate Eil. Nr. based on registration date
  // Data is sorted DESC (newest first), but Eil. Nr. should be sequential from oldest (1) to newest
  // Since we have multiple rows per treatment (one per medicine), we need to track unique treatments
  const dataWithEilNr = data.map((row, idx) => {
    // Count unique treatments that are OLDER than this one (earlier date)
    const treatmentsOlderThanThis = new Set<string>();
    
    for (let i = 0; i < data.length; i++) {
      const currentRow = data[i];
      
      // If current row has an earlier date, it's older (gets lower Eil. Nr.)
      if (currentRow.registration_date < row.registration_date) {
        treatmentsOlderThanThis.add(currentRow.treatment_id);
      } 
      // If same date, use created_at to determine order
      else if (currentRow.registration_date === row.registration_date) {
        if (currentRow.created_at < row.created_at) {
          treatmentsOlderThanThis.add(currentRow.treatment_id);
        } else if (currentRow.created_at === row.created_at && 
                   currentRow.treatment_id !== row.treatment_id) {
          // Same timestamp, use treatment_id for consistent ordering
          if (currentRow.treatment_id < row.treatment_id) {
            treatmentsOlderThanThis.add(currentRow.treatment_id);
          }
        }
      }
    }
    
    // Eil. Nr. = number of older treatments + 1
    return {
      ...row,
      eil_nr: treatmentsOlderThanThis.size + 1
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
                11.<br/>Suteiktos<br/>veterinarijos<br/>paslaugos
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
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900">
                  {row.tests || '-'}
                </td>
                
                {/* Column 10: Clinical diagnosis */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px]">
                  <div className="font-semibold text-gray-900">{row.disease_name || '-'}</div>
                  {row.clinical_diagnosis && row.clinical_diagnosis !== row.disease_name && (
                    <div className="text-gray-600 text-[10px] mt-0.5">{row.clinical_diagnosis}</div>
                  )}
                </td>
                
                {/* Column 11: Veterinary services provided - Medicine details */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px]">
                  {row.services && <div className="text-gray-900 mb-1">{row.services}</div>}
                  {row.medicine_name && (
                    <div className="text-gray-900 font-medium">
                      {row.medicine_name}
                    </div>
                  )}
                  {row.medicine_dose && (
                    <div className="text-gray-700 text-[10px] mt-0.5">
                      Dozė: {row.medicine_dose} {row.medicine_unit}
                      {row.medicine_days && ` × ${row.medicine_days} d.`}
                    </div>
                  )}
                  {!row.services && !row.medicine_name && <span className="text-gray-400">-</span>}
                </td>
                
                {/* Column 12: Withdrawal period - Only show dates */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px]">
                  {row.withdrawal_until_meat && row.withdrawal_days_meat > 0 && (
                    <div className="text-red-700 text-[10px]">🥩 {formatDateLT(row.withdrawal_until_meat)}</div>
                  )}
                  {row.withdrawal_until_milk && row.withdrawal_days_milk > 0 && (
                    <div className="text-blue-700 text-[10px] mt-0.5">🥛 {formatDateLT(row.withdrawal_until_milk)}</div>
                  )}
                  {(!row.withdrawal_until_meat || row.withdrawal_days_meat === 0) && 
                   (!row.withdrawal_until_milk || row.withdrawal_days_milk === 0) && (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                
                {/* Column 13: Outcome */}
                <td className="border-2 border-gray-300 px-2 py-2 text-[11px] text-gray-900">
                  {row.treatment_outcome || '-'}
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
                        {batch.invoice_number && <div className="font-medium text-gray-900">Sąskaita faktūra Nr. {batch.invoice_number}</div>}
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
