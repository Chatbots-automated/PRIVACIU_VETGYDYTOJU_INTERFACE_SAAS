import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows } from '../lib/helpers';
import { useFarm } from '../contexts/FarmContext';
import { useAuth } from '../contexts/AuthContext';
import {
  FileText,
  Download,
  Calendar,
  Activity,
  TrendingUp,
  AlertTriangle,
  Syringe,
  Package,
  DollarSign,
  PieChart,
  BarChart3,
  Users,
  Filter,
  X,
  RefreshCw,
  Printer,
  Heart
} from 'lucide-react';
import {
  TreatedAnimalsReport,
  MedicalWasteReport,
  DrugJournalReport,
  BiocideJournalReport,
  InseminationJournalReport,
  WithdrawalReport
} from './ReportTemplates';
import {
  TreatedAnimalRegistrationReport,
  ProductionAnimalMedicineUsageReport,
  MedicineBiocideStockBalanceReport,
  MedicineBiocideWriteOffActReport,
  VeterinaryWorkCompletionActReport
} from './journals/JournalReports';
import { SearchableSelect } from './SearchableSelect';
import { InvoiceViewer } from './InvoiceViewer';
import { exportReportToExcel, getColumnsForReportType, getReportTitle } from '../lib/reportExport';

interface AnalyticsData {
  totalAnimals: number;
  activeAnimals: number;
  totalTreatments: number;
  totalVaccinations: number;
  totalProductValue: number;
  lowStockProducts: number;
  expiringSoon: number;
  animalsInWithdrawal: number;
  topDiseases: Array<{ name: string; count: number }>;
  topProducts: Array<{ name: string; usage: number }>;
  treatmentsByMonth: Array<{ month: string; count: number }>;
  vaccinationsByMonth: Array<{ month: string; count: number }>;
  outcomeStats: Array<{ outcome: string; count: number }>;
  inventoryByCategory: Array<{ category: string; value: number }>;
}

type ReportType = 'analytics' | 'drug_journal' | 'treated_animals' | 'biocide_journal' | 'insemination_journal' | 'medical_waste' | 'invoices' | 'withdrawal' | 'treated_animal_registration' | 'production_animal_medicine' | 'stock_balance' | 'write_off_act' | 'work_completion_act';

// Get current month's first and last day
const getCurrentMonthDates = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    from: firstDay.toISOString().split('T')[0],
    to: lastDay.toISOString().split('T')[0]
  };
};

