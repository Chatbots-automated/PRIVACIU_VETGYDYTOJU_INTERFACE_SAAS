import { VeterinaryWorkCompletionAct as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface VeterinaryWorkCompletionActProps {
  data: JournalData;
}

export function VeterinaryWorkCompletionAct({ data }: VeterinaryWorkCompletionActProps) {
  return (
    <div className="journal-container journal-portrait">
      <div className="journal-page">
        {/* Header Section */}
        <div className="journal-header">
          <div className="journal-title-section">
            <h1 className="journal-title">Veterinarinių darbų atlikimo aktas</h1>
          </div>
        </div>

        {/* Provider and Farm Information */}
        <div className="journal-info-section work-act-info">
          <div className="info-line">
            <span className="info-label">Veterinarinė įstaiga:</span>
            <span className="info-value">{data.veterinaryProviderName}</span>
          </div>
          
          <div className="info-line" style={{ marginTop: '1rem' }}>
            <span className="info-label">Ūkio savininkas:</span>
            <span className="info-value">{data.farmOwnerName}</span>
          </div>
          
          <div className="info-line">
            <span className="info-label">Adresas:</span>
            <span className="info-value">{data.farmOwnerAddress}</span>
          </div>
          
          <div className="info-line" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>Data: {data.documentDate}</span>
            <span>Nr: {data.documentNumber || '____________________'}</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="journal-table-container">
          <table className="journal-table work-act-table">
            <thead>
              <tr>
                <th className="col-eil-nr">Eil.</th>
                <th className="col-date">Data</th>
                <th className="col-work-name">Darbo pavadinimas</th>
                <th className="col-doc-no">Dokumento Nr</th>
                <th className="col-income">Įplaukos</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <tr key={index} className="journal-table-row">
                  <td className="text-center">{row.rowNo}</td>
                  <td className="text-center">{row.date}</td>
                  <td className="text-left">{row.workName || '-'}</td>
                  <td className="text-center">{row.documentNo || '-'}</td>
                  <td className="text-right">{row.income || '-'}</td>
                </tr>
              ))}
              
              {/* Total row */}
              <tr className="total-row">
                <td colSpan={4} className="text-right total-label">Suma:</td>
                <td className="text-right total-value">{data.totalIncome}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Footer with signatures */}
        <div className="journal-footer work-act-footer">
          <div className="signature-section dual-signature">
            <div className="signature-line">
              <span className="signature-label">Darbus priėmė:</span>
              <div className="signature-block">
                <span className="signature-sublabel">Vardas,Pavardė,Parašas</span>
                <span className="signature-value">{data.acceptedByName}</span>
                <span className="signature-placeholder">_________________</span>
              </div>
            </div>
            
            <div className="signature-line" style={{ marginTop: '2rem' }}>
              <span className="signature-label">Darbus atliko:</span>
              <div className="signature-block">
                <span className="signature-sublabel">Vardas,Pavardė,Parašas</span>
                <span className="signature-value">{data.performedByName}</span>
                <span className="signature-placeholder">_________________</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
