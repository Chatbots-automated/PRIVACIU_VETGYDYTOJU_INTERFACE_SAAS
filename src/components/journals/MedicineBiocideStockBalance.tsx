import { VeterinaryMedicineBiocideStockBalance as JournalData } from '../../types/veterinaryJournals';
import './JournalStyles.css';

interface MedicineBiocideStockBalanceProps {
  data: JournalData;
}

export function MedicineBiocideStockBalance({ data }: MedicineBiocideStockBalanceProps) {
  return (
    <div className="journal-container journal-portrait">
      <div className="journal-page">
        {/* Header Section */}
        <div className="journal-header">
          <div className="journal-title-section">
            <h1 className="journal-title">VETERINARINIŲ VAISTŲ, BIOCIDŲ LIKUTIS</h1>
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

        {/* Provider Information */}
        <div className="journal-info-section">
          <div className="info-line">
            <span className="info-label">Veterinarinė įstaiga:</span>
            <span className="info-value">{data.veterinaryProviderName}</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="journal-table-container">
          <table className="journal-table stock-balance-table">
            <thead>
              <tr>
                <th className="col-product-name">Dokumento pavadinimas</th>
                <th className="col-expiry">Galiojimo laikas</th>
                <th className="col-batch">Serija</th>
                <th className="col-received">Gauta</th>
                <th className="col-used">Sunaudota</th>
                <th className="col-remaining">Likutis</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, index) => (
                <>
                  {/* Row A: Product description */}
                  <tr key={`${index}-desc`} className="product-description-row">
                    <td colSpan={6} className="product-description-cell">
                      <div className="product-info-line">
                        <span className="product-category">{row.itemCategoryText}</span>
                      </div>
                      <div className="product-info-line">
                        <span className="package-label">{row.packageLabel}</span>
                        <span className="package-unit">{row.packageUnit}</span>
                      </div>
                      <div className="product-info-line">
                        <span className="product-name-bold">{row.productName}</span>
                      </div>
                      <div className="product-info-line">
                        <span className="registration-number">{row.registrationNumberText}</span>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Row B: Quantity data */}
                  <tr key={`${index}-data`} className="product-data-row">
                    <td className="text-center">{row.documentNumber || '-'}</td>
                    <td className="text-center">{row.expiryDate || '-'}</td>
                    <td className="text-center">{row.batchSeries || '-'}</td>
                    <td className="text-right">{row.receivedQuantity || '-'}</td>
                    <td className="text-right">{row.usedQuantity || '-'}</td>
                    <td className="text-right">{row.remainingQuantity || '-'}</td>
                  </tr>
                </>
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
        </div>
      </div>
    </div>
  );
}
