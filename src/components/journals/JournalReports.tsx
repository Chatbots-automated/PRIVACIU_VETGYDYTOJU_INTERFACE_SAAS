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
import { Download } from 'lucide-react';

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

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Spausdinti / PDF
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

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Spausdinti / PDF
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

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Spausdinti / PDF
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

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Spausdinti / PDF
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

  return (
    <div>
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          Spausdinti / PDF
        </button>
      </div>
      <VeterinaryWorkCompletionAct data={journalData} />
    </div>
  );
}
