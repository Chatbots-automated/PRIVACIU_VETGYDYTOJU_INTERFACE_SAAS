import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Package, AlertCircle, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { requireClientId } from '../lib/clientHelpers';
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

interface FarmStock {
  farm_id: string;
  farm_name: string;
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  total_qty_received: number;
  total_qty_left: number;
  batch_count: number;
  earliest_expiry: string | null;
}

export function WarehouseInventory() {
  const { logAction, user } = useAuth();
  const [inventory, setInventory] = useState<WarehouseStock[]>([]);
  const [farmStock, setFarmStock] = useState<FarmStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [activeSection, setActiveSection] = useState<'warehouse' | 'farms'>('warehouse');

  useEffect(() => {
    loadInventory();
    loadFarmStock();
  }, []);

  const loadInventory = async () => {
    try {
      const clientId = requireClientId(user);
      
      const { data, error } = await supabase
        .from('vw_warehouse_inventory')
        .select('*')
        .eq('client_id', clientId)
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

  const loadFarmStock = async () => {
    try {
      const clientId = requireClientId(user);
      
      // Load all batches from all farms with remaining stock
      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          farm_id,
          product_id,
          qty_received,
          qty_left,
          expiry_date,
          farms!inner (
            name,
            client_id
          ),
          products (
            name,
            category,
            primary_pack_unit
          )
        `)
        .eq('farms.client_id', clientId)
        .gt('qty_left', 0)
        .order('expiry_date', { ascending: true, nullsFirst: false });

      console.log('🏠 Farm stock raw data:', data?.length || 0);

      if (error) {
        console.error('Error loading farm stock:', error);
        return;
      }

      // Group by farm and product
      const farmStockMap = new Map<string, FarmStock>();
      
      (data || []).forEach((batch: any) => {
        if (!batch.products || !batch.farms) return;
        
        const key = `${batch.farm_id}-${batch.product_id}`;
        const existing = farmStockMap.get(key);
        
        if (existing) {
          existing.total_qty_received += Number(batch.qty_received || 0);
          existing.total_qty_left += Number(batch.qty_left || 0);
          existing.batch_count += 1;
          // Keep earliest expiry
          if (batch.expiry_date && (!existing.earliest_expiry || batch.expiry_date < existing.earliest_expiry)) {
            existing.earliest_expiry = batch.expiry_date;
          }
        } else {
          farmStockMap.set(key, {
            farm_id: batch.farm_id,
            farm_name: batch.farms.name,
            product_id: batch.product_id,
            product_name: batch.products.name,
            category: batch.products.category || 'N/A',
            unit: batch.products.primary_pack_unit || 'ml',
            total_qty_received: Number(batch.qty_received || 0),
            total_qty_left: Number(batch.qty_left || 0),
            batch_count: 1,
            earliest_expiry: batch.expiry_date
          });
        }
      });

      const farmStockArray = Array.from(farmStockMap.values()).sort((a, b) => 
        a.farm_name.localeCompare(b.farm_name) || a.product_name.localeCompare(b.product_name)
      );

      console.log('🏠 Grouped farm stock:', farmStockArray.length);
      setFarmStock(farmStockArray);
    } catch (error) {
      console.error('Error loading farm stock:', error);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const filteredFarmStock = farmStock.filter(item => {
    const matchesSearch = !searchTerm ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.farm_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
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
    const isWarehouse = activeSection === 'warehouse';
    const dataToExport = isWarehouse ? filteredInventory : filteredFarmStock;
    
    const exportData = isWarehouse 
      ? filteredInventory.map(item => ({
          'Produktas': item.product_name || '',
          'Kategorija': translateCategory(item.category || ''),
          'Partijų sk.': item.batch_count || 1,
          'Priimta': item.received_qty,
          'Paskirstyta': item.qty_allocated,
          'Likutis': item.qty_left,
          'Vienetas': item.unit || '',
          'Būsena': item.status,
          'Galioja iki': item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('lt-LT') : '',
        }))
      : filteredFarmStock.map(item => ({
          'Ūkis': item.farm_name || '',
          'Produktas': item.product_name || '',
          'Kategorija': translateCategory(item.category || ''),
          'Partijų sk.': item.batch_count,
          'Priimta': item.total_qty_received,
          'Likutis': item.total_qty_left,
          'Vienetas': item.unit || '',
          'Galioja iki': item.earliest_expiry ? new Date(item.earliest_expiry).toLocaleDateString('lt-LT') : '',
        }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    const sheetName = isWarehouse ? 'Sandėlio Atsargos' : 'Ūkių Atsargos';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const columnWidths = isWarehouse 
      ? [
          { wch: 30 }, // Produktas
          { wch: 20 }, // Kategorija
          { wch: 12 }, // Partijų sk.
          { wch: 12 }, // Priimta
          { wch: 12 }, // Paskirstyta
          { wch: 12 }, // Likutis
          { wch: 10 }, // Vienetas
          { wch: 15 }, // Būsena
          { wch: 15 }, // Galioja iki
        ]
      : [
          { wch: 25 }, // Ūkis
          { wch: 30 }, // Produktas
          { wch: 20 }, // Kategorija
          { wch: 12 }, // Partijų sk.
          { wch: 12 }, // Priimta
          { wch: 12 }, // Likutis
          { wch: 10 }, // Vienetas
          { wch: 15 }, // Galioja iki
        ];
    worksheet['!cols'] = columnWidths;

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = isWarehouse ? `sandelio_atsargos_${timestamp}.xlsx` : `ukiu_atsargos_${timestamp}.xlsx`;
    XLSX.writeFile(workbook, filename);

    logAction(isWarehouse ? 'export_warehouse_inventory' : 'export_farm_inventory', null, null, null, {
      items_count: exportData.length,
      filter_category: filterCategory,
      filter_status: isWarehouse ? filterStatus : undefined,
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
      {/* DEBUG: Version marker */}
      <div className="hidden">v2.0-with-tabs</div>
      
      {/* Section Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveSection('warehouse')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'warehouse'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Sandėlio Atsargos
            {inventory.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {inventory.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveSection('farms')}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeSection === 'farms'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Ūkių Atsargos
            {farmStock.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                {farmStock.length}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={activeSection === 'warehouse' ? "Ieškoti pagal produkto pavadinimą..." : "Ieškoti pagal produkto ar ūkio pavadinimą..."}
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
        {activeSection === 'warehouse' && (
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
        )}
        <button
          onClick={exportToExcel}
          disabled={(activeSection === 'warehouse' ? filteredInventory : filteredFarmStock).length === 0}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Eksportuoti</span>
        </button>
      </div>

      {activeSection === 'warehouse' ? (
        filteredInventory.length === 0 ? (
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
      )
      ) : (
        filteredFarmStock.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Ūkių atsargų nerasta</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ūkis
                    </th>
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
                      Likutis
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Galiojimas
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFarmStock.map((item, index) => (
                    <tr key={`${item.farm_id}-${item.product_id}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">{item.farm_name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        <div className="text-sm text-gray-500">{translateCategory(item.category)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900">{item.batch_count}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">
                          {item.total_qty_received.toFixed(2)} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-medium ${
                          item.total_qty_left <= 0 ? 'text-gray-400' :
                          item.total_qty_left < 10 ? 'text-orange-600' :
                          'text-green-600'
                        }`}>
                          {item.total_qty_left.toFixed(2)} {item.unit}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {item.earliest_expiry ? (
                          <div>
                            <span className="text-sm text-gray-600">
                              {new Date(item.earliest_expiry).toLocaleDateString('lt-LT')}
                            </span>
                            {isExpired(item.earliest_expiry) && (
                              <div className="text-xs text-red-600 font-medium mt-1">Pasibaigusi</div>
                            )}
                            {!isExpired(item.earliest_expiry) && isExpiringSoon(item.earliest_expiry) && (
                              <div className="text-xs text-orange-600 font-medium mt-1">Greitai pasibaigs</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
}
