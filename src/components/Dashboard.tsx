import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useFarm } from '../contexts/FarmContext';
import {
  AlertTriangle,
  Package,
  TrendingDown,
  Clock,
  Syringe,
  Plus,
  Euro,
  Activity,
  PackagePlus,
  ShieldAlert,
  TrendingUp,
  BarChart3,
  Users,
  Droplet,
  Trash2,
  FileText,
  Calendar,
  Stethoscope,
  ArrowUpRight,
  ArrowDownRight,
  Pill
} from 'lucide-react';
import { formatCurrencyLT, formatDateLT, getDaysUntil, formatDateTimeLT, formatNumberLT } from '../lib/formatters';

interface DashboardStats {
  totalProducts: number;
  lowStock: number;
  expiringSoon: number;
  totalValue: number;
  treatmentsToday: number;
  treatmentsThisWeek: number;
  treatmentsThisMonth: number;
  recentReceived: number;
  zeroStock: number;
  expiredBatches: number;
  totalAnimals: number;
  totalSuppliers: number;
  biocidesThisMonth: number;
  wasteThisMonth: number;
  ownerMedsThisMonth: number;
  totalBatches: number;
  avgBatchValue: number;
  vaccinationsToday: number;
  vaccinationsThisWeek: number;
  vaccinationsThisMonth: number;
  visitsToday: number;
  visitsThisWeek: number;
  visitsThisMonth: number;
  upcomingVisits: number;
  animalsInWithdrawal: number;
  activeSynchronizations: number;
  completedSynchronizations: number;
}

interface CategoryStock {
  category: string;
  count: number;
  value: number;
}

interface TopProduct {
  product_id: string;
  product_name: string;
  total_used: number;
  usage_count: number;
}

interface StockAlert {
  type: 'expired' | 'expiring' | 'low' | 'zero';
  product_name: string;
  batch_lot: string | null;
  details: string;
  severity: 'critical' | 'warning' | 'info';
}

interface MonthlyTrend {
  month: string;
  treatments: number;
  received: number;
}

