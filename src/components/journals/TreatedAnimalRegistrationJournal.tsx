import { TreatedAnimalRegistrationJournal as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface TreatedAnimalRegistrationJournalProps {
  data: JournalData;
}

export function TreatedAnimalRegistrationJournal({ data }: TreatedAnimalRegistrationJournalProps) {
  return (
    <div className="journal-container journal-landscape">
      <div className="journal-page">
        {/* Header Section */}
        <div className="journal-header">
          <div className="journal-title-section">
            <h1 className="journal-title">GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS</h1>
          </div>
          
          {/* Top-right official confirmation block */}
          <div className="official-form-block">
            <p className="official-form-title">Forma patvirtinta</p>
            <p>Valstybinės maisto ir veterinarijos</p>
            <p>tarnybos direktoriaus</p>
            <p>2005 m. gruodžio 29 d.</p>
            <p>įsakymu Nr. B1-735</p>
          </div>
        </div>

        {/* Provider and Period Information */}
        <div className="journal-info-section">
          <div className="info-line">
            <span className="info-label">Veterinarinė įstaiga:</span>
            <span className="info-value">{data.veterinaryProviderName}</span>
          </div>
          <div className="info-line">
            <span className="info-label">Laikotarpis:</span>
            <span className="info-value">{data.periodStart} - {data.periodEnd}</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="journal-table-container">
          <table className="journal-table">
            <thead>
              <tr>
                <th rowSpan={2} className="col-eil-nr">Eil.<br/>Nr.</th>
                <th rowSpan={2} className="col-reg-data">Reg.<br/>data</th>
                <th rowSpan={2} className="col-holder">Gyvūno laikytojas,<br/>adresas</th>
                <th colSpan={3} className="col-group-header">Gyvūnas</th>
                <th rowSpan={2} className="col-treatment-period">Gydymo<br/>laikotarpis</th>
                <th rowSpan={2} className="col-condition">Gyvūno<br/>būklė</th>
                <th rowSpan={2} className="col-lab-tests">Lab.<br/>tyrimai</th>
                <th rowSpan={2} className="col-diagnosis">Klinikinė<br/>diagnozė</th>
                <th rowSpan={2} className="col-treatment">Gydymas</th>
                <th rowSpan={2} className="col-dose">Dozė</th>
                <th rowSpan={2} className="col-withdrawal">Išlauka</th>
                <th rowSpan={2} className="col-outcome">Baigtis</th>
              </tr>
              <tr>
                <th className="col-animal-id">Ženklinimo</th>
                <th className="col-age">Amžius</th>
                <th className="col-species">Rūšis</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <tr key={index} className="journal-table-row">
                  <td className="text-center">{row.rowNo}</td>
                  <td className="text-center">{row.registrationDate}</td>
                  <td className="text-left">{row.animalHolderAndAddress}</td>
                  <td className="text-center">{row.animalIdentifier || '-'}</td>
                  <td className="text-center">{row.animalAge || '-'}</td>
                  <td className="text-center">{row.animalSpecies || '-'}</td>
                  <td className="text-center">{row.treatmentPeriod || '-'}</td>
                  <td className="text-center">{row.animalCondition || '-'}</td>
                  <td className="text-center">{row.labTests || '-'}</td>
                  <td className="text-left cell-wrap">{row.clinicalDiagnosis || '-'}</td>
                  <td className="text-left cell-wrap">{row.treatment || '-'}</td>
                  <td className="text-center">{row.dose || '-'}</td>
                  <td className="text-center">{row.withdrawal || '-'}</td>
                  <td className="text-center">{row.outcome || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with signature */}
        <div className="journal-footer">
          <div className="signature-section">
            <div className="signature-line">
              <span className="signature-label">Už žurnalo tvarkymą atsakingas veterinarijos gydytojas:</span>
              <span className="signature-value">{data.responsibleVetName}</span>
              <span className="signature-placeholder">_________________</span>
            </div>
          </div>
          
          {data.pageNumber && data.totalPages && (
            <div className="page-number">
              Puslapis {data.pageNumber} iš {data.totalPages}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
