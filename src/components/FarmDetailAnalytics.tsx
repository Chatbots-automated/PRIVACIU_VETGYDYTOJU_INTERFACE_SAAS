import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowLeft, 
  Activity, 
  Syringe, 
  Calendar, 
  Package, 
  Euro, 
  TrendingUp,
  Users,
  FileText,
  AlertCircle,
  Download,
  Pill,
  Shield,
  Stethoscope,
  Warehouse,
  BarChart3
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface FarmDetailProps {
  farmId: string;
  farmName: string;
  farmCode: string;
  onBack: () => void;
}

interface FarmSummary {
  total_animals: number;
  active_animals: number;
  total_treatments: number;
  total_vaccinations: number;
  total_visits: number;
  total_cost: number;
  unique_products_used: number;
  unique_diseases_treated: number;
}

interface TreatmentSummary {
  id: string;
  reg_date: string;
  animal_tag: string;
  disease_name: string;
  outcome: string;
  vet_name: string;
  total_cost: number;
  medication_count: number;
}

interface VaccinationSummary {
  id: string;
  vaccination_date: string;
  animal_tag: string;
  product_name: string;
  dose_amount: number;
  unit: string;
  administered_by: string;
}

interface VisitSummary {
  id: string;
  visit_datetime: string;
  animal_tag: string;
  status: string;
  temperature: number;
  procedures: string[];
  vet_name: string;
}

interface ProductUsageSummary {
  product_id: string;
  product_name: string;
  category: string;
  times_used: number;
  total_quantity: number;
  unit: string;
  total_cost: number;
}

interface AnimalSummary {
  id: string;
  tag_no: string;
  species: string;
  sex: string;
  treatment_count: number;
  vaccination_count: number;
  visit_count: number;
  total_cost: number;
  last_activity: string;
}

interface AllocatedStockSummary {
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  total_allocated_qty: number;
  total_used_qty: number;
  qty_remaining: number;
  allocation_count: number;
  usage_count: number;
  last_allocation_date: string;
}

interface DiseaseStatistic {
  disease_id: string;
  disease_name: string;
  disease_code: string;
  total_cases: number;
  animals_affected: number;
  recovered_cases: number;
  ongoing_cases: number;
  deceased_cases: number;
  recovery_rate_percent: number;
  total_treatment_cost: number;
}

interface VeterinarianActivity {
  vet_name: string;
  treatment_count: number;
  vaccination_count: number;
  visit_count: number;
  total_activities: number;
  animals_treated: number;
}

