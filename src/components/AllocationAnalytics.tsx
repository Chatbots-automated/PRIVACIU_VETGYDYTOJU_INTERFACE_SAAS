import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart3, TrendingUp, Building2, Package, Euro, Download, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { FarmDetailAnalytics } from './FarmDetailAnalytics';

interface FarmAnalytics {
  farm_id: string;
  farm_name: string;
  farm_code: string;
  total_allocations: number;
  unique_products: number;
  total_qty_allocated: number;
  total_value_allocated: number;
  last_allocation_date: string | null;
}

interface ProductAnalytics {
  product_id: string;
  product_name: string;
  category: string;
  farms_using: number;
  total_allocations: number;
  total_qty_allocated: number;
  unit: string;
  last_allocation_date: string | null;
}

interface AllocationHistory {
  allocation_id: string;
  allocation_date: string;
  farm_name: string;
  farm_code: string;
  product_name: string;
  category: string;
  allocated_qty: number;
  unit: string;
  lot: string | null;
  allocated_by_name: string | null;
  notes: string | null;
}

export function AllocationAnalytics() {
  const [farmAnalytics, setFarmAnalytics] = useState<FarmAnalytics[]>([]);
  const [productAnalytics, setProductAnalytics] = useState<ProductAnalytics[]>([]);
  const [allocationHistory, setAllocationHistory] = useState<AllocationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'farms' | 'products' | 'history'>('farms');
  const [selectedFarm, setSelectedFarm] = useState<{ id: string; name: string; code: string } | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const [farmsRes, productsRes, historyRes] = await Promise.all([
        supabase.from('vw_allocation_analytics_by_farm').select('*').order('total_value_allocated', { ascending: false, nullsFirst: false }),
        supabase.from('vw_allocation_analytics_by_product').select('*').order('total_qty_allocated', { ascending: false, nullsFirst: false }),
        supabase.from('vw_stock_allocation_history').select('*').order('allocation_date', { ascending: false }).limit(100),
      ]);

      if (farmsRes.data) setFarmAnalytics(farmsRes.data);
      if (productsRes.data) setProductAnalytics(productsRes.data);
      if (historyRes.data) setAllocationHistory(historyRes.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (activeTab === 'farms') {
      const exportData = farmAnalytics.map(farm => ({
        'Ūkis': farm.farm_name,
        'Kodas': farm.farm_code,
        'Paskirstymų skaičius': farm.total_allocations,
        'Unikalių produktų': farm.unique_products,
        'Bendras kiekis': farm.total_qty_allocated,
        'Bendra vertė (EUR)': farm.total_value_allocated?.toFixed(2) || '0.00',
        'Paskutinis paskirstymas': farm.last_allocation_date ? new Date(farm.last_allocation_date).toLocaleDateString('lt-LT') : '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ūkių Statistika');
    } else if (activeTab === 'products') {
      const exportData = productAnalytics.map(product => ({
        'Produktas': product.product_name,
        'Kategorija': product.category,
        'Ūkių naudoja': product.farms_using,
        'Paskirstymų skaičius': product.total_allocations,
        'Bendras kiekis': product.total_qty_allocated,
        'Vienetas': product.unit,
        'Paskutinis paskirstymas': product.last_allocation_date ? new Date(product.last_allocation_date).toLocaleDateString('lt-LT') : '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produktų Statistika');
    } else if (activeTab === 'history') {
      const exportData = allocationHistory.map(record => ({
        'Data': new Date(record.allocation_date).toLocaleDateString('lt-LT'),
        'Ūkis': record.farm_name,
        'Kodas': record.farm_code,
        'Produktas': record.product_name,
        'Kategorija': record.category,
        'Kiekis': record.allocated_qty,
        'Vienetas': record.unit,
        'LOT': record.lot || '',
        'Paskirstė': record.allocated_by_name || '',
        'Pastabos': record.notes || '',
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Paskirstymų Istorija');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `paskirstymu_analitika_${timestamp}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show farm detail view if a farm is selected
  if (selectedFarm) {
    return (
      <FarmDetailAnalytics
        farmId={selectedFarm.id}
        farmName={selectedFarm.name}
        farmCode={selectedFarm.code}
        onBack={() => setSelectedFarm(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-gray-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <BarChart3 className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Paskirstymų Analitika</h2>
            <p className="text-gray-200 mt-1">Statistika apie atsargų paskirstymą ūkiams • Paspauskite ant ūkio detalesnei informacijai</p>
          </div>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('farms')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'farms'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Pagal Ūkius
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'products'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Pagal Produktus
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Istorija
          </button>
        </div>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={exportToExcel}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Eksportuoti Excel
        </button>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'farms' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ūkis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paskirstymų
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produktų
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bendra vertė
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paskutinis paskirstymas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {farmAnalytics.map((farm) => (
                  <tr 
                    key={farm.farm_id} 
                    onClick={() => setSelectedFarm({ id: farm.farm_id, name: farm.farm_name, code: farm.farm_code })}
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                            {farm.farm_name}
                          </div>
                          <div className="text-sm text-gray-500">{farm.farm_code}</div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{farm.total_allocations || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{farm.unique_products || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-green-600">
                        {farm.total_value_allocated ? `€${farm.total_value_allocated.toFixed(2)}` : '€0.00'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {farm.last_allocation_date ? new Date(farm.last_allocation_date).toLocaleDateString('lt-LT') : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produktas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Kategorija
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ūkių naudoja
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paskirstymų
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bendras kiekis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paskutinis paskirstymas
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productAnalytics.map((product) => (
                  <tr key={product.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{product.product_name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{product.farms_using || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{product.total_allocations || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-blue-600">
                        {product.total_qty_allocated || 0} {product.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {product.last_allocation_date ? new Date(product.last_allocation_date).toLocaleDateString('lt-LT') : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ūkis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produktas</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kiekis</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">LOT</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paskirstė</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pastabos</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allocationHistory.map((record) => (
                  <tr key={record.allocation_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {new Date(record.allocation_date).toLocaleDateString('lt-LT')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{record.farm_name}</div>
                      <div className="text-xs text-gray-500">{record.farm_code}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">{record.product_name}</div>
                      <div className="text-xs text-gray-500">{record.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-blue-600">
                        {record.allocated_qty} {record.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3">{record.lot || '-'}</td>
                    <td className="px-4 py-3">{record.allocated_by_name || '-'}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{record.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {activeTab === 'farms' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Aktyvių ūkių</p>
                <p className="text-2xl font-bold text-gray-900">
                  {farmAnalytics.filter(f => f.total_allocations > 0).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bendras paskirstymų skaičius</p>
                <p className="text-2xl font-bold text-gray-900">
                  {farmAnalytics.reduce((sum, f) => sum + (f.total_allocations || 0), 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Euro className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Bendra paskirstyta vertė</p>
                <p className="text-2xl font-bold text-gray-900">
                  €{farmAnalytics.reduce((sum, f) => sum + (f.total_value_allocated || 0), 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
