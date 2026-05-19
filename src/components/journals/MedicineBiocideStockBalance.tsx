import { VeterinaryMedicineBiocideStockBalance as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface MedicineBiocideStockBalanceProps {
  data: JournalData;
}

export function MedicineBiocideStockBalance({ data }: MedicineBiocideStockBalanceProps) {
  const formatDateLT = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('lt-LT');
  };

  return (
    <div className="bg-white print-content p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">VETERINARINIŲ VAISTŲ, BIOCIDŲ LIKUTIS</h1>
        <p className="text-sm text-gray-500">Vaistų ir biocidų apskaitos registras pagal LR reikalavimus</p>
        <p className="text-sm text-gray-500 mt-1">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {/* Info section */}
      <div className="mb-6 space-y-2 text-sm">
        <div><strong>Veterinarinė įstaiga:</strong> {data.veterinaryProviderName}</div>
        <div className="text-xs text-gray-500 mt-2">
          Forma patvirtinta Valstybinės maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodžio 29 d. įsakymu Nr. B1-735
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-purple-50 to-pink-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Prekės aprašymas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dokumento Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Galiojimo laikas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Serija</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gauta</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sunaudota</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Likutis</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr key={index} className="hover:bg-purple-50 transition-colors">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">
                  <div className="space-y-0.5">
                    <div className="text-gray-600 italic text-[10px]">{row.itemCategoryText}</div>
                    <div className="text-gray-600 italic text-[10px]">
                      <span>{row.packageLabel}</span> <span className="font-semibold text-gray-900">{row.packageUnit}</span>
                    </div>
                    <div className="font-semibold text-gray-900">{row.productName}</div>
                    <div className="text-gray-600 text-[10px]">{row.registrationNumberText}</div>
                  </div>
                </td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.documentNumber || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.expiryDate || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.batchSeries || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-mono text-gray-900">{row.receivedQuantity || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-mono text-gray-900">{row.usedQuantity || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-right font-mono text-gray-900">{row.remainingQuantity || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-700">
        <strong>Už žurnalo tvarkymą atsakingas veterinarijos gydytojas:</strong> {data.responsibleVetName}
      </div>
    </div>
  );
}
