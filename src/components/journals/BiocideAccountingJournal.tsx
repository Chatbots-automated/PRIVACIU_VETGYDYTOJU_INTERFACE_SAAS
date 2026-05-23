import './JournalStyles.css';

interface BiocideAccountingJournalProps {
  data: {
    productName: string;
    unit: string;
    rows: Array<{
      receiptDate: string;
      documentInfo: string;
      quantityReceived: string;
      manufacturingDate: string;
      expiryDate: string;
      batchNumber: string;
      usageDate: string;
      usagePurpose: string;
      workScope: string;
      quantityUsed: string;
      remaining: string;
      appliedBy: string;
    }>;
  };
}

export function BiocideAccountingJournal({ data }: BiocideAccountingJournalProps) {
  const formatDateLT = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('lt-LT');
  };

  return (
    <div className="bg-white print-content p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">BIOCIDINIŲ PRODUKTŲ APSKAITOS ŽURNALAS</h1>
        <p className="text-sm text-gray-500">(Biocidinių produktų apskaitos žurnalo formos pavyzdys)</p>
        <p className="text-sm text-gray-500 mt-1">Sugeneruota: {formatDateLT(new Date().toISOString())}</p>
      </div>

      {/* Product Info */}
      <div className="mb-6 space-y-2 text-sm">
        <div><strong>Biocidinio produkto pavadinimas:</strong> {data.productName}</div>
        <div><strong>Pirminė pakuotė (mato vnt.):</strong> {data.unit}</div>
        <div className="text-xs text-gray-500 mt-2">
          Įsakymas paskelbtas: Žin. 2012, Nr. 65-3326
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border-2 border-gray-300 shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gradient-to-r from-green-50 to-teal-50">
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Gavimo<br/>data<br/><span className="text-[10px] font-normal text-gray-500">(1)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Dokumento<br/>pavadinimas,<br/>numeris, data<br/><span className="text-[10px] font-normal text-gray-500">(2)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Gautas<br/>kiekis<br/><span className="text-[10px] font-normal text-gray-500">(3)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Pagaminimo<br/>data<br/><span className="text-[10px] font-normal text-gray-500">(4)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Tinkamumo<br/>naudoti laikas<br/><span className="text-[10px] font-normal text-gray-500">(5)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Serija,<br/>partija<br/><span className="text-[10px] font-normal text-gray-500">(6)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Panaudojimo<br/>data<br/><span className="text-[10px] font-normal text-gray-500">(7)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Panaudojimo<br/>paskirtis<br/><span className="text-[10px] font-normal text-gray-500">(8)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Darbų<br/>apimtis<br/><span className="text-[10px] font-normal text-gray-500">(9)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Sunaudotas<br/>kiekis<br/><span className="text-[10px] font-normal text-gray-500">(10)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Likutis<br/><span className="text-[10px] font-normal text-gray-500">(11)</span></th>
              <th className="border-2 border-gray-300 px-2 py-3 text-xs font-bold text-gray-700">Biocidinį produktą<br/>naudojusio asmens<br/>vardas, pavardė<br/><span className="text-[10px] font-normal text-gray-500">(12)</span></th>
            </tr>
          </thead>
          <tbody>
            {data.rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="border-2 border-gray-300 px-3 py-6 text-center text-gray-500 text-sm">
                  Nėra duomenų
                </td>
              </tr>
            ) : (
              data.rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-green-50 transition-colors">
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-center text-gray-700">{row.receiptDate}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-gray-700">{row.documentInfo}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-right font-mono text-gray-900">{row.quantityReceived}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-center text-gray-700">{row.manufacturingDate}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-center text-gray-700">{row.expiryDate}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-center text-gray-700">{row.batchNumber}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-center text-gray-700">{row.usageDate}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-gray-700">{row.usagePurpose}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-gray-700">{row.workScope}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-right font-mono text-gray-900">{row.quantityUsed}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-right font-mono text-gray-900">{row.remaining}</td>
                  <td className="border-2 border-gray-300 px-2 py-3 text-xs text-gray-700">{row.appliedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6 text-sm text-gray-700">
        <p className="font-medium">DIREKTORIUS JONAS MILIUS</p>
      </div>
    </div>
  );
}
