import { useState } from 'react';
// MastitisMilk removed - GEA integration no longer available
import { TreatmentCostAnalysis } from './TreatmentCostAnalysis';
import { ProductUsageAnalysis } from './ProductUsageAnalysis';
// GEA-related components removed
import { Euro, Package } from 'lucide-react';

export function TreatmentCostTab() {
  const [activeTab, setActiveTab] = useState<'costs' | 'usage'>('costs');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('costs')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'costs'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Euro className="w-5 h-5" />
            <span>Gydymų Savikainos</span>
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'usage'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Vaistų Panaudojimas</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'costs' && <TreatmentCostAnalysis />}
        {activeTab === 'usage' && <ProductUsageAnalysis />}
      </div>
    </div>
  );
}
