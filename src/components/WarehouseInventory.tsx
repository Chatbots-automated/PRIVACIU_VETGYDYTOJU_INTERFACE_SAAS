import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { translateCategory } from '../lib/helpers';
import * as XLSX from 'xlsx';

interface WarehouseStock {
  warehouse_batch_id: string;
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  lot: string | null;
  expiry_date: string | null;
  mfg_date: string | null;
  received_qty: number;
  qty_left: number;
  qty_allocated: number;
  status: string;
  supplier_name: string | null;
  doc_number: string | null;
  created_at: string;
  batch_count?: number;
}

export function WarehouseInventory() {
  const { logAction } = useAuth();
  const [inventory, setInventory] = useState<WarehouseStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_warehouse_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      console.log('📦 Warehouse inventory raw data:', data?.length || 0, data);

      if (error) throw error;
      
      // Group by product
      const grouped = (data || []).reduce((acc: any[], batch: WarehouseStock) => {
        const existing = acc.find(item => item.product_id === batch.product_id);
        if (existing) {
          existing.received_qty += batch.received_qty;
          existing.qty_allocated += batch.qty_allocated;
          existing.qty_left += batch.qty_left;
          existing.batch_count += 1;
          // Keep earliest expiry date
          if (batch.expiry_date && (!existing.expiry_date || batch.expiry_date < existing.expiry_date)) {
            existing.expiry_date = batch.expiry_date;
          }
        } else {
          acc.push({
            ...batch,
            batch_count: 1,
          });
        }
        return acc;
      }, []);
      
      // Filter out products with no remaining stock (qty_left = 0)
      // Only show products that are still available in the warehouse
      const availableStock = grouped.filter(item => item.qty_left > 0);
      
      console.log('📦 Available warehouse stock (qty_left > 0):', availableStock.length, 'of', grouped.length, 'total');
      
      setInventory(availableStock);
    } catch (error) {
      console.error('Error loading warehouse inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const isExpiringSoon = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiry <= thirtyDaysFromNow && expiry >= new Date();
  };

  const isExpired = (expiryDate: string | null) => {
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  };

  const exportToExcel = () => {
    const exportData = filteredInventory.map(item => ({
      'Produktas': item.product_name || '',
      'Kategorija': translateCategory(item.category || ''),
      'Partijų sk.': item.batch_count || 1,
      'Priimta': item.received_qty,
      'Paskirstyta': item.qty_allocated,
      'Likutis': item.qty_left,
      'Vienetas': item.unit || '',
      'Būsena': item.status,
      'Galioja iki': item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('lt-LT') : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sandėlio Atsargos');

    const columnWidths = [
      { wch: 30 }, // Produktas
      { wch: 20 }, // Kategorija
      { wch: 12 }, // Partijų sk.
      { wch: 12 }, // Priimta
      { wch: 12 }, // Paskirstyta
      { wch: 12 }, // Likutis
      { wch: 10 }, // Vienetas
      { wch: 15 }, // Būsena
      { wch: 15 }, // Galioja iki
    ];
    worksheet['!cols'] = columnWidths;

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `sandelio_atsargos_${timestamp}.xlsx`);

    logAction('export_warehouse_inventory', null, null, null, {
      items_count: exportData.length,
      filter_category: filterCategory,
      filter_status: filterStatus,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Ieškoti pagal produkto pavadinimą arba LOT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Visos kategorijos</option>
          <option value="medicines">Vaistai</option>
          <option value="prevention">Prevencija</option>
          <option value="ovules">Ovulės</option>
          <option value="vakcina">Vakcina</option>
          <option value="bolusas">Bolusas</option>
          <option value="svirkstukai">Švirkštukai</option>
          <option value="hygiene">Higiena</option>
          <option value="biocide">Biocidas</option>
          <option value="technical">Techniniai</option>
          <option value="treatment_materials">Gydymo medžiagos</option>
          <option value="reproduction">Reprodukcija</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Visos būsenos</option>
          <option value="active">Aktyvi</option>
          <option value="fully_allocated">Pilnai paskirstyta</option>
          <option value="expired">Pasibaigusi</option>
        </select>
        <button
          onClick={exportToExcel}
          disabled={filteredInventory.length === 0}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Eksportuoti</span>
        </button>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Sandėlio atsargų nerasta</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Produktas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partijų sk.
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Priimta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Paskirstyta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Likutis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Galiojimas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Būsena
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr key={item.warehouse_batch_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-sm text-gray-500">{translateCategory(item.category)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-gray-900">{item.batch_count || 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">
                        {item.received_qty} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-blue-600">
                        {item.qty_allocated} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${
                        item.qty_left <= 0 ? 'text-gray-400' :
                        item.qty_left < 10 ? 'text-orange-600' :
                        'text-green-600'
                      }`}>
                        {item.qty_left} {item.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.expiry_date ? (
                        <div>
                          <span className="text-sm text-gray-600">
                            {new Date(item.expiry_date).toLocaleDateString('lt-LT')}
                          </span>
                          {isExpired(item.expiry_date) && (
                            <div className="text-xs text-red-600 font-medium mt-1">Pasibaigusi</div>
                          )}
                          {!isExpired(item.expiry_date) && isExpiringSoon(item.expiry_date) && (
                            <div className="text-xs text-orange-600 font-medium mt-1">Greitai pasibaigs</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.status === 'active' && (
                        <span className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-full">
                          Aktyvi
                        </span>
                      )}
                      {item.status === 'fully_allocated' && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          Pilnai paskirstyta
                        </span>
                      )}
                      {item.status === 'expired' && (
                        <span className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-full">
                          Pasibaigusi
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
