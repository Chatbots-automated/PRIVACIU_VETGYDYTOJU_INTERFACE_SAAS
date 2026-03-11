import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { formatDateTimeLT, formatNumberLT } from '../lib/formatters';
import { calculateSafeUnitCost, formatCost, formatUnitCost } from '../lib/costCalculations';
import { fetchAllRows } from '../lib/helpers';
import { useFarm } from '../contexts/FarmContext';
import { Package, Search, RefreshCw, ChevronDown, ChevronRight, Calendar, Activity, TrendingUp, Filter } from 'lucide-react';

interface ProductUsageRecord {
  product_id: string;
  product_name: string;
  category: string | null;
  subcategory: string | null;
  total_quantity: number;
  unit: string;
  total_cost: number;
  usage_count: number;
  animals_treated: number;
  usages: UsageDetail[];
  inventory_additions: InventoryAddition[];
  total_received: number;
  total_used: number;
  remaining_stock: number;
}

interface InventoryAddition {
  batch_id: string;
  received_date: string;
  received_qty: number;
  purchase_price: number;
  supplier_name: string | null;
}

interface UsageDetail {
  date: string;
  animal_tag: string | null;
  animal_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  visit_id: string | null;
  treatment_id: string | null;
  source: 'usage_items' | 'vaccinations' | 'sync';
}