export function Dashboard() {
  const { selectedFarm } = useFarm();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStock: 0,
    expiringSoon: 0,
    totalValue: 0,
    treatmentsToday: 0,
    treatmentsThisWeek: 0,
    treatmentsThisMonth: 0,
    recentReceived: 0,
    zeroStock: 0,
    expiredBatches: 0,
    totalAnimals: 0,
    totalSuppliers: 0,
    biocidesThisMonth: 0,
    wasteThisMonth: 0,
    ownerMedsThisMonth: 0,
    totalBatches: 0,
    avgBatchValue: 0,
    vaccinationsToday: 0,
    vaccinationsThisWeek: 0,
    vaccinationsThisMonth: 0,
    visitsToday: 0,
    visitsThisWeek: 0,
    visitsThisMonth: 0,
    upcomingVisits: 0,
    animalsInWithdrawal: 0,
    activeSynchronizations: 0,
    completedSynchronizations: 0,
  });
  const [expiringBatches, setExpiringBatches] = useState<any[]>([]);
  const [categoryStats, setCategoryStats] = useState<CategoryStock[]>([]);
  const [recentTreatments, setRecentTreatments] = useState<any[]>([]);
  const [recentBatches, setRecentBatches] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [stockAlerts, setStockAlerts] = useState<StockAlert[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [withdrawalAnimals, setWithdrawalAnimals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedFarm) {
      loadDashboardData();
    }
  }, [selectedFarm]);

  const loadDashboardData = async () => {
    try {
      if (!selectedFarm) return;
      
      const now = new Date();

      // Calculate "today" starting at 12:00 GMT+3
      // Get current time in GMT+3
      const nowGMT3 = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Vilnius' }));
      const todayAt12GMT3 = new Date(nowGMT3.getFullYear(), nowGMT3.getMonth(), nowGMT3.getDate(), 12, 0, 0);

      // If current time is before 12:00, use yesterday's 12:00
      if (nowGMT3.getHours() < 12) {
        todayAt12GMT3.setDate(todayAt12GMT3.getDate() - 1);
      }

      // Convert back to UTC for database queries
      const todayStart = new Date(todayAt12GMT3.toLocaleString('en-US', { timeZone: 'UTC' })).toISOString();
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

      const ownerMedsQuery = supabase.from('owner_med_admin').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('first_admin_date', monthStart);

      const [
        stockData,
        batchesData,
        treatmentsToday,
        treatmentsWeek,
        treatmentsMonth,
        recentTreatmentsData,
        recentBatchesData,
        categoryData,
        batchValue,
        animalsCount,
        suppliersCount,
        biocidesCount,
        wasteCount,
        ownerMedsCount,
        allBatches,
        usageData,
        vaccinationsToday,
        vaccinationsWeek,
        vaccinationsMonth,
        visitsToday,
        visitsWeek,
        visitsMonth,
        upcomingVisits,
        withdrawalCount,
        withdrawalData,
        activeSyncs,
        completedSyncs
      ] = await Promise.all([
        supabase.from('stock_by_product').select('*').eq('farm_id', selectedFarm.id),
        supabase.from('stock_by_batch').select(`
          *,
          products!inner(name)
        `).eq('farm_id', selectedFarm.id).gt('on_hand', 0).not('expiry_date', 'is', null),
        supabase.from('treatments').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('reg_date', todayStart),
        supabase.from('treatments').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('reg_date', weekStart),
        supabase.from('treatments').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('reg_date', monthStart),
        supabase.from('treatments').select(`
          id,
          reg_date,
          animals(tag_no, species),
          diseases(name)
        `).eq('farm_id', selectedFarm.id).order('reg_date', { ascending: false }).limit(5),
        supabase.from('batches').select(`
          id,
          created_at,
          received_qty,
          lot,
          products!inner(name)
        `).eq('farm_id', selectedFarm.id).gte('created_at', sevenDaysAgo).order('created_at', { ascending: false }).limit(5),
        supabase.from('stock_by_product').select('category, on_hand').eq('farm_id', selectedFarm.id),
        supabase.from('batches').select('id, purchase_price, received_qty').eq('farm_id', selectedFarm.id),
        supabase.from('animals').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('biocide_usage').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('use_date', monthStart),
        supabase.from('medical_waste').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('created_at', monthStart),
        ownerMedsQuery.then(res => res.error && res.error.code === '404' ? { count: 0 } : res),
        supabase.from('batches').select('id, created_at').eq('farm_id', selectedFarm.id),
        supabase.from('usage_items').select(`
          qty,
          products!inner(id, name)
        `).eq('farm_id', selectedFarm.id).gte('created_at', monthStart),
        supabase.from('vaccinations').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('vaccination_date', todayStart),
        supabase.from('vaccinations').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('vaccination_date', weekStart),
        supabase.from('vaccinations').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('vaccination_date', monthStart),
        supabase.from('animal_visits').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('visit_datetime', todayStart),
        supabase.from('animal_visits').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('visit_datetime', weekStart),
        supabase.from('animal_visits').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('visit_datetime', monthStart),
        supabase.from('animal_visits').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).gte('visit_datetime', now.toISOString()).eq('status', 'scheduled'),
        supabase.from('treatments').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).or(`withdrawal_until_milk.gte.${now.toISOString()},withdrawal_until_meat.gte.${now.toISOString()}`),
        supabase.from('treatments').select(`
          id,
          withdrawal_until_milk,
          withdrawal_until_meat,
          reg_date,
          animals!inner(id, tag_no, species)
        `).eq('farm_id', selectedFarm.id).or(`withdrawal_until_milk.gte.${now.toISOString()},withdrawal_until_meat.gte.${now.toISOString()}`).order('withdrawal_until_milk', { ascending: true, nullsFirst: false }),
        supabase.from('animal_synchronizations').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).eq('status', 'Active'),
        supabase.from('animal_synchronizations').select('id', { count: 'exact', head: true }).eq('farm_id', selectedFarm.id).eq('status', 'Completed')
      ]);

      const totalProducts = stockData.data?.length || 0;
      const lowStock = stockData.data?.filter(p => p.on_hand > 0 && p.on_hand < 10).length || 0;
      const zeroStock = stockData.data?.filter(p => p.on_hand === 0).length || 0;

      const batches = batchesData.data || [];
      const expiringSoon = batches.filter(b => {
        const expiryDate = b.batches?.expiry_date ? new Date(b.batches.expiry_date) : null;
        return expiryDate && expiryDate <= new Date(thirtyDaysFromNow);
      }).length;

      const expiredBatches = batches.filter(b => {
        const daysUntil = getDaysUntil(b.batches?.expiry_date);
        return daysUntil !== null && daysUntil < 0;
      }).length;

      const expiringList = batches
        .filter(b => {
          const expiryDate = b.batches?.expiry_date ? new Date(b.batches.expiry_date) : null;
          return expiryDate && expiryDate <= new Date(thirtyDaysFromNow);
        })
        .sort((a, b) => {
          const dateA = a.batches?.expiry_date ? new Date(a.batches.expiry_date).getTime() : 0;
          const dateB = b.batches?.expiry_date ? new Date(b.batches.expiry_date).getTime() : 0;
          return dateA - dateB;
        })
        .slice(0, 10);

      // Calculate total value using qty_left from batches
      // Fetch batches with qty_left
      const { data: batchesWithStock } = await supabase
        .from('batches')
        .select('id, qty_left, received_qty, purchase_price')
        .eq('farm_id', selectedFarm.id);

      let totalValue = 0;
      if (batchesWithStock) {
        for (const batch of batchesWithStock) {
          const onHand = batch.qty_left || 0;
          const unitPrice = batch.received_qty > 0 ? (batch.purchase_price || 0) / batch.received_qty : 0;
          const batchValue = unitPrice * onHand;
          totalValue += batchValue;
        }
      }

      const totalBatches = allBatches.data?.length || 0;
      const avgBatchValue = totalBatches > 0 ? totalValue / totalBatches : 0;

      const categoryMap = new Map<string, { count: number; value: number }>();
      categoryData.data?.forEach(item => {
        const existing = categoryMap.get(item.category) || { count: 0, value: 0 };
        categoryMap.set(item.category, {
          count: existing.count + (item.on_hand > 0 ? 1 : 0),
          value: existing.value + item.on_hand
        });
      });

      const categoryStatsArray: CategoryStock[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        count: data.count,
        value: data.value
      }));

      const productUsageMap = new Map<string, { name: string; total: number; count: number }>();
      usageData.data?.forEach(item => {
        const productId = item.products?.id;
        const productName = item.products?.name;
        if (productId && productName) {
          const existing = productUsageMap.get(productId) || { name: productName, total: 0, count: 0 };
          productUsageMap.set(productId, {
            name: productName,
            total: existing.total + (item.qty || 0),
            count: existing.count + 1
          });
        }
      });

      const topProductsList: TopProduct[] = Array.from(productUsageMap.entries())
        .map(([id, data]) => ({
          product_id: id,
          product_name: data.name,
          total_used: data.total,
          usage_count: data.count
        }))
        .sort((a, b) => b.total_used - a.total_used)
        .slice(0, 5);

      const alerts: StockAlert[] = [];

      batches.forEach(batch => {
        const daysUntil = getDaysUntil(batch.batches?.expiry_date);
        if (daysUntil !== null && daysUntil < 0) {
          alerts.push({
            type: 'expired',
            product_name: batch.products?.name || 'Unknown',
            batch_lot: batch.lot,
            details: `Pasibaigęs ${Math.abs(daysUntil)} dienų`,
            severity: 'critical'
          });
        } else if (daysUntil !== null && daysUntil <= 7) {
          alerts.push({
            type: 'expiring',
            product_name: batch.products?.name || 'Unknown',
            batch_lot: batch.lot,
            details: `Pasibaigs po ${daysUntil} dienų`,
            severity: 'critical'
          });
        } else if (daysUntil !== null && daysUntil <= 14) {
          alerts.push({
            type: 'expiring',
            product_name: batch.products?.name || 'Unknown',
            batch_lot: batch.lot,
            details: `Pasibaigs po ${daysUntil} dienų`,
            severity: 'warning'
          });
        }
      });

      stockData.data?.forEach(product => {
        if (product.on_hand === 0) {
          alerts.push({
            type: 'zero',
            product_name: product.name,
            batch_lot: null,
            details: 'Atsargų nėra',
            severity: 'warning'
          });
        } else if (product.on_hand < 10) {
          alerts.push({
            type: 'low',
            product_name: product.name,
            batch_lot: null,
            details: `Likutis: ${product.on_hand} vnt.`,
            severity: 'info'
          });
        }
      });

      alerts.sort((a, b) => {
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

      const last6Months: MonthlyTrend[] = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthStart = date.toISOString();
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const [treatmentsRes, batchesRes] = await Promise.all([
          supabase.from('treatments').select('id', { count: 'exact', head: true })
            .gte('reg_date', monthStart).lte('reg_date', monthEnd),
          supabase.from('batches').select('id', { count: 'exact', head: true })
            .gte('created_at', monthStart).lte('created_at', monthEnd)
        ]);

        last6Months.push({
          month: date.toLocaleDateString('lt-LT', { month: 'short' }),
          treatments: treatmentsRes.count || 0,
          received: batchesRes.count || 0
        });
      }

      const recentReceived = recentBatchesData.data?.length || 0;

      // Group withdrawal animals by animal_id to show unique animals
      const withdrawalAnimalsData = withdrawalData.data || [];
      const uniqueWithdrawalAnimals = new Map();
      withdrawalAnimalsData.forEach(treatment => {
        const animalId = treatment.animals?.id;
        if (!animalId) return;

        const existing = uniqueWithdrawalAnimals.get(animalId);
        const milkDate = treatment.withdrawal_until_milk ? new Date(treatment.withdrawal_until_milk) : null;
        const meatDate = treatment.withdrawal_until_meat ? new Date(treatment.withdrawal_until_meat) : null;

        if (!existing ||
            (milkDate && (!existing.withdrawal_until_milk || milkDate > new Date(existing.withdrawal_until_milk))) ||
            (meatDate && (!existing.withdrawal_until_meat || meatDate > new Date(existing.withdrawal_until_meat)))) {
          uniqueWithdrawalAnimals.set(animalId, {
            animal_id: animalId,
            tag_no: treatment.animals?.tag_no,
            species: treatment.animals?.species,
            withdrawal_until_milk: milkDate && milkDate >= now ? treatment.withdrawal_until_milk : (existing?.withdrawal_until_milk || null),
            withdrawal_until_meat: meatDate && meatDate >= now ? treatment.withdrawal_until_meat : (existing?.withdrawal_until_meat || null),
          });
        }
      });

      const withdrawalAnimalsList = Array.from(uniqueWithdrawalAnimals.values())
        .filter(a => a.withdrawal_until_milk || a.withdrawal_until_meat)
        .sort((a, b) => {
          const aDate = new Date(a.withdrawal_until_milk || a.withdrawal_until_meat || 0);
          const bDate = new Date(b.withdrawal_until_milk || b.withdrawal_until_meat || 0);
          return bDate.getTime() - aDate.getTime();
        });

      setStats({
        totalProducts,
        lowStock,
        expiringSoon,
        totalValue,
        treatmentsToday: treatmentsToday.count || 0,
        treatmentsThisWeek: treatmentsWeek.count || 0,
        treatmentsThisMonth: treatmentsMonth.count || 0,
        recentReceived,
        zeroStock,
        expiredBatches,
        totalAnimals: animalsCount.count || 0,
        totalSuppliers: suppliersCount.count || 0,
        biocidesThisMonth: biocidesCount.count || 0,
        wasteThisMonth: wasteCount.count || 0,
        ownerMedsThisMonth: ownerMedsCount.count || 0,
        totalBatches,
        avgBatchValue,
        vaccinationsToday: vaccinationsToday.count || 0,
        vaccinationsThisWeek: vaccinationsWeek.count || 0,
        vaccinationsThisMonth: vaccinationsMonth.count || 0,
        visitsToday: visitsToday.count || 0,
        visitsThisWeek: visitsWeek.count || 0,
        visitsThisMonth: visitsMonth.count || 0,
        upcomingVisits: upcomingVisits.count || 0,
        animalsInWithdrawal: withdrawalCount.count || 0,
        activeSynchronizations: activeSyncs.count || 0,
        completedSynchronizations: completedSyncs.count || 0,
      });
      setExpiringBatches(expiringList);
      setCategoryStats(categoryStatsArray);
      setRecentTreatments(recentTreatmentsData.data || []);
      setRecentBatches(recentBatchesData.data || []);
      setTopProducts(topProductsList);
      setStockAlerts(alerts.slice(0, 10));
      setMonthlyTrends(last6Months);
      setWithdrawalAnimals(withdrawalAnimalsList);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      medicines: 'Vaistai',
      prevention: 'Prevencija',
      reproduction: 'Reprodukcija',
      treatment_materials: 'Gyd. medžiagos',
      hygiene: 'Higiena',
      biocide: 'Biocidai',
      technical: 'Techniniai'
    };
    return labels[category] || category;
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'expired':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'expiring':
        return <Clock className="w-4 h-4 text-orange-600" />;
      case 'low':
        return <TrendingDown className="w-4 h-4 text-yellow-600" />;
      case 'zero':
        return <Package className="w-4 h-4 text-gray-600" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'warning':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900';
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pagrindinis</h1>
          <p className="text-sm text-gray-600 mt-1">VetStock valdymo sistema · Pilna apžvalga</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
            <Plus className="w-4 h-4" />
            Priimti
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm">
            <Syringe className="w-4 h-4" />
            Gydymas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Iš viso produktų</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalProducts}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.zeroStock} be atsargų</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Mažos atsargos</p>
              <p className="text-3xl font-bold text-orange-600 mt-2">{stats.lowStock}</p>
              <p className="text-xs text-gray-500 mt-1">Reikia užsakyti</p>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg">
              <TrendingDown className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Greitai pasibaigs</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats.expiringSoon}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.expiredBatches} jau pasibaigę</p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Bendra vertė</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrencyLT(stats.totalValue)}</p>
              <p className="text-xs text-gray-500 mt-1">{stats.totalBatches} partijos</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Euro className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalAnimals}</p>
          <p className="text-sm text-gray-600 mt-1">Gyvūnų registre</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Users className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-blue-600">{stats.totalSuppliers}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers}</p>
          <p className="text-sm text-gray-600 mt-1">Tiekėjai</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Droplet className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-purple-600">{stats.biocidesThisMonth}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.biocidesThisMonth}</p>
          <p className="text-sm text-gray-600 mt-1">Biocidai šį mėn.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <Trash2 className="w-5 h-5 text-gray-600" />
            <span className="text-xs font-medium text-red-600">{stats.wasteThisMonth}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.wasteThisMonth}</p>
          <p className="text-sm text-gray-600 mt-1">Atliekos šį mėn.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Syringe className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Gydymai</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šiandien</span>
              <span className="text-2xl font-bold text-blue-600">{stats.treatmentsToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šią savaitę</span>
              <span className="text-lg font-semibold text-gray-700">{stats.treatmentsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šį mėnesį</span>
              <span className="text-lg font-semibold text-gray-700">{stats.treatmentsThisMonth}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-xl shadow-sm p-6 border border-cyan-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-cyan-600 p-2 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Vakcinacijos</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šiandien</span>
              <span className="text-2xl font-bold text-cyan-600">{stats.vaccinationsToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šią savaitę</span>
              <span className="text-lg font-semibold text-gray-700">{stats.vaccinationsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šį mėnesį</span>
              <span className="text-lg font-semibold text-gray-700">{stats.vaccinationsThisMonth}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-sm p-6 border border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-600 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Vizitai</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šiandien</span>
              <span className="text-2xl font-bold text-amber-600">{stats.visitsToday}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Šią savaitę</span>
              <span className="text-lg font-semibold text-gray-700">{stats.visitsThisWeek}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Suplanuota</span>
              <span className="text-lg font-semibold text-gray-700">{stats.upcomingVisits}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl shadow-sm p-6 border border-violet-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-violet-600 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Sinchronizacijos</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Aktyvios</span>
              <span className="text-2xl font-bold text-violet-600">{stats.activeSynchronizations}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Užbaigtos</span>
              <span className="text-lg font-semibold text-gray-700">{stats.completedSynchronizations}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-gray-900">Gyvūnai karencijoje</h3>
              <span className="ml-auto text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full">
                {withdrawalAnimals.length}
              </span>
            </div>
          </div>
          <div className="p-6 max-h-80 overflow-y-auto">
            {withdrawalAnimals.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Nėra gyvūnų karencijoje</p>
                <p className="text-xs text-gray-400 mt-1">Galima šalinti pieną ir mėsą</p>
              </div>
            ) : (
              <div className="space-y-3">
                {withdrawalAnimals.map((animal) => (
                  <div
                    key={animal.animal_id}
                    className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {animal.species} #{animal.tag_no}
                      </p>
                      <div className="mt-1 space-y-1">
                        {animal.withdrawal_until_milk && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-blue-700 font-medium">🥛 Pienas:</span>
                            <span className="text-gray-700">{formatDateLT(animal.withdrawal_until_milk)}</span>
                            <span className="text-gray-500">
                              ({getDaysUntil(animal.withdrawal_until_milk)} d.)
                            </span>
                          </div>
                        )}
                        {animal.withdrawal_until_meat && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-red-700 font-medium">🥩 Mėsa:</span>
                            <span className="text-gray-700">{formatDateLT(animal.withdrawal_until_meat)}</span>
                            <span className="text-gray-500">
                              ({getDaysUntil(animal.withdrawal_until_meat)} d.)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <PackagePlus className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Priėmimas</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Per 7 dienas</span>
              <span className="text-2xl font-bold text-blue-600">{stats.recentReceived}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Vid. partijos vertė</span>
              <span className="text-lg font-semibold text-gray-700">{formatCurrencyLT(stats.avgBatchValue)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-sm p-6 border border-indigo-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Kategorijos</h3>
          </div>
          <div className="space-y-2">
            {categoryStats.slice(0, 3).map((cat) => (
              <div key={cat.category} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{getCategoryLabel(cat.category)}</span>
                <span className="font-semibold text-indigo-600">{cat.count}</span>
              </div>
            ))}
            {categoryStats.length > 3 && (
              <p className="text-xs text-gray-600 mt-2">+{categoryStats.length - 3} daugiau</p>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-sm p-6 border border-rose-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-rose-600 p-2 rounded-lg">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900">Šio mėnesio</h3>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Gydymai</span>
              <span className="font-semibold text-rose-600">{stats.treatmentsThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Vakcinacijos</span>
              <span className="font-semibold text-rose-600">{stats.vaccinationsThisMonth}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700">Vizitai</span>
              <span className="font-semibold text-rose-600">{stats.visitsThisMonth}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Veiklos statistika (6 mėnesiai)</h3>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {monthlyTrends.map((trend, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700 w-16">{trend.month}</span>
                    <div className="flex-1 flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Syringe className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-gray-600">Gydymai: {trend.treatments}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((trend.treatments / Math.max(...monthlyTrends.map(t => t.treatments), 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <PackagePlus className="w-3 h-3 text-blue-600" />
                          <span className="text-xs text-gray-600">Priėmimas: {trend.received}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min((trend.received / Math.max(...monthlyTrends.map(t => t.received), 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Pill className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Top produktai</h3>
            </div>
          </div>
          <div className="p-6">
            {topProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-8 text-sm">Nėra duomenų</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div key={product.product_id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">#{idx + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{product.product_name}</p>
                      <p className="text-xs text-gray-600">
                        {formatNumberLT(product.total_used)} vnt. · {product.usage_count}× panaudota
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Atsargų įspėjimai</h3>
              <span className="ml-auto text-xs font-medium px-2 py-1 bg-red-100 text-red-700 rounded-full">
                {stockAlerts.length}
              </span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {stockAlerts.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Nėra įspėjimų</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stockAlerts.map((alert, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.product_name}</p>
                      {alert.batch_lot && (
                        <p className="text-xs opacity-75">LOT: {alert.batch_lot}</p>
                      )}
                      <p className="text-xs opacity-75 mt-0.5">{alert.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Greitai pasibaigiantys</h3>
              <span className="ml-auto text-sm text-gray-500">30 dienų</span>
            </div>
          </div>
          <div className="p-6 max-h-96 overflow-y-auto">
            {expiringBatches.length === 0 ? (
              <div className="text-center py-8">
                <ShieldAlert className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Visi produktai galioja</p>
              </div>
            ) : (
              <div className="space-y-3">
                {expiringBatches.map((batch) => {
                  const daysUntilExpiry = getDaysUntil(batch.batches?.expiry_date);
                  const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

                  return (
                    <div
                      key={batch.batch_id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isExpired
                          ? 'bg-red-50 border-red-200'
                          : daysUntilExpiry !== null && daysUntilExpiry <= 7
                          ? 'bg-orange-50 border-orange-200'
                          : 'bg-yellow-50 border-yellow-200'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{batch.products?.name}</p>
                        <p className="text-sm text-gray-600">LOT: {batch.lot || 'N/A'}</p>
                        <p className="text-xs text-gray-500">Galioja: {formatDateLT(batch.batches?.expiry_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{batch.on_hand} vnt.</p>
                        {daysUntilExpiry !== null && (
                          <p className={`text-xs font-semibold ${
                            isExpired ? 'text-red-600' : daysUntilExpiry <= 7 ? 'text-orange-600' : 'text-yellow-600'
                          }`}>
                            {isExpired ? 'PASIBAIGĘS' : `Po ${daysUntilExpiry} d.`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Paskutiniai gydymai</h3>
            </div>
          </div>
          <div className="p-6">
            {recentTreatments.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nėra įrašų</p>
            ) : (
              <div className="space-y-3">
                {recentTreatments.map((treatment) => (
                  <div key={treatment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Syringe className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {treatment.animals?.species || 'Gyvūnas'} #{treatment.animals?.tag_no || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-600">{treatment.diseases?.name || 'Liga nenurodyta'}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateLT(treatment.reg_date)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Naujos partijos</h3>
              <span className="ml-auto text-sm text-gray-500">7 dienos</span>
            </div>
          </div>
          <div className="p-6">
            {recentBatches.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nėra naujų partijų</p>
            ) : (
              <div className="space-y-3">
                {recentBatches.map((batch) => (
                  <div key={batch.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <PackagePlus className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{batch.products?.name}</p>
                      <p className="text-xs text-gray-600">LOT: {batch.lot || 'N/A'} · {batch.received_qty} vnt.</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDateTimeLT(batch.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
