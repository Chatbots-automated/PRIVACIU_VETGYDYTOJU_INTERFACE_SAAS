import { TreatedAnimalRegistrationJournal } from './TreatedAnimalRegistrationJournal';
import { ProductionAnimalMedicineUsageJournal } from './ProductionAnimalMedicineUsageJournal';
import { MedicineBiocideStockBalance } from './MedicineBiocideStockBalance';
import { MedicineBiocideWriteOffAct } from './MedicineBiocideWriteOffAct';
import { VeterinaryWorkCompletionAct } from './VeterinaryWorkCompletionAct';
import {
  transformToTreatedAnimalRegistrationJournal,
  transformToProductionAnimalMedicineUsageJournal,
  transformToMedicineBiocideStockBalance,
  transformToMedicineBiocideWriteOffAct,
  transformToVeterinaryWorkCompletionAct
} from '../../utils/journalAdapters';
import { Download, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to convert Lithuanian characters to ASCII for PDF
function toAscii(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/ą/g, 'a').replace(/Ą/g, 'A')
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/ę/g, 'e').replace(/Ę/g, 'E')
    .replace(/ė/g, 'e').replace(/Ė/g, 'E')
    .replace(/į/g, 'i').replace(/Į/g, 'I')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/ų/g, 'u').replace(/Ų/g, 'U')
    .replace(/ū/g, 'u').replace(/Ū/g, 'U')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z');
}

// =====================================================================
// Report Wrapper Components
// These components receive raw database data and transform it into
// journal formats using the adapter functions
// =====================================================================

interface TreatedAnimalRegistrationReportProps {
  data: any[];
  periodStart?: string;
  periodEnd?: string;
  veterinaryProviderName?: string;
  responsibleVetName?: string;
}

