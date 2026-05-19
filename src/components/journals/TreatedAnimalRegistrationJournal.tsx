import { TreatedAnimalRegistrationJournal as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface TreatedAnimalRegistrationJournalProps {
  data: JournalData;
}

export function TreatedAnimalRegistrationJournal({ data }: TreatedAnimalRegistrationJournalProps) {
  const formatDateLT = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('lt-LT');
  };

  return (
    <div className="bg-white print-content p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">Oficialus gydytų gyvūnų registras pagal LR reikalavimus</p>
        <p className="text-sm text-gray-500 mt-1">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {/* Info section */}
      <div className="mb-6 space-y-2 text-sm">
        <div><strong>Veterinarinė įstaiga:</strong> {data.veterinaryProviderName}</div>
        <div><strong>Laikotarpis:</strong> {data.periodStart} - {data.periodEnd}</div>
        <div className="text-xs text-gray-500 mt-2">
          Forma patvirtinta Valstybinės maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodžio 29 d. įsakymu Nr. B1-735
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Eil. Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Reg. data</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gyvūno laikytojas, adresas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Ženklinimo Nr.</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Amžius</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Rūšis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydymo laikotarpis</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gyvūno būklė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Lab. tyrimai</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Klinikinė diagnozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Gydymas</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Dozė</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Išlauka</th>
              <th className="border-2 border-gray-300 px-3 py-3 text-xs font-bold text-gray-700">Baigtis</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, index) => (
              <tr key={index} className="hover:bg-blue-50 transition-colors">
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center font-bold text-gray-900">{row.rowNo}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.registrationDate}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.animalHolderAndAddress}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.animalIdentifier || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.animalAge || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.animalSpecies || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.treatmentPeriod || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.animalCondition || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.labTests || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.clinicalDiagnosis || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-gray-700">{row.treatment || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.dose || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.withdrawal || '-'}</td>
                <td className="border-2 border-gray-300 px-3 py-3 text-xs text-center text-gray-700">{row.outcome || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-700">
        <strong>Už žurnalo tvarkymą atsakingas veterinarijos gydytojas:</strong> {data.responsibleVetName}
        {data.pageNumber && data.totalPages && (
          <div className="text-right text-xs text-gray-500 mt-2">
            Puslapis {data.pageNumber} iš {data.totalPages}
          </div>
        )}
      </div>
    </div>
  );
}