export function ProductUsageAnalysis() {
  const { selectedFarm } = useFarm();
  const [usageData, setUsageData] = useState<ProductUsageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'cost' | 'usage_count'>('cost');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadProductUsage();
  }, [selectedFarm]);

  const loadProductUsage = async () => {
    try {
      setLoading(true);
      if (!selectedFarm) return;
      
      console.log('🔄 Loading product usage data...');

      // 1. Get all usage_items
      const usageItemsRes = await supabase
        .from('usage_items')
        .select('id, qty, created_at, treatment_id, product_id, batch_id')
        .eq('farm_id', selectedFarm.id);
      const usageItems = usageItemsRes.data || [];

      console.log('✅ Usage items loaded:', usageItems.length);

      // 2. Get all vaccinations
      const vaccinationsRes = await supabase
        .from('vaccinations')
        .select('id, dose_amount, unit, vaccination_date, animal_id, product_id, batch_id')
        .eq('farm_id', selectedFarm.id);
      const vaccinations = vaccinationsRes.data || [];

      console.log('✅ Vaccinations loaded:', vaccinations.length);

      // 3. Get all synchronization steps
      const { data: syncSteps, error: syncStepsError } = await supabase
        .from('synchronization_steps')
        .select(`
          id,
          synchronization_id,
          dosage,
          batch_id,
          completed,
          completed_at,
          batches(id, product_id, purchase_price, received_qty)
        `)
        .eq('farm_id', selectedFarm.id)
        .eq('completed', true)
        .not('batch_id', 'is', null);

      if (syncStepsError) {
        console.error('Sync steps error:', syncStepsError);
        throw syncStepsError;
      }

      console.log('✅ Sync steps loaded:', syncSteps?.length || 0);

      // Get synchronizations for animal lookup
      const synchronizationsRes = await supabase
        .from('animal_synchronizations')
        .select('id, animal_id')
        .eq('farm_id', selectedFarm.id);
      const synchronizations = synchronizationsRes.data || [];
      const syncMap = new Map(synchronizations.map(s => [s.id, s]));

      // NOTE: We DO NOT load planned_medications because they are converted to usage_items
      // when visits are completed. Loading both would cause double-counting!

      // Fetch all lookup data upfront (MUCH faster than individual queries)
      console.log('📚 Loading lookup data...');
      const productsRes = await supabase.from('products').select('id, name, category, subcategory, primary_pack_unit').eq('farm_id', selectedFarm.id);
      const batchesRes = await supabase.from('batches').select('id, product_id, purchase_price, received_qty, qty_left, created_at, supplier_id').eq('farm_id', selectedFarm.id);
      const suppliersRes = await supabase.from('suppliers').select('id, name').eq('farm_id', selectedFarm.id);
      const treatmentsRes = await supabase.from('treatments').select('id, animal_id').eq('farm_id', selectedFarm.id);
      const animalsRes = await supabase.from('animals').select('id, tag_no').eq('farm_id', selectedFarm.id);
      
      const products = productsRes.data || [];
      const batches = batchesRes.data || [];
      const suppliers = suppliersRes.data || [];
      const treatments = treatmentsRes.data || [];
      const animals = animalsRes.data || [];

      // Create lookup maps
      const productMap = new Map(products.map(p => [p.id, p]));
      const batchMap = new Map(batches.map(b => [b.id, b]));
      const treatmentMap = new Map(treatments.map(t => [t.id, t]));
      const animalMap = new Map(animals.map(a => [a.id, a]));

      console.log('✅ Lookup data loaded:', products.length, 'products,', batches.length, 'batches,', animals.length, 'animals');

      // Process all data into product-centric view
      const usageByProduct = new Map<string, ProductUsageRecord>();

      // Process usage_items
      console.log('📦 Processing usage_items...');
      for (const item of usageItems || []) {
        if (!item.product_id || !item.batch_id || !item.qty) continue;

        const product = productMap.get(item.product_id);
        const batch = batchMap.get(item.batch_id);
        if (!product || !batch) continue;

        // Get animal info if treatment exists
        let animalTag = null;
        let animalId = null;
        if (item.treatment_id) {
          const treatment = treatmentMap.get(item.treatment_id);
          if (treatment) {
            animalId = treatment.animal_id;
            const animal = animalMap.get(treatment.animal_id);
            animalTag = animal?.tag_no || null;
          }
        }

        const unitCost = calculateSafeUnitCost(batch.purchase_price, batch.received_qty);
        const totalCost = item.qty * unitCost;

        const productId = product.id;
        if (!usageByProduct.has(productId)) {
          usageByProduct.set(productId, {
            product_id: productId,
            product_name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            total_quantity: 0,
            unit: product.primary_pack_unit || 'vnt',
            total_cost: 0,
            usage_count: 0,
            animals_treated: 0,
            usages: [],
            inventory_additions: [],
            total_received: 0,
            total_used: 0,
            remaining_stock: 0
          });
        }

        const record = usageByProduct.get(productId)!;
        record.total_quantity += item.qty;
        record.total_cost += totalCost;
        record.usage_count += 1;
        record.usages.push({
          date: item.created_at,
          animal_tag: animalTag,
          animal_id: animalId || '',
          quantity: item.qty,
          unit_cost: unitCost,
          total_cost: totalCost,
          visit_id: null,
          treatment_id: item.treatment_id,
          source: 'usage_items',
        });
      }
      console.log('✅ Usage items processed:', usageByProduct.size, 'products');

      // Process vaccinations (DEPRECATED: new vaccinations are automatically converted to usage_items)
      // This code is kept for backward compatibility with old vaccinations that weren't converted yet
      // Skip vaccinations that already have usage_items (to prevent double-counting)
      console.log('💉 Processing vaccinations (legacy only)...');

      // Get all vaccination_ids that already have usage_items
      const { data: existingVaccinationItems, error: vacItemsError } = await supabase
        .from('usage_items')
        .select('vaccination_id')
        .not('vaccination_id', 'is', null);

      if (vacItemsError) {
        console.error('Error fetching vaccination items:', vacItemsError);
      }

      const existingVaccinationIds = new Set(
        (existingVaccinationItems || []).map(item => item.vaccination_id).filter(Boolean)
      );

      let skippedCount = 0;
      let processedCount = 0;

      for (const vacc of vaccinations || []) {
        // Skip if this vaccination already has a usage_item
        if (existingVaccinationIds.has(vacc.id)) {
          skippedCount++;
          continue;
        }

        if (!vacc.product_id || !vacc.batch_id || !vacc.dose_amount) continue;

        const product = productMap.get(vacc.product_id);
        const batch = batchMap.get(vacc.batch_id);
        if (!product || !batch) continue;

        const animal = animalMap.get(vacc.animal_id);

        const unitCost = calculateSafeUnitCost(batch.purchase_price, batch.received_qty);
        const totalCost = vacc.dose_amount * unitCost;

        const productId = product.id;
        if (!usageByProduct.has(productId)) {
          usageByProduct.set(productId, {
            product_id: productId,
            product_name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            total_quantity: 0,
            unit: vacc.unit || product.primary_pack_unit || 'vnt',
            total_cost: 0,
            usage_count: 0,
            animals_treated: 0,
            usages: [],
            inventory_additions: [],
            total_received: 0,
            total_used: 0,
            remaining_stock: 0
          });
        }

        const record = usageByProduct.get(productId)!;
        record.total_quantity += vacc.dose_amount;
        record.total_cost += totalCost;
        record.usage_count += 1;
        record.usages.push({
          date: vacc.vaccination_date,
          animal_tag: animal?.tag_no || null,
          animal_id: vacc.animal_id,
          quantity: vacc.dose_amount,
          unit_cost: unitCost,
          total_cost: totalCost,
          visit_id: null,
          treatment_id: null,
          source: 'vaccinations',
        });
        processedCount++;
      }
      console.log(`✅ Vaccinations processed: ${processedCount} legacy, ${skippedCount} skipped (already in usage_items)`);

      // Process synchronization steps (sync medications)
      console.log('🔄 Processing sync medications...');
      for (const step of syncSteps || []) {
        // Skip if no batch info or dosage
        if (!step.batches || !step.dosage) continue;

        const batch = step.batches;
        // CRITICAL: Skip if batch doesn't have a product_id (orphaned batch reference)
        if (!batch.product_id) continue;
        
        const product = productMap.get(batch.product_id);
        if (!product) continue;

        // Get animal info from synchronization
        const sync = syncMap.get(step.synchronization_id);
        let animalTag = null;
        let animalId = null;
        if (sync) {
          animalId = sync.animal_id;
          const animal = animalMap.get(sync.animal_id);
          animalTag = animal?.tag_no || null;
        }

        const unitCost = calculateSafeUnitCost(batch.purchase_price, batch.received_qty);
        const totalCost = step.dosage * unitCost;

        const productId = product.id;
        if (!usageByProduct.has(productId)) {
          usageByProduct.set(productId, {
            product_id: productId,
            product_name: product.name,
            category: product.category,
            subcategory: product.subcategory,
            total_quantity: 0,
            unit: product.primary_pack_unit || 'vnt',
            total_cost: 0,
            usage_count: 0,
            animals_treated: 0,
            usages: [],
            inventory_additions: [],
            total_received: 0,
            total_used: 0,
            remaining_stock: 0
          });
        }

        const record = usageByProduct.get(productId)!;
        record.total_quantity += step.dosage;
        record.total_cost += totalCost;
        record.usage_count += 1;
        record.usages.push({
          date: step.completed_at || new Date().toISOString(),
          animal_tag: animalTag,
          animal_id: animalId || '',
          quantity: step.dosage,
          unit_cost: unitCost,
          total_cost: totalCost,
          visit_id: null,
          treatment_id: null,
          source: 'sync', // sync medications are tracked separately
        });
      }
      console.log('✅ Sync medications processed');

      // NOTE: We skip planned_medications processing to avoid double-counting
      // (they're already included in usage_items after visit completion)

      // Calculate unique animals per product
      for (const record of usageByProduct.values()) {
        const uniqueAnimals = new Set(record.usages.map(u => u.animal_id));
        record.animals_treated = uniqueAnimals.size;
      }

      // Add inventory tracking information
      console.log('📊 Processing inventory additions...');
      const supplierMap = new Map(suppliers.map(s => [s.id, s]));

      for (const record of usageByProduct.values()) {
        // Find all batches for this product using product_id
        const productBatches = batches.filter(b => b.product_id === record.product_id);

        record.inventory_additions = productBatches.map(batch => ({
          batch_id: batch.id,
          received_date: batch.created_at || 'N/A',
          received_qty: batch.received_qty || 0,
          purchase_price: batch.purchase_price || 0,
          supplier_name: batch.supplier_id ? (supplierMap.get(batch.supplier_id)?.name || 'N/A') : 'N/A'
        })).sort((a, b) => new Date(b.received_date).getTime() - new Date(a.received_date).getTime());

        record.total_received = productBatches.reduce((sum, b) => sum + (b.received_qty || 0), 0);
        
        // CRITICAL FIX: Use qty_left from batches as the source of truth
        // The database triggers maintain qty_left accurately, so we should trust it
        // rather than recalculating from usage records (which may have historical discrepancies)
        const actualRemainingStock = productBatches.reduce((sum, b) => sum + (b.qty_left || 0), 0);
        record.total_used = record.total_received - actualRemainingStock;
        record.remaining_stock = actualRemainingStock;
      }

      setUsageData(Array.from(usageByProduct.values()));
      console.log('📦 Product usage loaded:', usageByProduct.size, 'unique products');
    } catch (error) {
      console.error('Error loading product usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (productId: string) => {
    setExpandedProduct(expandedProduct === productId ? null : productId);
  };

  // Filter data
  const filteredData = usageData.filter(product => {
    // Search filter
    if (searchTerm && !product.product_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Category filter
    if (categoryFilter !== 'all' && product.category !== categoryFilter) {
      return false;
    }

    // Date range filter
    if (startDate || endDate) {
      const productUsagesInRange = product.usages.filter(usage => {
        const usageDate = new Date(usage.date);
        if (startDate && usageDate < new Date(startDate)) return false;
        if (endDate && usageDate > new Date(endDate + 'T23:59:59')) return false;
        return true;
      });
      if (productUsagesInRange.length === 0) return false;
    }

    return true;
  });

  // Sort data
  const sortedData = [...filteredData].sort((a, b) => {
    let compareValue = 0;
    switch (sortBy) {
      case 'name':
        compareValue = a.product_name.localeCompare(b.product_name, 'lt');
        break;
      case 'quantity':
        compareValue = a.total_quantity - b.total_quantity;
        break;
      case 'cost':
        compareValue = a.total_cost - b.total_cost;
        break;
      case 'usage_count':
        compareValue = a.usage_count - b.usage_count;
        break;
    }
    return sortOrder === 'desc' ? -compareValue : compareValue;
  });

  // Helper function to filter usages by date range
  const getFilteredUsages = (product: ProductUsageRecord) => {
    if (!startDate && !endDate) {
      return product.usages;
    }
    return product.usages.filter(usage => {
      const usageDate = new Date(usage.date);
      if (startDate && usageDate < new Date(startDate)) return false;
      if (endDate && usageDate > new Date(endDate + 'T23:59:59')) return false;
      return true;
    });
  };

  // Calculate totals based on filtered data and date range
  const totalStats = filteredData.reduce(
    (acc, product) => {
      const filteredUsages = getFilteredUsages(product);
      const productCost = filteredUsages.reduce((sum, u) => sum + u.total_cost, 0);
      const uniqueAnimals = new Set(filteredUsages.map(u => u.animal_id));

      return {
        totalProducts: acc.totalProducts + (filteredUsages.length > 0 ? 1 : 0),
        totalCost: acc.totalCost + productCost,
        totalUsages: acc.totalUsages + filteredUsages.length,
        totalAnimals: acc.totalAnimals + uniqueAnimals.size,
      };
    },
    { totalProducts: 0, totalCost: 0, totalUsages: 0, totalAnimals: 0 }
  );

  // Calculate breakdown by source based on filtered data and date range
  const sourceBreakdown = filteredData.reduce((acc, product) => {
    const filteredUsages = getFilteredUsages(product);
    filteredUsages.forEach(usage => {
      if (usage.source === 'usage_items') {
        acc.usageItems += usage.total_cost;
      } else if (usage.source === 'vaccinations') {
        acc.vaccinations += usage.total_cost;
      } else if (usage.source === 'sync') {
        acc.sync += usage.total_cost;
      }
    });
    return acc;
  }, { usageItems: 0, vaccinations: 0, sync: 0 });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Vaistų Panaudojimas</h2>
              <p className="text-sm text-gray-600">Detalus visų produktų panaudojimo ataskaita</p>
            </div>
          </div>
          <button
            onClick={loadProductUsage}
            className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            title="Atnaujinti"
          >
            <RefreshCw className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Produktų</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{totalStats.totalProducts}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Panaudojimų</span>
            </div>
            <div className="text-2xl font-bold text-orange-600">{totalStats.totalUsages}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-gray-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Gyvūnų</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{totalStats.totalAnimals}</div>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-semibold text-gray-600 uppercase">Viso išlaidų</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCost(totalStats.totalCost)}</div>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="text-xs font-semibold text-gray-600 uppercase mb-2">Išlaidų paskirstymas pagal šaltinį:</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-sm text-gray-600">Gydymo vaistai:</span>
              <span className="text-sm font-semibold text-gray-900">{formatCost(sourceBreakdown.usageItems)}</span>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-sm text-gray-600">Sinchronizacijos vaistai:</span>
              <span className="text-sm font-semibold text-gray-900">{formatCost(sourceBreakdown.sync)}</span>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-gray-200">
              <span className="text-sm text-gray-600">Vakcinacijos:</span>
              <span className="text-sm font-semibold text-gray-900">{formatCost(sourceBreakdown.vaccinations)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <span className="font-semibold text-gray-700">Filtrai</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti produkto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Visos kategorijos</option>
            <option value="medicines">Vaistai</option>
            <option value="prevention">Prevencija</option>
            <option value="reproduction">Reprodukcija</option>
            <option value="hygiene">Higiena</option>
            <option value="supplies">Priemonės</option>
          </select>

          {/* Start Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Nuo datos"
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Iki datos"
            />
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-gray-200">
          <span className="text-sm font-medium text-gray-700">Rūšiuoti pagal:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="cost">Kaina</option>
            <option value="quantity">Kiekis</option>
            <option value="usage_count">Panaudojimų skaičius</option>
            <option value="name">Pavadinimas</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {sortOrder === 'desc' ? '↓ Mažėjančia' : '↑ Didėjančia'}
          </button>
        </div>
      </div>

      {/* Data Table */}
      {sortedData.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center border border-gray-200">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nerasta produktų panaudojimo duomenų</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3"></th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Produktas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Kategorija
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Panaudota
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Panaudojimų
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Gyvūnų
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Viso kaina
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedData.map((product) => {
                  const isExpanded = expandedProduct === product.product_id;

                  // Calculate filtered values based on date range
                  const filteredUsages = getFilteredUsages(product);
                  const filteredQuantity = filteredUsages.reduce((sum, u) => sum + u.quantity, 0);
                  const filteredCost = filteredUsages.reduce((sum, u) => sum + u.total_cost, 0);
                  const filteredCount = filteredUsages.length;
                  const filteredAnimals = new Set(filteredUsages.map(u => u.animal_id)).size;

                  return (
                    <React.Fragment key={product.product_id}>
                      <tr
                        className="hover:bg-blue-50 transition-colors cursor-pointer"
                        onClick={() => toggleExpand(product.product_id)}
                      >
                        <td className="px-4 py-3">
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-600" />
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{product.product_name}</div>
                          {product.subcategory && (
                            <div className="text-xs text-gray-500 mt-1">{product.subcategory}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {product.category || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-gray-900">
                            {formatNumberLT(filteredQuantity)} {product.unit}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-gray-900">{filteredCount}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-gray-900">{filteredAnimals}</div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="text-lg font-bold text-blue-600">
                            {formatCost(filteredCost)}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-6 bg-gray-50">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              {/* Inventory Tracking */}
                              <div className="lg:col-span-1 bg-white rounded-lg p-4 border border-gray-300">
                                <div className="flex items-center gap-2 mb-4">
                                  <Package className="w-5 h-5 text-blue-600" />
                                  <h4 className="text-sm font-bold text-gray-900">Inventorius</h4>
                                </div>

                                <div className="space-y-3 mb-4">
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Viso gauta:</span>
                                    <span className="text-sm font-bold text-blue-700">
                                      {formatNumberLT(product.total_received)} {product.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-600">Panaudota:</span>
                                    <span className="text-sm font-bold text-orange-700">
                                      {formatNumberLT(product.total_used)} {product.unit}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                                    <span className="text-sm font-semibold text-gray-700">Likutis:</span>
                                    <span className={`text-sm font-bold ${product.remaining_stock > 0 ? 'text-green-700' : product.remaining_stock === 0 ? 'text-gray-700' : 'text-red-700'}`}>
                                      {formatNumberLT(product.remaining_stock)} {product.unit}
                                    </span>
                                  </div>
                                  {(startDate || endDate) && (
                                    <div className="pt-2 border-t border-gray-200">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-500">Panaudota (filtruota):</span>
                                        <span className="text-xs font-semibold text-gray-600">
                                          {formatNumberLT(filteredQuantity)} {product.unit}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>

                                <div className="border-t border-gray-300 pt-3">
                                  <h5 className="text-xs font-semibold text-gray-700 uppercase mb-2">Gavimo Istorija:</h5>
                                  <div className="space-y-2 max-h-48 overflow-y-auto">
                                    {product.inventory_additions.length > 0 ? (
                                      product.inventory_additions.map((inv, idx) => (
                                        <div key={idx} className="bg-gray-50 p-2 rounded text-xs border border-gray-200">
                                          <div className="flex justify-between items-start mb-1">
                                            <span className="text-gray-600">{formatDateTimeLT(inv.received_date)}</span>
                                            <span className="font-bold text-green-700">{formatNumberLT(inv.received_qty)} {product.unit}</span>
                                          </div>
                                          <div className="text-gray-500">
                                            {inv.supplier_name} • {formatCost(inv.purchase_price)}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-gray-500 italic">Nėra gavimo įrašų</p>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Usage History */}
                              <div className="lg:col-span-2 bg-white rounded-lg p-4 border border-gray-300">
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-5 h-5 text-orange-600" />
                                    <h4 className="text-sm font-bold text-gray-900">
                                      Panaudojimo Istorija ({filteredUsages.length})
                                    </h4>
                                  </div>
                                  <span className="text-xs text-gray-500">Rodyti visi {filteredUsages.length} įrašai</span>
                                </div>

                                <div className="space-y-2" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                                  {filteredUsages
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map((usage, idx) => (
                                      <div
                                        key={idx}
                                        className="bg-gray-50 p-3 rounded-lg border border-gray-200 hover:bg-blue-50 transition-colors"
                                      >
                                        <div className="flex items-center justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                              <span className="text-xs font-bold text-gray-500">#{idx + 1}</span>
                                              <span className="text-sm font-semibold text-gray-900">
                                                {formatDateTimeLT(usage.date)}
                                              </span>
                                              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                                                {usage.source === 'usage_items' ? 'Gydymas' :
                                                 usage.source === 'vaccinations' ? 'Vakcina' :
                                                 usage.source === 'sync' ? 'Sinchronizacija' :
                                                 'Planuotas'}
                                              </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                              <span className="text-gray-600">
                                                Gyvūnas: <span className="font-medium">{usage.animal_tag || 'N/A'}</span>
                                              </span>
                                              <span className="text-gray-600">
                                                Kiekis: <span className="font-medium">{formatNumberLT(usage.quantity)} {product.unit}</span>
                                              </span>
                                              <span className="text-gray-600">
                                                Vnt. kaina: <span className="font-medium">{formatUnitCost(usage.unit_cost)}/{product.unit}</span>
                                              </span>
                                            </div>
                                          </div>
                                          <div className="font-bold text-blue-600 text-lg ml-4">
                                            {formatCost(usage.total_cost)}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