export function TreatedAnimalRegistrationReport({ 
  data, 
  periodStart, 
  periodEnd,
  veterinaryProviderName,
  responsibleVetName
}: TreatedAnimalRegistrationReportProps) {
  // Use current month if dates not provided
  const now = new Date();
  const firstDay = periodStart || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = periodEnd || new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const journalData = transformToTreatedAnimalRegistrationJournal(
    data,
    firstDay,
    lastDay,
    veterinaryProviderName,
    responsibleVetName
  );

  const handlePrint = () => {
    window.print();
  };

  const handlePdfExport = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii('GYDOMU GYVUNU REGISTRACIJOS ZURNALAS'), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(toAscii(`Sugeneruota: ${new Date().toLocaleDateString('lt-LT')}`), doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    // Info section
    doc.setFontSize(8);
    doc.text(toAscii(`Veterinarine istaiga: ${journalData.veterinaryProviderName}`), 14, 30);
    doc.text(toAscii(`Laikotarpis: ${journalData.periodStart} - ${journalData.periodEnd}`), 14, 35);
    doc.setFontSize(7);
    doc.text(toAscii('Forma patvirtinta Valstybines maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodzio 29 d. isakymu Nr. B1-735'), 14, 40);

    // Prepare table data
    const tableData = journalData.rows.map(row => [
      toAscii(String(row.rowNo)),
      toAscii(row.registrationDate),
      toAscii(row.animalHolderAndAddress),
      toAscii(row.animalIdentifier),
      toAscii(row.animalAge),
      toAscii(row.animalSpecies),
      toAscii(row.treatmentPeriod),
      toAscii(row.animalCondition),
      toAscii(row.labTests),
      toAscii(row.clinicalDiagnosis),
      toAscii(row.treatment),
      toAscii(row.dose),
      toAscii(row.withdrawal),
      toAscii(row.outcome)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [[
        toAscii('Eil.\nNr.'),
        toAscii('Reg.\ndata'),
        toAscii('Gyvuno laikytojas,\nadresas'),
        toAscii('Zenkinimo\nNr.'),
        toAscii('Amzius'),
        toAscii('Rusis'),
        toAscii('Gydymo\nlaikotarpis'),
        toAscii('Gyvuno\nbukle'),
        toAscii('Lab.\ntyrimai'),
        toAscii('Klinike\ndiagnoze'),
        toAscii('Gydymas'),
        toAscii('Doze'),
        toAscii('Islauka'),
        toAscii('Baigtis')
      ]],
      body: tableData,
      styles: { 
        fontSize: 6,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [220, 230, 241],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 18, halign: 'center' },
        2: { cellWidth: 30 },
        3: { cellWidth: 15, halign: 'center' },
        4: { cellWidth: 12, halign: 'center' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 15, halign: 'center' },
        8: { cellWidth: 15, halign: 'center' },
        9: { cellWidth: 25 },
        10: { cellWidth: 25 },
        11: { cellWidth: 15, halign: 'center' },
        12: { cellWidth: 20, halign: 'center' },
        13: { cellWidth: 15, halign: 'center' }
      },
      margin: { left: 5, right: 5 },
      theme: 'grid'
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    doc.setFontSize(8);
    doc.text(toAscii(`Za zurnalo tvarkima atsakingas veterinarijos gydytojas: ${journalData.responsibleVetName}`), 14, finalY + 10);

    doc.save(`Gydomu-gyvunu-registracijos-zurnalas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="no-print mb-4 flex justify-end gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Spausdinti
        </button>
        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Eksportuoti PDF
        </button>
      </div>
      <TreatedAnimalRegistrationJournal data={journalData} />
    </div>
  );
}

interface ProductionAnimalMedicineUsageReportProps {
  data: any[];
  animalOwnerName: string;
  veterinaryProviderName?: string;
}

export function ProductionAnimalMedicineUsageReport({
  data,
  animalOwnerName,
  veterinaryProviderName
}: ProductionAnimalMedicineUsageReportProps) {
  const journalData = transformToProductionAnimalMedicineUsageJournal(
    data,
    animalOwnerName,
    veterinaryProviderName
  );

  const handlePrint = () => {
    window.print();
  };

  const handlePdfExport = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii('PRODUKCIJOS GYVUNU VAISTU ZURNALAS'), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(toAscii(`Sugeneruota: ${new Date().toLocaleDateString('lt-LT')}`), doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    // Info section
    doc.setFontSize(8);
    doc.text(toAscii(`Veterinarine istaiga: ${journalData.veterinaryProviderName}`), 14, 30);
    doc.text(toAscii(`Gyvunu savininkas: ${journalData.animalOwnerName}`), 14, 35);
    doc.setFontSize(7);
    doc.text(toAscii('Forma patvirtinta Valstybines maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodzio 29 d. isakymu Nr. B1-735'), 14, 40);

    // Prepare table data
    const tableData = journalData.rows.map(row => [
      toAscii(String(row.rowNo)),
      toAscii(row.registrationDate),
      toAscii(row.animalIdentifier),
      toAscii(row.animalSpecies),
      toAscii(row.animalAge),
      toAscii(row.treatmentPeriod),
      toAscii(row.clinicalDiagnosis),
      toAscii(row.medicationName),
      toAscii(row.usedAmount),
      toAscii(row.withdrawal),
      toAscii(row.ownerSignature),
      toAscii(row.vetSignature)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [[
        toAscii('Eil.\nNr.'),
        toAscii('Reg.\ndata'),
        toAscii('Zenkinimo\nNr.'),
        toAscii('Rusis'),
        toAscii('Amzius'),
        toAscii('Gydymo\nlaikotarpis'),
        toAscii('Klinike\ndiagnoze'),
        toAscii('Medikamento\npavadinimas'),
        toAscii('Sunaudota'),
        toAscii('Islauka'),
        toAscii('Savininko\nparasas'),
        toAscii('Vet.gydytojo\nparasas')
      ]],
      body: tableData,
      styles: { 
        fontSize: 6,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [220, 241, 230],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 20, halign: 'center' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 15, halign: 'center' },
        6: { cellWidth: 30 },
        7: { cellWidth: 30 },
        8: { cellWidth: 20, halign: 'center' },
        9: { cellWidth: 25, halign: 'center' },
        10: { cellWidth: 25, halign: 'center' },
        11: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: 5, right: 5 },
      theme: 'grid'
    });

    doc.save(`Produkcijos-gyvunu-vaistu-zurnalas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="no-print mb-4 flex justify-end gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Spausdinti
        </button>
        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Eksportuoti PDF
        </button>
      </div>
      <ProductionAnimalMedicineUsageJournal data={journalData} />
    </div>
  );
}

interface MedicineBiocideStockBalanceReportProps {
  data: any[];
  veterinaryProviderName?: string;
  responsibleVetName?: string;
}

export function MedicineBiocideStockBalanceReport({
  data,
  veterinaryProviderName,
  responsibleVetName
}: MedicineBiocideStockBalanceReportProps) {
  const journalData = transformToMedicineBiocideStockBalance(
    data,
    veterinaryProviderName,
    responsibleVetName
  );

  const handlePrint = () => {
    window.print();
  };

  const handlePdfExport = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii('VETERINARINIU VAISTU, BIOCIDU LIKUTIS'), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(toAscii(`Sugeneruota: ${new Date().toLocaleDateString('lt-LT')}`), doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    // Info section
    doc.setFontSize(8);
    doc.text(toAscii(`Veterinarine istaiga: ${journalData.veterinaryProviderName}`), 14, 30);
    doc.setFontSize(7);
    doc.text(toAscii('Forma patvirtinta Valstybines maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodzio 29 d. isakymu Nr. B1-735'), 14, 35);

    // Prepare table data
    const tableData = journalData.rows.map(row => {
      const description = `${row.itemCategoryText}\n${row.packageLabel} ${row.packageUnit}\n${row.productName}\n${row.registrationNumberText}`;
      return [
        toAscii(description),
        toAscii(row.documentNumber),
        toAscii(row.expiryDate),
        toAscii(row.batchSeries),
        toAscii(row.receivedQuantity),
        toAscii(row.usedQuantity),
        toAscii(row.remainingQuantity)
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [[
        toAscii('Prekes apraasymas'),
        toAscii('Dokumento Nr.'),
        toAscii('Galiojimo\nlaikas'),
        toAscii('Serija'),
        toAscii('Gauta'),
        toAscii('Sunaudota'),
        toAscii('Likutis')
      ]],
      body: tableData,
      styles: { 
        fontSize: 6,
        cellPadding: 1.5,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [240, 230, 241],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 25, halign: 'center' },
        3: { cellWidth: 25, halign: 'center' },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 20, halign: 'right' },
        6: { cellWidth: 20, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
      theme: 'grid'
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(8);
    doc.text(toAscii(`Za zurnalo tvarkima atsakingas veterinarijos gydytojas: ${journalData.responsibleVetName}`), 14, finalY + 10);

    doc.save(`Vaistu-biocidu-likutis-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="no-print mb-4 flex justify-end gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Spausdinti
        </button>
        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Eksportuoti PDF
        </button>
      </div>
      <MedicineBiocideStockBalance data={journalData} />
    </div>
  );
}

interface MedicineBiocideWriteOffActReportProps {
  data: any[];
  periodStart: string;
  periodEnd: string;
  place?: string;
  veterinaryProviderName?: string;
  responsibleVetName?: string;
}

export function MedicineBiocideWriteOffActReport({
  data,
  periodStart,
  periodEnd,
  place,
  veterinaryProviderName,
  responsibleVetName
}: MedicineBiocideWriteOffActReportProps) {
  const journalData = transformToMedicineBiocideWriteOffAct(
    data,
    periodStart,
    periodEnd,
    place,
    veterinaryProviderName,
    responsibleVetName
  );

  const handlePrint = () => {
    window.print();
  };

  const handlePdfExport = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii('SUNAUDOTU VETERINARINIU VAISTU, BIOCIDU NURASYMO AKTAS'), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(toAscii(`Sugeneruota: ${new Date().toLocaleDateString('lt-LT')}`), doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    // Info section
    doc.setFontSize(8);
    doc.text(toAscii(`Veterinarine istaiga: ${journalData.veterinaryProviderName}`), 14, 30);
    doc.text(toAscii(`Vieta: ${journalData.place}`), 14, 35);
    doc.setFontSize(7);
    doc.text(toAscii('Forma patvirtinta Valstybines maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodzio 29 d. isakymu Nr. B1-735'), 14, 40);

    // Prepare table data
    const tableData = journalData.rows.map(row => [
      toAscii(String(row.rowNo)),
      toAscii(row.productName),
      toAscii(row.batchSeries),
      toAscii(row.measurementUnit),
      toAscii(row.usedQuantity)
    ]);

    autoTable(doc, {
      startY: 45,
      head: [[
        toAscii('Eil.\nNr.'),
        toAscii('Veterinarinio vaisto, biocido pavadinimas'),
        toAscii('Serija'),
        toAscii('Matavimo vnt.'),
        toAscii('Sunaudotas kiekis')
      ]],
      body: tableData,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [255, 245, 220],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 110 },
        2: { cellWidth: 40, halign: 'center' },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 40, halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      theme: 'grid'
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    doc.setFontSize(8);
    doc.text(toAscii(`Veterinarijos gydytojas: ${journalData.responsibleVetName}`), 14, finalY + 10);

    doc.save(`Vaistu-nurasymo-aktas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="no-print mb-4 flex justify-end gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Spausdinti
        </button>
        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Eksportuoti PDF
        </button>
      </div>
      <MedicineBiocideWriteOffAct data={journalData} />
    </div>
  );
}

interface VeterinaryWorkCompletionActReportProps {
  data: any[];
  farmOwnerName: string;
  farmOwnerAddress: string;
  documentDate: string;
  veterinaryProviderName?: string;
  performedByName?: string;
}

export function VeterinaryWorkCompletionActReport({
  data,
  farmOwnerName,
  farmOwnerAddress,
  documentDate,
  veterinaryProviderName,
  performedByName
}: VeterinaryWorkCompletionActReportProps) {
  const journalData = transformToVeterinaryWorkCompletionAct(
    data,
    farmOwnerName,
    farmOwnerAddress,
    documentDate,
    veterinaryProviderName,
    performedByName
  );

  const handlePrint = () => {
    window.print();
  };

  const handlePdfExport = () => {
    const doc = new jsPDF('l', 'mm', 'a4');
    
    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii('VETERINARINIU DARBU ATLIKIMO AKTAS'), doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(toAscii(`Sugeneruota: ${new Date().toLocaleDateString('lt-LT')}`), doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });

    // Info section
    doc.setFontSize(8);
    doc.text(toAscii(`Veterinarine istaiga: ${journalData.veterinaryProviderName}`), 14, 30);
    doc.text(toAscii(`Ukio savininkas: ${journalData.farmOwnerName}`), 14, 35);
    doc.text(toAscii(`Adresas: ${journalData.farmOwnerAddress}`), 14, 40);
    doc.text(toAscii(`Data: ${journalData.documentDate}`), 14, 45);
    doc.setFontSize(7);
    doc.text(toAscii('Forma patvirtinta Valstybines maisto ir veterinarijos tarnybos direktoriaus 2005 m. gruodzio 29 d. isakymu Nr. B1-735'), 14, 50);

    // Prepare table data
    const tableData = journalData.rows.map(row => [
      toAscii(String(row.rowNo)),
      toAscii(row.date),
      toAscii(row.workName),
      toAscii(row.documentNo),
      toAscii(row.income)
    ]);

    // Add total row
    tableData.push([
      { content: toAscii('Suma:'), colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } } as any,
      { content: toAscii(journalData.totalIncome), styles: { halign: 'right', fontStyle: 'bold', fillColor: [240, 240, 240] } } as any
    ]);

    autoTable(doc, {
      startY: 55,
      head: [[
        toAscii('Eil.\nNr.'),
        toAscii('Data'),
        toAscii('Darbo pavadinimas'),
        toAscii('Dokumento Nr.'),
        toAscii('Iplaukos (EUR)')
      ]],
      body: tableData,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        lineColor: [0, 0, 0],
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [220, 241, 250],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
        halign: 'center',
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [0, 0, 0]
      },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 100 },
        3: { cellWidth: 40, halign: 'center' },
        4: { cellWidth: 35, halign: 'right' }
      },
      margin: { left: 14, right: 14 },
      theme: 'grid'
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 55;
    doc.setFontSize(8);
    doc.text(toAscii(`Darbus prieme: ${journalData.acceptedByName}`), 14, finalY + 10);
    doc.text(toAscii(`Darbus atliko: ${journalData.performedByName}`), 14, finalY + 17);

    doc.save(`Veterinariniu-darbu-atlikimo-aktas-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div>
      <div className="no-print mb-4 flex justify-end gap-3">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Printer className="w-5 h-5" />
          Spausdinti
        </button>
        <button
          onClick={handlePdfExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Eksportuoti PDF
        </button>
      </div>
      <VeterinaryWorkCompletionAct data={journalData} />
    </div>
  );
}
