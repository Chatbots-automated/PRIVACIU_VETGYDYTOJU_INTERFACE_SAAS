import { UsedVeterinaryMedicineBiocideWriteOffAct as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface MedicineBiocideWriteOffActProps {
  data: JournalData;
}

export function MedicineBiocideWriteOffAct({ data }: MedicineBiocideWriteOffActProps) {
  const formatDateLT = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('lt-LT');
  };

  return (
    <div className="bg-white print-content p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SUNAUDOTŲ VETERINARINIŲ VAISTŲ, BIOCIDŲ NURAŠYMO AKTAS</h1>
        <p className="text-sm text-gray-500">Vaistų nurašymo registras pagal LR reikalavimus</p>
        <p className="text-sm text-gray-500 mt-1">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {/* Info section */}
      <div className="mb-6 space-y-2 text-sm">
        <div><strong>Veterinarinė įstaiga:</strong> {data.veterinaryProviderName}</div>
        <div className="text-xs text-gray-500 italic">
          (veterinarinio aptarnavimo (paslaugų) įmonės, įstaigos ar valstybinės veterinarinės priežiūros objekto pavadinimas)
        </div>
        <div className="mt-4"><strong>Vieta:</strong> {data.place}</div>
        <div className="mt-4">Nurašomi sunaudoti veterinariniai vaistai ir biocidai</div>
        <div className="mt-2 flex justify-between items-center">
          <span>Data: {formatDateLT(new Date().toISOString())}</span>
          <span><strong>Nr.</strong> {data.documentNumber || '____________________'}</span>
        </div>
        <div className="text-xs text-gray-500 mt-2">
          Forma patvirtinta Valstybinės maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodžio 29 d. įsakymu Nr. B1-735
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-amber-50 to-yellow-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '60px' }}>Eil. Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Veterinarinio vaisto, biocido pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '120px' }}>Serija</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '120px' }}>Matavimo vnt.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700" style={{ width: '120px' }}>Sunaudotas kiekis</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr key={index} className="hover:bg-amber-50 transition-colors">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-bold text-gray-900">{row.rowNo}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.productName || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.batchSeries || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.measurementUnit || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-900">{row.usedQuantity || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-700">
        <strong>Veterinarijos gydytojas:</strong> {data.responsibleVetName}
      </div>
    </div>
  );
}
