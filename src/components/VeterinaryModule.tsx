import { useState } from 'react';
import { Layout } from './Layout';
import { Dashboard } from './Dashboard';
import { Inventory } from './Inventory';
import { ReceiveStock } from './ReceiveStock';
import { Products } from './Products';
import { AnimalsCompact as Animals } from './AnimalsCompact';
import { VisitsModern as Visits } from './VisitsModern';
import { Synchronizations } from './Synchronizations';
import { Seklinimas } from './Seklinimas';
import { Hoofs } from './Hoofs';
import { Suppliers } from './Suppliers';
import { Biocides } from './Biocides';
import { OwnerMeds } from './OwnerMeds';
import { MedicalWaste } from './MedicalWaste';
import { Reports } from './Reports';
import { UserManagement } from './UserManagement';
import { Vaccinations } from './Vaccinations';
import { BulkTreatment } from './BulkTreatment';
import { TreatmentHistory } from './TreatmentHistory';
import { TreatmentCostTab } from './TreatmentCostTab';
import { FarmSelector } from './FarmSelector';
import { useFarm } from '../contexts/FarmContext';

interface VeterinaryModuleProps {
  onBackToModules: () => void;
}

export function VeterinaryModule({ onBackToModules }: VeterinaryModuleProps) {
  const [currentView, setCurrentView] = useState('dashboard');
  const [farmSelected, setFarmSelected] = useState(false);
  const { selectedFarm } = useFarm();

  if (!farmSelected || !selectedFarm) {
    return <FarmSelector onFarmSelected={() => setFarmSelected(true)} onBack={onBackToModules} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'inventory':
        return <Inventory />;
      case 'receive':
        return <ReceiveStock />;
      case 'treatment-history':
        return <TreatmentHistory />;
      case 'treatment-costs':
        return <TreatmentCostTab />;
      case 'vaccinations':
        return <Vaccinations />;
      case 'bulk-treatment':
        return <BulkTreatment />;
      case 'products':
        return <Products />;
      case 'animals':
        return <Animals />;
      case 'visits':
        return <Visits />;
      case 'hoofs':
        return <Hoofs />;
      case 'synchronizations':
        return <Synchronizations />;
      case 'insemination':
        return <Seklinimas />;
      case 'suppliers':
        return <Suppliers />;
      case 'biocides':
        return <Biocides />;
      case 'owner-meds':
        return <OwnerMeds />;
      case 'waste':
        return <MedicalWaste />;
      case 'reports':
        return <Reports />;
      case 'users':
        return <UserManagement />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onNavigate={setCurrentView}
      onBackToModules={onBackToModules}
    >
      {renderView()}
    </Layout>
  );
}