export function FarmDetailAnalytics({ farmId, farmName, farmCode, onBack }: FarmDetailProps) {
  const [summary, setSummary] = useState<FarmSummary | null>(null);
  const [treatments, setTreatments] = useState<TreatmentSummary[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationSummary[]>([]);
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [productUsage, setProductUsage] = useState<ProductUsageSummary[]>([]);
  const [animals, setAnimals] = useState<AnimalSummary[]>([]);
  const [allocatedStock, setAllocatedStock] = useState<AllocatedStockSummary[]>([]);
  const [diseases, setDiseases] = useState<DiseaseStatistic[]>([]);
  const [vets, setVets] = useState<VeterinarianActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'treatments' | 'vaccinations' | 'visits' | 'products' | 'animals' | 'stock' | 'diseases' | 'vets'>('overview');

  useEffect(() => {
    loadFarmData();
  }, [farmId]);

  const loadFarmData = async () => {
    try {
      setLoading(true);

      // Load summary from the new view
      const { data: summaryData } = await supabase
        .from('vw_farm_summary_analytics')
        .select('*')
        .eq('farm_id', farmId)
        .single();

      if (summaryData) {
        setSummary({
          total_animals: summaryData.total_animals || 0,
          active_animals: summaryData.active_animals || 0,
          total_treatments: summaryData.total_treatments || 0,
          total_vaccinations: summaryData.total_vaccinations || 0,
          total_visits: summaryData.total_visits || 0,
          total_cost: summaryData.total_cost || 0,
          unique_products_used: summaryData.unique_products_used || 0,
          unique_diseases_treated: summaryData.unique_diseases_treated || 0,
        });
      }

      // Load detailed treatments from view
      const { data: treatmentDetails } = await supabase
        .from('vw_farm_treatment_details')
        .select('*')
        .eq('farm_id', farmId)
        .order('reg_date', { ascending: false })
        .limit(100);

      const treatmentSummaries = treatmentDetails?.map(t => ({
        id: t.treatment_id,
        reg_date: t.reg_date,
        animal_tag: t.animal_tag || 'N/A',
        disease_name: t.disease_name || 'Nenurodyta',
        outcome: t.outcome || 'Vykdoma',
        vet_name: t.vet_name || 'N/A',
        total_cost: t.total_treatment_cost || 0,
        medication_count: t.medication_count || 0,
      })) || [];

      setTreatments(treatmentSummaries);

      // Load vaccinations from view
      const { data: vaccinationDetails } = await supabase
        .from('vw_farm_vaccination_details')
        .select('*')
        .eq('farm_id', farmId)
        .order('vaccination_date', { ascending: false })
        .limit(100);

      const vaccinationSummaries = vaccinationDetails?.map(v => ({
        id: v.vaccination_id,
        vaccination_date: v.vaccination_date,
        animal_tag: v.animal_tag || 'N/A',
        product_name: v.product_name || 'N/A',
        dose_amount: v.dose_amount,
        unit: v.unit,
        administered_by: v.administered_by || 'N/A',
      })) || [];

      setVaccinations(vaccinationSummaries);

      // Load visits from view
      const { data: visitDetails } = await supabase
        .from('vw_farm_visit_details')
        .select('*')
        .eq('farm_id', farmId)
        .order('visit_datetime', { ascending: false })
        .limit(100);

      const visitSummaries = visitDetails?.map(v => ({
        id: v.visit_id,
        visit_datetime: v.visit_datetime,
        animal_tag: v.animal_tag || 'N/A',
        status: v.status,
        temperature: v.temperature,
        procedures: v.procedures || [],
        vet_name: v.vet_name || 'N/A',
      })) || [];

      setVisits(visitSummaries);

      // Load product usage summary from view
      const { data: productUsageDetails } = await supabase
        .from('vw_farm_product_usage_summary')
        .select('*')
        .eq('farm_id', farmId)
        .order('times_used', { ascending: false });

      const productUsageSummaries = productUsageDetails?.map(p => ({
        product_id: p.product_id,
        product_name: p.product_name,
        category: p.category,
        times_used: p.times_used || 0,
        total_quantity: p.total_quantity || 0,
        unit: p.unit || '',
        total_cost: p.total_cost || 0,
      })) || [];

      setProductUsage(productUsageSummaries);

      // Load animal summaries from view
      const { data: animalDetails } = await supabase
        .from('vw_farm_animal_activity')
        .select('*')
        .eq('farm_id', farmId)
        .eq('active', true)
        .order('last_activity', { ascending: false, nullsFirst: false });

      const animalSummaries = animalDetails?.map(animal => ({
        id: animal.animal_id,
        tag_no: animal.tag_no || 'N/A',
        species: animal.species || 'bovine',
        sex: animal.sex || 'N/A',
        treatment_count: animal.treatment_count || 0,
        vaccination_count: animal.vaccination_count || 0,
        visit_count: animal.visit_count || 0,
        total_cost: animal.total_cost || 0,
        last_activity: animal.last_activity || '',
      })) || [];

      setAnimals(animalSummaries);

      // Load allocated stock summary
      const { data: allocatedStockDetails } = await supabase
        .from('vw_farm_allocated_stock_summary')
        .select('*')
        .eq('farm_id', farmId)
        .order('total_used_qty', { ascending: false });

      const allocatedStockSummaries = allocatedStockDetails?.map(stock => ({
        product_id: stock.product_id,
        product_name: stock.product_name,
        category: stock.category,
        unit: stock.unit,
        total_allocated_qty: stock.total_allocated_qty || 0,
        total_used_qty: stock.total_used_qty || 0,
        qty_remaining: stock.qty_remaining || 0,
        allocation_count: stock.allocation_count || 0,
        usage_count: stock.usage_count || 0,
        last_allocation_date: stock.last_allocation_date,
      })) || [];

      setAllocatedStock(allocatedStockSummaries);

      // Load disease statistics
      const { data: diseaseStats } = await supabase
        .from('vw_farm_disease_statistics')
        .select('*')
        .eq('farm_id', farmId)
        .order('total_cases', { ascending: false });

      const diseaseStatistics = diseaseStats?.map(d => ({
        disease_id: d.disease_id,
        disease_name: d.disease_name,
        disease_code: d.disease_code || '',
        total_cases: d.total_cases || 0,
        animals_affected: d.animals_affected || 0,
        recovered_cases: d.recovered_cases || 0,
        ongoing_cases: d.ongoing_cases || 0,
        deceased_cases: d.deceased_cases || 0,
        recovery_rate_percent: d.recovery_rate_percent || 0,
        total_treatment_cost: d.total_treatment_cost || 0,
      })) || [];

      setDiseases(diseaseStatistics);

      // Load veterinarian activity
      const { data: vetActivity } = await supabase
        .from('vw_farm_veterinarian_activity')
        .select('*')
        .eq('farm_id', farmId)
        .order('total_activities', { ascending: false });

      const vetActivities = vetActivity?.map(vet => ({
        vet_name: vet.vet_name,
        treatment_count: vet.treatment_count || 0,
        vaccination_count: vet.vaccination_count || 0,
        visit_count: vet.visit_count || 0,
        total_activities: vet.total_activities || 0,
        animals_treated: vet.animals_treated || 0,
      })) || [];

      setVets(vetActivities);

    } catch (error) {
      console.error('Error loading farm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    if (activeTab === 'overview' && summary) {
      const exportData = [{
        'Ūkis': farmName,
        'Kodas': farmCode,
        'Gyvūnų (aktyvių)': `${summary.active_animals} / ${summary.total_animals}`,
        'Gydymų': summary.total_treatments,
        'Vakcinacijų': summary.total_vaccinations,
        'Vizitų': summary.total_visits,
        'Unikalių produktų': summary.unique_products_used,
        'Ligų': summary.unique_diseases_treated,
        'Bendra išlaidų suma (EUR)': summary.total_cost.toFixed(2),
      }];
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Suvestinė');
    } else if (activeTab === 'treatments') {
      const exportData = treatments.map(t => ({
        'Data': new Date(t.reg_date).toLocaleDateString('lt-LT'),
        'Gyvūnas': t.animal_tag,
        'Liga': t.disease_name,
        'Rezultatas': t.outcome,
        'Veterinaras': t.vet_name,
        'Vaistų': t.medication_count,
        'Kaina (EUR)': t.total_cost.toFixed(2),
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Gydymai');
    } else if (activeTab === 'vaccinations') {
      const exportData = vaccinations.map(v => ({
        'Data': new Date(v.vaccination_date).toLocaleDateString('lt-LT'),
        'Gyvūnas': v.animal_tag,
        'Produktas': v.product_name,
        'Dozė': `${v.dose_amount} ${v.unit}`,
        'Atliko': v.administered_by,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vakcinacijos');
    } else if (activeTab === 'visits') {
      const exportData = visits.map(v => ({
        'Data': new Date(v.visit_datetime).toLocaleDateString('lt-LT'),
        'Gyvūnas': v.animal_tag,
        'Statusas': v.status,
        'Temperatūra': v.temperature ? `${v.temperature}°C` : '-',
        'Procedūros': v.procedures.join(', '),
        'Veterinaras': v.vet_name,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Vizitai');
    } else if (activeTab === 'products') {
      const exportData = productUsage.map(p => ({
        'Produktas': p.product_name,
        'Kategorija': p.category,
        'Panaudota kartų': p.times_used,
        'Bendras kiekis': `${p.total_quantity} ${p.unit}`,
        'Bendra kaina (EUR)': p.total_cost.toFixed(2),
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Produktai');
    } else if (activeTab === 'animals') {
      const exportData = animals.map(a => ({
        'Ausies numeris': a.tag_no,
        'Rūšis': a.species,
        'Lytis': a.sex,
        'Gydymų': a.treatment_count,
        'Vakcinacijų': a.vaccination_count,
        'Vizitų': a.visit_count,
        'Išlaidos (EUR)': a.total_cost.toFixed(2),
        'Paskutinė veikla': a.last_activity ? new Date(a.last_activity).toLocaleDateString('lt-LT') : '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Gyvūnai');
    } else if (activeTab === 'stock') {
      const exportData = allocatedStock.map(s => ({
        'Produktas': s.product_name,
        'Kategorija': s.category,
        'Paskirta': `${s.total_allocated_qty} ${s.unit}`,
        'Panaudota': `${s.total_used_qty} ${s.unit}`,
        'Likutis': `${s.qty_remaining} ${s.unit}`,
        'Paskirstymų': s.allocation_count,
        'Panaudojimų': s.usage_count,
        'Paskutinis paskirstymas': s.last_allocation_date ? new Date(s.last_allocation_date).toLocaleDateString('lt-LT') : '-',
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Atsargos');
    } else if (activeTab === 'diseases') {
      const exportData = diseases.map(d => ({
        'Liga': d.disease_name,
        'Kodas': d.disease_code,
        'Atvejai': d.total_cases,
        'Gyvūnų': d.animals_affected,
        'Pasveiko': d.recovered_cases,
        'Gydoma': d.ongoing_cases,
        'Kritę': d.deceased_cases,
        'Pasveikimo %': d.recovery_rate_percent,
        'Išlaidos (EUR)': d.total_treatment_cost.toFixed(2),
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Ligos');
    } else if (activeTab === 'vets') {
      const exportData = vets.map(v => ({
        'Veterinaras': v.vet_name,
        'Gydymai': v.treatment_count,
        'Vakcinacijos': v.vaccination_count,
        'Vizitai': v.visit_count,
        'Viso veiklų': v.total_activities,
        'Gydytų gyvūnų': v.animals_treated,
      }));
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Veterinarai');
    }

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${farmCode}_analitika_${timestamp}.xlsx`);
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
        <button
          onClick={onBack}
          className="mb-4 flex items-center gap-2 text-white/90 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Grįžti į visų ūkių analitiką
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">{farmName}</h2>
            <p className="text-blue-100 text-lg">Kodas: {farmCode}</p>
          </div>
          <button
            onClick={exportToExcel}
            className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
          >
            <Download className="w-5 h-5" />
            Eksportuoti
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gyvūnai</p>
                <p className="text-2xl font-bold text-gray-900">{summary.active_animals}</p>
                <p className="text-xs text-gray-500">iš {summary.total_animals}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-lg">
                <Syringe className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Gydymai</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_treatments}</p>
                <p className="text-xs text-gray-500">{summary.unique_diseases_treated} ligos</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vakcinacijos</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_vaccinations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Euro className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Išlaidos</p>
                <p className="text-2xl font-bold text-gray-900">€{summary.total_cost.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Vizitai</p>
                <p className="text-2xl font-bold text-gray-900">{summary.total_visits}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 rounded-lg">
                <Package className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Produktai</p>
                <p className="text-2xl font-bold text-gray-900">{summary.unique_products_used}</p>
                <p className="text-xs text-gray-500">unikalių</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-2">
        <div className="flex gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap relative ${
              activeTab === 'overview' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Apžvalga
          </button>
          <button
            onClick={() => setActiveTab('treatments')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'treatments' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Syringe className="w-4 h-4 inline mr-2" />
            Gydymai ({treatments.length})
          </button>
          <button
            onClick={() => setActiveTab('vaccinations')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'vaccinations' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Vakcinacijos ({vaccinations.length})
          </button>
          <button
            onClick={() => setActiveTab('visits')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'visits' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Vizitai ({visits.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'products' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Produktai ({productUsage.length})
          </button>
          <button
            onClick={() => setActiveTab('animals')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'animals' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Gyvūnai ({animals.length})
          </button>
          <button
            onClick={() => setActiveTab('stock')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'stock' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Warehouse className="w-4 h-4 inline mr-2" />
            Paskirstytos atsargos ({allocatedStock.length})
          </button>
          <button
            onClick={() => setActiveTab('diseases')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'diseases' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertCircle className="w-4 h-4 inline mr-2" />
            Ligos ({diseases.length})
          </button>
          <button
            onClick={() => setActiveTab('vets')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'vets' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Stethoscope className="w-4 h-4 inline mr-2" />
            Veterinarai ({vets.length})
          </button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 mb-1">Ūkio išsami analitika</h4>
                <p className="text-sm text-blue-700">
                  Čia matote visą šio ūkio veiklą: gydymus, vakcinacijas, vizitus, produktų naudojimą ir išlaidas. 
                  Naudokite skirtukus viršuje detalesnei informacijai.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-600" />
                Dažniausiai naudojami produktai
              </h3>
              <div className="space-y-3">
                {productUsage.slice(0, 5).map((product) => (
                  <div key={product.product_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{product.product_name}</div>
                      <div className="text-sm text-gray-500">
                        {product.times_used} kartų • {product.total_quantity.toFixed(1)} {product.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-amber-600">€{product.total_cost.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
                {productUsage.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nėra produktų naudojimo duomenų</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Paskutiniai gydymai
              </h3>
              <div className="space-y-3">
                {treatments.slice(0, 5).map((treatment) => (
                  <div key={treatment.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Syringe className="w-4 h-4 text-red-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 text-sm">
                        {treatment.animal_tag} - {treatment.disease_name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(treatment.reg_date).toLocaleDateString('lt-LT')} • {treatment.outcome}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-green-600">
                      €{treatment.total_cost.toFixed(2)}
                    </div>
                  </div>
                ))}
                {treatments.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nėra gydymų duomenų</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Disease Statistics */}
          {diseases.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                Dažniausios ligos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {diseases.slice(0, 6).map((disease) => (
                  <div key={disease.disease_id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-medium text-gray-900 mb-2">{disease.disease_name}</div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Atvejai:</span>
                        <span className="font-medium text-gray-900">{disease.total_cases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pasveiko:</span>
                        <span className="font-medium text-green-600">{disease.recovered_cases}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pasveikimo %:</span>
                        <span className={`font-medium ${
                          disease.recovery_rate_percent >= 80 ? 'text-green-600' :
                          disease.recovery_rate_percent >= 50 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {disease.recovery_rate_percent}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Veterinarian Activity */}
          {vets.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
                Veterinarų veikla
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vets.slice(0, 4).map((vet, index) => (
                  <div key={index} className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
                    <div className="font-medium text-gray-900 mb-3">{vet.vet_name}</div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-red-600">{vet.treatment_count}</div>
                        <div className="text-xs text-gray-600">Gydymai</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-purple-600">{vet.vaccination_count}</div>
                        <div className="text-xs text-gray-600">Vakcinacijos</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-blue-600">{vet.visit_count}</div>
                        <div className="text-xs text-gray-600">Vizitai</div>
                      </div>
                      <div className="text-center p-2 bg-white rounded">
                        <div className="font-bold text-green-600">{vet.animals_treated}</div>
                        <div className="text-xs text-gray-600">Gyvūnų</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'treatments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvūnas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liga</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rezultatas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veterinaras</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vaistai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kaina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {treatments.map((treatment) => (
                  <tr key={treatment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(treatment.reg_date).toLocaleDateString('lt-LT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{treatment.animal_tag}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{treatment.disease_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        treatment.outcome === 'Pasveiko' ? 'bg-green-100 text-green-700' :
                        treatment.outcome === 'Kritęs' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {treatment.outcome}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{treatment.vet_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{treatment.medication_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-green-600">€{treatment.total_cost.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {treatments.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Syringe className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra gydymų duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vaccinations' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvūnas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produktas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dozė</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atliko</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vaccinations.map((vaccination) => (
                  <tr key={vaccination.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(vaccination.vaccination_date).toLocaleDateString('lt-LT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{vaccination.animal_tag}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">{vaccination.product_name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {vaccination.dose_amount} {vaccination.unit}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{vaccination.administered_by}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vaccinations.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Shield className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra vakcinacijų duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'visits' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvūnas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statusas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Temperatūra</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedūros</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veterinaras</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {visits.map((visit) => (
                  <tr key={visit.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {new Date(visit.visit_datetime).toLocaleDateString('lt-LT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{visit.animal_tag}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        visit.status === 'Baigtas' ? 'bg-green-100 text-green-700' :
                        visit.status === 'Vykdomas' ? 'bg-blue-100 text-blue-700' :
                        visit.status === 'Atšauktas' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {visit.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {visit.temperature ? `${visit.temperature}°C` : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {visit.procedures.length > 0 ? visit.procedures.join(', ') : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{visit.vet_name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {visits.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra vizitų duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'products' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produktas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorija</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Panaudota kartų</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bendras kiekis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bendra kaina</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {productUsage.map((product) => (
                  <tr key={product.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{product.product_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.times_used}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {product.total_quantity.toFixed(2)} {product.unit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-green-600">€{product.total_cost.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {productUsage.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Package className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra produktų naudojimo duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'animals' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ausies Nr.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rūšis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lytis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydymai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vakcinacijos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vizitai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paskutinė veikla</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {animals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{animal.tag_no}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{animal.species}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{animal.sex}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-medium text-red-600">{animal.treatment_count}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-medium text-purple-600">{animal.vaccination_count}</span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className="font-medium text-blue-600">{animal.visit_count}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {animal.last_activity ? new Date(animal.last_activity).toLocaleDateString('lt-LT') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {animals.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra gyvūnų duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produktas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategorija</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paskirta</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Panaudota</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Likutis</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paskirstymų</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paskutinis paskirstymas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allocatedStock.map((stock) => (
                  <tr key={stock.product_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{stock.product_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">
                        {stock.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {stock.total_allocated_qty.toFixed(2)} {stock.unit}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {stock.total_used_qty.toFixed(2)} {stock.unit}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`font-medium ${
                        stock.qty_remaining > 0 ? 'text-green-600' : 'text-gray-400'
                      }`}>
                        {stock.qty_remaining.toFixed(2)} {stock.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{stock.allocation_count}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {stock.last_allocation_date ? new Date(stock.last_allocation_date).toLocaleDateString('lt-LT') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allocatedStock.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Warehouse className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra paskirstytų atsargų duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'diseases' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liga</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kodas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Atvejai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvūnų</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pasveiko</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydoma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kritę</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pasveikimo %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Išlaidos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {diseases.map((disease) => (
                  <tr key={disease.disease_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{disease.disease_name}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{disease.disease_code}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{disease.total_cases}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{disease.animals_affected}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-green-600">{disease.recovered_cases}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-orange-600">{disease.ongoing_cases}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-red-600">{disease.deceased_cases}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        disease.recovery_rate_percent >= 80 ? 'bg-green-100 text-green-700' :
                        disease.recovery_rate_percent >= 50 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {disease.recovery_rate_percent}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-green-600">€{disease.total_treatment_cost.toFixed(2)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {diseases.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra ligų duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'vets' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veterinaras</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydymai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vakcinacijos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vizitai</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Viso veiklų</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydytų gyvūnų</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vets.map((vet, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="font-medium text-gray-900">{vet.vet_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-red-600">{vet.treatment_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-purple-600">{vet.vaccination_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-blue-600">{vet.visit_count}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-gray-900">{vet.total_activities}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{vet.animals_treated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {vets.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Nėra veterinarų duomenų</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
