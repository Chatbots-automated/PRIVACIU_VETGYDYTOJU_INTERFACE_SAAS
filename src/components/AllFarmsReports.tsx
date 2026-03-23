import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows } from '../lib/helpers';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  X,
  Building2,
  Package,
  AlertTriangle
} from 'lucide-react';
import {
  TreatedAnimalsReport,
  DrugJournalReport,
  WithdrawalReport,
  InvoicesReport
} from './ReportTemplates';
import { SearchableSelect } from './SearchableSelect';
import { exportReportToExcel, getColumnsForReportType, getReportTitle } from '../lib/reportExport';

type ReportType = 'drug_journal' | 'treated_animals' | 'withdrawal' | 'invoices';

const getCurrentMonthDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0]
  };
};

export function AllFarmsReports() {
  const currentMonth = getCurrentMonthDates();

  const [reportType, setReportType] = useState<ReportType>('drug_journal');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const [filterAnimal, setFilterAnimal] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterDisease, setFilterDisease] = useState('');
  const [filterInvoice, setFilterInvoice] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterVet, setFilterVet] = useState('');
  const [filterFarm, setFilterFarm] = useState('');

  const [animals, setAnimals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [farms, setFarms] = useState<any[]>([]);

  useEffect(() => {
    loadFilterOptions();
    
    // For invoices, clear date filters
    if (reportType === 'invoices') {
      setDateFrom('');
      setDateTo('');
    } else if (reportType !== 'treated_animals') {
      // For other reports, use current month filters
      const currentMonth = getCurrentMonthDates();
      setDateFrom(currentMonth.from);
      setDateTo(currentMonth.to);
    }
  }, [reportType]);

  // Auto-load reports when ready
  useEffect(() => {
    if (reportType === 'invoices') {
      // Load invoices immediately without date filters
      loadReport();
    } else if (reportType === 'treated_animals' && dateFrom && dateTo) {
      loadReport();
    } else if (reportType !== 'treated_animals' && dateFrom && dateTo) {
      loadReport();
    }
  }, [reportType, dateFrom, dateTo]);

  const loadFilterOptions = async () => {
    try {
      const [animalsRes, productsRes, diseasesRes, farmsRes] = await Promise.all([
        supabase.from('animals').select('id, tag_no, species, farm_id').order('tag_no'),
        supabase.from('products').select('id, name').eq('is_active', true).order('name'),
        supabase.from('diseases').select('id, name').order('name'),
        supabase.from('farms').select('id, name, code').eq('is_active', true).order('name'),
      ]);

      if (animalsRes.data) setAnimals(animalsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (diseasesRes.data) setDiseases(diseasesRes.data);
      if (farmsRes.data) setFarms(farmsRes.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let result: any[] = [];

      switch (reportType) {
        case 'drug_journal': {
          let query = supabase.from('vw_vet_drug_journal_all_farms').select('*').order('receipt_date', { ascending: false });
          if (dateFrom) query = query.gte('receipt_date', dateFrom);
          if (dateTo) query = query.lte('receipt_date', dateTo);
          if (filterFarm) query = query.eq('farm_id', filterFarm);
          if (filterProduct) query = query.eq('product_id', filterProduct);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];

          if (filterBatch) {
            result = result.filter(r => r.batch_number?.toLowerCase().includes(filterBatch.toLowerCase()) || r.lot?.toLowerCase().includes(filterBatch.toLowerCase()));
          }
          break;
        }

        case 'treated_animals': {
          const filters: { column: string; value: any; operator?: string }[] = [];

          if (dateFrom) filters.push({ column: 'registration_date', value: dateFrom, operator: 'gte' });
          if (dateTo) filters.push({ column: 'registration_date', value: dateTo, operator: 'lte' });
          if (filterAnimal) filters.push({ column: 'animal_id', value: filterAnimal });
          if (filterDisease) filters.push({ column: 'disease_id', value: filterDisease });
          if (filterFarm) filters.push({ column: 'farm_id', value: filterFarm });

          result = await fetchAllRows('vw_treated_animals_all_farms', '*', 'registration_date', filters);

          if (filterProduct) {
            result = result.filter(r => {
              const product = products.find(p => p.id === filterProduct);
              return product && r.medicine_name?.toLowerCase().includes(product.name.toLowerCase());
            });
          }
          if (filterVet) {
            result = result.filter(r => r.veterinarian?.toLowerCase().includes(filterVet.toLowerCase()));
          }
          
          result.sort((a, b) => {
            const dateCompare = b.registration_date.localeCompare(a.registration_date);
            if (dateCompare !== 0) return dateCompare;
            return b.created_at.localeCompare(a.created_at);
          });
          
          break;
        }

        case 'withdrawal': {
          let query = supabase.from('vw_withdrawal_journal_all_farms').select('*');
          if (dateFrom) query = query.gte('treatment_date', dateFrom);
          if (dateTo) query = query.lte('treatment_date', dateTo);
          if (filterFarm) query = query.eq('farm_id', filterFarm);
          if (filterAnimal) query = query.eq('animal_id', filterAnimal);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];
          break;
        }

        case 'invoices': {
          console.log('🔍 Loading invoices with filters:', { dateFrom, dateTo, filterFarm });
          
          let query = supabase
            .from('invoices')
            .select(`
              *,
              farm:farms(name, code),
              supplier:suppliers(name, code)
            `)
            .order('invoice_date', { ascending: false });

          if (dateFrom) query = query.gte('invoice_date', dateFrom);
          if (dateTo) query = query.lte('invoice_date', dateTo);
          if (filterFarm) query = query.eq('farm_id', filterFarm);

          const { data: invoicesData, error: invoicesError } = await query;
          
          console.log('📦 Invoices loaded:', invoicesData?.length || 0, invoicesData);
          
          if (invoicesError) {
            console.error('❌ Error loading invoices:', invoicesError);
            throw invoicesError;
          }

          // Load invoice items separately for each invoice
          const invoicesWithItems = await Promise.all(
            (invoicesData || []).map(async (invoice) => {
              const { data: items, error: itemsError } = await supabase
                .from('invoice_items')
                .select(`
                  *,
                  product:products(name, category),
                  batch:batches(lot, farm_id, farm:farms(name, code)),
                  warehouse_batch:warehouse_batches(
                    lot,
                    allocations:farm_stock_allocations(
                      farm_id,
                      allocated_qty,
                      farm:farms(name, code)
                    )
                  )
                `)
                .eq('invoice_id', invoice.id)
                .order('line_no');

              if (itemsError) {
                console.error('❌ Error loading items for invoice:', invoice.id, itemsError);
              }

              console.log(`📋 Items for invoice ${invoice.invoice_number}:`, items?.length || 0);

              return {
                ...invoice,
                items: items || []
              };
            })
          );

          console.log('✅ Final invoices with items:', invoicesWithItems.length);
          result = invoicesWithItems;
          break;
        }
      }

      setData(result);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (data.length === 0) {
      alert('Nėra duomenų eksportavimui');
      return;
    }

    const reportTitle = getReportTitle(reportType);
    const columns = getColumnsForReportType(reportType);
    exportReportToExcel(data, columns, reportTitle);
  };

  const clearFilters = () => {
    setFilterAnimal('');
    setFilterProduct('');
    setFilterDisease('');
    setFilterInvoice('');
    setFilterBatch('');
    setFilterVet('');
    setFilterFarm('');
    setDateFrom(currentMonth.from);
    setDateTo(currentMonth.to);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-700 to-gray-800 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-lg">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Bendros Ataskaitos</h2>
            <p className="text-gray-200 mt-1">Visų ūkių suvestinės ataskaitos</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setReportType('drug_journal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'drug_journal'
                ? 'bg-slate-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Package className="w-4 h-4" />
            Vaistų žurnalas
          </button>
          <button
            onClick={() => setReportType('treated_animals')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'treated_animals'
                ? 'bg-slate-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Gydomų gyvūnų registras
          </button>
          <button
            onClick={() => setReportType('withdrawal')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'withdrawal'
                ? 'bg-slate-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            Karencijos žurnalas
          </button>
          <button
            onClick={() => setReportType('invoices')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              reportType === 'invoices'
                ? 'bg-slate-700 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            Sąskaitos
          </button>
        </div>

        <div className="mb-6">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 font-medium"
          >
            <Filter className="w-5 h-5" />
            {showFilters ? 'Slėpti filtrus' : 'Rodyti filtrus'}
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Filtrai</h3>
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                <X className="w-4 h-4" />
                Išvalyti
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Nuo datos
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Iki datos
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Ūkis
                </label>
                <SearchableSelect
                  options={[
                    { value: '', label: 'Visi ūkiai' },
                    ...farms.map(f => ({ value: f.id, label: `${f.name} (${f.code})` }))
                  ]}
                  value={filterFarm}
                  onChange={setFilterFarm}
                  placeholder="Pasirinkite ūkį..."
                />
              </div>

              {reportType === 'treated_animals' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gyvūnas</label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'Visi gyvūnai' },
                        ...animals.map(a => ({ value: a.id, label: `${a.tag_no} (${a.species})` }))
                      ]}
                      value={filterAnimal}
                      onChange={setFilterAnimal}
                      placeholder="Pasirinkite gyvūną..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Liga</label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'Visos ligos' },
                        ...diseases.map(d => ({ value: d.id, label: d.name }))
                      ]}
                      value={filterDisease}
                      onChange={setFilterDisease}
                      placeholder="Pasirinkite ligą..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Veterinaras</label>
                    <input
                      type="text"
                      value={filterVet}
                      onChange={(e) => setFilterVet(e.target.value)}
                      placeholder="Ieškoti veterinaro..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </>
              )}

              {reportType === 'drug_journal' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Produktas</label>
                    <SearchableSelect
                      options={[
                        { value: '', label: 'Visi produktai' },
                        ...products.map(p => ({ value: p.id, label: p.name }))
                      ]}
                      value={filterProduct}
                      onChange={setFilterProduct}
                      placeholder="Pasirinkite produktą..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partijos Nr.</label>
                    <input
                      type="text"
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      placeholder="Ieškoti partijos..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sąskaitos Nr.</label>
                    <input
                      type="text"
                      value={filterInvoice}
                      onChange={(e) => setFilterInvoice(e.target.value)}
                      placeholder="Ieškoti sąskaitos..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={loadReport}
                className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Taikyti filtrus
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div className="text-sm text-gray-600">
            Rasta įrašų: <span className="font-semibold text-gray-900">{data.length}</span>
          </div>
          <button
            onClick={handleExport}
            disabled={data.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Eksportuoti į Excel
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div>
            <p className="mt-2 text-gray-600">Kraunama...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {reportType === 'drug_journal' && <DrugJournalReport data={data} />}
            {reportType === 'treated_animals' && <TreatedAnimalsReport data={data} />}
            {reportType === 'withdrawal' && <WithdrawalReport data={data} />}
            {reportType === 'invoices' && <InvoicesReport data={data} />}
          </div>
        )}
      </div>
    </div>
  );
}
