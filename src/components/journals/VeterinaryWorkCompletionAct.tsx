import { VeterinaryWorkCompletionAct as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface VeterinaryWorkCompletionActProps {
  data: JournalData;
}

export function VeterinaryWorkCompletionAct({ data }: VeterinaryWorkCompletionActProps) {
  const formatDateLT = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('lt-LT');
  };

  return (
    <div className="bg-white print-content p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VETERINARINIŲ DARBŲ ATLIKIMO AKTAS</h1>
        <p className="text-sm text-gray-500">Veterinarinių darbų registras pagal LR reikalavimus</p>
        <p className="text-sm text-gray-500 mt-1">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {/* Info section */}
      <div className="mb-6 space-y-2 text-sm">
        <div><strong>Veterinarinė įstaiga:</strong> {data.veterinaryProviderName}</div>
        <div className="mt-4"><strong>Ūkio savininkas:</strong> {data.farmOwnerName}</div>
        <div><strong>Adresas:</strong> {data.farmOwnerAddress}</div>
        <div className="mt-4 flex justify-between items-center">
          <span><strong>Data:</strong> {data.documentDate}</span>
          <span><strong>Nr:</strong> {data.documentNumber || '____________________'}</span>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Forma patvirtinta Valstybinės maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodžio 29 d. įsakymu Nr. B1-735
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-cyan-50 to-blue-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '60px' }}>Eil. Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '100px' }}>Data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Darbo pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '140px' }}>Dokumento Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '120px' }}>Įplaukos (EUR)</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr key={index} className="hover:bg-cyan-50 transition-colors">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-bold text-gray-900">{row.rowNo}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.date}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.workName || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.documentNo || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-mono text-gray-900">{row.income || '-'}</td>
              </tr>
            ))}
            {/* Total row */}
            <tr className="bg-gray-100">
              <td colSpan={4} className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-bold text-gray-900">Suma:</td>
              <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-mono font-bold text-gray-900">{data.totalIncome}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-700 space-y-4">
        <div>
          <div className="mb-1"><strong>Darbus priėmė:</strong></div>
          <div className="text-xs text-gray-500 italic mb-1">Vardas, Pavardė, Parašas</div>
          <div>{data.acceptedByName}</div>
        </div>
        
        <div>
          <div className="mb-1"><strong>Darbus atliko:</strong></div>
          <div className="text-xs text-gray-500 italic mb-1">Vardas, Pavardė, Parašas</div>
          <div>{data.performedByName}</div>
        </div>
      </div>
    </div>
  );
}