export function Reports() {
  const { selectedFarm } = useFarm();
  const { user } = useAuth();
  const currentMonth = getCurrentMonthDates();

  const [reportType, setReportType] = useState<ReportType>('analytics');
  const [data, setData] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState(currentMonth.from);
  const [dateTo, setDateTo] = useState(currentMonth.to);
  const [showFilters, setShowFilters] = useState(true);

  const [filterAnimal, setFilterAnimal] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterDisease, setFilterDisease] = useState('');
  const [filterInvoice, setFilterInvoice] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterVet, setFilterVet] = useState('');

  const [animals, setAnimals] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);

  useEffect(() => {
    if (selectedFarm) {
      loadFilterOptions();
      if (reportType === 'analytics') {
        loadAnalytics();
      } else if (reportType !== 'treated_animals') {
        loadReport();
      }
    }
    // For treated_animals, wait for date filters to be set (handled in separate useEffect)
  }, [reportType, selectedFarm]);

  // Auto-load treated_animals report with current month filters
  useEffect(() => {
    if (reportType === 'treated_animals' && dateFrom && dateTo && selectedFarm) {
      loadReport();
    }
  }, [reportType, dateFrom, dateTo, selectedFarm]);

  const loadFilterOptions = async () => {
    try {
      if (!selectedFarm) return;

      const [animalsRes, productsRes, diseasesRes] = await Promise.all([
        supabase.from('animals').select('id, tag_no, species').eq('farm_id', selectedFarm.id).order('tag_no'),
        supabase.from('products').select('id, name').eq('farm_id', selectedFarm.id).eq('is_active', true).order('name'),
        supabase.from('diseases').select('id, name').eq('farm_id', selectedFarm.id).order('name'),
      ]);

      if (animalsRes.data) setAnimals(animalsRes.data);
      if (productsRes.data) setProducts(productsRes.data);
      if (diseasesRes.data) setDiseases(diseasesRes.data);
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (!selectedFarm) return;

      const [
        animalsRes,
        treatmentsRes,
        vaccinationsRes,
        productsRes,
        batchesRes,
        diseasesRes,
        usageRes,
        withdrawalRes,
      ] = await Promise.all([
        supabase.from('animals').select('id, active').eq('farm_id', selectedFarm.id),
        supabase.from('treatments').select('id, reg_date, outcome, disease_id').eq('farm_id', selectedFarm.id).gte('reg_date', sixMonthsAgo),
        supabase.from('vaccinations').select('id, vaccination_date').eq('farm_id', selectedFarm.id).gte('vaccination_date', sixMonthsAgo),
        supabase.from('products').select('id, name, category, is_active').eq('farm_id', selectedFarm.id),
        supabase.from('batches').select('id, product_id, expiry_date, qty_received, purchase_price').eq('farm_id', selectedFarm.id),
        supabase.from('diseases').select('id, name').eq('farm_id', selectedFarm.id),
        supabase.from('usage_items').select('product_id, quantity, treatment_id, batch_id').eq('farm_id', selectedFarm.id),
        supabase.from('treatments').select('withdrawal_until_meat, withdrawal_until_milk').eq('farm_id', selectedFarm.id).or(`withdrawal_until_meat.gte.${today},withdrawal_until_milk.gte.${today}`),
      ]);

      const animals = animalsRes.data || [];
      const treatments = treatmentsRes.data || [];
      const vaccinations = vaccinationsRes.data || [];
      const products = productsRes.data || [];
      const batches = batchesRes.data || [];
      const diseases = diseasesRes.data || [];
      const usage = usageRes.data || [];

      const totalAnimals = animals.length;
      const activeAnimals = animals.filter(a => a.active).length;
      const totalTreatments = treatments.length;
      const totalVaccinations = vaccinations.length;

      // Calculate total value based on on-hand quantity
      const usageByBatch = new Map<string, number>();
      usage.forEach(u => {
        if (u.batch_id) {
          const current = usageByBatch.get(u.batch_id) || 0;
          usageByBatch.set(u.batch_id, current + (parseFloat(u.qty) || 0));
        }
      });

      // Filter out expired batches before calculating stock
      const todayDate = new Date();
      todayDate.setHours(0, 0, 0, 0);
      const validBatches = batches.filter(b => {
        if (!b.expiry_date) return true;
        const expiryDate = new Date(b.expiry_date);
        return expiryDate >= todayDate;
      });

      let totalProductValue = 0;
      validBatches.forEach(b => {
        const totalUsed = usageByBatch.get(b.id) || 0;
        const receivedQty = parseFloat(b.received_qty) || 0;
        const onHand = receivedQty - totalUsed;
        if (onHand > 0) {
          const purchasePrice = parseFloat(b.purchase_price) || 0;
          const unitPrice = receivedQty > 0 ? purchasePrice / receivedQty : 0;
          totalProductValue += unitPrice * onHand;
        }
      });

      const stockByProduct = new Map<string, number>();
      validBatches.forEach(b => {
        const current = stockByProduct.get(b.product_id) || 0;
        stockByProduct.set(b.product_id, current + parseFloat(b.received_qty || 0));
      });
      usage.forEach(u => {
        const current = stockByProduct.get(u.product_id) || 0;
        stockByProduct.set(u.product_id, current - parseFloat(u.qty || 0));
      });
      const lowStockProducts = Array.from(stockByProduct.values()).filter(qty => qty < 10).length;

      const expiryThreshold = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expiringSoon = batches.filter(b => b.expiry_date && b.expiry_date <= expiryThreshold && b.expiry_date >= today).length;

      const animalsInWithdrawal = withdrawalRes.data?.length || 0;

      const diseaseCount = new Map<string, number>();
      treatments.forEach(t => {
        if (t.disease_id) {
          const count = diseaseCount.get(t.disease_id) || 0;
          diseaseCount.set(t.disease_id, count + 1);
        }
      });
      const topDiseases = Array.from(diseaseCount.entries())
        .map(([diseaseId, count]) => ({
          name: diseases.find(d => d.id === diseaseId)?.name || 'Unknown',
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      const productUsage = new Map<string, number>();
      usage.forEach(u => {
        const count = productUsage.get(u.product_id) || 0;
        productUsage.set(u.product_id, count + parseFloat(u.qty || 0));
      });
      const topProducts = Array.from(productUsage.entries())
        .map(([productId, usage]) => ({
          name: products.find(p => p.id === productId)?.name || 'Unknown',
          usage: Math.round(usage * 10) / 10,
        }))
        .sort((a, b) => b.usage - a.usage)
        .slice(0, 5);

      const treatmentsByMonth = new Map<string, number>();
      treatments.forEach(t => {
        const month = t.reg_date?.substring(0, 7) || '';
        const count = treatmentsByMonth.get(month) || 0;
        treatmentsByMonth.set(month, count + 1);
      });
      const treatmentsMonthly = Array.from(treatmentsByMonth.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const vaccinationsByMonth = new Map<string, number>();
      vaccinations.forEach(v => {
        const month = v.vaccination_date?.substring(0, 7) || '';
        const count = vaccinationsByMonth.get(month) || 0;
        vaccinationsByMonth.set(month, count + 1);
      });
      const vaccinationsMonthly = Array.from(vaccinationsByMonth.entries())
        .map(([month, count]) => ({ month, count }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-6);

      const outcomeCount = new Map<string, number>();
      treatments.forEach(t => {
        if (t.outcome) {
          const count = outcomeCount.get(t.outcome) || 0;
          outcomeCount.set(t.outcome, count + 1);
        }
      });
      const outcomeStats = Array.from(outcomeCount.entries())
        .map(([outcome, count]) => ({ outcome, count }));

      const categoryValue = new Map<string, number>();
      validBatches.forEach(b => {
        const product = products.find(p => p.id === b.product_id);
        if (product) {
          const totalUsed = usageByBatch.get(b.id) || 0;
          const receivedQty = parseFloat(b.received_qty) || 0;
          const onHand = receivedQty - totalUsed;
          if (onHand > 0) {
            const purchasePrice = parseFloat(b.purchase_price) || 0;
            const unitPrice = receivedQty > 0 ? purchasePrice / receivedQty : 0;
            const value = unitPrice * onHand;
            const current = categoryValue.get(product.category) || 0;
            categoryValue.set(product.category, current + value);
          }
        }
      });
      const inventoryByCategory = Array.from(categoryValue.entries())
        .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value);

      setAnalytics({
        totalAnimals,
        activeAnimals,
        totalTreatments,
        totalVaccinations,
        totalProductValue: Math.round(totalProductValue * 100) / 100,
        lowStockProducts,
        expiringSoon,
        animalsInWithdrawal,
        topDiseases,
        topProducts,
        treatmentsByMonth: treatmentsMonthly,
        vaccinationsByMonth: vaccinationsMonthly,
        outcomeStats,
        inventoryByCategory,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = async () => {
    setLoading(true);
    try {
      let result: any[] = [];

      switch (reportType) {
        case 'drug_journal': {
          if (!selectedFarm) return;
          
          let query = supabase.from('vw_vet_drug_journal').select('*').eq('farm_id', selectedFarm.id);
          if (dateFrom) query = query.gte('receipt_date', dateFrom);
          if (dateTo) query = query.lte('receipt_date', dateTo);
          if (filterProduct) query = query.eq('product_id', filterProduct);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];

          if (filterBatch) {
            result = result.filter(r => r.batch_number?.toLowerCase().includes(filterBatch.toLowerCase()));
          }
          if (filterInvoice) {
            result = result.filter(r => r.invoice_number?.toLowerCase().includes(filterInvoice.toLowerCase()));
          }
          break;
        }

        case 'treated_animals': {
          if (!selectedFarm) return;
          
          // Build filters array for fetchAllRows
          const filters: { column: string; value: any; operator?: string }[] = [
            { column: 'farm_id', value: selectedFarm.id }
          ];

          if (dateFrom) filters.push({ column: 'registration_date', value: dateFrom, operator: 'gte' });
          if (dateTo) filters.push({ column: 'registration_date', value: dateTo, operator: 'lte' });
          if (filterAnimal) filters.push({ column: 'animal_id', value: filterAnimal });
          if (filterDisease) filters.push({ column: 'disease_id', value: filterDisease });

          // Use fetchAllRows to handle pagination automatically
          result = await fetchAllRows('vw_treated_animals_detailed', '*', 'registration_date', filters);

          // Apply additional filters that can't be done in the query
          if (filterProduct) {
            result = result.filter(r => {
              const product = products.find(p => p.id === filterProduct);
              return product && r.medications_used?.toLowerCase().includes(product.name.toLowerCase());
            });
          }
          if (filterVet) {
            result = result.filter(r => r.veterinarian?.toLowerCase().includes(filterVet.toLowerCase()));
          }
          
          // Sort by registration_date (descending - newest first) and created_at
          result.sort((a, b) => {
            const dateCompare = b.registration_date.localeCompare(a.registration_date); // Reversed for descending
            if (dateCompare !== 0) return dateCompare;
            return b.created_at.localeCompare(a.created_at); // Reversed for descending
          });
          
          break;
        }


        case 'biocide_journal': {
          if (!selectedFarm) return;
          
          let query = supabase.from('vw_biocide_journal').select('*').eq('farm_id', selectedFarm.id);
          if (dateFrom) query = query.gte('use_date', dateFrom);
          if (dateTo) query = query.lte('use_date', dateTo);
          if (filterProduct) query = query.eq('product_id', filterProduct);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];

          if (filterBatch) {
            result = result.filter(r => r.batch_number?.toLowerCase().includes(filterBatch.toLowerCase()));
          }
          break;
        }

        case 'insemination_journal': {
          if (!selectedFarm) return;
          
          let query = supabase
            .from('insemination_records')
            .select(`
              *,
              animal:animals(tag_no, species),
              sperm_product:insemination_products!insemination_records_sperm_product_id_fkey(name, unit),
              glove_product:insemination_products!insemination_records_glove_product_id_fkey(name, unit)
            `)
            .eq('farm_id', selectedFarm.id)
            .order('insemination_date', { ascending: false });

          if (dateFrom) query = query.gte('insemination_date', dateFrom);
          if (dateTo) query = query.lte('insemination_date', dateTo);
          if (filterAnimal) query = query.eq('animal_id', filterAnimal);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];
          break;
        }

        case 'medical_waste': {
          if (!selectedFarm) return;
          
          let query = supabase.from('vw_medical_waste').select('*').eq('farm_id', selectedFarm.id);
          if (dateFrom) query = query.gte('record_date', dateFrom);
          if (dateTo) query = query.lte('record_date', dateTo);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];
          break;
        }

        case 'withdrawal': {
          if (!selectedFarm) return;
          
          let query = supabase.from('vw_withdrawal_report').select('*').eq('farm_id', selectedFarm.id);
          if (dateFrom) query = query.gte('treatment_date', dateFrom);
          if (dateTo) query = query.lte('treatment_date', dateTo);
          if (filterAnimal) query = query.eq('animal_id', filterAnimal);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];
          break;
        }

        case 'treated_animal_registration': {
          if (!selectedFarm) return;
          
          // Use same data source as treated_animals
          const filters: { column: string; value: any; operator?: string }[] = [
            { column: 'farm_id', value: selectedFarm.id }
          ];

          if (dateFrom) filters.push({ column: 'registration_date', value: dateFrom, operator: 'gte' });
          if (dateTo) filters.push({ column: 'registration_date', value: dateTo, operator: 'lte' });
          if (filterAnimal) filters.push({ column: 'animal_id', value: filterAnimal });
          if (filterDisease) filters.push({ column: 'disease_id', value: filterDisease });

          result = await fetchAllRows('vw_treated_animals_detailed', '*', 'registration_date', filters);

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
            const dateCompare = a.registration_date.localeCompare(b.registration_date);
            if (dateCompare !== 0) return dateCompare;
            return a.created_at.localeCompare(b.created_at);
          });
          
          break;
        }

        case 'production_animal_medicine': {
          if (!selectedFarm) return;
          
          // Use same data source as treated_animal_registration but can be filtered by owner
          const filters: { column: string; value: any; operator?: string }[] = [
            { column: 'farm_id', value: selectedFarm.id }
          ];

          if (dateFrom) filters.push({ column: 'registration_date', value: dateFrom, operator: 'gte' });
          if (dateTo) filters.push({ column: 'registration_date', value: dateTo, operator: 'lte' });

          result = await fetchAllRows('vw_treated_animals_detailed', '*', 'registration_date', filters);
          
          // Don't filter by species - show all animals for production medicine journal
          // The user can filter manually if needed
          
          result.sort((a, b) => a.registration_date.localeCompare(b.registration_date));
          break;
        }

        case 'stock_balance': {
          if (!selectedFarm) return;
          
          let query = supabase.from('vw_vet_drug_journal').select('*').eq('farm_id', selectedFarm.id);
          if (filterProduct) query = query.eq('product_id', filterProduct);

          const { data, error } = await query;
          if (error) throw error;

          result = data || [];

          if (filterBatch) {
            result = result.filter(r => r.batch_number?.toLowerCase().includes(filterBatch.toLowerCase()));
          }
          break;
        }

        case 'write_off_act': {
          if (!selectedFarm) return;
          
          let query = supabase.from('vw_vet_drug_journal').select('*').eq('farm_id', selectedFarm.id);
          
          // Don't filter by receipt_date for write-off - we want items that have been used
          if (filterProduct) query = query.eq('product_id', filterProduct);

          const { data, error } = await query;
          if (error) throw error;

          // Filter to only include items with usage > 0
          result = (data || []).filter(r => parseFloat(r.quantity_used || '0') > 0);

          if (filterBatch) {
            result = result.filter(r => r.batch_number?.toLowerCase().includes(filterBatch.toLowerCase()));
          }
          
          console.log('Write-off act results:', result.length, 'items with usage');
          break;
        }

        case 'work_completion_act': {
          if (!selectedFarm) return;
          
          // Use visit_charges table for billing data
          const query = supabase
            .from('visit_charges')
            .select('id, created_at, description, total_price')
            .eq('farm_id', selectedFarm.id);
          
          if (dateFrom) query.gte('created_at', dateFrom);
          if (dateTo) query.lte('created_at', dateTo);

          const { data, error } = await query;
          if (error) {
            console.error('Work completion act query error:', error);
            throw error;
          }

          // Map the data to expected format
          result = (data || []).map(row => ({
            date: row.created_at,
            work_name: row.description || 'Veterinarinė paslauga',
            document_no: row.id,
            income: row.total_price || 0
          }));
          
          console.log('Work completion act data:', result);
          break;
        }

        default:
          return;
      }

      setData(result);
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    // For treated_animals, reset to current month instead of clearing
    if (reportType === 'treated_animals') {
      const currentMonth = getCurrentMonthDates();
      setDateFrom(currentMonth.from);
      setDateTo(currentMonth.to);
    } else {
      setDateFrom('');
      setDateTo('');
    }
    setFilterAnimal('');
    setFilterProduct('');
    setFilterDisease('');
    setFilterInvoice('');
    setFilterBatch('');
    setFilterVet('');
  };

  const handleExport = () => {
    if (data.length === 0) {
      alert('Nėra duomenų eksportavimui');
      return;
    }

    const columns = getColumnsForReportType(reportType);
    const title = getReportTitle(reportType);
    exportReportToExcel(data, reportType, columns, title);
  };

  const handlePrint = () => {
    window.print();
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (dateFrom) count++;
    if (dateTo) count++;
    if (filterAnimal) count++;
    if (filterProduct) count++;
    if (filterDisease) count++;
    if (filterInvoice) count++;
    if (filterBatch) count++;
    if (filterVet) count++;
    return count;
  };

  const renderAnalytics = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!analytics) return null;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Gyvūnai</p>
                <span className="text-3xl font-bold text-gray-900">{analytics.totalAnimals}</span>
                <p className="text-xs text-gray-500 mt-1">Aktyvūs: {analytics.activeAnimals}</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Gydymai</p>
                <span className="text-3xl font-bold text-gray-900">{analytics.totalTreatments}</span>
                <p className="text-xs text-gray-500 mt-1">Per 6 mėn.</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Syringe className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Atsargų vertė</p>
                <span className="text-3xl font-bold text-gray-900">€{analytics.totalProductValue.toLocaleString()}</span>
                <p className="text-xs text-gray-500 mt-1">Bendrai</p>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg">
                <Package className="w-8 h-8 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 font-medium">Įspėjimai</p>
                <span className="text-3xl font-bold text-gray-900">{analytics.lowStockProducts + analytics.expiringSoon}</span>
                <p className="text-xs text-gray-500 mt-1">Reikia dėmesio</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Dažniausios ligos</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.topDiseases.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topDiseases.map((disease, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{disease.name}</span>
                      </div>
                      <span className="text-lg font-bold text-blue-600">{disease.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold text-gray-900">Populiariausi produktai</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.topProducts.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.topProducts.map((product, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <span className="text-sm font-medium text-gray-700">{product.name}</span>
                      </div>
                      <span className="text-lg font-bold text-purple-600">{product.usage}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Gydymai per mėnesį</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.treatmentsByMonth.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-2">
                  {analytics.treatmentsByMonth.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-20">{item.month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-blue-500 h-8 rounded-full transition-all flex items-center justify-end pr-3"
                          style={{ width: `${(item.count / Math.max(...analytics.treatmentsByMonth.map(t => t.count))) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Syringe className="w-5 h-5 text-cyan-600" />
                <h3 className="text-lg font-semibold text-gray-900">Vakcinacijos per mėnesį</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.vaccinationsByMonth.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-2">
                  {analytics.vaccinationsByMonth.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-600 w-20">{item.month}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                        <div
                          className="bg-cyan-500 h-8 rounded-full transition-all flex items-center justify-end pr-3"
                          style={{ width: `${(item.count / Math.max(...analytics.vaccinationsByMonth.map(v => v.count))) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">{item.count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-semibold text-gray-900">Gydymo rezultatai</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.outcomeStats.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.outcomeStats.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className={`text-sm font-semibold capitalize ${
                        stat.outcome === 'recovered' ? 'text-green-600' :
                        stat.outcome === 'ongoing' ? 'text-amber-600' :
                        stat.outcome === 'died' ? 'text-red-600' : 'text-gray-700'
                      }`}>
                        {stat.outcome === 'recovered' ? '✓ Pasveiko' :
                         stat.outcome === 'ongoing' ? '⟳ Tęsiasi' :
                         stat.outcome === 'died' ? '✕ Žuvo' : stat.outcome}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">{stat.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-gray-900">Atsargos pagal kategoriją</h3>
              </div>
            </div>
            <div className="p-6">
              {analytics.inventoryByCategory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nėra duomenų</p>
              ) : (
                <div className="space-y-3">
                  {analytics.inventoryByCategory.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <span className="text-sm font-semibold text-gray-700 capitalize">
                        {cat.category}
                      </span>
                      <span className="text-xl font-bold text-orange-600">€{cat.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (data.length === 0) {
      return (
        <div className="text-center py-16">
          <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-500">Nėra duomenų šiai ataskaitai</p>
          <p className="text-sm text-gray-400 mt-2">Pabandykite pakeisti filtrus arba datos intervalą</p>
        </div>
      );
    }

    switch (reportType) {
      case 'treated_animals':
        return <TreatedAnimalsReport data={data} />;
      case 'medical_waste':
        return <MedicalWasteReport data={data} />;
      case 'drug_journal':
        return <DrugJournalReport data={data} />;
      case 'withdrawal':
        return <WithdrawalReport data={data} onDataChange={loadReport} />;
      case 'biocide_journal':
        return <BiocideJournalReport data={data} />;
      case 'insemination_journal':
        return <InseminationJournalReport data={data} />;
      case 'treated_animal_registration':
        return <TreatedAnimalRegistrationReport 
          data={data} 
          periodStart={dateFrom} 
          periodEnd={dateTo}
          veterinaryProviderName={selectedFarm?.name || ''}
          responsibleVetName={user?.full_name || ''}
        />;
      case 'production_animal_medicine':
        return <ProductionAnimalMedicineUsageReport 
          data={data}
          animalOwnerName={selectedFarm?.contact_person || selectedFarm?.name || ''}
          veterinaryProviderName={selectedFarm?.name || ''}
        />;
      case 'stock_balance':
        return <MedicineBiocideStockBalanceReport 
          data={data}
          veterinaryProviderName={selectedFarm?.name || ''}
          responsibleVetName={user?.full_name || ''}
        />;
      case 'write_off_act':
        return <MedicineBiocideWriteOffActReport 
          data={data}
          periodStart={dateFrom}
          periodEnd={dateTo}
          place={selectedFarm?.address || ''}
          veterinaryProviderName={selectedFarm?.name || ''}
          responsibleVetName={user?.full_name || ''}
        />;
      case 'work_completion_act':
        return <VeterinaryWorkCompletionActReport
          data={data}
          farmOwnerName={selectedFarm?.contact_person || selectedFarm?.name || ''}
          farmOwnerAddress={selectedFarm?.address || ''}
          documentDate={dateTo || new Date().toISOString().split('T')[0]}
          veterinaryProviderName={selectedFarm?.name || ''}
          performedByName={user?.full_name || ''}
        />;
      default:
        return null;
    }
  };

  const reportTypeInfo = {
    analytics: { name: 'Analitika', icon: PieChart, color: 'blue' },
    invoices: { name: 'Sąskaitų Priskirimas', icon: FileText, color: 'indigo' },
    drug_journal: { name: 'Veterinarinių vaistų žurnalas', icon: Syringe, color: 'emerald' },
    treated_animals: { name: 'Gydomų gyvūnų registras', icon: Activity, color: 'teal' },
    withdrawal: { name: 'Išlaukų ataskaita', icon: AlertTriangle, color: 'red' },
    biocide_journal: { name: 'Biocidų žurnalas', icon: Package, color: 'purple' },
    insemination_journal: { name: 'Sėklinimo žurnalas', icon: Heart, color: 'rose' },
    medical_waste: { name: 'Medicininių atliekų žurnalas', icon: AlertTriangle, color: 'orange' },
    treated_animal_registration: { name: 'GYDOMŲ GYVŪNŲ REGISTRACIJOS ŽURNALAS', icon: FileText, color: 'blue' },
    production_animal_medicine: { name: 'Produkcijos gyvūnų vaistų žurnalas', icon: Syringe, color: 'green' },
    stock_balance: { name: 'Vaistų, biocidų likutis', icon: Package, color: 'amber' },
    write_off_act: { name: 'Vaistų nurašymo aktas', icon: FileText, color: 'red' },
    work_completion_act: { name: 'Veterinarinių darbų atlikimo aktas', icon: FileText, color: 'indigo' },
  };

  const currentReport = reportTypeInfo[reportType];
  const CurrentIcon = currentReport.icon;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`bg-${currentReport.color}-50 p-3 rounded-xl shadow-sm`}>
              <CurrentIcon className={`w-7 h-7 text-${currentReport.color}-600`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ataskaitos ir analitika</h2>
              <p className="text-sm text-gray-600">Peržiūrėkite duomenis ir generuokite ataskaitas</p>
            </div>
          </div>

          {reportType !== 'analytics' && data.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                <Printer className="w-4 h-4" />
                Spausdinti
              </button>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Eksportuoti
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {Object.entries(reportTypeInfo).map(([key, info]) => {
            const Icon = info.icon;
            const isActive = reportType === key;
            return (
              <button
                key={key}
                onClick={() => {
                  setReportType(key as ReportType);
                  // For treated_animals, set current month dates and clear other filters
                  if (key === 'treated_animals') {
                    const currentMonth = getCurrentMonthDates();
                    setDateFrom(currentMonth.from);
                    setDateTo(currentMonth.to);
                    setFilterAnimal('');
                    setFilterProduct('');
                    setFilterDisease('');
                    setFilterVet('');
                  } else {
                    clearFilters();
                  }
                }}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  isActive
                    ? `border-${info.color}-500 bg-${info.color}-50 shadow-md`
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className={`p-2 rounded-lg ${isActive ? `bg-${info.color}-100` : 'bg-gray-100'}`}>
                  <Icon className={`w-5 h-5 ${isActive ? `text-${info.color}-600` : 'text-gray-600'}`} />
                </div>
                <span className={`text-sm font-semibold ${isActive ? `text-${info.color}-900` : 'text-gray-700'}`}>
                  {info.name}
                </span>
              </button>
            );
          })}
        </div>

        {reportType !== 'analytics' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-600" />
                <h3 className="text-base font-bold text-gray-900">Filtrai</h3>
                {getActiveFilterCount() > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">
                    {getActiveFilterCount()}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                {showFilters ? 'Slėpti' : 'Rodyti'}
              </button>
            </div>

            {showFilters && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Data nuo</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Data iki</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {(reportType === 'treated_animals' || reportType === 'insemination_journal') && (
                    <SearchableSelect
                      label="Gyvūnas"
                      placeholder="Pasirinkite gyvūną"
                      emptyLabel="Visi gyvūnai"
                      value={filterAnimal}
                      onChange={setFilterAnimal}
                      options={animals.map(animal => ({
                        value: animal.id,
                        label: `${animal.tag_no} - ${animal.species}`
                      }))}
                    />
                  )}

                  {(reportType === 'treated_animals' || reportType === 'drug_journal' || reportType === 'biocide_journal') && (
                    <SearchableSelect
                      label="Produktas"
                      placeholder="Pasirinkite produktą"
                      emptyLabel="Visi produktai"
                      value={filterProduct}
                      onChange={setFilterProduct}
                      options={products.map(product => ({
                        value: product.id,
                        label: product.name
                      }))}
                    />
                  )}

                  {reportType === 'treated_animals' && (
                    <SearchableSelect
                      label="Liga"
                      placeholder="Pasirinkite ligą"
                      emptyLabel="Visos ligos"
                      value={filterDisease}
                      onChange={setFilterDisease}
                      options={diseases.map(disease => ({
                        value: disease.id,
                        label: disease.name
                      }))}
                    />
                  )}

                  {(reportType === 'drug_journal' || reportType === 'biocide_journal') && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Serijos nr.</label>
                      <input
                        type="text"
                        value={filterBatch}
                        onChange={(e) => setFilterBatch(e.target.value)}
                        placeholder="Įveskite serijos numerį"
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}

                  {reportType === 'drug_journal' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Sąskaitos nr.</label>
                      <input
                        type="text"
                        value={filterInvoice}
                        onChange={(e) => setFilterInvoice(e.target.value)}
                        placeholder="Įveskite sąskaitos numerį"
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}

                  {reportType === 'treated_animals' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">Veterinaras</label>
                      <input
                        type="text"
                        value={filterVet}
                        onChange={(e) => setFilterVet(e.target.value)}
                        placeholder="Veterinaro vardas"
                        className="w-full px-3 py-2.5 text-sm border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={loadReport}
                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white text-sm rounded-lg font-semibold hover:bg-blue-700 transition-all shadow-sm hover:shadow-md"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Generuoti ataskaitą
                  </button>
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gray-200 text-gray-700 text-sm rounded-lg font-semibold hover:bg-gray-300 transition-all"
                  >
                    <X className="w-4 h-4" />
                    Išvalyti
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {reportType === 'analytics' ? renderAnalytics() : reportType === 'invoices' ? <InvoiceViewer /> : renderReport()}
      </div>
    </div>
  );
}
