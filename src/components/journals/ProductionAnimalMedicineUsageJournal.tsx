import { ProductionAnimalMedicineUsageJournal as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface ProductionAnimalMedicineUsageJournalProps {
  data: JournalData;
}

export function ProductionAnimalMedicineUsageJournal({ data }: ProductionAnimalMedicineUsageJournalProps) {
  return (
    <div className="journal-container journal-landscape">
      <div className="journal-page">
        {/* Header Section */}
        <div className="journal-header">
          <div className="journal-title-section">
            <h2 className="journal-subtitle">Veterinarinės medicinos produktų ir vaistinių pašarų naudojamų produkcijos</h2>
            <h2 className="journal-subtitle">gyvūnams apskaitos ir naudojimo kontrolės</h2>
          </div>
          
          {/* Official reference block */}
          <div className="official-reference-block">
            <p className="official-form-title">Vadovaujantis</p>
            <p>Valstybinės maisto ir veterinarijos</p>
            <p>tarnybos direktoriaus</p>
            <p>2003 m. balandžio 18 d.</p>
            <p>įsakymu Nr. B1-390</p>
          </div>
        </div>

        <div className="journal-main-title">
          <h1>ŽURNALAS</h1>
        </div>

        {/* Provider and Owner Information */}
        <div className="journal-info-section">
          <div className="info-line">
            <span className="info-label">Veterinarinė įstaiga:</span>
            <span className="info-value">{data.veterinaryProviderName}</span>
          </div>
          <div className="info-line">
            <span className="info-label">Gyvulių savininkas:</span>
            <span className="info-value">{data.animalOwnerName}</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="journal-table-container">
          <table className="journal-table">
            <thead>
              <tr>
                <th rowSpan={2} className="col-eil-nr">Eil.<br/>Nr.</th>
                <th rowSpan={2} className="col-reg-data">Reg.<br/>data</th>
                <th rowSpan={2} className="col-animal-id">Ženklinimo<br/>Nr</th>
                <th colSpan={2} className="col-group-header">Gyvūnas</th>
                <th rowSpan={2} className="col-treatment-period">Gydymo<br/>laikotarpis</th>
                <th rowSpan={2} className="col-diagnosis">Klinikinė<br/>diagnozė</th>
                <th rowSpan={2} className="col-medication">Medikamento<br/>pavadinimas</th>
                <th rowSpan={2} className="col-used-amount">Sunaudota</th>
                <th rowSpan={2} className="col-withdrawal">Išlauka</th>
                <th rowSpan={2} className="col-owner-sig">Savininko<br/>parašas</th>
                <th rowSpan={2} className="col-vet-sig">Vet.gydytojo<br/>parašas</th>
              </tr>
              <tr>
                <th className="col-species">Rūšis</th>
                <th className="col-age">Amžius</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <tr key={index} className="journal-table-row">
                  <td className="text-center">{row.rowNo}</td>
                  <td className="text-center">{row.registrationDate}</td>
                  <td className="text-center">{row.animalIdentifier || '-'}</td>
                  <td className="text-center">{row.animalSpecies || '-'}</td>
                  <td className="text-center">{row.animalAge || '-'}</td>
                  <td className="text-center">{row.treatmentPeriod || '-'}</td>
                  <td className="text-left cell-wrap">{row.clinicalDiagnosis || '-'}</td>
                  <td className="text-left cell-wrap">{row.medicationName || '-'}</td>
                  <td className="text-center">{row.usedAmount || '-'}</td>
                  <td className="text-center">{row.withdrawal || '-'}</td>
                  <td className="text-center">{row.ownerSignature || '-'}</td>
                  <td className="text-center">{row.vetSignature || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with page number */}
        <div className="journal-footer">
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
