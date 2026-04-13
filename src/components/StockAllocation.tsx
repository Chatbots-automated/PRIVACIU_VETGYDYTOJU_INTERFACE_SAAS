import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Package, ArrowRight, Building2, CheckCircle, AlertCircle, Search, Filter, FileText } from 'lucide-react';
import { InvoiceAllocation } from './InvoiceAllocation';

interface WarehouseStock {
  warehouse_batch_id: string;
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  lot: string | null;
  expiry_date: string | null;
  received_qty: number;
  available_qty: number;
  qty_allocated: number;
  supplier_name: string | null;
  doc_number: string | null;
  created_at: string;
  batch_count?: number;
  batches?: WarehouseStock[];
}

interface Farm {
  id: string;
  name: string;
  code: string;
}

export function StockAllocation() {
  const { logAction, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'products' | 'invoices'>('products');
  const [warehouseStock, setWarehouseStock] = useState<WarehouseStock[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [allocationForm, setAllocationForm] = useState({
    farm_id: '',
    notes: '',
  });
  const [productQuantities, setProductQuantities] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stockRes, farmsRes] = await Promise.all([
        supabase.from('vw_warehouse_stock_available').select('*').order('expiry_date', { ascending: true, nullsFirst: false }),
        supabase.from('farms').select('id, name, code').eq('is_active', true).order('name'),
      ]);

      // Group by product but keep individual batches for FIFO allocation
      const grouped = (stockRes.data || []).reduce((acc: WarehouseStock[], batch: WarehouseStock) => {
        const existing = acc.find(item => item.product_id === batch.product_id);
        if (existing) {
          existing.received_qty += batch.received_qty;
          existing.available_qty += batch.available_qty;
          existing.qty_allocated += batch.qty_allocated;
          existing.batch_count = (existing.batch_count || 1) + 1;
          existing.batches = existing.batches || [];
          existing.batches.push(batch);
          // Keep earliest expiry date
          if (batch.expiry_date && (!existing.expiry_date || batch.expiry_date < existing.expiry_date)) {
            existing.expiry_date = batch.expiry_date;
            existing.lot = batch.lot;
          }
        } else {
          acc.push({ 
            ...batch, 
            batch_count: 1,
            batches: [batch]
          });
        }
        return acc;
      }, []);

      setWarehouseStock(grouped);
      if (farmsRes.data) setFarms(farmsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleProductSelection = (productId: string) => {
    const newSelection = new Set(selectedProducts);
    if (newSelection.has(productId)) {
      newSelection.delete(productId);
      const newQtys = new Map(productQuantities);
      newQtys.delete(productId);
      setProductQuantities(newQtys);
    } else {
      newSelection.add(productId);
    }
    setSelectedProducts(newSelection);
  };

  const setProductQuantity = (productId: string, qty: string) => {
    const newQtys = new Map(productQuantities);
    newQtys.set(productId, qty);
    setProductQuantities(newQtys);
  };

  const handleAllocate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedProducts.size === 0 || !allocationForm.farm_id) {
      alert('Pasirinkite bent vieną produktą ir ūkį');
      return;
    }

    // Validate all quantities
    const productsToAllocate = Array.from(selectedProducts).map(productId => {
      const product = warehouseStock.find(p => p.product_id === productId);
      const qty = parseFloat(productQuantities.get(productId) || '0');
      return { product, qty };
    });

    for (const { product, qty } of productsToAllocate) {
      if (!product) continue;
      if (qty <= 0) {
        alert(`Įveskite kiekį produktui "${product.product_name}"`);
        return;
      }
      if (qty > product.available_qty) {
        alert(`Nepakanka atsargų produktui "${product.product_name}". Galima: ${product.available_qty} ${product.unit}`);
        return;
      }
    }

    setAllocating(true);

    try {
      const selectedFarm = farms.find(f => f.id === allocationForm.farm_id);
      let totalAllocated = 0;
      
      // Allocate each selected product
      for (const { product, qty } of productsToAllocate) {
        if (!product) continue;
        
        // First, check if the product exists for this farm, if not create it
        const { data: existingFarmProduct } = await supabase
          .from('products')
          .select('id')
          .eq('farm_id', allocationForm.farm_id)
          .eq('name', product.product_name)
          .maybeSingle();
        
        let farmProductId = product.product_id;
        
        if (!existingFarmProduct) {
          console.log(`📦 Product "${product.product_name}" doesn't exist for farm, creating it...`);
          
          // Get the warehouse product details
          const { data: warehouseProduct } = await supabase
            .from('products')
            .select('*')
            .eq('id', product.product_id)
            .maybeSingle();
          
          if (warehouseProduct) {
            // Create farm-specific product
            const { data: newFarmProduct, error: productError } = await supabase
              .from('products')
              .insert({
                farm_id: allocationForm.farm_id,
                name: warehouseProduct.name,
                category: warehouseProduct.category,
                primary_pack_unit: warehouseProduct.primary_pack_unit,
                primary_pack_size: warehouseProduct.primary_pack_size,
                active_substance: warehouseProduct.active_substance,
                registration_code: warehouseProduct.registration_code,
                dosage_notes: warehouseProduct.dosage_notes,
                withdrawal_days_meat: warehouseProduct.withdrawal_days_meat,
                withdrawal_days_milk: warehouseProduct.withdrawal_days_milk,
                subcategory: warehouseProduct.subcategory,
                subcategory_2: warehouseProduct.subcategory_2,
                package_weight_g: warehouseProduct.package_weight_g,
                is_active: true,
              })
              .select()
              .single();
            
            if (productError) {
              console.error('Error creating farm product:', productError);
              throw new Error(`Nepavyko sukurti produkto ūkyje: ${productError.message}`);
            }
            
            if (newFarmProduct) {
              farmProductId = newFarmProduct.id;
              console.log(`✅ Created farm product with ID: ${farmProductId}`);
            }
          }
        }
        
        let remainingQty = qty;
        const batchesToAllocateFrom = product.batches || [product];
        
        // Allocate from batches in FIFO order (earliest expiry first)
        for (const batch of batchesToAllocateFrom) {
          if (remainingQty <= 0) break;
          
          const qtyFromThisBatch = Math.min(remainingQty, batch.available_qty);
          
          // 1. Create allocation record
          const { data: allocation, error: allocationError } = await supabase
            .from('farm_stock_allocations')
            .insert({
              warehouse_batch_id: batch.warehouse_batch_id,
              farm_id: allocationForm.farm_id,
              product_id: product.product_id,
              allocated_qty: qtyFromThisBatch,
              allocated_by: user?.full_name || user?.email || null,
              notes: allocationForm.notes || null,
            })
            .select()
            .single();

          if (allocationError) throw allocationError;

          // 2. Create corresponding batch in the farm (using farm-specific product ID)
          const { error: batchError } = await supabase
            .from('batches')
            .insert({
              farm_id: allocationForm.farm_id,
              product_id: farmProductId,
              allocation_id: allocation.id,
              lot: batch.lot,
              expiry_date: batch.expiry_date,
              received_qty: qtyFromThisBatch,
              qty_left: qtyFromThisBatch,
              doc_title: 'Warehouse Allocation',
              doc_number: `WH-${batch.lot || 'N/A'}`,
              doc_date: new Date().toISOString().split('T')[0],
            });

          if (batchError) throw batchError;
          
          remainingQty -= qtyFromThisBatch;
          totalAllocated++;
        }
      }

      await logAction(
        'allocate_stock',
        'farm_stock_allocations',
        null,
        null,
        {
          farm_name: selectedFarm?.name,
          products_count: selectedProducts.size,
          allocations_created: totalAllocated,
        }
      );

      alert(`Sėkmingai paskirstyta ${selectedProducts.size} produktų ūkiui "${selectedFarm?.name}"`);
      
      setSelectedProducts(new Set());
      setProductQuantities(new Map());
      setAllocationForm({
        farm_id: '',
        notes: '',
      });
      
      await loadData();
    } catch (error: any) {
      alert('Klaida paskirstant atsargas: ' + error.message);
      console.error('Allocation error:', error);
    } finally {
      setAllocating(false);
    }
  };

  const filteredStock = warehouseStock.filter(item => {
    const matchesSearch = !searchTerm ||
      item.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.lot?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-gray-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <ArrowRight className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Atsargų Paskirstymas</h2>
            <p className="text-gray-200 mt-1">Paskirstykite sandėlio atsargas arba sąskaitas konkretiems ūkiams</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'products'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Package className="w-5 h-5" />
          Sandėlio Atsargos (Produktais)
        </button>
        <button
          onClick={() => setActiveTab('invoices')}
          className={`px-6 py-3 font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FileText className="w-5 h-5" />
          Sandėlio Atsargos (Sąskaitomis)
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'invoices' ? (
        <InvoiceAllocation />
      ) : (
        <>
      {/* Filters */}
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
          <option value="vakcina">Vakcina</option>
          <option value="bolusas">Bolusas</option>
          <option value="svirkstukai">Švirkštukai</option>
          <option value="hygiene">Higiena</option>
          <option value="biocide">Biocidas</option>
          <option value="technical">Techniniai</option>
          <option value="treatment_materials">Gydymo medžiagos</option>
          <option value="reproduction">Reprodukcija</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Warehouse Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Sandėlio Atsargos
          </h3>

          {filteredStock.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Sandėlyje nėra prieinamų atsargų</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredStock.map((item) => {
                const isSelected = selectedProducts.has(item.product_id);
                const qty = productQuantities.get(item.product_id) || '';
                
                return (
                  <div
                    key={item.warehouse_batch_id}
                    className={`p-4 border rounded-lg transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProductSelection(item.product_id)}
                        className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 mt-1 cursor-pointer"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                            {item.batch_count && item.batch_count > 1 && (
                              <p className="text-xs text-gray-500">Partijų: {item.batch_count}</p>
                            )}
                          </div>
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                            {item.category}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                          <div>
                            <span className="text-gray-600">Priimta:</span>
                            <span className="ml-1 font-medium">{item.received_qty} {item.unit}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Paskirstyta:</span>
                            <span className="ml-1 font-medium">{item.qty_allocated} {item.unit}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-600">Galima:</span>
                            <span className="ml-1 font-bold text-green-600">{item.available_qty} {item.unit}</span>
                          </div>
                          {item.expiry_date && (
                            <div className="col-span-2">
                              <span className="text-gray-600">Galioja iki:</span>
                              <span className="ml-1 font-medium">{new Date(item.expiry_date).toLocaleDateString('lt-LT')}</span>
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Paskirstyti kiekis ({item.unit})
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={qty}
                              onChange={(e) => setProductQuantity(item.product_id, e.target.value)}
                              placeholder={`Max: ${item.available_qty}`}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Allocation Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-indigo-600" />
            Paskirstymas Ūkiui
          </h3>

          {selectedProducts.size === 0 ? (
            <div className="text-center py-12">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Pažymėkite produktus iš sandėlio</p>
            </div>
          ) : (
            <form onSubmit={handleAllocate} className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-gray-900 mb-2">Pasirinkta produktų: {selectedProducts.size}</h4>
                <div className="space-y-1 text-sm">
                  {Array.from(selectedProducts).map(productId => {
                    const product = warehouseStock.find(p => p.product_id === productId);
                    const qty = productQuantities.get(productId);
                    return product ? (
                      <div key={productId} className="flex justify-between">
                        <span className="text-gray-700">{product.product_name}</span>
                        <span className="font-medium text-blue-700">{qty || '0'} {product.unit}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pasirinkite ūkį *
                </label>
                <select
                  value={allocationForm.farm_id}
                  onChange={(e) => setAllocationForm({ ...allocationForm, farm_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Pasirinkite ūkį</option>
                  {farms.map(farm => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} ({farm.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pastabos
                </label>
                <textarea
                  value={allocationForm.notes}
                  onChange={(e) => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Papildoma informacija apie paskirstymą..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProducts(new Set());
                    setProductQuantities(new Map());
                  }}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Išvalyti
                </button>
                <button
                  type="submit"
                  disabled={allocating}
                  className="flex-1 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {allocating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Paskirstoma...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Paskirstyti ({selectedProducts.size})
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
