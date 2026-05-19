import { ProductionAnimalMedicineUsageJournal as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface ProductionAnimalMedicineUsageJournalProps {
  data: JournalData;
}

export function ProductionAnimalMedicineUsageJournal({ data }: ProductionAnimalMedicineUsageJournalProps) {
  const formatDateLT = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('lt-LT');
  };

  return (
    <div className="bg-white print-content p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-sm text-gray-600 mb-1">
          <div>Veterinarinių medicinos produktų ir vaistinių pašarų naudojamų produkcijos</div>
          <div>gyvūnams apskaitos ir naudojimo kontrolės</div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Produkcijos gyvūnų gydymo registras pagal LR reikalavimus</p>
        <p className="text-sm text-gray-500 mt-1">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {/* Info section */}
      <div className="mb-6 space-y-2 text-sm">
        <div><strong>Veterinarinė įstaiga:</strong> {data.veterinaryProviderName}</div>
        <div><strong>Gyvulių savininkas:</strong> {data.animalOwnerName}</div>
        <div className="text-xs text-gray-500 mt-2">
          Vadovaujantis Valstybinės maisto ir veterinarijos tarnybos direktoriaus 2003 m. balandžio 18 d. įsakymu Nr. B1-390
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-green-50 to-emerald-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Eil. Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Reg. data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Ženklinimo Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Rūšis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Amžius</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydymo laikotarpis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Klinikinė diagnozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Medikamento pavadinimas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Sunaudota</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Išlauka</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Savininko parašas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Vet. gydytojo parašas</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr key={index} className="hover:bg-green-50 transition-colors">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-bold text-gray-900">{row.rowNo}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.registrationDate}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.animalIdentifier || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.animalSpecies || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.animalAge || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.treatmentPeriod || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.clinicalDiagnosis || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.medicationName || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.usedAmount || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.withdrawal || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.ownerSignature || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.vetSignature || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {data.pageNumber && data.totalPages && (
        <div className="mt-6 text-sm text-gray-700">
          <div className="text-right text-xs text-gray-500">
            Puslapis {data.pageNumber} iš {data.totalPages}
          </div>
        </div>
      )}
    </div>
  );
}
