import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Search, AlertCircle, Package, Edit2, Save, X, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { translateCategory, sortByLithuanian } from '../lib/helpers';
import * as XLSX from 'xlsx';

interface StockItem {
  batch_id: string;
  product_id: string;
  on_hand: number;
  expiry_date: string | null;
  lot: string | null;
  mfg_date: string | null;
  product_name?: string;
  category?: string;
  unit?: string;
  package_size?: number | null;
  package_count?: number | null;
  primary_pack_size?: number | null;
}

interface EditingData {
  product_name: string;
  on_hand: string;
  category: string;
  unit: string;
  primary_pack_size: string;
  expiry_date: string;
  lot: string;
}

export function Inventory() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<EditingData | null>(null);

  useEffect(() => {
    loadInventory();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'batches',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback(() => {
      loadInventory();
    }, []),
    onUpdate: useCallback(() => {
      loadInventory();
    }, []),
    onDelete: useCallback(() => {
      loadInventory();
    }, []),
  });

  useRealtimeSubscription({
    table: 'usage_items',
    onInsert: useCallback(() => {
      loadInventory();
    }, []),
    onUpdate: useCallback(() => {
      loadInventory();
    }, []),
  });

  const loadInventory = async () => {
    try {
      if (!selectedFarm) {
        setInventory([]);
        setLoading(false);
        return;
      }

      // Get batches with their products
      const { data: batchesData, error: batchesError } = await supabase
        .from('batches')
        .select(`
          id,
          product_id,
          lot,
          expiry_date,
          mfg_date,
          received_qty,
          qty_left,
          package_size,
          package_count,
          products!inner(
            name,
            category,
            primary_pack_unit,
            primary_pack_size
          )
        `)
        .eq('farm_id', selectedFarm.id);

      if (batchesError) throw batchesError;

      // Map batches to inventory items using qty_left as the source of truth
      const batchesWithStock = batchesData?.map((batch) => ({
        batch_id: batch.id,
        product_id: batch.product_id,
        on_hand: batch.qty_left || 0, // ✅ Use qty_left from database (maintained by triggers)
        expiry_date: batch.expiry_date,
        lot: batch.lot,
        mfg_date: batch.mfg_date,
        product_name: batch.products?.name,
        category: batch.products?.category,
        unit: batch.products?.primary_pack_unit,
        primary_pack_size: batch.products?.primary_pack_size,
        package_size: batch.package_size,
        package_count: batch.package_count,
      })) || [];

      // Filter out expired batches
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validBatches = batchesWithStock.filter(batch => {
        if (!batch.expiry_date) return true;
        const expiryDate = new Date(batch.expiry_date);
        return expiryDate >= today;
      });

      // Group batches by product_id and sum up quantities
      const productMap = new Map<string, { item: StockItem, batchCount: number, lots: Set<string> }>();

      validBatches.forEach(batch => {
        const existing = productMap.get(batch.product_id);
        if (existing) {
          // Product already exists, sum the quantities
          existing.item.on_hand += batch.on_hand;
          existing.batchCount += 1;
          if (batch.lot) existing.lots.add(batch.lot);
          // Keep the earliest expiry date for display
          if (batch.expiry_date && (!existing.item.expiry_date || batch.expiry_date < existing.item.expiry_date)) {
            existing.item.expiry_date = batch.expiry_date;
          }
        } else {
          // First time seeing this product, add it
          const lots = new Set<string>();
          if (batch.lot) lots.add(batch.lot);
          productMap.set(batch.product_id, {
            item: { ...batch },
            batchCount: 1,
            lots
          });
        }
      });

      // Convert map back to array and update LOT display
      const groupedInventory = Array.from(productMap.values()).map(({ item, batchCount, lots }) => {
        if (batchCount > 1) {
          // Multiple batches - show indication
          const lotArray = Array.from(lots);
          item.lot = lotArray.length > 1 ? `${lotArray.length} partijos` : lotArray[0] || null;
          // Clear package breakdown when multiple batches
          item.package_size = null;
          item.package_count = null;
        }
        return item;
      });

      // Sort by Lithuanian alphabet
      const sortedInventory = sortByLithuanian(groupedInventory, 'product_name');
      setInventory(sortedInventory);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = !searchTerm ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lot?.toLowerCase().includes(searchTerm.toLowerCase());

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

  const handleEditClick = (item: StockItem) => {
    setEditingBatchId(item.batch_id);
    setEditingData({
      product_name: item.product_name || '',
      on_hand: item.on_hand.toString(),
      category: item.category || 'medicines',
      unit: item.unit || 'ml',
      primary_pack_size: item.primary_pack_size?.toString() || '',
      expiry_date: item.expiry_date || '',
      lot: item.lot || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingBatchId(null);
    setEditingData(null);
  };

  const handleSaveEdit = async (item: StockItem) => {
    if (!editingData) return;

    const newAmount = parseFloat(editingData.on_hand);
    const newPackSize = parseFloat(editingData.primary_pack_size);

    if (isNaN(newAmount) || newAmount < 0) {
      alert('Prašome įvesti teisingą kiekį');
      return;
    }

    try {
      // Update product information
      const { error: productError } = await supabase
        .from('products')
        .update({
          name: editingData.product_name,
          category: editingData.category,
          primary_pack_unit: editingData.unit,
          primary_pack_size: isNaN(newPackSize) ? null : newPackSize,
        })
        .eq('id', item.product_id);

      if (productError) throw productError;

      // Get ALL batches for this product (not just one)
      const { data: allBatches, error: batchesError } = await supabase
        .from('batches')
        .select('id, received_qty, qty_left, expiry_date')
        .eq('product_id', item.product_id);

      if (batchesError) throw batchesError;

      if (!allBatches || allBatches.length === 0) {
        throw new Error('No batches found for this product');
      }

      // Filter out expired batches
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const validBatches = allBatches.filter(batch => {
        if (!batch.expiry_date) return true;
        const expiryDate = new Date(batch.expiry_date);
        return expiryDate >= today;
      });

      if (validBatches.length === 0) {
        throw new Error('No valid (non-expired) batches found for this product');
      }

      // Calculate how much was actually used from each batch (using qty_left as source of truth)
      const batchesWithUsage = validBatches.map(batch => ({
        batch_id: batch.id,
        received_qty: batch.received_qty || 0,
        qty_left: batch.qty_left || 0,
        total_used: (batch.received_qty || 0) - (batch.qty_left || 0),
      }));

      // Distribute the new amount across batches proportionally
      const amountPerBatch = newAmount / validBatches.length;

      // Update each batch - we need to adjust received_qty to match the desired qty_left
      const updatePromises = batchesWithUsage.map(async (batch) => {
        // New received_qty = desired qty_left + actual usage
        const newReceivedQty = amountPerBatch + batch.total_used;
        
        const { error: updateError } = await supabase
          .from('batches')
          .update({
            received_qty: newReceivedQty,
            qty_left: amountPerBatch, // ✅ Directly set qty_left to desired amount
            // Set package_size and package_count to NULL to prevent trigger from recalculating
            package_size: null,
            package_count: null,
          })
          .eq('id', batch.batch_id);

        if (updateError) throw updateError;
      });

      await Promise.all(updatePromises);

      await logAction(
        'edit_inventory',
        'products',
        item.product_id,
        item.batch_id,
        {
          old_product_name: item.product_name,
          new_product_name: editingData.product_name,
          old_amount: item.on_hand,
          new_amount: newAmount,
          old_category: item.category,
          new_category: editingData.category,
          batches_updated: validBatches.length,
        }
      );

      setEditingBatchId(null);
      setEditingData(null);
      loadInventory();
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Klaida atnaujinant atsargas');
    }
  };

  const exportToExcel = () => {
    // Prepare data for export
    const exportData = filteredInventory.map(item => ({
      'Produktas': item.product_name || '',
      'Kategorija': translateCategory(item.category || ''),
      'Kiekis': item.on_hand,
      'Vienetas': item.unit || '',
      'Pakuotės dydis': item.primary_pack_size || '',
      'Pakuočių skaičius': item.package_count || '',
      'Partija': item.lot || '',
      'Galioja iki': item.expiry_date ? new Date(item.expiry_date).toLocaleDateString('lt-LT') : '',
      'Pagaminta': item.mfg_date ? new Date(item.mfg_date).toLocaleDateString('lt-LT') : '',
    }));

    // Create workbook and worksheet
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Atsargos');

    // Set column widths for better readability
    const columnWidths = [
      { wch: 30 }, // Produktas
      { wch: 20 }, // Kategorija
      { wch: 10 }, // Kiekis
      { wch: 12 }, // Vienetas
      { wch: 15 }, // Pakuotės dydis
      { wch: 15 }, // Pakuočių skaičius
      { wch: 15 }, // Partija
      { wch: 15 }, // Galioja iki
      { wch: 15 }, // Pagaminta
    ];
    worksheet['!cols'] = columnWidths;

    // Generate Excel file and download
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `atsargos_${timestamp}.xlsx`);

    logAction('export_inventory', null, null, null, {
      items_count: exportData.length,
      filter_category: filterCategory
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
            placeholder="Ieškoti pagal produkto pavadinimą arba PARTIJĄ..."
            value={searchTerm}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchTerm(newValue);
              if (newValue.length >= 3) {
                logAction('search_inventory', null, null, null, { search_term: newValue });
              }
            }}
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
          <option value="vakcina">Vakcina</option>
          <option value="bolusas">Bolusas</option>
          <option value="svirkstukai">Švirkštukai</option>
          <option value="hygiene">Higiena</option>
          <option value="biocide">Biocidas</option>
          <option value="technical">Techniniai</option>
          <option value="treatment_materials">Gydymo medžiagos</option>
          <option value="reproduction">Reprodukcija</option>
        </select>
        <button
          onClick={exportToExcel}
          disabled={filteredInventory.length === 0}
          className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-5 h-5" />
          <span className="hidden sm:inline">Eksportuoti Excel</span>
          <span className="sm:hidden">Excel</span>
        </button>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Atsargų nerasta</p>
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
                    Kategorija
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    LOT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Likutis
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Galiojimo pabaiga
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Būsena
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Veiksmai
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr key={item.batch_id} className={`transition-colors ${editingBatchId === item.batch_id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-6 py-4">
                      {editingBatchId === item.batch_id && editingData ? (
                        <input
                          type="text"
                          value={editingData.product_name}
                          onChange={(e) => setEditingData({ ...editingData, product_name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingBatchId === item.batch_id && editingData ? (
                        <select
                          value={editingData.category}
                          onChange={(e) => setEditingData({ ...editingData, category: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="medicines">Vaistai</option>
                          <option value="prevention">Prevencija</option>
                          <option value="vakcina">Vakcina</option>
                          <option value="bolusas">Bolusas</option>
                          <option value="svirkstukai">Švirkštukai</option>
                          <option value="hygiene">Higiena</option>
                          <option value="biocide">Biocidas</option>
                          <option value="technical">Techniniai</option>
                          <option value="treatment_materials">Gydymo medžiagos</option>
                          <option value="reproduction">Reprodukcija</option>
                        </select>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          {translateCategory(item.category)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingBatchId === item.batch_id && editingData ? (
                        <input
                          type="text"
                          value={editingData.lot}
                          onChange={(e) => setEditingData({ ...editingData, lot: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-600">{item.lot || 'N/A'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingBatchId === item.batch_id && editingData ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={editingData.on_hand}
                            onChange={(e) => setEditingData({ ...editingData, on_hand: e.target.value })}
                            className="w-20 px-2 py-1 border border-blue-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                            step="0.01"
                            min="0"
                          />
                          <select
                            value={editingData.unit}
                            onChange={(e) => setEditingData({ ...editingData, unit: e.target.value })}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="ml">ml</option>
                            <option value="l">L</option>
                            <option value="g">g</option>
                            <option value="kg">kg</option>
                            <option value="vnt">vnt</option>
                            <option value="tabletkė">tabletkė</option>
                            <option value="bolus">bolus</option>
                            <option value="syringe">syringe</option>
                          </select>
                        </div>
                      ) : (
                        <div>
                          <span className={`font-medium ${
                            item.on_hand < 0 ? 'text-red-600 font-bold' :
                            item.on_hand < 10 ? 'text-orange-600' :
                            'text-gray-900'
                          }`}>
                            {item.on_hand} {item.unit}
                            {item.on_hand < 0 && <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">NEIGIAMA</span>}
                          </span>
                          {item.package_size && item.package_count && (
                            <div className="text-xs text-gray-500 mt-1">
                              {item.package_count} pak. × {item.package_size} {item.unit}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingBatchId === item.batch_id && editingData ? (
                        <input
                          type="date"
                          value={editingData.expiry_date}
                          onChange={(e) => setEditingData({ ...editingData, expiry_date: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500"
                        />
                      ) : (
                        <span className="text-sm text-gray-600">
                          {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : 'N/A'}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isExpired(item.expiry_date) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Pasibaigęs
                        </span>
                      ) : isExpiringSoon(item.expiry_date) ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full">
                          <AlertCircle className="w-3 h-3" />
                          Greitai pasibaigs
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                          Geras
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {editingBatchId === item.batch_id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEdit(item)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Išsaugoti"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Atšaukti"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleEditClick(item)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Redaguoti kiekį"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
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
