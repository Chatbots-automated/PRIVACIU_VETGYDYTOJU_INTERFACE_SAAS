import { UsedVeterinaryMedicineBiocideWriteOffAct as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface MedicineBiocideWriteOffActProps {
  data: JournalData;
}

export function MedicineBiocideWriteOffAct({ data }: MedicineBiocideWriteOffActProps) {
  return (
    <div className="journal-container journal-portrait">
      <div className="journal-page">
        {/* Header Section */}
        <div className="journal-header">
          <div className="journal-title-section">
            <h1 className="journal-title">SUNAUDOTŲ VETERINARINIŲ VAISTŲ, BIOCIDŲ NURAŠYMO AKTAS</h1>
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

        {/* Provider and Document Information */}
        <div className="journal-info-section writeoff-info">
          <div className="info-line">
            <span className="info-label">Veterinarinė įstaiga:</span>
            <span className="info-value">{data.veterinaryProviderName}</span>
          </div>
          <div className="info-line centered info-sublabel">
            (veterinarinio aptarnavimo (paslaugų) įmonės, įstaigos ar valstybinės veterinarinės priežiūros objekto pavadinimas)
          </div>
          
          <div className="info-line centered" style={{ marginTop: '1rem' }}>
            <span className="info-value">{data.place}</span>
          </div>
          <div className="info-line centered info-sublabel">
            (vieta)
          </div>
          
          <div className="info-line centered" style={{ marginTop: '1rem' }}>
            <span>mėnesį sunaudoti veterinariniai vaistai ir biocidai:</span>
          </div>
          
          <div className="info-line centered" style={{ marginTop: '0.5rem' }}>
            <span>Nurašomi šie {data.periodText}</span>
          </div>
          
          <div className="info-line" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>{data.documentDateText}</span>
            <span>Nr {data.documentNumber || '____________________'}</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="journal-table-container">
          <table className="journal-table writeoff-table">
            <thead>
              <tr>
                <th className="col-eil-nr">EilNr</th>
                <th className="col-product-name-wide">Veterinarinio vaisto,biocido pavadinimas</th>
                <th className="col-batch">Serija</th>
                <th className="col-unit">Matavimo vnt.</th>
                <th className="col-used-qty">Sunaudotas kiekis</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <tr key={index} className="journal-table-row">
                  <td className="text-center">{row.rowNo}</td>
                  <td className="text-left">{row.productName || '-'}</td>
                  <td className="text-center">{row.batchSeries || '-'}</td>
                  <td className="text-center">{row.measurementUnit || '-'}</td>
                  <td className="text-center">{row.usedQuantity || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer with signature */}
        <div className="journal-footer">
          <div className="signature-section">
            <div className="signature-line">
              <span className="signature-label">Veterinarijos gydytojas:</span>
              <span className="signature-value">{data.responsibleVetName}</span>
              <span className="signature-placeholder">_________________</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
