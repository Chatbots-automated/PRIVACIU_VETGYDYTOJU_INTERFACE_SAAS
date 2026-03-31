import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Animal, AnimalVisit, VisitProcedure, VisitStatus, Treatment, Product, UsageItem, HoofLeg, HoofClaw, HoofConditionCode, Unit } from '../lib/types';
import { X, Calendar, Thermometer, Pill, Syringe, FileText, Plus, CheckCircle, CheckCircle2, XCircle, Clock, AlertCircle, Package, Check, Filter, Search, ExternalLink, Milk, Activity, Trash2 } from 'lucide-react';
import { formatDateTimeLT, formatDateLT } from '../lib/formatters';
import { normalizeNumberInput, sortByLithuanian } from '../lib/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { AnimalAnalytics } from './AnimalAnalytics';
import { TeatStatusCard } from './TeatStatusCard';
import { TeatDisplay, TeatSelector } from './TeatSelector';
import { SynchronizationProtocolComponent } from './SynchronizationProtocol';
import { SearchableSelect } from './SearchableSelect';
import { showNotification } from './NotificationToast';
import { HoofSelector } from './HoofSelector';
import { CourseMedicationScheduler } from './CourseMedicationScheduler';

interface Vaccination {
  id: string;
  animal_id: string;
  product_id: string;
  vaccination_date: string;
  batch_id: string | null;
  dose_amount: number;
  unit: string;
  dose_number: number;
  next_booster_date: string | null;
  administered_by: string | null;
  notes: string | null;
  created_at: string;
}

interface VaccinationWithProduct extends Vaccination {
  product?: Product;
}

interface WithdrawalStatus {
  animal_id: string;
  milk_active: boolean;
  milk_until: string | null;
  meat_active: boolean;
  meat_until: string | null;
}

// GEA-related interfaces and components removed - no longer tracking milk production data

function WithdrawalStatusCard({ animalId }: { animalId: string }) {
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWithdrawalStatus();
  }, [animalId]);

  const loadWithdrawalStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('vw_withdrawal_status')
        .select('*')
        .eq('animal_id', animalId)
        .maybeSingle();

      if (error) throw error;
      setWithdrawalStatus(data);
    } catch (error) {
      console.error('Error loading withdrawal status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-sm text-gray-500">Kraunama...</p>
      </div>
    );
  }

  if (!withdrawalStatus || (!withdrawalStatus.milk_active && !withdrawalStatus.meat_active)) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <h4 className="font-semibold text-gray-900">Karencija</h4>
        </div>
        <p className="text-sm text-green-700 mt-2">Karencijos laikotarpis nėra aktyvus</p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <h4 className="font-semibold text-gray-900">Karencijos Laikotarpis</h4>
      </div>
      <div className="space-y-2 text-sm">
        {withdrawalStatus.milk_active && withdrawalStatus.milk_until && (
          <p className="text-amber-800">
            🥛 Pienas iki: <strong>{formatDateLT(withdrawalStatus.milk_until)}</strong>
          </p>
        )}
        {withdrawalStatus.meat_active && withdrawalStatus.meat_until && (
          <p className="text-amber-800">
            🥩 Mėsa iki: <strong>{formatDateLT(withdrawalStatus.meat_until)}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

// GeaDailyCard function completely removed (was 575 lines)

interface TreatmentWithDetails extends Treatment {
  usage_items?: UsageItemWithProduct[];
  disease_name?: string;
}

interface UsageItemWithProduct extends UsageItem {
  product?: Product;
}

interface AnimalDetailSidebarProps {
  animal: Animal;
  onClose: () => void;
  defaultTab?: TabType;
}

type TabType = 'overview' | 'visits' | 'treatments' | 'vaccinations' | 'logs';

export function AnimalDetailSidebar({ animal, onClose, defaultTab = 'overview' }: AnimalDetailSidebarProps) {
  const { logAction, user } = useAuth();
  const { selectedFarm } = useFarm();
  const [activeTab, setActiveTab] = useState<TabType>(defaultTab);
  const [visits, setVisits] = useState<AnimalVisit[]>([]);
  const [treatments, setTreatments] = useState<TreatmentWithDetails[]>([]);
  const [vaccinations, setVaccinations] = useState<VaccinationWithProduct[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<AnimalVisit | null>(null);
  const [showVisitDetailModal, setShowVisitDetailModal] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const [treatmentDateFrom, setTreatmentDateFrom] = useState('');
  const [treatmentDateTo, setTreatmentDateTo] = useState('');
  const [deletingTreatmentId, setDeletingTreatmentId] = useState<string | null>(null);
  const [treatmentSearch, setTreatmentSearch] = useState('');

  const [vaccinationDateFrom, setVaccinationDateFrom] = useState('');
  const [vaccinationDateTo, setVaccinationDateTo] = useState('');
  const [vaccinationSearch, setVaccinationSearch] = useState('');

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }
  };

  useEffect(() => {
    loadAllData();
  }, [animal.id]);

  useEffect(() => {
    if (showVisitModal || showVisitDetailModal) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [showVisitModal, showVisitDetailModal]);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadVisits(),
      loadTreatments(),
      loadVaccinations(),
      loadProducts()
    ]);
    setLoading(false);
  };

  const loadVisits = async () => {
    const { data, error } = await supabase
      .from('animal_visits')
      .select('*')
      .eq('animal_id', animal.id)
      .order('visit_datetime', { ascending: false });

    if (!error && data) {
      setVisits(data);
    }
  };

  const loadTreatments = async () => {
    const { data: treatmentsData, error } = await supabase
      .from('treatments')
      .select('*, disease:diseases(name)')
      .eq('animal_id', animal.id)
      .order('reg_date', { ascending: false });

    if (!error && treatmentsData) {
      console.log('📥 Loaded treatments:', treatmentsData.length);

      const treatmentsWithItems = await Promise.all(
        treatmentsData.map(async (treatment: any) => {
          // Load both usage_items (single doses) and treatment_courses (multi-day courses)
          const [usageResult, coursesResult] = await Promise.all([
            supabase
              .from('usage_items')
              .select('*, product:products(*)')
              .eq('treatment_id', treatment.id),
            supabase
              .from('treatment_courses')
              .select('*, product:products(*), batch:batches(*)')
              .eq('treatment_id', treatment.id)
          ]);

          console.log(`📦 Treatment ${treatment.id.slice(0, 8)}:`, {
            withdrawal_milk: treatment.withdrawal_until_milk,
            withdrawal_meat: treatment.withdrawal_until_meat,
            usage_items: usageResult.data?.length || 0,
            courses: coursesResult.data?.length || 0
          });

          return {
            ...treatment,
            disease_name: treatment.disease?.name,
            usage_items: usageResult.data || [],
            treatment_courses: coursesResult.data || []
          };
        })
      );

      setTreatments(treatmentsWithItems);
    }
  };

  const loadVaccinations = async () => {
    const { data, error } = await supabase
      .from('vaccinations')
      .select('*, product:products(*)')
      .eq('animal_id', animal.id)
      .order('vaccination_date', { ascending: false });

    if (!error && data) {
      setVaccinations(data);
    }
  };

  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (!error && data) {
      // Sort by Lithuanian alphabet
      const sortedData = sortByLithuanian(data, 'name');
      setProducts(sortedData);
    }
  };

  const handleApsekStatusChange = () => {
    showNotification(
      'Sinchronizacijos protokolai automatiškai atšaukti dėl APSĖK statuso',
      'warning'
    );
    loadVisits();
  };

  // Calculate age in months from birth date
  const calculateAgeMonths = (birthDate: string | null): number | null => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + 
                   (today.getMonth() - birth.getMonth());
    return Math.max(0, months);
  };

  // Get display age - prioritize calculated from birth_date, fallback to stored age_months
  const getDisplayAge = (): string => {
    if (animal.birth_date) {
      const calculatedAge = calculateAgeMonths(animal.birth_date);
      return calculatedAge !== null ? `${calculatedAge} mėn.` : '-';
    }
    return animal.age_months ? `${animal.age_months} mėn.` : '-';
  };

  const handleDeleteTreatment = async (treatmentId: string) => {
    if (!confirm(`Ar tikrai norite ištrinti šį gydymą gyvūnui ${animal.tag_no}?\n\nŠis veiksmas:\n• Ištrina gydymo įrašą\n• Grąžina panaudotus vaistus į atsargas\n• Pašalina karencijos laikotarpius\n• Negali būti atšauktas`)) {
      return;
    }

    setDeletingTreatmentId(treatmentId);

    try {
      // Step 1: Get all usage_items for this treatment to revert stock
      const { data: usageItems, error: usageError } = await supabase
        .from('usage_items')
        .select('id, batch_id, qty')
        .eq('treatment_id', treatmentId);

      if (usageError) throw usageError;

      // Step 2: Revert stock for each usage item
      if (usageItems && usageItems.length > 0) {
        for (const item of usageItems) {
          // Get current batch qty_left
          const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('qty_left, status')
            .eq('id', item.batch_id)
            .single();

          if (batchError) {
            console.error('Error fetching batch:', batchError);
            continue;
          }

          // Add quantity back to batch
          const newQtyLeft = (batch.qty_left || 0) + item.qty;
          const newStatus = batch.status === 'depleted' && newQtyLeft > 0 ? 'active' : batch.status;

          const { error: updateError } = await supabase
            .from('batches')
            .update({ 
              qty_left: newQtyLeft,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.batch_id);

          if (updateError) {
            console.error('Error updating batch:', updateError);
          }
        }
      }

      // Step 3: Delete treatment_courses (will cascade to course_doses)
      const { error: coursesError } = await supabase
        .from('treatment_courses')
        .delete()
        .eq('treatment_id', treatmentId);

      if (coursesError) {
        console.error('Error deleting courses:', coursesError);
      }

      // Step 4: Delete usage_items
      const { error: deleteUsageError } = await supabase
        .from('usage_items')
        .delete()
        .eq('treatment_id', treatmentId);

      if (deleteUsageError) throw deleteUsageError;

      // Step 5: Delete the treatment itself
      const { error: deleteTreatmentError } = await supabase
        .from('treatments')
        .delete()
        .eq('id', treatmentId);

      if (deleteTreatmentError) throw deleteTreatmentError;

      // Show success message
      showNotification(
        `Gydymas ištrintas! Grąžinta produktų į atsargas: ${usageItems?.length || 0}`,
        'success'
      );

      // Reload treatments
      await loadTreatments();
    } catch (error: any) {
      console.error('Error deleting treatment:', error);
      showNotification(`Klaida trinant gydymą: ${error.message}`, 'error');
    } finally {
      setDeletingTreatmentId(null);
    }
  };

  // Categorize all visits by time
  const todayVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate.toDateString() === today.toDateString();
  });

  const futureVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate > today;
  }).sort((a, b) => new Date(a.visit_datetime).getTime() - new Date(b.visit_datetime).getTime());

  const pastVisits = visits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate < today && visitDate.toDateString() !== today.toDateString();
  }).sort((a, b) => new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime());

  // Separate by completion status
  const todayIncomplete = todayVisits.filter(v => v.status !== 'Baigtas');
  const todayCompleted = todayVisits.filter(v => v.status === 'Baigtas');

  const futureIncomplete = futureVisits.filter(v => v.status !== 'Baigtas');
  const futureCompleted = futureVisits.filter(v => v.status === 'Baigtas');

  const pastIncomplete = pastVisits.filter(v => v.status !== 'Baigtas');
  const pastCompleted = pastVisits.filter(v => v.status === 'Baigtas');

  // For stats
  const incompleteVisits = visits.filter(v => v.status !== 'Baigtas');
  const completedVisits = visits.filter(v => v.status === 'Baigtas');

  const filteredTreatments = treatments.filter(treatment => {
    let match = true;

    if (treatmentDateFrom) {
      match = match && treatment.reg_date >= treatmentDateFrom;
    }

    if (treatmentDateTo) {
      match = match && treatment.reg_date <= treatmentDateTo;
    }

    if (treatmentSearch) {
      const search = treatmentSearch.toLowerCase();
      match = match && (
        treatment.disease_name?.toLowerCase().includes(search) ||
        treatment.vet_name?.toLowerCase().includes(search) ||
        treatment.clinical_diagnosis?.toLowerCase().includes(search) ||
        treatment.notes?.toLowerCase().includes(search)
      );
    }

    return match;
  });

  const filteredVaccinations = vaccinations.filter(vaccination => {
    let match = true;

    if (vaccinationDateFrom) {
      match = match && vaccination.vaccination_date >= vaccinationDateFrom;
    }

    if (vaccinationDateTo) {
      match = match && vaccination.vaccination_date <= vaccinationDateTo;
    }

    if (vaccinationSearch) {
      const search = vaccinationSearch.toLowerCase();
      match = match && (
        vaccination.product?.name?.toLowerCase().includes(search) ||
        vaccination.administered_by?.toLowerCase().includes(search) ||
        vaccination.notes?.toLowerCase().includes(search) ||
        vaccination.batch_id?.toLowerCase().includes(search)
      );
    }

    return match;
  });

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case 'Planuojamas': return 'bg-blue-100 text-blue-800';
      case 'Vykdomas': return 'bg-yellow-100 text-yellow-800';
      case 'Baigtas': return 'bg-green-100 text-green-800';
      case 'Atšauktas': return 'bg-gray-100 text-gray-800';
      case 'Neįvykęs': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: VisitStatus) => {
    switch (status) {
      case 'Planuojamas': return <Clock className="w-4 h-4" />;
      case 'Vykdomas': return <AlertCircle className="w-4 h-4" />;
      case 'Baigtas': return <CheckCircle className="w-4 h-4" />;
      case 'Atšauktas': return <XCircle className="w-4 h-4" />;
      case 'Neįvykęs': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[500px] lg:w-[600px] xl:w-[800px] bg-white shadow-2xl z-50 flex flex-col">
      <div className="flex items-center justify-between p-2 xl:p-4 border-b border-gray-200 bg-gray-50">
        <div>
          <h2 className="text-base xl:text-xl font-bold text-gray-900">
            {animal.tag_no || 'Nenurodytas ID'}
          </h2>
          <p className="text-xs xl:text-sm text-gray-600">
            {animal.species} {animal.sex && `• ${animal.sex}`} {getDisplayAge() !== '-' && `• ${getDisplayAge()}`}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 xl:p-2 hover:bg-blue-200 rounded-lg transition-colors min-w-[36px] xl:min-w-[44px] min-h-[36px] xl:min-h-[44px] touch-manipulation active:bg-blue-300"
        >
          <X className="w-5 xl:w-6 h-5 xl:h-6 text-gray-600" />
        </button>
      </div>

      <div className="flex border-b border-gray-200 bg-gray-50 overflow-x-auto">
        <button
          onClick={() => handleTabChange('overview')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'overview'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Apžvalga
        </button>
        <button
          onClick={() => handleTabChange('visits')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'visits'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vizitai
        </button>
        <button
          onClick={() => handleTabChange('treatments')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'treatments'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Gydymų istorija
        </button>
        <button
          onClick={() => handleTabChange('vaccinations')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'vaccinations'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Vakcinos
        </button>
        <button
          onClick={() => handleTabChange('logs')}
          className={`px-3 xl:px-6 py-2 xl:py-3 text-sm font-medium transition-colors whitespace-nowrap min-h-[40px] xl:min-h-[44px] touch-manipulation ${
            activeTab === 'logs'
              ? 'bg-white text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Žurnalai
        </button>
      </div>

      <div ref={contentRef} className="flex-1 overflow-y-auto p-3 xl:p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <div className="mb-4">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Gyvūno informacija
                </h3>
              </div>
              
              {/* Ausies numeris - centered at top */}
              <div className="mb-4">
                <div className="bg-white rounded-lg p-3 border border-blue-200 text-center">
                  <span className="text-xs text-gray-500 block mb-1">Ausies numeris</span>
                  <span className="font-bold text-blue-600 text-lg">{animal.tag_no || '-'}</span>
                </div>
              </div>

              {/* Two column layout */}
              <div className="grid grid-cols-2 gap-3">
                {/* Left Column */}
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-gray-500 block mb-1">Lytis</span>
                    <span className="font-bold text-gray-900 text-base">{animal.sex || '-'}</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-gray-500 block mb-1">Gimimo data</span>
                    <span className="font-semibold text-gray-900 text-sm">
                      {animal.birth_date ? formatDateLT(animal.birth_date) : '-'}
                    </span>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-gray-500 block mb-1">Veislė</span>
                    <span className="font-bold text-gray-900 text-base">{animal.breed || '-'}</span>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-blue-100">
                    <span className="text-xs text-gray-500 block mb-1">Amžius</span>
                    <span className="font-bold text-gray-900 text-base">{getDisplayAge()}</span>
                  </div>
                </div>
              </div>
            </div>

            <WithdrawalStatusCard animalId={animal.id} />

            <TeatStatusCard key={`teat-${animal.id}-${treatments.length}`} animalId={animal.id} />

            {/* GEA Daily Card removed - no longer tracking milk production data */}

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  <h4 className="font-semibold text-gray-900">Sekantis vizitas</h4>
                </div>
                {futureVisits.length > 0 ? (
                  <p className="text-sm text-gray-700">{formatDateTimeLT(futureVisits[0].visit_datetime)}</p>
                ) : (
                  <p className="text-sm text-gray-500">Nėra suplanuota</p>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <h4 className="font-semibold text-gray-900">Paskutinis vizitas</h4>
                </div>
                {pastVisits.length > 0 ? (
                  <p className="text-sm text-gray-700">{formatDateTimeLT(pastVisits[0].visit_datetime)}</p>
                ) : (
                  <p className="text-sm text-gray-500">Nebuvo vizitų</p>
                )}
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Statistika
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-blue-600">{incompleteVisits.length}</p>
                  <p className="text-xs text-gray-600">Neužbaigti vizitai</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-green-600">{completedVisits.length}</p>
                  <p className="text-xs text-gray-600">Užbaigti vizitai</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-orange-600">{todayVisits.length}</p>
                  <p className="text-xs text-gray-600">Šiandien</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="text-3xl font-bold text-purple-600">{futureVisits.length}</p>
                  <p className="text-xs text-gray-600">Būsimų</p>
                </div>
                <div className="bg-white rounded-lg p-3 shadow-sm col-span-2">
                  <p className="text-3xl font-bold text-indigo-600">{treatments.length}</p>
                  <p className="text-xs text-gray-600">Iš viso gydymų</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'visits' && (
          <div className="space-y-6">
            <button
              onClick={() => setShowVisitModal(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Naujas vizitas
            </button>

            {/* INCOMPLETE VISITS - TOP PRIORITY */}
            {pastIncomplete.length > 0 && (
              <div>
                <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  Praleisti vizitai (Reikia atlikti)
                </h3>
                <div className="space-y-3">
                  {pastIncomplete.map(visit => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      onClick={() => {
                        setSelectedVisit(visit);
                        setShowVisitDetailModal(true);
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {todayVisits.length > 0 && (
              <div>
                <h3 className="font-bold text-orange-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-600" />
                  Šiandien ({todayVisits.length})
                </h3>

                {todayIncomplete.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2 uppercase">Reikia atlikti</h4>
                    <div className="space-y-3">
                      {todayIncomplete.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {todayCompleted.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-600 mb-2 uppercase flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Atlikta šiandien
                    </h4>
                    <div className="space-y-3">
                      {todayCompleted.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {futureVisits.length > 0 && (
              <div>
                <h3 className="font-bold text-blue-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Būsimi vizitai ({futureVisits.length})
                </h3>

                {futureIncomplete.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-600 mb-2 uppercase">Suplanuota</h4>
                    <div className="space-y-3">
                      {futureIncomplete.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {futureCompleted.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-600 mb-2 uppercase flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      Atlikta iš anksto
                    </h4>
                    <div className="space-y-3">
                      {futureCompleted.map(visit => (
                        <VisitCard
                          key={visit.id}
                          visit={visit}
                          getStatusColor={getStatusColor}
                          getStatusIcon={getStatusIcon}
                          onClick={() => {
                            setSelectedVisit(visit);
                            setShowVisitDetailModal(true);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* PAST COMPLETED VISITS */}
            {pastCompleted.length > 0 && (
              <div className="pt-6 border-t-2 border-gray-300">
                <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Ankstesni užbaigti vizitai ({pastCompleted.length})
                </h3>
                <div className="space-y-3">
                  {pastCompleted.slice(0, 5).map(visit => (
                    <VisitCard
                      key={visit.id}
                      visit={visit}
                      getStatusColor={getStatusColor}
                      getStatusIcon={getStatusIcon}
                      onClick={() => {
                        setSelectedVisit(visit);
                        setShowVisitDetailModal(true);
                      }}
                    />
                  ))}
                  {pastCompleted.length > 5 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      + dar {pastCompleted.length - 5} užbaigti vizitai
                    </p>
                  )}
                </div>
              </div>
            )}

            {visits.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Nėra vizitų</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Filtrai</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data nuo</label>
                  <input
                    type="date"
                    value={treatmentDateFrom}
                    onChange={(e) => setTreatmentDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data iki</label>
                  <input
                    type="date"
                    value={treatmentDateTo}
                    onChange={(e) => setTreatmentDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paieška</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={treatmentSearch}
                      onChange={(e) => setTreatmentSearch(e.target.value)}
                      placeholder="Liga, vet., pastabos..."
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Rasta: <strong>{filteredTreatments.length}</strong> iš {treatments.length}
                </span>
                {(treatmentDateFrom || treatmentDateTo || treatmentSearch) && (
                  <button
                    onClick={() => {
                      setTreatmentDateFrom('');
                      setTreatmentDateTo('');
                      setTreatmentSearch('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Išvalyti filtrus
                  </button>
                )}
              </div>
            </div>

            {filteredTreatments.length > 0 ? (
              filteredTreatments.map(treatment => (
                <div key={treatment.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Pill className="w-5 h-5 text-green-600" />
                        <div className="font-semibold text-lg text-gray-900">
                          {formatDateLT(treatment.reg_date)}
                        </div>
                      </div>
                      {treatment.disease_name && (
                        <div className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-red-100 text-red-800 border border-red-200">
                          <AlertCircle className="w-4 h-4 mr-1.5" />
                          {treatment.disease_name}
                        </div>
                      )}
                    </div>
                    {treatment.vet_name && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-semibold text-green-700">
                            {treatment.vet_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{treatment.vet_name}</span>
                      </div>
                    )}
                  </div>

                  {treatment.clinical_diagnosis && (
                    <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-amber-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-semibold text-amber-900 mb-1">Klinikinis diagnozas</div>
                          <p className="text-sm text-amber-900 leading-relaxed">{treatment.clinical_diagnosis}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Withdrawal dates - MOST IMPORTANT, SHOWN FIRST */}
                  {(treatment.withdrawal_until_milk || treatment.withdrawal_until_meat) && (
                    <div className="bg-orange-50 border border-orange-300 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <AlertCircle className="w-5 h-5 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-orange-900 mb-2">⚠️ Karencinės dienos</div>
                          <div className="space-y-1">
                            {treatment.withdrawal_until_milk && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">🥛 Pienas iki:</span>
                                <span className="font-bold text-blue-700">{formatDateLT(treatment.withdrawal_until_milk)}</span>
                              </div>
                            )}
                            {treatment.withdrawal_until_meat && (
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-700">🥩 Mėsa iki:</span>
                                <span className="font-bold text-red-700">{formatDateLT(treatment.withdrawal_until_meat)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Single-dose medicines */}
                  {treatment.usage_items && treatment.usage_items.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <Pill className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          Panaudoti vaistai - vienkartinės dozės ({treatment.usage_items.length})
                        </div>
                      </div>
                      <div className="space-y-2">
                        {treatment.usage_items.map((item: UsageItemWithProduct) => (
                          <div key={item.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 mb-1">
                                  {item.product?.name || 'Nežinomas produktas'}
                                </div>
                                <div className="text-xs text-gray-600 mb-2">
                                  {item.purpose}
                                </div>
                                {item.batch_id && (
                                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border border-blue-200 text-gray-700">
                                    Serija: {item.batch_id.slice(0, 10)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-blue-700">
                                  {item.qty} {item.unit}
                                </div>
                                <div className="text-xs text-gray-500">Kiekis</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Multi-day course medicines */}
                  {treatment.treatment_courses && treatment.treatment_courses.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="text-sm font-semibold text-gray-900">
                          Gydymo kursai ({treatment.treatment_courses.length})
                        </div>
                      </div>
                      <div className="space-y-2">
                        {treatment.treatment_courses.map((course: any) => (
                          <div key={course.id} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-900 mb-1">
                                  {course.product?.name || 'Nežinomas produktas'}
                                </div>
                                <div className="flex flex-wrap gap-2 text-xs mb-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-purple-200 text-gray-700">
                                    📅 Kursas: {course.days} dienų
                                  </span>
                                  <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-purple-200 text-gray-700">
                                    💊 Dienos dozė: {course.daily_dose} {course.unit}
                                  </span>
                                  {course.start_date && (
                                    <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-purple-200 text-gray-700">
                                      🗓️ Pradžia: {formatDateLT(course.start_date)}
                                    </span>
                                  )}
                                </div>
                                {course.batch && (
                                  <div className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white border border-purple-200 text-gray-700">
                                    Serija: {course.batch.lot || course.batch_id.slice(0, 10)}
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <div className="text-lg font-bold text-purple-700">
                                  {course.total_dose} {course.unit}
                                </div>
                                <div className="text-xs text-gray-500">Visa dozė</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {(treatment.notes || treatment.outcome) && (
                    <div className="space-y-3 pt-4 border-t border-gray-200">
                      {treatment.notes && (
                        <div className="flex items-start gap-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                            <p className="text-sm text-gray-700 leading-relaxed">{treatment.notes}</p>
                          </div>
                        </div>
                      )}

                      {treatment.outcome && (
                        <div className="flex items-start gap-2">
                          <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium text-gray-500 mb-1">Rezultatas</div>
                            <p className="text-sm text-gray-700 leading-relaxed font-medium">{treatment.outcome}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Pill className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium">Nėra gydymų</p>
                <p className="text-sm mt-1">Gydymai bus rodomi čia</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'vaccinations' && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="w-4 h-4 text-gray-600" />
                <h4 className="font-semibold text-gray-900">Filtrai</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data nuo</label>
                  <input
                    type="date"
                    value={vaccinationDateFrom}
                    onChange={(e) => setVaccinationDateFrom(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data iki</label>
                  <input
                    type="date"
                    value={vaccinationDateTo}
                    onChange={(e) => setVaccinationDateTo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paieška</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={vaccinationSearch}
                      onChange={(e) => setVaccinationSearch(e.target.value)}
                      placeholder="Vakcina, serija, atliko..."
                      className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-gray-600">
                  Rasta: <strong>{filteredVaccinations.length}</strong> iš {vaccinations.length}
                </span>
                {(vaccinationDateFrom || vaccinationDateTo || vaccinationSearch) && (
                  <button
                    onClick={() => {
                      setVaccinationDateFrom('');
                      setVaccinationDateTo('');
                      setVaccinationSearch('');
                    }}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Išvalyti filtrus
                  </button>
                )}
              </div>
            </div>

            {filteredVaccinations.length > 0 ? (
              filteredVaccinations.map(vaccination => (
                <div key={vaccination.id} className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                        <Syringe className="w-5 h-5 text-blue-600" />
                        {vaccination.product?.name || 'Nežinoma vakcina'}
                      </div>
                      <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDateLT(vaccination.vaccination_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Dozė #{vaccination.dose_number}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Dozė</div>
                      <div className="font-semibold text-gray-900">
                        {vaccination.dose_amount} {vaccination.unit}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="text-xs text-gray-500 mb-1">Serija</div>
                      <div className="font-semibold text-gray-900 text-sm truncate">
                        {vaccination.batch_id ? vaccination.batch_id.slice(0, 8) : 'N/A'}
                      </div>
                    </div>
                  </div>

                  {vaccination.next_booster_date && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-gray-700">Kita vakcina:</span>
                        </div>
                        <span className="font-bold text-green-700">
                          {formatDateLT(vaccination.next_booster_date)}
                        </span>
                      </div>
                    </div>
                  )}

                  {vaccination.administered_by && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-xs font-semibold text-blue-700">
                          {vaccination.administered_by.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span>Atliko: <span className="font-medium text-gray-900">{vaccination.administered_by}</span></span>
                    </div>
                  )}

                  {vaccination.notes && (
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                          <p className="text-sm text-gray-700 leading-relaxed">{vaccination.notes}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Syringe className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium">Nėra vakcinacijų</p>
                <p className="text-sm mt-1">Pridėkite vakcinaciją per vizitą</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Gyvūno statistika
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-blue-600 mb-1">{visits.length}</div>
                  <div className="text-xs text-gray-600">Vizitų</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-green-600 mb-1">{treatments.length}</div>
                  <div className="text-xs text-gray-600">Gydymų</div>
                </div>
                <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                  <div className="text-3xl font-bold text-purple-600 mb-1">{vaccinations.length}</div>
                  <div className="text-xs text-gray-600">Vakcinacijų</div>
                </div>
              </div>
            </div>

            <AnimalAnalytics animalId={animal.id} tagNumber={animal.tag_no} />

            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="bg-gray-50 border-b border-gray-200 px-5 py-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-gray-600" />
                  Pilna istorija
                </h3>
              </div>
              <div className="p-5">
                {(() => {
                  const allEvents = [
                    ...visits.map(v => ({ type: 'visit', date: v.visit_datetime, data: v })),
                    ...treatments.map(t => ({ type: 'treatment', date: t.reg_date, data: t })),
                    ...vaccinations.map(v => ({ type: 'vaccination', date: v.vaccination_date, data: v }))
                  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  if (allEvents.length === 0) {
                    return (
                      <div className="text-center py-12 text-gray-500">
                        <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-10 h-10 text-gray-400" />
                        </div>
                        <p className="text-lg font-medium">Nėra įvykių</p>
                        <p className="text-sm mt-1">Istorija prasidės po pirmojo vizito</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {allEvents.map((event, idx) => {
                        if (event.type === 'visit') {
                          const visit = event.data as AnimalVisit;
                          return (
                            <div key={`visit-${visit.id}`} className="flex gap-3 group hover:bg-blue-50 p-3 rounded-lg transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                  <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-gray-900">Vizitas</div>
                                    <div className="text-sm text-gray-600 mt-0.5">
                                      {visit.procedures.join(', ')}
                                    </div>
                                    {visit.notes && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{visit.notes}</div>
                                    )}
                                    {(visit as any).planned_medications && (visit as any).planned_medications.length > 0 && !(visit as any).medications_processed && (
                                      <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                                        <div className="text-xs font-semibold text-amber-900 mb-1">📦 Planuojami vaistai:</div>
                                        {(visit as any).planned_medications.map((med: any, idx: number) => {
                                          const product = products.find(p => p.id === med.product_id);
                                          const needsQty = !med.qty || med.qty === null || med.qty === '' || med.qty === '0';
                                          return (
                                            <div key={idx} className="text-xs text-amber-800">
                                              • {product?.name || 'Produktas'}
                                              {needsQty ? (
                                                <span className="ml-1 px-1 py-0.5 bg-orange-200 text-orange-900 rounded font-semibold">
                                                  Reikia įvesti kiekį
                                                </span>
                                              ) : (
                                                <span>: {med.qty} {med.unit}</span>
                                              )}
                                            </div>
                                          );
                                        })}
                                        <div className="text-xs text-amber-600 mt-1 italic">
                                          {(visit as any).planned_medications.some((m: any) => !m.qty || m.qty === null || m.qty === '' || m.qty === '0')
                                            ? '⚠️ Įveskite kiekius prieš užbaigiant'
                                            : 'Nusirašys kai vizitas bus užbaigtas'}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateTimeLT(visit.visit_datetime)}
                                  </div>
                                </div>
                                {visit.status && (
                                  <div className="mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      visit.status === 'Užbaigtas' ? 'bg-green-100 text-green-800' :
                                      visit.status === 'Planuojamas' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {visit.status}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (event.type === 'treatment') {
                          const treatment = event.data as TreatmentWithDetails;
                          return (
                            <div key={`treatment-${treatment.id}`} className="flex gap-3 group hover:bg-green-50 p-3 rounded-lg transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <Pill className="w-5 h-5 text-green-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-gray-900">Gydymas</div>
                                    {treatment.disease_name && (
                                      <div className="text-sm text-gray-600 mt-0.5">{treatment.disease_name}</div>
                                    )}
                                    {treatment.notes && (
                                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{treatment.notes}</div>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateLT(treatment.reg_date)}
                                  </div>
                                </div>
                                {((treatment.usage_items && treatment.usage_items.length > 0) || (treatment.treatment_courses && treatment.treatment_courses.length > 0)) && (
                                  <div className="mt-2 space-y-2">
                                    {/* Show single doses with cost */}
                                    {treatment.usage_items && treatment.usage_items.map((item, i) => {
                                      const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                                        ? item.batch.purchase_price / item.batch.received_qty
                                        : 0;
                                      const totalCost = item.qty * unitCost;
                                      return (
                                        <div key={`usage-${i}`} className="flex items-center justify-between text-xs bg-blue-50 px-2 py-1 rounded">
                                          <span className="text-blue-900 font-medium">
                                            {item.product?.name || 'Produktas'} - {item.qty} {item.product?.primary_pack_unit || 'vnt'}
                                          </span>
                                          {totalCost > 0 && (
                                            <span className="text-blue-700 font-bold">€{totalCost.toFixed(2)}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Show courses with cost */}
                                    {treatment.treatment_courses && treatment.treatment_courses.map((course, i) => {
                                      const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                                        ? course.batch.purchase_price / course.batch.received_qty
                                        : 0;
                                      const totalCost = course.total_quantity * unitCost;
                                      return (
                                        <div key={`course-${i}`} className="flex items-center justify-between text-xs bg-purple-50 px-2 py-1 rounded">
                                          <span className="text-purple-900 font-medium">
                                            {course.product?.name || 'Produktas'} - Kursas {course.days}d ({course.total_quantity} {course.product?.primary_pack_unit || 'vnt'})
                                          </span>
                                          {totalCost > 0 && (
                                            <span className="text-purple-700 font-bold">€{totalCost.toFixed(2)}</span>
                                          )}
                                        </div>
                                      );
                                    })}
                                    {/* Total treatment cost */}
                                    {(() => {
                                      const usageCost = treatment.usage_items?.reduce((sum, item) => {
                                        const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                                          ? item.batch.purchase_price / item.batch.received_qty
                                          : 0;
                                        return sum + (item.qty * unitCost);
                                      }, 0) || 0;
                                      const courseCost = treatment.treatment_courses?.reduce((sum, course) => {
                                        const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                                          ? course.batch.purchase_price / course.batch.received_qty
                                          : 0;
                                        return sum + (course.total_quantity * unitCost);
                                      }, 0) || 0;
                                      const totalCost = usageCost + courseCost;

                                      return totalCost > 0 ? (
                                        <div className="flex items-center justify-between text-xs bg-blue-100 px-2 py-1.5 rounded font-bold border border-blue-200">
                                          <span className="text-blue-900">SAVIKAINA (Gydymo kaina)</span>
                                          <span className="text-blue-700 text-sm">€{totalCost.toFixed(2)}</span>
                                        </div>
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                                {treatment.outcome && (
                                  <div className="mt-2">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                      treatment.outcome === 'recovered' ? 'bg-green-100 text-green-800' :
                                      treatment.outcome === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                                      treatment.outcome === 'deceased' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {treatment.outcome === 'recovered' ? 'Pasveiko' :
                                       treatment.outcome === 'ongoing' ? 'Gydoma' :
                                       treatment.outcome === 'deceased' ? 'Kritęs' : treatment.outcome}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        } else if (event.type === 'vaccination') {
                          const vaccination = event.data as VaccinationWithProduct;
                          return (
                            <div key={`vaccination-${vaccination.id}`} className="flex gap-3 group hover:bg-purple-50 p-3 rounded-lg transition-colors">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                  <Syringe className="w-5 h-5 text-purple-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-medium text-gray-900">Vakcinacija</div>
                                    {vaccination.product && (
                                      <div className="text-sm text-gray-600 mt-0.5">
                                        {vaccination.product.name}
                                      </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                      Dozė: {vaccination.dose_amount} {vaccination.unit}
                                    </div>
                                  </div>
                                  <div className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateLT(vaccination.vaccination_date)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'treatments' && (
          <div className="space-y-4">
            {treatments.length > 0 ? (
              treatments.map(treatment => (
                <div key={treatment.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{treatment.disease_name}</div>
                      <div className="text-xs text-gray-500 mt-1">{formatDateLT(treatment.reg_date)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {treatment.outcome && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          treatment.outcome === 'recovered' ? 'bg-green-100 text-green-800' :
                          treatment.outcome === 'ongoing' ? 'bg-yellow-100 text-yellow-800' :
                          treatment.outcome === 'deceased' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {treatment.outcome === 'recovered' ? 'Pasveiko' :
                           treatment.outcome === 'ongoing' ? 'Gydoma' :
                           treatment.outcome === 'deceased' ? 'Kritęs' : treatment.outcome}
                        </span>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTreatment(treatment.id);
                        }}
                        disabled={deletingTreatmentId === treatment.id}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Ištrinti gydymą"
                      >
                        <Trash2 className={`w-4 h-4 ${deletingTreatmentId === treatment.id ? 'text-gray-400' : 'text-gray-400 group-hover:text-red-600'}`} />
                      </button>
                    </div>
                  </div>

                  {((treatment.usage_items && treatment.usage_items.length > 0) || (treatment.treatment_courses && treatment.treatment_courses.length > 0)) && (
                    <div className="space-y-2 mt-3">
                      {/* Single doses with cost */}
                      {treatment.usage_items && treatment.usage_items.map((item, i) => {
                        const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                          ? item.batch.purchase_price / item.batch.received_qty
                          : 0;
                        const totalCost = item.qty * unitCost;
                        return (
                          <div key={`usage-${i}`} className="flex items-center justify-between text-xs bg-blue-50 px-3 py-2 rounded-lg">
                            <span className="text-blue-900 font-medium">
                              {item.product?.name || 'Produktas'} - {item.qty} {item.product?.primary_pack_unit || 'vnt'}
                            </span>
                            {totalCost > 0 && (
                              <span className="text-blue-700 font-bold">€{totalCost.toFixed(2)}</span>
                            )}
                          </div>
                        );
                      })}
                      {/* Courses with cost */}
                      {treatment.treatment_courses && treatment.treatment_courses.map((course, i) => {
                        const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                          ? course.batch.purchase_price / course.batch.received_qty
                          : 0;
                        const totalCost = course.total_quantity * unitCost;
                        return (
                          <div key={`course-${i}`} className="flex items-center justify-between text-xs bg-purple-50 px-3 py-2 rounded-lg">
                            <span className="text-purple-900 font-medium">
                              {course.product?.name || 'Produktas'} - Kursas {course.days}d ({course.total_quantity} {course.product?.primary_pack_unit || 'vnt'})
                            </span>
                            {totalCost > 0 && (
                              <span className="text-purple-700 font-bold">€{totalCost.toFixed(2)}</span>
                            )}
                          </div>
                        );
                      })}
                      {/* Total treatment cost */}
                      {(() => {
                        const usageCost = treatment.usage_items?.reduce((sum, item) => {
                          const unitCost = item.batch?.purchase_price && item.batch?.received_qty
                            ? item.batch.purchase_price / item.batch.received_qty
                            : 0;
                          return sum + (item.qty * unitCost);
                        }, 0) || 0;
                        const courseCost = treatment.treatment_courses?.reduce((sum, course) => {
                          const unitCost = course.batch?.purchase_price && course.batch?.received_qty
                            ? course.batch.purchase_price / course.batch.received_qty
                            : 0;
                          return sum + (course.total_quantity * unitCost);
                        }, 0) || 0;
                        const totalCost = usageCost + courseCost;

                        return totalCost > 0 ? (
                          <div className="flex items-center justify-between text-xs bg-blue-100 px-3 py-2 rounded-lg font-bold border-2 border-blue-300">
                            <span className="text-blue-900">SAVIKAINA (Gydymo kaina)</span>
                            <span className="text-blue-700 text-sm">€{totalCost.toFixed(2)}</span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  )}

                  {(treatment.sick_teats || treatment.affected_teats || treatment.disabled_teats) && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <TeatDisplay
                        sickTeats={treatment.sick_teats || []}
                        disabledTeats={treatment.disabled_teats || []}
                      />
                    </div>
                  )}

                  {treatment.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{treatment.notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : null}
          </div>
        )}

        {activeTab === 'vaccinations' && (
          <div className="space-y-4">
            {vaccinations.length > 0 ? (
              vaccinations.map((vaccination) => (
                <div key={vaccination.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      {vaccination.product && (
                        <div className="font-semibold text-gray-900">{vaccination.product.name}</div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">{formatDateLT(vaccination.vaccination_date)}</div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      Dozė #{vaccination.dose_number}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-xs font-medium text-gray-500 mb-1">Kiekis</div>
                      <div className="text-gray-700">{vaccination.dose_amount} {vaccination.unit}</div>
                    </div>
                    {vaccination.next_booster_date && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 mb-1">Kitas skiepas</div>
                        <div className="text-gray-700">{formatDateLT(vaccination.next_booster_date)}</div>
                      </div>
                    )}
                  </div>

                  {vaccination.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <div className="text-xs font-medium text-gray-500 mb-1">Pastabos</div>
                      <p className="text-sm text-gray-700 leading-relaxed">{vaccination.notes}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16 text-gray-500">
                <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Syringe className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-lg font-medium">Nėra vakcinacijų</p>
                <p className="text-sm mt-1">Pridėkite vakcinaciją per vizitą</p>
              </div>
            )}
          </div>
        )}

      </div>

      {showVisitModal && (
        <VisitCreateModal
          animalId={animal.id}
          onClose={() => setShowVisitModal(false)}
          onSuccess={() => {
            loadAllData();
            setShowVisitModal(false);
          }}
        />
      )}

      {showVisitDetailModal && selectedVisit && (
        <VisitDetailModal
          visit={selectedVisit}
          animalId={animal.id}
          onClose={() => {
            setShowVisitDetailModal(false);
            setSelectedVisit(null);
          }}
          onSuccess={() => {
            loadAllData();
            setShowVisitDetailModal(false);
            setSelectedVisit(null);
          }}
        />
      )}
    </div>
  );
}

function VisitCard({ visit, getStatusColor, getStatusIcon, onClick }: { visit: AnimalVisit; getStatusColor: (status: VisitStatus) => string; getStatusIcon: (status: VisitStatus) => JSX.Element; onClick: () => void }) {
  const isCancelled = visit.status === 'Atšauktas';

  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer transform hover:scale-[1.01] ${
        isCancelled ? 'border-red-300 bg-gray-50 opacity-75' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(visit.status)}`}>
            {getStatusIcon(visit.status)}
            {visit.status}
          </span>
          <span className={`text-sm ${isCancelled ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
            {formatDateTimeLT(visit.visit_datetime)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {visit.procedures.map((proc, idx) => (
          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
            {proc}
          </span>
        ))}
      </div>
      {visit.temperature && (
        <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
          <Thermometer className="w-4 h-4 text-red-500" />
          <span>{visit.temperature}°C</span>
          {visit.temperature_measured_at && (
            <span className="text-gray-500 text-xs">({formatDateTimeLT(visit.temperature_measured_at)})</span>
          )}
        </div>
      )}
      {visit.notes && (
        <p className="text-sm text-gray-700 mt-2">{visit.notes}</p>
      )}
      {visit.next_visit_required && visit.next_visit_date && (
        <div className="mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            Sekantis vizitas: <span className="font-medium">{formatDateTimeLT(visit.next_visit_date)}</span>
          </p>
        </div>
      )}
      {visit.treatment_required && (
        <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
          <Pill className="w-3 h-3" />
          <span>Reikalingas gydymas</span>
        </div>
      )}
      {visit.vet_name && (
        <p className="text-xs text-gray-500 mt-2">Gyd.: {visit.vet_name}</p>
      )}
    </div>
  );
}

function VisitCreateModal({ animalId, onClose, onSuccess, visitToEdit }: { animalId: string; onClose: () => void; onSuccess: () => void; visitToEdit?: AnimalVisit }) {
  const { logAction, user } = useAuth();
  const { selectedFarm } = useFarm();
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Refs for auto-scrolling to sections in modal
  const treatmentSectionRef = useRef<HTMLDivElement>(null);
  const vaccinationSectionRef = useRef<HTMLDivElement>(null);
  const preventionSectionRef = useRef<HTMLDivElement>(null);
  const temperatureSectionRef = useRef<HTMLDivElement>(null);
  const hoofSectionRef = useRef<HTMLDivElement>(null);

  const isEditMode = !!visitToEdit;

  const [formData, setFormData] = useState({
    visit_datetime: visitToEdit?.visit_datetime.slice(0, 16) || new Date().toISOString().slice(0, 16),
    procedures: visitToEdit?.procedures || [] as VisitProcedure[],
    temperature: visitToEdit?.temperature?.toString() || '',
    temperature_measured_at: visitToEdit?.temperature_measured_at?.slice(0, 16) || new Date().toISOString().slice(0, 16),
    status: visitToEdit?.status || 'Planuojamas' as VisitStatus,
    notes: visitToEdit?.notes || '',
    vet_name: visitToEdit?.vet_name || user?.full_name || user?.email || '',
    next_visit_required: visitToEdit?.next_visit_required || false,
    next_visit_date: visitToEdit?.next_visit_date?.slice(0, 16) || '',
    treatment_required: visitToEdit?.treatment_required || false,
  });

  // Auto-update vet_name when user changes
  useEffect(() => {
    if (user && !visitToEdit) {
      setFormData(prev => ({
        ...prev,
        vet_name: user.full_name || user.email || ''
      }));
    }
  }, [user, visitToEdit]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [diseases, setDiseases] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});
  const [users, setUsers] = useState<Array<{ id: string; full_name: string }>>([]);

  // Treatment form data
  const [treatmentData, setTreatmentData] = useState({
    disease_id: '',
    clinical_diagnosis: '',
    tests: '',
    animal_condition: '',
    outcome: '',
    outcome_date: '',
    services: '',
    withdrawal_until: '',
    notes: '',
    recurring_days: [] as string[],
    medications: [] as Array<{
      product_id: string;
      batch_id: string;
      qty: string;
      unit: Unit;
      purpose: string;
      is_course: boolean;
      course_days: string;
      teat: string;
      administration_route?: string;
    }>,
    courseMedicationSchedule: null as any,
  });

  const [sickTeats, setSickTeats] = useState<string[]>([]);
  const [disabledTeats, setDisabledTeats] = useState<string[]>([]);

  // Note: Withdrawal dates are now calculated by the database function
  // after treatment is saved, using per-medicine course durations

  // Withdrawal dates are calculated by database, no need for client-side calculation

  // Vaccination form data
  const [vaccinationData, setVaccinationData] = useState({
    vaccines: [] as Array<{
      product_id: string;
      batch_id: string;
      dose_amount: string;
      dose_number: string;
      unit: Unit;
      next_booster_date: string;
    }>,
    administered_by: '',
    notes: '',
  });

  // Prevention form data
  const [preventionData, setPreventionData] = useState({
    products: [] as Array<{
      product_id: string;
      batch_id: string;
      dose_qty: string;
      dose_unit: Unit;
      purpose: string;
      is_course: boolean;
      course_days: string;
    }>,
    notes: '',
  });

  // Course scheduler state
  const [showCourseScheduler, setShowCourseScheduler] = useState(false);
  const [courseSchedulerMedIndex, setCourseSchedulerMedIndex] = useState<number | null>(null);

  // Hoof examination data
  const [hoofConditions, setHoofConditions] = useState<HoofConditionCode[]>([]);
  const [hoofData, setHoofData] = useState({
    examination_date: new Date().toISOString().split('T')[0],
    technician_name: '',
    general_notes: '',
    examinations: [] as Array<{
      leg: HoofLeg;
      claw: HoofClaw;
      condition_code: string;
      severity: number;
      was_trimmed: boolean;
      was_treated: boolean;
      treatment_product_id?: string;
      treatment_batch_id?: string;
      treatment_quantity?: string;
      treatment_unit?: Unit;
      treatment_notes?: string;
      bandage_applied: boolean;
      requires_followup: boolean;
      followup_date?: string;
      notes?: string;
    }>,
  });
  const [selectedHoofLeg, setSelectedHoofLeg] = useState<HoofLeg | null>(null);
  const [selectedHoofClaw, setSelectedHoofClaw] = useState<HoofClaw | null>(null);

  const [showNewDiseaseModal, setShowNewDiseaseModal] = useState(false);
  const [newDiseaseName, setNewDiseaseName] = useState('');

  useEffect(() => {
    loadResources();
    if (isEditMode && visitToEdit) {
      loadExistingData();
    }
  }, [selectedFarm]);

  const loadExistingData = async () => {
    if (!visitToEdit) return;

    // Load existing treatment data if visit has Gydymas procedure
    if (visitToEdit.procedures.includes('Gydymas')) {
      const { data: treatmentRecords } = await supabase
        .from('treatments')
        .select('*, treatment_medications(*)')
        .eq('visit_id', visitToEdit.id);

      if (treatmentRecords && treatmentRecords.length > 0) {
        const treatment = treatmentRecords[0];

        // Load future planned visits that are part of the treatment course
        // Include planned_medications to reconstruct the full course schedule
        const { data: futureVisits } = await supabase
          .from('animal_visits')
          .select('visit_datetime, planned_medications')
          .eq('related_visit_id', visitToEdit.id)
          .eq('status', 'Planuojamas')
          .order('visit_datetime', { ascending: true });

        const recurringDays = futureVisits ? futureVisits.map(v => v.visit_datetime.split('T')[0]) : [];

        // Reconstruct the full course medication schedule including today's visit
        let courseMedicationSchedule: any[] = [];

        // Add today's visit medications if it has planned_medications
        const todayDate = visitToEdit.visit_datetime.split('T')[0];
        if ((visitToEdit as any).planned_medications && Array.isArray((visitToEdit as any).planned_medications)) {
          courseMedicationSchedule.push({
            date: todayDate,
            medications: (visitToEdit as any).planned_medications
          });
        }

        // Add future visits medications
        if (futureVisits) {
          futureVisits.forEach(visit => {
            if ((visit as any).planned_medications && Array.isArray((visit as any).planned_medications)) {
              courseMedicationSchedule.push({
                date: visit.visit_datetime.split('T')[0],
                medications: (visit as any).planned_medications
              });
            }
          });
        }

        setTreatmentData({
          disease_id: treatment.disease_id || '',
          clinical_diagnosis: treatment.clinical_diagnosis || '',
          tests: treatment.tests || '',
          animal_condition: treatment.animal_condition || '',
          outcome: treatment.outcome || '',
          outcome_date: treatment.outcome_date || '',
          services: treatment.services || '',
          withdrawal_until: treatment.withdrawal_until || '',
          notes: treatment.notes || '',
          recurring_days: recurringDays,
          courseMedicationSchedule: courseMedicationSchedule.length > 0 ? courseMedicationSchedule : undefined,
          medications: (treatment.treatment_medications || []).map((med: any) => ({
            product_id: med.product_id,
            batch_id: med.batch_id,
            qty: med.qty?.toString() || '',
            unit: med.unit || 'ml',
            purpose: med.purpose || '',
            is_course: med.is_course || false,
            course_days: med.course_days?.toString() || '',
            teat: med.teat || '',
          })),
        });

        // Load sick teats
        if (treatment.sick_teats) {
          setSickTeats(treatment.sick_teats);
        }

        // Load disabled teats from teat_status table
        const { data: teatStatusRecords } = await supabase
          .from('teat_status')
          .select('teat_position')
          .eq('animal_id', visitToEdit.animal_id)
          .eq('is_disabled', true);

        if (teatStatusRecords && teatStatusRecords.length > 0) {
          setDisabledTeats(teatStatusRecords.map(t => t.teat_position));
        }
      } else if ((visitToEdit as any).planned_medications) {
        // If no treatment record exists but visit has planned_medications, load those
        // Check if there's a related treatment to get disease info
        let diseaseId = '';
        let clinicalDiagnosis = '';
        let relatedNotes = '';

        if ((visitToEdit as any).related_treatment_id) {
          const { data: relatedTreatment } = await supabase
            .from('treatments')
            .select('disease_id, clinical_diagnosis, notes, sick_teats')
            .eq('id', (visitToEdit as any).related_treatment_id)
            .maybeSingle();

          if (relatedTreatment) {
            diseaseId = relatedTreatment.disease_id || '';
            clinicalDiagnosis = relatedTreatment.clinical_diagnosis || '';
            relatedNotes = relatedTreatment.notes || '';

            // Load sick teats from related treatment
            if (relatedTreatment.sick_teats) {
              setSickTeats(relatedTreatment.sick_teats);
            }
          }
        }

        // Load future planned visits that are part of the treatment course
        // Include planned_medications to reconstruct the full course schedule
        const { data: futureVisits } = await supabase
          .from('animal_visits')
          .select('visit_datetime, planned_medications')
          .eq('related_visit_id', visitToEdit.id)
          .eq('status', 'Planuojamas')
          .order('visit_datetime', { ascending: true });

        const recurringDays = futureVisits ? futureVisits.map(v => v.visit_datetime.split('T')[0]) : [];

        // Reconstruct the full course medication schedule including today's visit
        let courseMedicationSchedule: any[] = [];

        // Add today's visit medications if it has planned_medications
        const todayDate = visitToEdit.visit_datetime.split('T')[0];
        if ((visitToEdit as any).planned_medications && Array.isArray((visitToEdit as any).planned_medications)) {
          courseMedicationSchedule.push({
            date: todayDate,
            medications: (visitToEdit as any).planned_medications
          });
        }

        // Add future visits medications
        if (futureVisits) {
          futureVisits.forEach(visit => {
            if ((visit as any).planned_medications && Array.isArray((visit as any).planned_medications)) {
              courseMedicationSchedule.push({
                date: visit.visit_datetime.split('T')[0],
                medications: (visit as any).planned_medications
              });
            }
          });
        }

        setTreatmentData({
          disease_id: diseaseId,
          clinical_diagnosis: clinicalDiagnosis,
          tests: '',
          animal_condition: '',
          outcome: '',
          services: '',
          withdrawal_until: '',
          notes: relatedNotes,
          recurring_days: recurringDays,
          courseMedicationSchedule: courseMedicationSchedule.length > 0 ? courseMedicationSchedule : undefined,
          medications: (visitToEdit as any).planned_medications.map((med: any) => ({
            product_id: med.product_id,
            batch_id: med.batch_id || '',
            qty: med.qty?.toString() || '',
            unit: med.unit || 'ml',
            purpose: med.purpose || 'Gydymas',
            is_course: med.is_course || false,
            course_days: med.course_days?.toString() || '',
            teat: med.teat || '',
          })),
        });
      }
    }

    // Load existing vaccination data if visit has Vakcina procedure
    if (visitToEdit.procedures.includes('Vakcina')) {
      const { data: vaccinationRecords } = await supabase
        .from('vaccinations')
        .select('*')
        .eq('visit_id', visitToEdit.id);

      if (vaccinationRecords && vaccinationRecords.length > 0) {
        setVaccinationData({
          vaccines: vaccinationRecords.map((vacc: any) => ({
            product_id: vacc.product_id || '',
            batch_id: vacc.batch_id || '',
            dose_amount: vacc.dose_amount?.toString() || '',
            dose_number: vacc.dose_number?.toString() || '1',
            unit: vacc.unit || 'ml',
            next_booster_date: vacc.next_booster_date || '',
          })),
          administered_by: vaccinationRecords[0].administered_by || '',
          notes: vaccinationRecords[0].notes || '',
        });
      }
    }

    // Load existing prevention data if visit has Profilaktika procedure
    if (visitToEdit.procedures.includes('Profilaktika')) {
      const { data: preventionRecords } = await supabase
        .from('preventions')
        .select('*')
        .eq('visit_id', visitToEdit.id);

      if (preventionRecords && preventionRecords.length > 0) {
        setPreventionData({
          products: preventionRecords.map((prev: any) => ({
            product_id: prev.product_id || '',
            batch_id: prev.batch_id || '',
            dose_qty: prev.qty?.toString() || '',
            dose_unit: prev.unit || 'ml',
            purpose: prev.purpose || '',
            is_course: prev.is_course || false,
            course_days: prev.course_days?.toString() || '1',
          })),
          notes: preventionRecords[0].notes || '',
        });
      }
    }

    // Load existing hoof records if visit has Nagai procedure
    if (visitToEdit.procedures.includes('Nagai')) {
      const { data: hoofRecords } = await supabase
        .from('hoof_records')
        .select('*')
        .eq('visit_id', visitToEdit.id);

      if (hoofRecords && hoofRecords.length > 0) {
        const firstRecord = hoofRecords[0];
        setHoofData({
          examination_date: firstRecord.examination_date || new Date().toISOString().split('T')[0],
          technician_name: firstRecord.technician_name || '',
          general_notes: firstRecord.notes || '',
          examinations: hoofRecords.map((record: any) => ({
            leg: record.leg,
            claw: record.claw,
            condition_code: record.condition_code,
            severity: record.severity || 0,
            was_trimmed: record.was_trimmed || false,
            was_treated: record.was_treated || false,
            treatment_product_id: record.treatment_product_id || undefined,
            treatment_batch_id: record.treatment_batch_id || undefined,
            treatment_quantity: record.treatment_quantity?.toString() || undefined,
            treatment_unit: record.treatment_unit || undefined,
            treatment_notes: record.treatment_notes || undefined,
            bandage_applied: record.bandage_applied || false,
            requires_followup: record.requires_followup || false,
            followup_date: record.followup_date || undefined,
            notes: record.notes || undefined,
          })),
        });
      }
    }
  };

  const loadResources = async () => {
    if (!selectedFarm) return;

    const [productsRes, diseasesRes, batchesRes, usersRes, hoofConditionsRes] = await Promise.all([
      supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true),
      supabase.from('diseases').select('*').eq('farm_id', selectedFarm.id).order('name'),
      supabase.from('batches').select('*').eq('farm_id', selectedFarm.id).order('expiry_date'),
      supabase.from('users').select('id, full_name, email').eq('role', 'vet').order('full_name'),
      supabase.from('hoof_condition_codes').select('*').order('code'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (diseasesRes.data) setDiseases(diseasesRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
    if (usersRes.data) setUsers(usersRes.data);
    if (hoofConditionsRes.data) setHoofConditions(hoofConditionsRes.data);
  };

  const handleCreateDisease = async () => {
    if (!newDiseaseName.trim()) {
      showNotification('Įveskite ligos pavadinimą', 'error');
      return;
    }

    if (!selectedFarm || !selectedFarm.id) {
      showNotification('Pasirinkite ūkį', 'error');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('diseases')
        .insert({ 
          farm_id: selectedFarm.id,
          name: newDiseaseName.trim() 
        })
        .select()
        .single();

      if (error) throw error;

      setDiseases([...diseases, data]);
      setTreatmentData({ ...treatmentData, disease_id: data.id });
      setNewDiseaseName('');
      setShowNewDiseaseModal(false);

      await logAction('create_disease', 'diseases', data.id, null, { name: data.name });
      showNotification('Diagnozė sėkmingai sukurta', 'success');
    } catch (error: any) {
      console.error('Error creating disease:', error);
      showNotification('Klaida kuriant ligą: ' + error.message, 'error');
    }
  };

  const fetchStockLevel = async (productId: string) => {
    if (!selectedFarm) return 0;
    
    const { data: batchesData, error } = await supabase
      .from('batches')
      .select('id, received_qty, qty_left, expiry_date')
      .eq('product_id', productId)
      .eq('farm_id', selectedFarm.id);

    if (error || !batchesData) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Filter out expired batches
    const validBatches = batchesData.filter(batch => {
      if (!batch.expiry_date) return true;
      const expiryDate = new Date(batch.expiry_date);
      return expiryDate >= today;
    });

    // Use qty_left from batches (maintained by database triggers) as the source of truth
    const total = validBatches.reduce((sum, batch) => sum + (batch.qty_left || 0), 0);

    setStockLevels(prev => ({ ...prev, [productId]: total }));
    return total;
  };

  const getOldestBatchWithStock = async (productId: string): Promise<string> => {
    try {
      if (!selectedFarm) return '';
      
      const { data: batchesData, error } = await supabase
        .from('batches')
        .select('id, qty_left, expiry_date')
        .eq('product_id', productId)
        .eq('farm_id', selectedFarm.id)
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching batch stock:', error);
        return '';
      }

      if (batchesData && batchesData.length > 0) {
        // Filter out expired batches
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check each batch for actual stock using qty_left (maintained by triggers)
        for (const batch of batchesData) {
          // Skip expired batches
          if (batch.expiry_date) {
            const expiryDate = new Date(batch.expiry_date);
            if (expiryDate < today) continue;
          }

          // Use qty_left from database as source of truth
          const availableStock = batch.qty_left || 0;

          // Return first batch with stock > 0
          if (availableStock > 0) {
            return batch.id;
          }
        }
      }

      return '';
    } catch (error) {
      console.error('Error in getOldestBatchWithStock:', error);
      return '';
    }
  };

  const allProcedures: VisitProcedure[] = ['Apžiūra', 'Profilaktika', 'Gydymas', 'Vakcina', 'Sinchronizacijos protokolas', 'Nagai', 'Kita'];

  const toggleProcedure = (proc: VisitProcedure) => {
    const isAdding = !formData.procedures.includes(proc);

    if (formData.procedures.includes(proc)) {
      setFormData({ ...formData, procedures: formData.procedures.filter(p => p !== proc) });
    } else {
      // Special handling for Sinchronizacijos protokolas - it should be used alone
      if (proc === 'Sinchronizacijos protokolas') {
        setFormData({ ...formData, procedures: ['Sinchronizacijos protokolas'] });
      } else if (formData.procedures.includes('Sinchronizacijos protokolas')) {
        // If Sinchronizacijos protokolas is already selected, replace it with the new procedure
        setFormData({ ...formData, procedures: [proc] });
      } else {
        setFormData({ ...formData, procedures: [...formData.procedures, proc] });
      }

      // Auto-scroll to relevant section after a short delay (for tablet UX)
      setTimeout(() => {
        let targetRef: React.RefObject<HTMLDivElement> | null = null;

        if (proc === 'Gydymas') targetRef = treatmentSectionRef;
        else if (proc === 'Vakcina') targetRef = vaccinationSectionRef;
        else if (proc === 'Profilaktika') targetRef = preventionSectionRef;
        else if (proc === 'Nagai') targetRef = hoofSectionRef;

        if (targetRef?.current && modalContentRef.current) {
          // Calculate position relative to modal container
          const modalTop = modalContentRef.current.scrollTop;
          const targetTop = targetRef.current.offsetTop;
          const modalHeight = modalContentRef.current.clientHeight;

          // Scroll within modal to position element near top (with some padding)
          modalContentRef.current.scrollTo({
            top: targetTop - 100,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  };

  const handleSubmit = async (e: React.FormEvent, autoComplete = false) => {
    e.preventDefault();

    // Prevent double-submission: Set loading immediately
    if (loading) {
      console.log('⚠️ Submit already in progress, ignoring duplicate click');
      return;
    }
    setLoading(true);

    console.log('🚀 handleSubmit called:', {
      isEditMode,
      visitId: visitToEdit?.id,
      currentStatus: formData.status,
      autoComplete,
      procedures: formData.procedures,
      hasTreatmentMeds: treatmentData.medications.length > 0
    });

    if (formData.procedures.length === 0) {
      showNotification('Pasirinkite bent vieną procedūrą', 'error');
      setLoading(false);
      return;
    }

    // If "Sinchronizacijos protokolas" is selected, don't create a visit here
    // The SynchronizationProtocolComponent handles its own visit creation
    if (formData.procedures.includes('Sinchronizacijos protokolas')) {
      showNotification('Sinchronizacijos protokolas turi būti sukurtas naudojant protokolo formą žemiau. Vizitai bus sukurti automatiškai.', 'info');
      setLoading(false);
      return;
    }

    // Validate procedure-specific data
    if (formData.procedures.includes('Gydymas') &&
        treatmentData.medications.length === 0 &&
        !treatmentData.courseMedicationSchedule) {
      showNotification('Gydymui reikia pasirinkti bent vieną vaistą arba suplanuoti kursą', 'error');
      setLoading(false);
      return;
    }

    if (formData.procedures.includes('Vakcina') && vaccinationData.vaccines.length === 0) {
      showNotification('Vakcinai reikia pasirinkti bent vieną produktą', 'error');
      setLoading(false);
      return;
    }

    if (formData.procedures.includes('Nagai') && hoofData.examinations.length === 0) {
      showNotification('Nagų apžiūrai reikia apžiūrėti bent vieną nagą', 'error');
      setLoading(false);
      return;
    }

    if (formData.procedures.includes('Profilaktika') && preventionData.products.length === 0) {
      showNotification('Profilaktikai reikia pasirinkti bent vieną produktą', 'error');
      setLoading(false);
      return;
    }

    try {
      let visitData;

      if (isEditMode && visitToEdit) {
        // Update existing visit
        const { data, error: visitError } = await supabase
          .from('animal_visits')
          .update({
            visit_datetime: formData.visit_datetime,
            procedures: formData.procedures,
            temperature: formData.temperature ? parseFloat(formData.temperature) : null,
            temperature_measured_at: formData.procedures.includes('Temperatūra') && formData.temperature ? formData.temperature_measured_at : null,
            status: autoComplete ? 'Baigtas' : formData.status,
            notes: formData.notes ? formData.notes : null,
            vet_name: formData.vet_name ? formData.vet_name : null,
            next_visit_required: formData.next_visit_required,
            next_visit_date: formData.next_visit_required ? formData.next_visit_date : null,
            treatment_required: formData.procedures.includes('Gydymas'),
          })
          .eq('id', visitToEdit.id)
          .select()
          .single();

        if (visitError) throw visitError;
        visitData = data;

        // Delete existing treatment/vaccination/prevention records if procedures changed
        if (visitToEdit.procedures.includes('Gydymas') && !formData.procedures.includes('Gydymas')) {
          await supabase.from('treatment_medications').delete().eq('treatment_id', (await supabase.from('treatments').select('id').eq('visit_id', visitToEdit.id).maybeSingle()).data?.id);
          await supabase.from('treatments').delete().eq('visit_id', visitToEdit.id);
        }
        if (visitToEdit.procedures.includes('Vakcina') && !formData.procedures.includes('Vakcina')) {
          await supabase.from('vaccinations').delete().eq('visit_id', visitToEdit.id);
        }
        if (visitToEdit.procedures.includes('Profilaktika') && !formData.procedures.includes('Profilaktika')) {
          await supabase.from('preventions').delete().eq('visit_id', visitToEdit.id);
        }

        await logAction('update_visit', 'animal_visits', visitData.id);
      } else {
        // Create new visit - but first check for recent duplicates (protection against double-click)
        const visitDate = formData.visit_datetime.split('T')[0];
        const { data: recentVisits } = await supabase
          .from('animal_visits')
          .select('id, created_at')
          .eq('animal_id', animalId)
          .gte('visit_datetime', `${visitDate}T00:00:00`)
          .lte('visit_datetime', `${visitDate}T23:59:59`)
          .order('created_at', { ascending: false })
          .limit(5);

        // Check if a visit with identical procedures was just created (within last 10 seconds)
        const now = new Date();
        const tenSecondsAgo = new Date(now.getTime() - 10000);
        const proceduresStr = JSON.stringify(formData.procedures.sort());

        let isDuplicate = false;
        if (recentVisits && recentVisits.length > 0) {
          for (const rv of recentVisits) {
            const createdAt = new Date(rv.created_at);
            if (createdAt > tenSecondsAgo) {
              // Fetch full visit details to check procedures
              const { data: fullVisit } = await supabase
                .from('animal_visits')
                .select('procedures')
                .eq('id', rv.id)
                .single();

              if (fullVisit && JSON.stringify(fullVisit.procedures.sort()) === proceduresStr) {
                isDuplicate = true;
                console.warn('⚠️ Duplicate visit detected (created within last 10 seconds), skipping creation');
                visitData = rv; // Use the existing visit
                break;
              }
            }
          }
        }

        if (!isDuplicate) {
          const { data, error: visitError } = await supabase
            .from('animal_visits')
            .insert({
              farm_id: selectedFarm!.id,
              animal_id: animalId,
              visit_datetime: formData.visit_datetime,
              procedures: formData.procedures,
              temperature: formData.temperature ? parseFloat(formData.temperature) : null,
              temperature_measured_at: formData.procedures.includes('Temperatūra') && formData.temperature ? formData.temperature_measured_at : null,
              status: formData.status,
              notes: formData.notes ? formData.notes : null,
              vet_name: formData.vet_name ? formData.vet_name : null,
              created_by_user_id: user?.full_name || user?.email || null,
              next_visit_required: formData.next_visit_required,
              next_visit_date: formData.next_visit_required ? formData.next_visit_date : null,
              treatment_required: formData.procedures.includes('Gydymas'),
            })
            .select()
            .single();

          if (visitError) throw visitError;
          visitData = data;

          await logAction('create_visit', 'animal_visits', visitData.id);
        }
      }

      // 2. If Gydymas procedure, create or update treatment
      if (formData.procedures.includes('Gydymas')) {
        const hasRecurringDays = treatmentData.recurring_days.length > 0;

        let treatmentRecord;

        if (isEditMode && visitToEdit) {
          // Check if treatment exists for this visit using related_treatment_id or visit_id
          let existingTreatment = null;
          
          // First, try to get treatment by related_treatment_id if it exists
          if ((visitToEdit as any).related_treatment_id) {
            const { data } = await supabase
              .from('treatments')
              .select('id')
              .eq('id', (visitToEdit as any).related_treatment_id)
              .maybeSingle();
            existingTreatment = data;
          }
          
          // If not found by related_treatment_id, try by visit_id
          if (!existingTreatment) {
            const { data } = await supabase
              .from('treatments')
              .select('id')
              .eq('visit_id', visitToEdit.id)
              .maybeSingle();
            existingTreatment = data;
          }

          if (existingTreatment) {
            console.log('✏️ Updating existing treatment:', existingTreatment.id);
            // Update existing treatment
            const { data, error: treatmentError } = await supabase
              .from('treatments')
              .update({
                reg_date: formData.visit_datetime.split('T')[0],
                disease_id: treatmentData.disease_id ? treatmentData.disease_id : null,
                clinical_diagnosis: treatmentData.clinical_diagnosis ? treatmentData.clinical_diagnosis : null,
                tests: treatmentData.tests ? treatmentData.tests : null,
                animal_condition: treatmentData.animal_condition ? treatmentData.animal_condition : null,
                outcome: treatmentData.outcome ? treatmentData.outcome : null,
                outcome_date: treatmentData.outcome_date ? treatmentData.outcome_date : null,
                services: treatmentData.services ? treatmentData.services : null,
                vet_name: formData.vet_name ? formData.vet_name : null,
                notes: treatmentData.notes ? treatmentData.notes : null,
                creates_future_visits: hasRecurringDays,
                sick_teats: sickTeats,
                affected_teats: sickTeats,
                disabled_teats: disabledTeats,
              })
              .eq('id', existingTreatment.id)
              .select()
              .single();

            if (treatmentError) throw treatmentError;
            treatmentRecord = data;

            // Delete existing medications and courses to replace with new ones
            console.log('🗑️ Deleting old medications/courses for treatment:', existingTreatment.id);
            await supabase.from('usage_items').delete().eq('treatment_id', existingTreatment.id);
            await supabase.from('treatment_courses').delete().eq('treatment_id', existingTreatment.id);
            await supabase.from('treatment_medications').delete().eq('treatment_id', existingTreatment.id);
          } else {
            console.log('➕ Creating new treatment for visit:', visitToEdit.id);
            // Create new treatment
            const { data, error: treatmentError } = await supabase
              .from('treatments')
              .insert({
                farm_id: selectedFarm!.id,
                animal_id: animalId,
                visit_id: visitData.id,
                reg_date: formData.visit_datetime.split('T')[0],
                disease_id: treatmentData.disease_id ? treatmentData.disease_id : null,
                clinical_diagnosis: treatmentData.clinical_diagnosis ? treatmentData.clinical_diagnosis : null,
                tests: treatmentData.tests ? treatmentData.tests : null,
                animal_condition: treatmentData.animal_condition ? treatmentData.animal_condition : null,
                outcome: treatmentData.outcome ? treatmentData.outcome : null,
                outcome_date: treatmentData.outcome_date ? treatmentData.outcome_date : null,
                services: treatmentData.services ? treatmentData.services : null,
                vet_name: formData.vet_name ? formData.vet_name : null,
                notes: treatmentData.notes ? treatmentData.notes : null,
                creates_future_visits: hasRecurringDays,
                sick_teats: sickTeats,
                affected_teats: sickTeats,
                disabled_teats: disabledTeats,
              })
              .select()
              .single();

            if (treatmentError) throw treatmentError;
            treatmentRecord = data;
          }
        } else {
          // Create new treatment (non-edit mode)
          const { data, error: treatmentError } = await supabase
            .from('treatments')
            .insert({
              farm_id: selectedFarm!.id,
              animal_id: animalId,
              visit_id: visitData.id,
              reg_date: formData.visit_datetime.split('T')[0],
              disease_id: treatmentData.disease_id ? treatmentData.disease_id : null,
              clinical_diagnosis: treatmentData.clinical_diagnosis ? treatmentData.clinical_diagnosis : null,
              tests: treatmentData.tests ? treatmentData.tests : null,
              animal_condition: treatmentData.animal_condition ? treatmentData.animal_condition : null,
              outcome: treatmentData.outcome ? treatmentData.outcome : null,
              services: treatmentData.services ? treatmentData.services : null,
              vet_name: formData.vet_name ? formData.vet_name : null,
              notes: treatmentData.notes ? treatmentData.notes : null,
              creates_future_visits: hasRecurringDays,
              sick_teats: sickTeats,
              affected_teats: sickTeats,
              disabled_teats: disabledTeats,
            })
            .select()
            .single();

          if (treatmentError) throw treatmentError;
          treatmentRecord = data;
        }

        // NEW SYSTEM: Handle medication deduction based on visit status
        // If visit is "Baigtas" immediately, process medications now
        // Otherwise, store as planned_medications and process when completed

        const isCourseWithMultipleDays = treatmentData.medications.some(
          med => med.is_course && parseInt(med.course_days) > 1
        );

        console.log('🔍 Processing medications:', {
          isEditMode,
          visitStatus: formData.status,
          autoComplete,
          medicationCount: treatmentData.medications.length,
          willDeductStock: formData.status === 'Baigtas' || autoComplete
        });

        for (const med of treatmentData.medications) {
          const isCourse = med.is_course && parseInt(med.course_days) > 1;

          // For multi-day courses, only product_id is required (batch selected per visit)
          // For single doses, both product_id and batch_id are required
          if (!med.product_id) {
            throw new Error('Produktas privalomas');
          }

          if (!isCourse && (!med.batch_id || med.batch_id.trim() === '')) {
            throw new Error('Serija privaloma vienkartiniams gydymams');
          }

          if (!isCourse && !med.qty) {
            throw new Error('Kiekis privalomas vienkartiniams gydymams');
          }

          // If this is a multi-day course
          if (med.is_course && parseInt(med.course_days) > 1) {
            const days = parseInt(med.course_days);

            // Store course information for tracking (without pre-calculated doses)
            // batch_id is null for courses - it will be selected per visit
            const { error: courseError } = await supabase
              .from('treatment_courses')
              .insert({
                farm_id: selectedFarm!.id,
                treatment_id: treatmentRecord.id,
                product_id: med.product_id,
                batch_id: med.batch_id || null,
                total_dose: null,
                days: days,
                daily_dose: null,
                unit: med.unit,
                start_date: formData.visit_datetime.split('T')[0],
                teat: med.teat || null,
                administration_route: med.administration_route || null,
              });

            if (courseError) throw courseError;

            // For multi-day courses, medications will be entered per visit
            // No immediate stock deduction
            console.log('📅 Created course entry (no immediate stock deduction)');
          } else {
            // Single dose - only create usage if visit is completed
            if (formData.status === 'Baigtas' || autoComplete) {
              console.log('✅ Creating usage_item (deducting stock):', {
                product_id: med.product_id,
                batch_id: med.batch_id,
                qty: med.qty,
                unit: med.unit
              });

              const { error: usageError } = await supabase
                .from('usage_items')
                .insert({
                  farm_id: selectedFarm!.id,
                  treatment_id: treatmentRecord.id,
                  product_id: med.product_id,
                  batch_id: med.batch_id,
                  qty: parseFloat(med.qty),
                  unit: med.unit,
                  purpose: med.purpose ? med.purpose : null,
                  teat: med.teat || null,
                  administration_route: med.administration_route || null,
                  administered_date: formData.visit_datetime.split('T')[0],
                });

              if (usageError) {
                console.error('❌ Error creating usage_item:', usageError);
                throw usageError;
              }
              console.log('✅ Stock deducted successfully');
            } else {
              console.log('⏸️  Visit not completed - storing as planned medication (no stock deduction yet)');
            }
          }
        }

        // Update the visit with planned medications if not completed
        if (formData.status !== 'Baigtas' && !autoComplete) {
          const plannedMeds = treatmentData.medications
            .filter(med => !(med.is_course && parseInt(med.course_days) > 1))
            .map(med => {
              return {
                product_id: med.product_id,
                batch_id: med.batch_id,
                qty: parseFloat(med.qty),
                unit: med.unit,
                purpose: med.purpose || 'Gydymas',
                teat: med.teat || null,
                administration_route: med.administration_route || null,
              };
            });

          if (plannedMeds.length > 0) {
            await supabase
              .from('animal_visits')
              .update({
                planned_medications: plannedMeds,
                medications_processed: false
              })
              .eq('id', visitData.id);
          }
        }

        // Calculate withdrawal dates using database function
        console.log('🔧 Calling calculate_withdrawal_dates for treatment:', treatmentRecord.id);
        const { data: rpcData, error: rpcError } = await supabase.rpc('calculate_withdrawal_dates', { p_treatment_id: treatmentRecord.id });

        if (rpcError) {
          console.error('❌ RPC Error calculating withdrawal dates:', rpcError);
          showNotification('Įspėjimas: Karencinių dienų skaičiavimas nepavyko. Klaida: ' + rpcError.message, 'warning');
        } else {
          console.log('✅ Withdrawal dates calculated successfully');
        }

        // Create future visits for recurring treatments with planned medications
        if (hasRecurringDays) {
          console.log('📅 Creating future visits for course...');
          console.log('Course schedule:', treatmentData.courseMedicationSchedule);

          // In EDIT mode: Fetch existing related visits to update them instead of deleting
          let existingVisits: any[] = [];
          if (isEditMode && visitToEdit) {
            console.log('🔄 Edit mode: Fetching existing related visits to update');
            const { data: existing } = await supabase
              .from('animal_visits')
              .select('*')
              .eq('related_visit_id', visitToEdit.id)
              .eq('status', 'Planuojamas'); // Only update unstarted planned visits

            existingVisits = existing || [];
            console.log(`Found ${existingVisits.length} existing related visits`);
          }

          let futureVisits: any[] = [];
          const todayDate = formData.visit_datetime.split('T')[0];
          
          // Check if all medications have quantities (new behavior for bulk entry)
          const allHaveQuantities = treatmentData.courseMedicationSchedule?.every((daySchedule: any) => 
            daySchedule.medications.every((med: any) => med.qty && med.batch_id)
          ) || false;

          // If we have a full course schedule (from CourseMedicationScheduler)
          if (treatmentData.courseMedicationSchedule && treatmentData.courseMedicationSchedule.length > 0) {
            console.log('✅ Using detailed course schedule with all quantities filled');
            console.log('All medications have quantities?', allHaveQuantities);

            // Filter out today's date to avoid creating a duplicate visit
            futureVisits = treatmentData.courseMedicationSchedule
              .filter((daySchedule: any) => daySchedule.date !== todayDate)
              .map((daySchedule: any) => {
                const medicationNames = daySchedule.medications
                  .map((med: any) => products.find(p => p.id === med.product_id)?.name)
                  .filter(Boolean)
                  .join(', ');

                const dailyMedications = daySchedule.medications.map((med: any) => ({
                  product_id: med.product_id,
                  batch_id: med.batch_id || null,
                  qty: med.qty || null,
                  unit: med.unit,
                  purpose: med.purpose || 'Gydymas',
                  teat: med.teat || null,
                }));

                return {
                  farm_id: selectedFarm!.id,
                  animal_id: animalId,
                  visit_datetime: `${daySchedule.date}T10:00:00`,
                  procedures: ['Gydymas'],
                  status: allHaveQuantities ? 'Baigtas' : 'Planuojamas',
                  notes: allHaveQuantities 
                    ? `Gydymo kursas (${treatmentData.disease_id ? diseases.find(d => d.id === treatmentData.disease_id)?.name || '' : 'liga nenurodyta'})\nVaistai: ${medicationNames}`
                    : `Pakartotinis gydymas (${treatmentData.disease_id ? diseases.find(d => d.id === treatmentData.disease_id)?.name || '' : 'liga nenurodyta'})\nVaistai: ${medicationNames}\n\n⚠️ Įveskite vaistų kiekį prieš užbaigiant vizitą`,
                  vet_name: formData.vet_name || null,
                  created_by_user_id: user?.full_name || user?.email || null,
                  next_visit_required: false,
                  treatment_required: true,
                  related_treatment_id: treatmentRecord.id,
                  related_visit_id: visitData.id,
                  planned_medications: dailyMedications,
                  medications_processed: allHaveQuantities,
                };
              });

            // Also add today's medications to the current visit being created
            const todaySchedule = treatmentData.courseMedicationSchedule.find(
              (daySchedule: any) => daySchedule.date === todayDate
            );

            if (todaySchedule) {
              console.log('✅ Found today\'s medications in course schedule, processing for today');

              // If all medications have quantities OR visit is being completed, deduct stock
              if (allHaveQuantities || autoComplete) {
                console.log('✅ Visit being completed - creating usage_items for today\'s medications');

                for (const med of todaySchedule.medications) {
                  if (med.batch_id && med.qty) {
                    const { error: usageError } = await supabase
                      .from('usage_items')
                      .insert({
                        farm_id: selectedFarm!.id,
                        treatment_id: treatmentRecord.id,
                        product_id: med.product_id,
                        batch_id: med.batch_id,
                        qty: parseFloat(med.qty),
                        unit: med.unit,
                        purpose: med.purpose || 'Gydymas',
                        teat: med.teat || null,
                        administered_date: todayDate,
                      });

                    if (usageError) {
                      console.error('❌ Error creating usage_item for today:', usageError);
                      throw usageError;
                    }
                  }
                }

                // Mark medications as processed
                await supabase
                  .from('animal_visits')
                  .update({ 
                    medications_processed: true,
                    status: 'Baigtas'
                  })
                  .eq('id', visitData.id);

                console.log('✅ Today\'s medications processed and stock deducted');
              } else {
                // Visit not being completed - store as planned medications
                const todayMedications = todaySchedule.medications.map((med: any) => ({
                  product_id: med.product_id,
                  batch_id: med.batch_id || null,
                  qty: null,
                  unit: med.unit,
                  purpose: med.purpose || 'Gydymas',
                  teat: med.teat || null,
                }));

                await supabase
                  .from('animal_visits')
                  .update({
                    planned_medications: todayMedications,
                    medications_processed: false
                  })
                  .eq('id', visitData.id);

                console.log('⏸️ Today\'s medications stored as planned (no stock deduction)');
              }
            }
          } else {
            // Fallback: Old system with same medications for all days
            console.log('⚠️ Using fallback: same medications for all days');

            const medicationNames = treatmentData.medications
              .map(med => products.find(p => p.id === med.product_id)?.name)
              .filter(Boolean)
              .join(', ');

            const dailyMedications = treatmentData.medications.map(med => ({
              product_id: med.product_id,
              batch_id: med.batch_id,
              qty: null,
              unit: med.unit,
              purpose: med.purpose || 'Gydymas',
              teat: med.teat || null,
              administration_route: med.administration_route || null,
            }));

            // Filter out today's date to avoid creating a duplicate visit
            futureVisits = treatmentData.recurring_days
              .filter(dateStr => dateStr !== todayDate)
              .map(dateStr => ({
                farm_id: selectedFarm!.id,
                animal_id: animalId,
                visit_datetime: `${dateStr}T10:00:00`,
                procedures: ['Gydymas'],
                status: 'Planuojamas',
                notes: `Pakartotinis gydymas (${treatmentData.disease_id ? diseases.find(d => d.id === treatmentData.disease_id)?.name || '' : 'liga nenurodyta'})\nVaistai: ${medicationNames}\n\n⚠️ Įveskite vaistų kiekį prieš užbaigiant vizitą`,
                vet_name: formData.vet_name || null,
                created_by_user_id: user?.full_name || user?.email || null,
                next_visit_required: false,
                treatment_required: true,
                related_treatment_id: treatmentRecord.id,
                related_visit_id: visitData.id,
                planned_medications: dailyMedications,
                medications_processed: false,
              }));
          }

          // Process future visits: update existing ones, create new ones, delete removed ones
          const scheduledDates = new Set(futureVisits.map(v => v.visit_datetime.split('T')[0]));
          const existingVisitsMap = new Map(
            existingVisits.map(v => [v.visit_datetime.split('T')[0], v])
          );

          let updatedCount = 0;
          let createdCount = 0;
          const visitsToCreate: any[] = [];

          // Update existing visits or create new ones
          for (const futureVisit of futureVisits) {
            const visitDate = futureVisit.visit_datetime.split('T')[0];
            const existingVisit = existingVisitsMap.get(visitDate);

            if (existingVisit) {
              // Update existing visit
              const { error: updateError } = await supabase
                .from('animal_visits')
                .update({
                  visit_datetime: futureVisit.visit_datetime,
                  procedures: futureVisit.procedures,
                  notes: futureVisit.notes,
                  vet_name: futureVisit.vet_name,
                  related_treatment_id: futureVisit.related_treatment_id,
                  planned_medications: futureVisit.planned_medications,
                  medications_processed: false,
                })
                .eq('id', existingVisit.id);

              if (updateError) {
                console.error('Error updating visit:', updateError);
              } else {
                updatedCount++;
              }
            } else {
              // Add to create list
              visitsToCreate.push(futureVisit);
            }
          }

          // Create new visits
          if (visitsToCreate.length > 0) {
            const { data: createdVisits, error: createError } = await supabase
              .from('animal_visits')
              .insert(visitsToCreate)
              .select();

            if (createError) {
              console.error('Error creating future visits:', createError);
              showNotification('Įspėjimas: Naujų vizitų sukūrimas nepavyko. Klaida: ' + createError.message, 'warning');
            } else {
              createdCount = visitsToCreate.length;
              
              // If visits were created as completed (with quantities), deduct stock immediately
              if (allHaveQuantities && createdVisits) {
                console.log('✅ Auto-completing course visits and deducting stock for all days');
                
                for (const visit of createdVisits) {
                  const visitDate = visit.visit_datetime.split('T')[0];
                  const daySchedule = treatmentData.courseMedicationSchedule.find(
                    (ds: any) => ds.date === visitDate
                  );
                  
                  if (daySchedule && daySchedule.medications) {
                    // Create usage_items for this visit
                    const usageItems = daySchedule.medications.map((med: any) => ({
                      farm_id: selectedFarm!.id,
                      treatment_id: treatmentRecord.id,
                      product_id: med.product_id,
                      batch_id: med.batch_id,
                      qty: parseFloat(med.qty),
                      unit: med.unit,
                      purpose: med.purpose || 'Gydymas',
                      teat: med.teat || null,
                      administration_route: med.administration_route || null,
                    }));
                    
                    const { error: usageError } = await supabase
                      .from('usage_items')
                      .insert(usageItems);
                    
                    if (usageError) {
                      console.error(`❌ Error creating usage_items for ${visitDate}:`, usageError);
                    } else {
                      console.log(`✅ Stock deducted for visit on ${visitDate}`);
                    }
                  }
                }
              }
            }
          }

          // Delete visits that are no longer in the schedule
          const visitsToDelete = existingVisits
            .filter(v => !scheduledDates.has(v.visit_datetime.split('T')[0]))
            .map(v => v.id);

          if (visitsToDelete.length > 0) {
            const { error: deleteError } = await supabase
              .from('animal_visits')
              .delete()
              .in('id', visitsToDelete);

            if (deleteError) {
              console.error('Error deleting removed visits:', deleteError);
            } else {
              console.log(`🗑️ Deleted ${visitsToDelete.length} visits no longer in schedule`);
            }
          }

          console.log(`✅ Updated ${updatedCount} visits, created ${createdCount} new visits, deleted ${visitsToDelete.length} old visits`);

          // Auto-enable "Reikia sekančio vizito" when course is created
          // The next visit should be AFTER the last course day for check-up
          const lastCourseDate = treatmentData.recurring_days[treatmentData.recurring_days.length - 1];
          const lastCourseDateObj = new Date(lastCourseDate);
          const checkupDate = new Date(lastCourseDateObj);
          checkupDate.setDate(checkupDate.getDate() + 3); // 3 days after last treatment

          await supabase
            .from('animal_visits')
            .update({
              next_visit_required: true,
              next_visit_date: checkupDate.toISOString().slice(0, 16),
            })
            .eq('id', visitData.id);

          console.log(`✅ Auto-enabled next visit for check-up on ${checkupDate.toLocaleDateString('lt')}`);
        }

        // Save disabled teats to teat_status table
        // Update all teats: set disabled for selected ones, enable all others
        console.log('💾 Saving teat statuses. Disabled teats:', disabledTeats);
        const allTeatPositions = ['K1', 'K2', 'D1', 'D2'];
        for (const teatPosition of allTeatPositions) {
          const isDisabled = disabledTeats.includes(teatPosition.toLowerCase());
          console.log(`  - ${teatPosition}: ${isDisabled ? 'DISABLED' : 'enabled'}`);

          const { data: teatData, error: teatError } = await supabase
            .from('teat_status')
            .upsert({
              farm_id: selectedFarm!.id,
              animal_id: animalId,
              teat_position: teatPosition.toLowerCase(),
              is_disabled: isDisabled,
              disabled_date: isDisabled ? formData.visit_datetime.split('T')[0] : null,
              disabled_reason: isDisabled ? (treatmentData.notes || 'Išjungtas per gydymą') : null,
            }, {
              onConflict: 'animal_id,teat_position'
            })
            .select();

          if (teatError) {
            console.error('❌ Error saving teat status for', teatPosition, ':', teatError);
            throw new Error(`Nepavyko išsaugoti spenos būsenos: ${teatError.message}`);
          } else {
            console.log('  ✅ Saved:', teatData);
          }
        }
        console.log('✅ All teat statuses updated');

        await logAction('create_treatment', 'treatments', treatmentRecord.id);
      }

      // 3. If Vakcina procedure, create vaccinations
      if (formData.procedures.includes('Vakcina')) {
        for (const vaccine of vaccinationData.vaccines) {
          if (!vaccine.product_id || !vaccine.batch_id || !vaccine.dose_amount) {
            throw new Error('Visi vakcinacijos laukai privalomi: produktas, serija ir dozė');
          }

          const { data: vaccinationRecord, error: vaccinationError } = await supabase
            .from('vaccinations')
            .insert({
              farm_id: selectedFarm!.id,
              animal_id: animalId,
              product_id: vaccine.product_id,
              batch_id: vaccine.batch_id,
              vaccination_date: formData.visit_datetime.split('T')[0],
              dose_amount: parseFloat(vaccine.dose_amount),
              dose_number: parseInt(vaccine.dose_number),
              unit: vaccine.unit,
              next_booster_date: vaccine.next_booster_date ? vaccine.next_booster_date : null,
              administered_by: vaccinationData.administered_by ? vaccinationData.administered_by : formData.vet_name,
              notes: vaccinationData.notes ? vaccinationData.notes : null,
            })
            .select()
            .single();

          if (vaccinationError) throw vaccinationError;

          await logAction('create_vaccination', 'vaccinations', vaccinationRecord.id);

          // If there's a next booster date, create a planned visit for it
          if (vaccine.next_booster_date) {
            const { error: futureVisitError } = await supabase
              .from('animal_visits')
              .insert({
                farm_id: selectedFarm!.id,
                animal_id: animalId,
                visit_datetime: `${vaccine.next_booster_date}T10:00:00`,
                procedures: ['Vakcina'],
                status: 'Planuojamas',
                notes: `Pakartotinė vakcina: ${products.find(p => p.id === vaccine.product_id)?.name || 'N/A'}`,
                vet_name: vaccinationData.administered_by || formData.vet_name || null,
                created_by_user_id: user?.full_name || user?.email || null,
                next_visit_required: false,
                treatment_required: false,
              });

            if (futureVisitError) {
              console.error('Error creating future vaccination visit:', futureVisitError);
            }
          }
        }
      }

      // 4. If Profilaktika procedure, create prevention records
      if (formData.procedures.includes('Profilaktika')) {
        for (const product of preventionData.products) {
          if (!product.product_id || !product.batch_id || !product.dose_qty) {
            throw new Error('Visi profilaktikos laukai privalomi: produktas, serija ir kiekis');
          }

          // If this is a multi-day prevention course
          if (product.is_course && parseInt(product.course_days) > 1) {
            const totalQty = parseFloat(product.dose_qty);
            const days = parseInt(product.course_days);
            const dailyDose = totalQty / days;

            // For TODAY'S visit: Only create biocide_usage if status is "Baigtas"
            if (formData.status === 'Baigtas' || autoComplete) {
              const { data: preventionRecord, error: preventionError } = await supabase
                .from('biocide_usage')
                .insert({
                  farm_id: selectedFarm!.id,
                  product_id: product.product_id,
                  batch_id: product.batch_id,
                  use_date: formData.visit_datetime.split('T')[0],
                  purpose: product.purpose ? product.purpose : 'Profilaktika',
                  work_scope: `Gyvūnas: ${animalId}`,
                  qty: dailyDose,
                  unit: product.dose_unit,
                  used_by_name: formData.vet_name ? formData.vet_name : null,
                })
                .select()
                .single();

              if (preventionError) throw preventionError;
              await logAction('create_prevention', 'biocide_usage', preventionRecord.id);
            }
          } else {
            // Single dose - only create if visit is completed
            if (formData.status === 'Baigtas' || autoComplete) {
              const { data: preventionRecord, error: preventionError } = await supabase
                .from('biocide_usage')
                .insert({
                  product_id: product.product_id,
                  batch_id: product.batch_id,
                  use_date: formData.visit_datetime.split('T')[0],
                  purpose: product.purpose ? product.purpose : 'Profilaktika',
                  work_scope: `Gyvūnas: ${animalId}`,
                  qty: parseFloat(product.dose_qty),
                  unit: product.dose_unit,
                  used_by_name: formData.vet_name ? formData.vet_name : null,
                })
                .select()
                .single();

              if (preventionError) throw preventionError;
              await logAction('create_prevention', 'biocide_usage', preventionRecord.id);
            }
          }
        }

        // Update the visit with planned prevention medications if not completed
        if (formData.status !== 'Baigtas') {
          const plannedPreventions = preventionData.products.map(product => {
            const dailyQty = product.is_course && parseInt(product.course_days) > 1
              ? parseFloat(product.dose_qty) / parseInt(product.course_days)
              : parseFloat(product.dose_qty);

            return {
              product_id: product.product_id,
              batch_id: product.batch_id,
              qty: dailyQty,
              unit: product.dose_unit,
              purpose: product.purpose || 'Profilaktika',
            };
          });

          await supabase
            .from('animal_visits')
            .update({
              planned_medications: plannedPreventions,
              medications_processed: false
            })
            .eq('id', visitData.id);
        }

        // Create future visits for prevention courses
        const hasPreventionCourse = preventionData.products.some(
          product => product.is_course && parseInt(product.course_days) > 1
        );

        if (hasPreventionCourse) {
          const productNames = preventionData.products
            .map(product => products.find(p => p.id === product.product_id)?.name)
            .filter(Boolean)
            .join(', ');

          // Get course days from the first course product
          const courseProduct = preventionData.products.find(
            product => product.is_course && parseInt(product.course_days) > 1
          );
          const courseDays = parseInt(courseProduct?.course_days || '1');

          // Calculate daily doses for each product
          const dailyPreventions = preventionData.products.map(product => {
            const dailyQty = product.is_course && parseInt(product.course_days) > 1
              ? parseFloat(product.dose_qty) / parseInt(product.course_days)
              : parseFloat(product.dose_qty);

            return {
              product_id: product.product_id,
              batch_id: product.batch_id,
              qty: dailyQty,
              unit: product.dose_unit,
              purpose: product.purpose || 'Profilaktika',
            };
          });

          // Create visits for remaining days (day 2, 3, etc.)
          const visitDate = new Date(formData.visit_datetime);
          const futureVisits = [];

          for (let i = 1; i < courseDays; i++) {
            const nextDate = new Date(visitDate);
            nextDate.setDate(nextDate.getDate() + i);
            const dateStr = nextDate.toISOString().split('T')[0];

            futureVisits.push({
              farm_id: selectedFarm!.id,
              animal_id: animalId,
              visit_datetime: `${dateStr}T10:00:00`,
              procedures: ['Profilaktika'],
              status: 'Planuojamas',
              notes: `Pakartotinė profilaktika (${courseDays} dienų kursas)\nProduktai: ${productNames}`,
              vet_name: formData.vet_name || null,
              created_by_user_id: user?.full_name || user?.email || null,
              next_visit_required: false,
              treatment_required: false,
              related_visit_id: visitData.id,
              planned_medications: dailyPreventions,
              medications_processed: false,
            });
          }

          if (futureVisits.length > 0) {
            const { error: futureVisitsError } = await supabase
              .from('animal_visits')
              .insert(futureVisits);

            if (futureVisitsError) {
              console.error('Error creating future prevention visits:', futureVisitsError);
              showNotification('Įspėjimas: Būsimų profilaktikos vizitų sukūrimas nepavyko. Klaida: ' + futureVisitsError.message, 'warning');
            } else {
              console.log(`✅ Created ${futureVisits.length} future prevention visits with planned medications`);
            }
          }
        }
      }

      // 5. If Nagai procedure, create hoof examination records
      if (formData.procedures.includes('Nagai')) {
        for (const exam of hoofData.examinations) {
          if (!exam.condition_code) {
            throw new Error('Visi nagų įrašai turi turėti būklės kodą');
          }

          const { data: hoofRecord, error: hoofError } = await supabase
            .from('hoof_records')
            .insert({
              animal_id: animalId,
              examination_date: hoofData.examination_date,
              leg: exam.leg,
              claw: exam.claw,
              condition_code: exam.condition_code,
              severity: exam.severity,
              was_trimmed: exam.was_trimmed,
              was_treated: exam.was_treated,
              treatment_product_id: exam.treatment_product_id || null,
              treatment_batch_id: exam.treatment_batch_id || null,
              treatment_quantity: exam.treatment_quantity ? parseFloat(exam.treatment_quantity) : null,
              treatment_unit: exam.treatment_unit || null,
              treatment_notes: exam.treatment_notes || null,
              bandage_applied: exam.bandage_applied,
              requires_followup: exam.requires_followup,
              followup_date: exam.followup_date || null,
              followup_completed: false,
              technician_name: hoofData.technician_name || null,
              notes: exam.notes || null,
              visit_id: visitData.id,
            })
            .select()
            .single();

          if (hoofError) throw hoofError;

          await logAction('create_hoof_record', 'hoof_records', hoofRecord.id);

          // If treatment was applied and product/batch selected, deduct from inventory
          if (exam.was_treated && exam.treatment_product_id && exam.treatment_batch_id && exam.treatment_quantity) {
            await supabase
              .from('biocide_usage')
              .insert({
                product_id: exam.treatment_product_id,
                batch_id: exam.treatment_batch_id,
                use_date: hoofData.examination_date,
                purpose: `Nagų gydymas - ${exam.leg} ${exam.claw === 'inner' ? 'Vidinis' : 'Išorinis'}`,
                work_scope: `Gyvūnas: ${animalId}, Būklė: ${exam.condition_code}`,
                qty: parseFloat(exam.treatment_quantity),
                unit: exam.treatment_unit!,
                used_by_name: hoofData.technician_name || formData.vet_name || null,
              });
          }

          // If follow-up required, create a planned visit
          if (exam.requires_followup && exam.followup_date) {
            const { error: followupVisitError } = await supabase
              .from('animal_visits')
              .insert({
                animal_id: animalId,
                visit_datetime: `${exam.followup_date}T10:00:00`,
                procedures: ['Nagai'],
                status: 'Planuojamas',
                notes: `Nagų pakartotinė apžiūra - ${exam.leg} ${exam.claw === 'inner' ? 'Vidinis' : 'Išorinis'} (${exam.condition_code})`,
                vet_name: hoofData.technician_name || formData.vet_name || null,
                next_visit_required: false,
                treatment_required: false,
              });

            if (followupVisitError) {
              console.error('Error creating follow-up visit:', followupVisitError);
            }
          }
        }

        // Add general notes to visit if provided
        if (hoofData.general_notes) {
          await supabase
            .from('animal_visits')
            .update({
              notes: (visitData.notes ? visitData.notes + '\n\n' : '') +
                     `Nagų apžiūros pastabos:\n${hoofData.general_notes}`
            })
            .eq('id', visitData.id);
        }
      }

      // Create next visit if required
      if (formData.next_visit_required && formData.next_visit_date) {
        const { data: nextVisitData, error: nextVisitError } = await supabase
          .from('animal_visits')
          .insert({
            animal_id: animalId,
            visit_datetime: formData.next_visit_date,
            procedures: formData.procedures,
            status: 'Planuojamas',
            notes: `Pakartotinis vizitas po: ${formData.procedures.join(', ')}`,
            vet_name: formData.vet_name,
            next_visit_required: false,
            treatment_required: false,
          })
          .select()
          .single();

        if (nextVisitError) {
          console.error('Error creating next visit:', nextVisitError);
          showNotification('Vizitas sukurtas, bet klaida kuriant sekantį vizitą: ' + nextVisitError.message, 'warning');
        } else {
          await logAction('create_future_visit', 'animal_visits', nextVisitData.id, null, {
            from_visit_id: visitData.id,
            scheduled_date: formData.next_visit_date
          });
        }
      }

      // Auto-complete the visit if requested (only for today's visit, not future ones)
      if (autoComplete && !isEditMode) {
        const { error: completeError } = await supabase
          .from('animal_visits')
          .update({ status: 'Baigtas' })
          .eq('id', visitData.id);

        if (completeError) {
          console.error('Error auto-completing visit:', completeError);

          // Check if it's an expired batch error
          if (completeError.message && completeError.message.includes('expired batch')) {
            showNotification('Vizitas sukurtas, bet negali būti užbaigtas - pasirinkta pasibaigusi serija. Prašome pasirinkti aktyvią seriją.', 'error');
          } else {
            showNotification('Vizitas sukurtas, bet nepavyko užbaigti automatiškai: ' + completeError.message, 'warning');
          }
        } else {
          await logAction('complete_visit', 'animal_visits', visitData.id);
          showNotification('Vizitas sukurtas ir užbaigtas!', 'success');
        }
      } else if (autoComplete && isEditMode) {
        // Edit mode with auto-complete
        await logAction('complete_visit', 'animal_visits', visitData.id);
        showNotification('Vizitas išsaugotas ir užbaigtas!', 'success');
      } else {
        // Determine if stock was deducted
        const hasTreatmentMeds = formData.procedures.includes('Gydymas') && treatmentData.medications.length > 0;
        const stockDeducted = hasTreatmentMeds && (formData.status === 'Baigtas' || autoComplete);
        const singleDoseMeds = treatmentData.medications.filter(med => !(med.is_course && parseInt(med.course_days) > 1));

        let message = isEditMode ? 'Vizitas sėkmingai atnaujintas!' : 'Vizitas ir visi susiję įrašai sėkmingai sukurti!';

        if (hasTreatmentMeds && singleDoseMeds.length > 0) {
          if (stockDeducted) {
            message += ' Vaistai nurašyti iš atsargų.';
          } else {
            message += ' Vaistai saugomi kaip planuojami (nebus nurašyti kol vizitas nebus užbaigtas).';
          }
        }

        showNotification(message, 'success');
      }

      onSuccess();
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div ref={modalContentRef} className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">{isEditMode ? 'Redaguoti vizitą' : 'Naujas vizitas'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data ir laikas *
            </label>
            <input
              type="datetime-local"
              value={formData.visit_datetime}
              onChange={(e) => {
                const newDateTime = e.target.value;
                setFormData({
                  ...formData,
                  visit_datetime: newDateTime,
                  temperature_measured_at: newDateTime,
                  next_visit_date: newDateTime,
                });
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Procedūros *
            </label>
            <div className="flex flex-wrap gap-2">
              {allProcedures.map(proc => (
                <button
                  key={proc}
                  type="button"
                  onClick={() => toggleProcedure(proc)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    formData.procedures.includes(proc)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {proc}
                </button>
              ))}
            </div>
          </div>


          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Pastabos
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Apžiūros rezultatai, pastebėjimai, būklė, papildoma informacija..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gydytojas
              </label>
              <input
                type="text"
                value={formData.vet_name}
                onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Gydytojo vardas"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Statusas
              </label>
              <select
                value={formData.status}
                onChange={(e) => {
                  const newStatus = e.target.value as VisitStatus;
                  // Warn if changing from Baigtas to something else
                  if (isEditMode && visitToEdit?.status === 'Baigtas' && newStatus !== 'Baigtas') {
                    if (!confirm('ĮSPĖJIMAS: Keičiate užbaigto vizito statusą. Jei pakeisite statusą į "' + newStatus + '", pridėti vaistai NEBUS nurašyti iš atsargų. Ar tikrai norite keisti statusą?')) {
                      return;
                    }
                  }
                  setFormData({ ...formData, status: newStatus });
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                title={isEditMode && visitToEdit?.status === 'Baigtas' ? 'Jei pakeisite statusą iš "Baigtas", nauji vaistai nebus nurašyti iš atsargų' : ''}
              >
                <option value="Planuojamas">Planuojamas</option>
                <option value="Vykdomas">Vykdomas</option>
                <option value="Baigtas">Baigtas</option>
                <option value="Atšauktas">Atšauktas</option>
                <option value="Neįvykęs">Neįvykęs</option>
              </select>
              {isEditMode && visitToEdit?.status === 'Baigtas' && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Vizitas užbaigtas. Išlaikykite "Baigtas" statusą, kad pridėti vaistai būtų nurašyti iš atsargų.
                </p>
              )}
            </div>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.next_visit_required}
                onChange={(e) => setFormData({ ...formData, next_visit_required: e.target.checked })}
                className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="font-medium text-gray-900">Reikia sekančio vizito?</span>
            </label>

            {formData.next_visit_required && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sekančio vizito data *
                </label>
                <input
                  type="date"
                  value={formData.next_visit_date}
                  onChange={(e) => setFormData({ ...formData, next_visit_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  required={formData.next_visit_required}
                />
              </div>
            )}
          </div>

          {/* GYDYMAS FORM */}
          {formData.procedures.includes('Gydymas') && (
            <div ref={treatmentSectionRef} className="p-4 bg-orange-50 border-2 border-orange-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Pill className="w-5 h-5 text-orange-600" />
                Gydymo informacija
              </h4>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Klinikinė diagnozė</label>
                  <select
                    value={treatmentData.disease_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewDiseaseModal(true);
                      } else {
                        setTreatmentData({ ...treatmentData, disease_id: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Pasirinkite diagnozę</option>
                    {diseases.map(disease => (
                      <option key={disease.id} value={disease.id}>{disease.name}</option>
                    ))}
                    <option value="__new__">+ Sukurti naują diagnozę</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                    <Thermometer className="w-4 h-4 text-red-500" />
                    Temperatūra (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.temperature}
                    onChange={(e) => setFormData({ ...formData, temperature: normalizeNumberInput(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    placeholder="38.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Matavimo laikas
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.temperature_measured_at}
                    onChange={(e) => setFormData({ ...formData, temperature_measured_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Klinikinis tyrimas</label>
                <textarea
                  value={treatmentData.clinical_diagnosis}
                  onChange={(e) => setTreatmentData({ ...treatmentData, clinical_diagnosis: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder="Klinikiniai tyrimai ir pastebėjimai..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kiti tyrimai</label>
                <textarea
                  value={treatmentData.tests}
                  onChange={(e) => setTreatmentData({ ...treatmentData, tests: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder="Papildomi tyrimai, laboratoriniai rezultatai..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ligos baigtis</label>
                  <select
                    value={treatmentData.outcome}
                    onChange={(e) => setTreatmentData({ ...treatmentData, outcome: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Pasirinkite</option>
                    <option value="Pasveiko">Pasveiko</option>
                    <option value="Mirė">Mirė</option>
                    <option value="Gydomas">Gydomas</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ligos baigtis (data)</label>
                  <input
                    type="date"
                    value={treatmentData.outcome_date}
                    onChange={(e) => setTreatmentData({ ...treatmentData, outcome_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              {/* SECTION 1: SINGLE-USE TREATMENT (TODAY ONLY) */}
              <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-5 h-5 text-blue-600" />
                  <h5 className="font-bold text-gray-900">Vienkartinis gydymas (tik šiandien)</h5>
                </div>
                <p className="text-xs text-gray-600 mb-3">Pasirinkite vaistus, kurie bus panaudoti tik šiandien</p>

                <div className="space-y-3">
                  {treatmentData.medications.map((med, idx) => {
                    const selectedProduct = products.find(p => p.id === med.product_id);
                    const stockLevel = med.product_id ? stockLevels[med.product_id] : undefined;
                    const availableBatches = batches.filter(b =>
                      b.product_id === med.product_id &&
                      (!b.expiry_date || new Date(b.expiry_date) >= new Date()) &&
                      b.qty_left > 0
                    );

                    return (
                      <div key={idx} className="bg-white p-3 rounded-lg border-2 border-gray-300 space-y-2">
                        <div className="grid grid-cols-12 gap-2">
                          <div className="col-span-4">
                            <select
                              value={med.product_id}
                              onChange={async (e) => {
                                const productId = e.target.value;
                                const newMeds = [...treatmentData.medications];
                                newMeds[idx].product_id = productId;

                                if (productId) {
                                  const product = products.find(p => p.id === productId);
                                  const oldestBatchId = await getOldestBatchWithStock(productId);
                                  newMeds[idx].batch_id = oldestBatchId;
                                  newMeds[idx].unit = product?.primary_pack_unit || 'ml';
                                  fetchStockLevel(productId);
                                } else {
                                  newMeds[idx].batch_id = '';
                                  newMeds[idx].unit = 'ml';
                                }

                                setTreatmentData({ ...treatmentData, medications: newMeds });
                              }}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Pasirinkite vaistą</option>
                              {sortByLithuanian(products.filter(p => p.category === 'medicines'), 'name').map(product => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                            </select>
                            {stockLevel !== undefined && (
                              <div className="text-xs text-gray-500 mt-0.5 px-1">
                                Likutis: <span className={stockLevel > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>{stockLevel.toFixed(2)}</span> {selectedProduct?.primary_pack_unit}
                              </div>
                            )}
                          </div>
                          <select
                            value={med.batch_id}
                            onChange={(e) => {
                              const newMeds = [...treatmentData.medications];
                              newMeds[idx].batch_id = e.target.value;
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-3 px-2 py-1 border border-gray-300 rounded text-sm"
                            disabled={!med.product_id}
                          >
                            <option value="">Serija *</option>
                            {availableBatches.map(b => (
                              <option key={b.id} value={b.id}>
                                {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'} · Likutis: {b.qty_left?.toFixed(2) || '0'}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Kiekis"
                            value={med.qty}
                            onChange={(e) => {
                              const newMeds = [...treatmentData.medications];
                              newMeds[idx].qty = normalizeNumberInput(e.target.value);
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-2 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <div className="col-span-2 px-2 py-1 border border-gray-200 bg-gray-50 rounded text-sm flex items-center text-gray-700 font-medium">
                            {selectedProduct?.primary_pack_unit || med.unit || 'ml'}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const newMeds = treatmentData.medications.filter((_, i) => i !== idx);
                              setTreatmentData({ ...treatmentData, medications: newMeds });
                            }}
                            className="col-span-1 px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Administration Route Buttons - Only show if product has withdrawal periods */}
                        {selectedProduct && (selectedProduct.withdrawal_days_milk || selectedProduct.withdrawal_days_meat) && (
                          <div className="space-y-2">
                            <label className="block text-xs font-medium text-gray-700">Būdas *</label>
                            <div className="flex flex-wrap gap-1.5">
                              {[
                                { code: 'iv', label: 'i.v' },
                                { code: 'im', label: 'i.m' },
                                { code: 'sc', label: 's.c' },
                                { code: 'iu', label: 'i.u' },
                                { code: 'imm', label: 'i.mm' },
                                { code: 'pos', label: 'p.o.s' }
                              ].map(route => (
                                <button
                                  key={route.code}
                                  type="button"
                                  onClick={() => {
                                    const newMeds = [...treatmentData.medications];
                                    newMeds[idx].administration_route = route.code;
                                    setTreatmentData({ ...treatmentData, medications: newMeds });
                                  }}
                                  className={`px-3 py-1 text-xs font-medium rounded border transition-colors ${
                                    med.administration_route === route.code
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {route.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {selectedProduct && (selectedProduct.withdrawal_days_milk || selectedProduct.withdrawal_days_meat || med.administration_route) && (
                          <div className="text-xs bg-amber-50 border-2 border-amber-300 rounded px-3 py-2">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertCircle className="w-4 h-4 text-amber-600" />
                              <span className="font-bold text-amber-900">Karencinės dienos:</span>
                            </div>
                            <div className="flex gap-4">
                              {med.administration_route && (
                                <>
                                  {selectedProduct[`withdrawal_${med.administration_route}_milk` as keyof typeof selectedProduct] && (
                                    <span className="text-blue-700 font-semibold">
                                      🥛 Pienas: {selectedProduct[`withdrawal_${med.administration_route}_milk` as keyof typeof selectedProduct] as number} d.
                                    </span>
                                  )}
                                  {selectedProduct[`withdrawal_${med.administration_route}_meat` as keyof typeof selectedProduct] && (
                                    <span className="text-red-700 font-semibold">
                                      🥩 Mėsa: {selectedProduct[`withdrawal_${med.administration_route}_meat` as keyof typeof selectedProduct] as number} d.
                                    </span>
                                  )}
                                </>
                              )}
                              {!med.administration_route && (
                                <>
                                  {selectedProduct.withdrawal_days_milk && (
                                    <span className="text-blue-700 font-semibold">
                                      🥛 Pienas: {selectedProduct.withdrawal_days_milk} d.
                                    </span>
                                  )}
                                  {selectedProduct.withdrawal_days_meat && (
                                    <span className="text-red-700 font-semibold">
                                      🥩 Mėsa: {selectedProduct.withdrawal_days_meat} d.
                                    </span>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setTreatmentData({
                        ...treatmentData,
                        medications: [...treatmentData.medications, { product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'Gydymas', is_course: false, course_days: '1', teat: '', administration_route: '' }]
                      });
                    }}
                    className="w-full px-3 py-2 border-2 border-dashed border-blue-300 rounded-lg text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Pridėti vaistą
                  </button>
                </div>
              </div>

              {/* SECTION 2: COURSE PLANNING (MULTI-DAY) */}
              <div className="bg-purple-50 border border-purple-300 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <h5 className="font-bold text-gray-900">Kurso planavimas (kelių dienų gydymas)</h5>
                </div>
                <p className="text-xs text-gray-600 mb-3">Suplanuokite gydymo kursą kelioms dienoms su skirtingais vaistais kiekvienai dienai</p>

                {!treatmentData.courseMedicationSchedule ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCourseSchedulerMedIndex(0);
                      setShowCourseScheduler(true);
                    }}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2 font-semibold transition-colors"
                  >
                    <Calendar className="w-5 h-5" />
                    Planuoti gydymo kursą
                  </button>
                ) : (
                  <div className="bg-white border-2 border-purple-300 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="font-bold text-gray-900">Kursas suplanuotas</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTreatmentData({
                            ...treatmentData,
                            courseMedicationSchedule: null,
                            recurring_days: []
                          });
                        }}
                        className="text-red-600 hover:bg-red-50 px-3 py-1 rounded text-sm font-medium"
                      >
                        Pašalinti kursą
                      </button>
                    </div>
                    <div className="text-sm text-gray-700 space-y-2">
                      <p className="font-semibold">📅 {treatmentData.courseMedicationSchedule.length} dienų gydymas</p>
                      <div className="space-y-1">
                        {treatmentData.courseMedicationSchedule.map((day: any, idx: number) => (
                          <div key={idx} className="text-xs bg-purple-50 px-3 py-2 rounded border border-purple-200">
                            <span className="font-semibold">Diena {idx + 1} ({new Date(day.date).toLocaleDateString('lt')})</span>
                            <span className="text-gray-600"> - {day.medications.length} vaistų</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setCourseSchedulerMedIndex(0);
                        setShowCourseScheduler(true);
                      }}
                      className="w-full mt-3 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      Redaguoti kursą
                    </button>
                  </div>
                )}
              </div>

              {/* TEAT SELECTOR */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-sm font-semibold text-gray-900 mb-2">Spenų būsena</h5>
                <TeatSelector
                  selectedSickTeats={sickTeats}
                  selectedDisabledTeats={disabledTeats}
                  onSickTeatsChange={setSickTeats}
                  onDisabledTeatsChange={setDisabledTeats}
                />
              </div>

              <div>
                <div className="space-y-3">
                  {/* WITHDRAWAL CALCULATION PREVIEW */}
                  {((treatmentData.medications.length > 0 && treatmentData.medications.some(m => m.product_id)) || treatmentData.courseMedicationSchedule) && (
                    <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 space-y-3">
                      <h5 className="font-bold text-amber-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Karencijos skaičiavimas (po išsaugojimo)
                      </h5>
                      <div className="text-sm space-y-2">
                        {/* Single-use medications */}
                        {treatmentData.medications
                          .filter(m => m.product_id)
                          .map((med, idx) => {
                            const product = products.find(p => p.id === med.product_id);
                            const milkDays = product?.withdrawal_days_milk || 0;
                            const meatDays = product?.withdrawal_days_meat || 0;

                            return (
                              <div key={idx} className="bg-white rounded border border-amber-300 p-2">
                                <div className="font-semibold text-gray-900 mb-1">{product?.name}</div>
                                <div className="text-xs text-gray-700 space-y-0.5">
                                  {milkDays > 0 && (
                                    <div className="text-blue-700">
                                      • 🥛 Pienas: {milkDays} dienų
                                    </div>
                                  )}
                                  {meatDays > 0 && (
                                    <div className="text-red-700">
                                      • 🥩 Mėsa: {meatDays} dienų
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {/* Course medications */}
                        {treatmentData.courseMedicationSchedule && (
                          <div className="bg-white rounded border border-amber-300 p-2">
                            <div className="font-semibold text-gray-900 mb-1">Gydymo kursas</div>
                            <div className="text-xs text-gray-700">
                              • Kursas trunka {treatmentData.courseMedicationSchedule.length} dienas
                              <br />• Karencija bus apskaičiuota automatiškai nuo paskutinės dienos
                            </div>
                          </div>
                        )}

                        <div className="pt-2 mt-2 border-t-2 border-amber-400 text-xs text-gray-600">
                          ℹ️ Tikslios datos bus apskaičiuotos automatiškai po išsaugojimo ir bus matomos gyvūno apžvalgoje.
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* SYNCHRONIZATION PROTOCOL */}
          {formData.procedures.includes('Sinchronizacijos protokolas') && (
            <div className="mt-4 p-4 bg-purple-50 border border-purple-300 rounded-lg">
              <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                Sinchronizacijos protokolas
              </h4>
              <SynchronizationProtocolComponent
                animalId={animalId}
                onProtocolCreated={() => {
                  setShowVisitModal(false);
                  showNotification('Sinchronizacijos protokolas sukurtas! Vizitai automatiškai sukurti.', 'success');
                  // Reload visits after a short delay to ensure DB has updated
                  setTimeout(() => {
                    loadVisits();
                  }, 500);
                }}
              />
            </div>
          )}

          {/* VAKCINA FORM */}
          {formData.procedures.includes('Vakcina') && (
            <div ref={vaccinationSectionRef} className="p-4 bg-purple-50 border-2 border-purple-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Syringe className="w-5 h-5 text-purple-600" />
                Vakcinacijos informacija
              </h4>

              <div className="space-y-3">
                {vaccinationData.vaccines.map((vaccine, index) => (
                  <div key={index} className="p-3 bg-white border border-purple-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Vakcina #{index + 1}</span>
                      {vaccinationData.vaccines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newVaccines = vaccinationData.vaccines.filter((_, i) => i !== index);
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vakcina *</label>
                      <select
                        value={vaccine.product_id}
                        onChange={async (e) => {
                          const productId = e.target.value;
                          const unit = products.find(p => p.id === productId)?.primary_pack_unit || 'ml';
                          const newVaccines = [...vaccinationData.vaccines];

                          if (productId) {
                            const oldestBatchId = await getOldestBatchWithStock(productId);
                            newVaccines[index] = { ...vaccine, product_id: productId, batch_id: oldestBatchId, unit: unit };
                            fetchStockLevel(productId);
                          } else {
                            newVaccines[index] = { ...vaccine, product_id: '', batch_id: '', unit: 'ml' };
                          }

                          setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        required
                      >
                        <option value="">Pasirinkite vakciną</option>
                        {products.filter(p => p.category === 'prevention' || p.category === 'vakcina').map(product => (
                          <option key={product.id} value={product.id}>{product.name}</option>
                        ))}
                      </select>
                      {vaccine.product_id && stockLevels[vaccine.product_id] !== undefined && (
                        <div className="text-xs text-gray-500 mt-1 px-1">
                          Likutis: <span className={stockLevels[vaccine.product_id] > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                            {stockLevels[vaccine.product_id].toFixed(2)}
                          </span> {products.find(p => p.id === vaccine.product_id)?.primary_pack_unit}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serija *</label>
                      <select
                        value={vaccine.batch_id}
                        onChange={(e) => {
                          const newVaccines = [...vaccinationData.vaccines];
                          newVaccines[index] = { ...vaccine, batch_id: e.target.value };
                          setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        disabled={!vaccine.product_id}
                        required
                      >
                        <option value="">Pasirinkite seriją</option>
                        {batches.filter(b =>
                          b.product_id === vaccine.product_id &&
                          (!b.expiry_date || new Date(b.expiry_date) >= new Date())
                        ).map(b => (
                          <option key={b.id} value={b.id}>
                            {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'} · Likutis: {b.qty_left?.toFixed(2) || '0'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dozė *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={vaccine.dose_amount}
                          onChange={(e) => {
                            const newVaccines = [...vaccinationData.vaccines];
                            newVaccines[index] = { ...vaccine, dose_amount: e.target.value };
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                        <select
                          value={vaccine.unit}
                          onChange={(e) => {
                            const newVaccines = [...vaccinationData.vaccines];
                            newVaccines[index] = { ...vaccine, unit: e.target.value as any };
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="vnt">vnt</option>
                          <option value="bolus">bolus</option>
                          <option value="syringe">syringe</option>
                          <option value="tabletkė">tabletkė</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dozės Nr.</label>
                        <input
                          type="number"
                          value={vaccine.dose_number}
                          onChange={(e) => {
                            const newVaccines = [...vaccinationData.vaccines];
                            newVaccines[index] = { ...vaccine, dose_number: e.target.value };
                            setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Pakartotinė vakcinacija (data)</label>
                      <input
                        type="date"
                        value={vaccine.next_booster_date}
                        onChange={(e) => {
                          const newVaccines = [...vaccinationData.vaccines];
                          newVaccines[index] = { ...vaccine, next_booster_date: e.target.value };
                          setVaccinationData({ ...vaccinationData, vaccines: newVaccines });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setVaccinationData({
                      ...vaccinationData,
                      vaccines: [...vaccinationData.vaccines, { product_id: '', batch_id: '', dose_amount: '', dose_number: '1', unit: 'ml', next_booster_date: '' }]
                    });
                  }}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti vakciną
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Atliko (vardas)</label>
                <input
                  type="text"
                  value={vaccinationData.administered_by}
                  onChange={(e) => setVaccinationData({ ...vaccinationData, administered_by: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Veterinaras"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={vaccinationData.notes}
                  onChange={(e) => setVaccinationData({ ...vaccinationData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows={2}
                />
              </div>
            </div>
          )}


          {/* PROFILAKTIKA FORM */}
          {formData.procedures.includes('Profilaktika') && (
            <div ref={preventionSectionRef} className="p-4 bg-green-50 border-2 border-green-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                Profilaktikos informacija
              </h4>

              <div className="space-y-3">
                {preventionData.products.map((product, index) => (
                  <div key={index} className="p-3 bg-white border border-green-200 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Produktas #{index + 1}</span>
                      {preventionData.products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const newProducts = preventionData.products.filter((_, i) => i !== index);
                            setPreventionData({ ...preventionData, products: newProducts });
                          }}
                          className="text-red-600 hover:bg-red-50 p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Produktas *</label>
                      <select
                        value={product.product_id}
                        onChange={async (e) => {
                          const productId = e.target.value;
                          const unit = products.find(p => p.id === productId)?.primary_pack_unit || 'ml';
                          const newProducts = [...preventionData.products];

                          if (productId) {
                            const oldestBatchId = await getOldestBatchWithStock(productId);
                            newProducts[index] = { ...product, product_id: productId, batch_id: oldestBatchId, dose_unit: unit };
                            fetchStockLevel(productId);
                          } else {
                            newProducts[index] = { ...product, product_id: '', batch_id: '', dose_unit: 'ml' };
                          }

                          setPreventionData({ ...preventionData, products: newProducts });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        required
                      >
                        <option value="">Pasirinkite produktą</option>
                        {products.filter(p =>
                          p.category === 'prevention' ||
                          p.category === 'biocide' ||
                          p.category === 'bolusas' ||
                          p.category === 'hygiene' ||
                          p.category === 'treatment_materials'
                        ).map(prod => (
                          <option key={prod.id} value={prod.id}>{prod.name}</option>
                        ))}
                      </select>
                      {product.product_id && stockLevels[product.product_id] !== undefined && (
                        <div className="text-xs text-gray-500 mt-1 px-1">
                          Likutis: <span className={stockLevels[product.product_id] > 0 ? 'text-green-600' : 'text-red-600 font-bold'}>
                            {stockLevels[product.product_id].toFixed(2)}
                          </span> {products.find(p => p.id === product.product_id)?.primary_pack_unit}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serija *</label>
                      <select
                        value={product.batch_id}
                        onChange={(e) => {
                          const newProducts = [...preventionData.products];
                          newProducts[index] = { ...product, batch_id: e.target.value };
                          setPreventionData({ ...preventionData, products: newProducts });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        disabled={!product.product_id}
                        required
                      >
                        <option value="">Pasirinkite seriją</option>
                        {batches.filter(b =>
                          b.product_id === product.product_id &&
                          (!b.expiry_date || new Date(b.expiry_date) >= new Date())
                        ).map(b => (
                          <option key={b.id} value={b.id}>
                            {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'} · Likutis: {b.qty_left?.toFixed(2) || '0'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kiekis *</label>
                        <input
                          type="number"
                          step="0.01"
                          value={product.dose_qty}
                          onChange={(e) => {
                            const newProducts = [...preventionData.products];
                            newProducts[index] = { ...product, dose_qty: e.target.value };
                            setPreventionData({ ...preventionData, products: newProducts });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                        <select
                          value={product.dose_unit}
                          onChange={(e) => {
                            const newProducts = [...preventionData.products];
                            newProducts[index] = { ...product, dose_unit: e.target.value as any };
                            setPreventionData({ ...preventionData, products: newProducts });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="vnt">vnt</option>
                          <option value="bolus">bolus</option>
                          <option value="syringe">syringe</option>
                          <option value="tabletkė">tabletkė</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Paskirtis</label>
                      <input
                        type="text"
                        value={product.purpose}
                        onChange={(e) => {
                          const newProducts = [...preventionData.products];
                          newProducts[index] = { ...product, purpose: e.target.value };
                          setPreventionData({ ...preventionData, products: newProducts });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="Parazitų prevencija, dezinfekcija, kt."
                      />
                    </div>

                    {/* Course checkbox and days input */}
                    <div className="border-t pt-3 space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={product.is_course}
                          onChange={(e) => {
                            const newProducts = [...preventionData.products];
                            newProducts[index].is_course = e.target.checked;
                            setPreventionData({ ...preventionData, products: newProducts });
                          }}
                          className="rounded border-gray-300"
                        />
                        <span className="text-gray-700">Kursas (keli dienas)</span>
                      </label>
                      {product.is_course && (
                        <>
                          <input
                            type="number"
                            min="2"
                            placeholder="Dienų"
                            value={product.course_days}
                            onChange={(e) => {
                              const newProducts = [...preventionData.products];
                              newProducts[index].course_days = e.target.value;
                              setPreventionData({ ...preventionData, products: newProducts });
                            }}
                            className="w-20 px-2 py-1 border border-gray-300 rounded text-xs"
                          />
                          {parseInt(product.course_days) > 1 && product.dose_qty && (
                            <span className="text-xs text-gray-600">
                              = {(parseFloat(product.dose_qty) / parseInt(product.course_days)).toFixed(2)} {product.dose_unit} / dieną
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPreventionData({
                      ...preventionData,
                      products: [...preventionData.products, { product_id: '', batch_id: '', dose_qty: '', dose_unit: 'ml', purpose: '', is_course: false, course_days: '1' }]
                    });
                  }}
                  className="w-full px-3 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti produktą
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={preventionData.notes}
                  onChange={(e) => setPreventionData({ ...preventionData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* NAGAI (HOOF EXAMINATION) FORM */}
          {formData.procedures.includes('Nagai') && (
            <div ref={hoofSectionRef} className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg space-y-4">
              <h4 className="font-bold text-gray-900 flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                Nagų apžiūra
              </h4>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Apžiūros data</label>
                    <input
                      type="date"
                      value={hoofData.examination_date}
                      onChange={(e) => setHoofData({ ...hoofData, examination_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Technikas</label>
                    <input
                      type="text"
                      value={hoofData.technician_name}
                      onChange={(e) => setHoofData({ ...hoofData, technician_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Techniko vardas..."
                    />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-gray-700 mb-3">Pasirinkite nagą apžiūrai:</p>
                  <HoofSelector
                    selectedLeg={selectedHoofLeg}
                    selectedClaw={selectedHoofClaw}
                    onSelect={(leg, claw) => {
                      setSelectedHoofLeg(leg);
                      setSelectedHoofClaw(claw);
                    }}
                    examinedClaws={new Set(hoofData.examinations.map(e => `${e.leg}-${e.claw}`))}
                    clawSeverities={new Map(hoofData.examinations.map(e => [`${e.leg}-${e.claw}`, e.severity]))}
                  />
                </div>

                {selectedHoofLeg && selectedHoofClaw && (
                  <div className="p-4 bg-white border-2 border-blue-300 rounded-lg space-y-3">
                    <h5 className="font-semibold text-gray-900">
                      {selectedHoofLeg} - {selectedHoofClaw === 'inner' ? 'Vidinis' : 'Išorinis'} nagas
                    </h5>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Būklės kodas</label>
                      <select
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => {
                          const existingIdx = hoofData.examinations.findIndex(
                            ex => ex.leg === selectedHoofLeg && ex.claw === selectedHoofClaw
                          );
                          const newExam = {
                            leg: selectedHoofLeg,
                            claw: selectedHoofClaw,
                            condition_code: e.target.value,
                            severity: 0,
                            was_trimmed: false,
                            was_treated: false,
                            bandage_applied: false,
                            requires_followup: false,
                          };

                          if (existingIdx >= 0) {
                            const updated = [...hoofData.examinations];
                            updated[existingIdx] = { ...updated[existingIdx], condition_code: e.target.value };
                            setHoofData({ ...hoofData, examinations: updated });
                          } else {
                            setHoofData({ ...hoofData, examinations: [...hoofData.examinations, newExam] });
                          }
                        }}
                        value={hoofData.examinations.find(e => e.leg === selectedHoofLeg && e.claw === selectedHoofClaw)?.condition_code || ''}
                      >
                        <option value="">Pasirinkite...</option>
                        {hoofConditions.map(c => (
                          <option key={c.id} value={c.code}>
                            {c.code} - {c.name_lt}
                          </option>
                        ))}
                      </select>
                    </div>

                    {hoofData.examinations.find(e => e.leg === selectedHoofLeg && e.claw === selectedHoofClaw) && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Sunkumas (0-4)</label>
                          <input
                            type="number"
                            min="0"
                            max="4"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            value={hoofData.examinations.find(e => e.leg === selectedHoofLeg && e.claw === selectedHoofClaw)?.severity || 0}
                            onChange={(e) => {
                              const updated = hoofData.examinations.map(ex =>
                                ex.leg === selectedHoofLeg && ex.claw === selectedHoofClaw
                                  ? { ...ex, severity: parseInt(e.target.value) || 0 }
                                  : ex
                              );
                              setHoofData({ ...hoofData, examinations: updated });
                            }}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hoofData.examinations.find(e => e.leg === selectedHoofLeg && e.claw === selectedHoofClaw)?.was_trimmed || false}
                              onChange={(e) => {
                                const updated = hoofData.examinations.map(ex =>
                                  ex.leg === selectedHoofLeg && ex.claw === selectedHoofClaw
                                    ? { ...ex, was_trimmed: e.target.checked }
                                    : ex
                                );
                                setHoofData({ ...hoofData, examinations: updated });
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700">Apkirpta</span>
                          </label>

                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={hoofData.examinations.find(e => e.leg === selectedHoofLeg && e.claw === selectedHoofClaw)?.requires_followup || false}
                              onChange={(e) => {
                                const updated = hoofData.examinations.map(ex =>
                                  ex.leg === selectedHoofLeg && ex.claw === selectedHoofClaw
                                    ? { ...ex, requires_followup: e.target.checked }
                                    : ex
                                );
                                setHoofData({ ...hoofData, examinations: updated });
                              }}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700">Reikia pakartotinės apžiūros</span>
                          </label>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            value={hoofData.examinations.find(e => e.leg === selectedHoofLeg && e.claw === selectedHoofClaw)?.notes || ''}
                            onChange={(e) => {
                              const updated = hoofData.examinations.map(ex =>
                                ex.leg === selectedHoofLeg && ex.claw === selectedHoofClaw
                                  ? { ...ex, notes: e.target.value }
                                  : ex
                              );
                              setHoofData({ ...hoofData, examinations: updated });
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Bendros pastabos</label>
                  <textarea
                    value={hoofData.general_notes}
                    onChange={(e) => setHoofData({ ...hoofData, general_notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                {hoofData.examinations.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-2">Apžiūrėti nagai: {hoofData.examinations.length}</p>
                    <div className="flex flex-wrap gap-2">
                      {hoofData.examinations.map((exam, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {exam.leg}-{exam.claw === 'inner' ? 'V' : 'I'} ({exam.condition_code})
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Atšaukti
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              {loading ? (isEditMode ? 'Saugoma...' : 'Kuriama...') : (isEditMode ? 'Išsaugoti pakeitimus' : 'Sukurti vizitą')}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none"
            >
              {loading ? (isEditMode ? 'Saugoma...' : 'Kuriama...') : (isEditMode ? 'Išsaugoti ir užbaigti' : 'Sukurti ir užbaigti')}
            </button>
          </div>
        </form>
      </div>

      {showNewDiseaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sukurti naują diagnozę</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Diagnozės pavadinimas *
                </label>
                <input
                  type="text"
                  value={newDiseaseName}
                  onChange={(e) => setNewDiseaseName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Įveskite ligos pavadinimą..."
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateDisease();
                    }
                  }}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewDiseaseModal(false);
                    setNewDiseaseName('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Atšaukti
                </button>
                <button
                  type="button"
                  onClick={handleCreateDisease}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Sukurti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCourseScheduler && selectedFarm && (
        <CourseMedicationScheduler
          animalId={animalId}
          farmId={selectedFarm.id}
          initialStartDate={formData.visit_datetime.split('T')[0]}
          initialSchedule={treatmentData.courseMedicationSchedule}
          onConfirm={(schedule) => {
            console.log('📅 Course schedule confirmed:', schedule);

            setTreatmentData({
              ...treatmentData,
              courseMedicationSchedule: schedule,
              recurring_days: schedule.map(s => s.date),
              medications: []
            });

            setShowCourseScheduler(false);
            setCourseSchedulerMedIndex(null);
          }}
          onCancel={() => {
            setShowCourseScheduler(false);
            setCourseSchedulerMedIndex(null);
          }}
        />
      )}
    </div>
  );
}

function VisitDetailModal({ visit, animalId, onClose, onSuccess }: { visit: AnimalVisit; animalId: string; onClose: () => void; onSuccess: () => void }) {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(visit.notes || '');
  const [status, setStatus] = useState(visit.status);
  const [showFutureVisitForm, setShowFutureVisitForm] = useState(false);
  const [futureVisitDate, setFutureVisitDate] = useState('');
  const [futureVisitNotes, setFutureVisitNotes] = useState('');
  const [showEditMode, setShowEditMode] = useState(false);
  const [showMedicationEntry, setShowMedicationEntry] = useState(false);
  const [medicationQuantities, setMedicationQuantities] = useState<Record<string, string>>({});
  const [medicationBatches, setMedicationBatches] = useState<Record<string, string>>({});
  const [syncStepBatchId, setSyncStepBatchId] = useState<string>('');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<any[]>([]);

  useEffect(() => {
    loadProductsAndBatches();
  }, [selectedFarm]);

  useEffect(() => {
    if (batches.length > 0) {
      checkMedicationEntry();
    }
  }, [batches, visit.planned_medications]);

  const loadProductsAndBatches = async () => {
    if (!selectedFarm) return;

    const [productsRes, batchesRes] = await Promise.all([
      supabase.from('products').select('*').eq('farm_id', selectedFarm.id).order('name'),
      supabase.from('batches').select('*').eq('farm_id', selectedFarm.id).order('expiry_date')
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
  };

  const checkMedicationEntry = () => {
    if (visit.planned_medications && Array.isArray(visit.planned_medications) && visit.status !== 'Baigtas') {
      // Always show medication entry form for planned medications
      setShowMedicationEntry(true);

      const initialQtys: Record<string, string> = {};
      const initialBatches: Record<string, string> = {};

      visit.planned_medications.forEach((med: any, idx: number) => {
        // Pre-fill with existing quantities if they exist
        initialQtys[`${idx}`] = med.qty != null && med.qty !== '' && med.qty !== 0 ? String(med.qty) : '';

        // Auto-select first available batch if no batch_id exists
        if (med.batch_id) {
          initialBatches[`${idx}`] = med.batch_id;
        } else {
          const availableBatches = batches.filter(b =>
            b.product_id === med.product_id &&
            (!b.expiry_date || new Date(b.expiry_date) >= new Date()) &&
            b.qty_left > 0
          );
          initialBatches[`${idx}`] = availableBatches[0]?.id || '';
        }
      });

      setMedicationQuantities(initialQtys);
      setMedicationBatches(initialBatches);
      console.log('🔍 Pre-filled medication quantities:', initialQtys);
      console.log('🔍 Auto-selected batches:', initialBatches);
      console.log('🔍 Visit planned_medications:', visit.planned_medications);
    }
  };

  if (showEditMode) {
    return (
      <VisitCreateModal
        animalId={animalId}
        visitToEdit={visit}
        onClose={() => setShowEditMode(false)}
        onSuccess={() => {
          setShowEditMode(false);
          onSuccess();
        }}
      />
    );
  }

  const handleCompleteVisit = async () => {
    if (status === 'Baigtas') {
      showNotification('Šis vizitas jau užbaigtas', 'warning');
      return;
    }

    // Handle synchronization visit completion
    if (visit.sync_step_id) {
      // Check if batch is required and selected
      const { data: syncStep } = await supabase
        .from('synchronization_steps')
        .select('medication_product_id, batch_id')
        .eq('id', visit.sync_step_id)
        .maybeSingle();

      if (syncStep?.medication_product_id && !syncStep.batch_id && !syncStepBatchId) {
        showNotification('Prašome pasirinkti pakuotę / seriją prieš užbaigiant vizitą', 'error');
        return;
      }

      if (!confirm('Ar tikrai norite pažymėti šį sinchronizacijos vizitą kaip užbaigtą? Vaistas bus nurašytas iš atsargų.')) {
        return;
      }

      setLoading(true);
      try {
        // Update sync step with batch (if selected) and mark as completed
        const updateData: any = {
          completed: true,
          completed_at: new Date().toISOString()
        };

        if (syncStepBatchId) {
          updateData.batch_id = syncStepBatchId;
        }

        const { error: syncError } = await supabase
          .from('synchronization_steps')
          .update(updateData)
          .eq('id', visit.sync_step_id);

        if (syncError) throw syncError;

        // Update visit status
        const { error: visitError } = await supabase
          .from('animal_visits')
          .update({
            status: 'Baigtas',
            notes: notes
          })
          .eq('id', visit.id);

        if (visitError) throw visitError;

        await logAction('complete_sync_visit', 'animal_visits', visit.id);
        onSuccess();
        showNotification('Sinchronizacijos vizitas sėkmingai užbaigtas! Vaistas nurašytas iš atsargų.', 'success');
      } catch (error: any) {
        showNotification('Klaida: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Handle regular visit completion (existing logic)
    let updatedMeds = visit.planned_medications;

    if (showMedicationEntry) {
      const allEntered = visit.planned_medications?.every((_: any, idx: number) => {
        const qty = medicationQuantities[`${idx}`];
        const batch = medicationBatches[`${idx}`];
        return qty && parseFloat(qty) > 0 && batch;
      });

      if (!allEntered) {
        showNotification('Prašome įvesti visų vaistų kiekius ir pasirinkti serijas prieš užbaigiant vizitą', 'error');
        return;
      }

      updatedMeds = visit.planned_medications?.map((med: any, idx: number) => ({
        ...med,
        qty: parseFloat(medicationQuantities[`${idx}`]),
        batch_id: medicationBatches[`${idx}`]
      }));
    }

    if (!confirm('Ar tikrai norite pažymėti šį vizitą kaip užbaigtą?')) {
      return;
    }

    setLoading(true);
    try {
      // CRITICAL FIX: Update both planned_medications AND status in a SINGLE atomic update
      // This prevents race conditions where the trigger fires before medications are updated
      const { error } = await supabase
        .from('animal_visits')
        .update({
          status: 'Baigtas',
          notes: notes,
          planned_medications: updatedMeds
        })
        .eq('id', visit.id);

      if (error) throw error;

      await logAction('complete_visit', 'animal_visits', visit.id);
      onSuccess();
      showNotification('Vizitas sėkmingai užbaigtas! Vaistai nurašyti iš atsargų.', 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateNotes = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('animal_visits')
        .update({
          notes: notes,
          status: status
        })
        .eq('id', visit.id);

      if (error) throw error;

      if (visit.sync_step_id) {
        const isCompleted = status === 'Atliktas' || status === 'Baigtas';
        await supabase
          .from('synchronization_steps')
          .update({
            completed: isCompleted,
            completed_at: isCompleted ? new Date().toISOString() : null
          })
          .eq('id', visit.sync_step_id);
      }

      await logAction('update_visit', 'animal_visits', visit.id);
      onSuccess();
      showNotification('Vizitas atnaujintas!', 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFutureVisit = async () => {
    if (!futureVisitDate) {
      showNotification('Prašome pasirinkti datą', 'error');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('animal_visits')
        .insert({
          animal_id: animalId,
          visit_datetime: futureVisitDate,
          procedures: visit.procedures,
          status: 'Planuojamas',
          notes: futureVisitNotes || `Pakartotinis vizitas po: ${visit.procedures.join(', ')}`,
          vet_name: visit.vet_name,
          next_visit_required: false,
          treatment_required: false,
        });

      if (error) throw error;

      await logAction('create_future_visit', 'animal_visits', null, null, {
        from_visit_id: visit.id,
        scheduled_date: futureVisitDate
      });

      setShowFutureVisitForm(false);
      setFutureVisitDate('');
      setFutureVisitNotes('');
      onSuccess();
      showNotification('Būsimas vizitas sėkmingai sukurtas!', 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case 'Baigtas': return 'bg-green-100 text-green-800 border-green-300';
      case 'Planuojamas': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Atšauktas': return 'bg-red-100 text-red-800 border-red-300';
      case 'Vykdomas': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Neįvykęs': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-blue-600 p-6 text-white border-b border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Vizito informacija</h2>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5" />
            <span className="text-lg">{formatDateTimeLT(visit.visit_datetime)}</span>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status and Key Info Section */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-gray-500 mb-1">Statusas</div>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VisitStatus)}
                  className={`w-full px-3 py-2 rounded-lg border-2 font-medium ${getStatusColor(status)}`}
                >
                  <option value="Planuojamas">Planuojamas</option>
                  <option value="Vykdomas">Vykdomas</option>
                  <option value="Baigtas">Užbaigtas</option>
                  <option value="Atšauktas">Atšauktas</option>
                  <option value="Neįvykęs">Neįvykęs</option>
                </select>
              </div>
              {visit.vet_name && (
                <div>
                  <div className="text-xs font-medium text-gray-500 mb-1">Veterinaras</div>
                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-300">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-blue-700">
                        {visit.vet_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{visit.vet_name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Metadata Section - Shows creation/update info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-xs font-semibold text-blue-900 mb-2">Vizito duomenys</div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Sukurta:</span>
                <span className="font-medium text-gray-900">{formatDateTimeLT(visit.created_at)}</span>
              </div>
              {visit.updated_at && visit.updated_at !== visit.created_at && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Atnaujinta:</span>
                  <span className="font-medium text-gray-900">{formatDateTimeLT(visit.updated_at)}</span>
                </div>
              )}
              {status === 'Baigtas' && (
                <div className="mt-2 pt-2 border-t border-blue-200">
                  <div className="flex items-center gap-2 text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-semibold">Vizitas užbaigtas</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-gray-900 mb-2">Procedūros</div>
            <div className="flex flex-wrap gap-2">
              {visit.procedures.map((proc, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium border border-blue-200">
                  {proc}
                </span>
              ))}
            </div>
          </div>

          {visit.temperature && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Thermometer className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <div className="text-xs font-medium text-gray-600">Temperatūra</div>
                  <div className="text-2xl font-bold text-red-700">{visit.temperature}°C</div>
                  {visit.temperature_measured_at && (
                    <div className="text-xs text-gray-500">{formatDateTimeLT(visit.temperature_measured_at)}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {visit.treatment_required && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-700">
                <Pill className="w-4 h-4" />
                <span className="font-medium">Reikalingas gydymas</span>
              </div>
            </div>
          )}

          {visit.next_visit_required && visit.next_visit_date && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-700">
                  <Calendar className="w-4 h-4" />
                  <span className="font-medium">Sekantis vizitas</span>
                </div>
                <span className="font-bold text-green-800">{formatDateTimeLT(visit.next_visit_date)}</span>
              </div>
            </div>
          )}

          {visit.sync_step_id && (
            <SyncStepMedicationDisplay
              visitId={visit.id}
              syncStepId={visit.sync_step_id}
              onBatchSelected={(batchId) => setSyncStepBatchId(batchId)}
            />
          )}

          {showMedicationEntry && visit.planned_medications && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Pill className="w-5 h-5 text-orange-700" />
                <h3 className="font-bold text-orange-900">Įveskite vaistų kiekius</h3>
              </div>
              <div className="bg-white rounded-lg p-3 mb-3">
                <p className="text-sm text-gray-700 mb-2">
                  Šis vizitas reikalauja rankiniu būdu įvesti faktinį sunaudotų vaistų kiekį.
                </p>
                <p className="text-xs text-gray-600">
                  ⚠️ Vaistai bus nurašyti iš atsargų tik kai įvesite kiekius ir užbaigsite vizitą.
                </p>
              </div>
              <div className="space-y-3">
                {visit.planned_medications.map((med: any, idx: number) => {
                  const product = products.find(p => p.id === med.product_id);
                  const selectedBatchId = medicationBatches[`${idx}`] || med.batch_id;
                  const selectedBatch = batches.find(b => b.id === selectedBatchId);
                  const availableBatches = batches.filter(b =>
                    b.product_id === med.product_id &&
                    (!b.expiry_date || new Date(b.expiry_date) >= new Date()) &&
                    b.qty_left > 0
                  );

                  return (
                    <div key={idx} className="bg-white rounded-lg border-2 border-orange-200 p-3">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{product?.name || 'Nežinomas produktas'}</div>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            if (confirm(`Ar tikrai norite pašalinti ${product?.name || 'šį vaistą'} iš vizito?`)) {
                              const updatedMeds = visit.planned_medications.filter((_: any, i: number) => i !== idx);
                              const { error } = await supabase
                                .from('animal_visits')
                                .update({ planned_medications: updatedMeds })
                                .eq('id', visit.id);
                              if (error) {
                                showNotification('Klaida: ' + error.message, 'error');
                              } else {
                                onSuccess();
                                showNotification('Vaistas pašalintas', 'success');
                              }
                            }
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Serija *
                          </label>
                          <select
                            value={selectedBatchId || ''}
                            onChange={(e) => {
                              setMedicationBatches({
                                ...medicationBatches,
                                [`${idx}`]: e.target.value
                              });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                            required
                          >
                            <option value="">Pasirinkite seriją</option>
                            {availableBatches.map(batch => (
                              <option key={batch.id} value={batch.id}>
                                {batch.lot || batch.serial_number || batch.id.slice(0, 8)} · Exp: {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString('lt') : 'N/A'} · Likutis: {batch.qty_left?.toFixed(2) || '0'}
                              </option>
                            ))}
                          </select>
                          {selectedBatch && selectedBatch.expiry_date && (
                            <div className="text-xs text-gray-600 mt-1">
                              Galioja iki: {formatDateLT(selectedBatch.expiry_date)}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 items-end">
                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Kiekis *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={medicationQuantities[`${idx}`] || ''}
                              onChange={(e) => {
                                setMedicationQuantities({
                                  ...medicationQuantities,
                                  [`${idx}`]: e.target.value
                                });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                              placeholder="0.00"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Vnt.
                            </label>
                            <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-medium text-gray-700">
                              {med.unit || product?.primary_pack_unit || 'ml'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Pastabos ir komentarai
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Pridėkite pastabas apie vizitą, gydymo rezultatus, rekomendacijas..."
            />
          </div>

          {showFutureVisitForm ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Suplanuoti būsimą vizitą
                </h3>
                <button
                  onClick={() => setShowFutureVisitForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data ir laikas
                  </label>
                  <input
                    type="datetime-local"
                    value={futureVisitDate}
                    onChange={(e) => setFutureVisitDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pastabos (neprivaloma)
                  </label>
                  <textarea
                    value={futureVisitNotes}
                    onChange={(e) => setFutureVisitNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Papildomos pastabos būsimam vizitui..."
                  />
                </div>
                <button
                  onClick={handleCreateFutureVisit}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
                >
                  {loading ? 'Kuriama...' : 'Sukurti būsimą vizitą'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowFutureVisitForm(true)}
              className="w-full px-4 py-2 border-2 border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Suplanuoti būsimą vizitą
            </button>
          )}

          <div className="space-y-3">
            <button
              onClick={() => setShowEditMode(true)}
              className="w-full px-4 py-3 border-2 border-orange-400 text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Redaguoti vizitą
            </button>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Atšaukti
              </button>
              <button
                onClick={handleUpdateNotes}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Saugoma...' : 'Išsaugoti'}
              </button>
              {status !== 'Baigtas' && (
                <button
                  onClick={handleCompleteVisit}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check className="w-5 h-5" />
                  {loading ? 'Užbaigiama...' : 'Užbaigti'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SyncStepMedicationDisplay({ visitId, syncStepId, onBatchSelected }: { visitId: string; syncStepId: string; onBatchSelected?: (batchId: string) => void }) {
  const [stepData, setStepData] = useState<any>(null);
  const [productData, setProductData] = useState<any>(null);
  const [batchData, setBatchData] = useState<any>(null);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [syncStepId]);

  const loadData = async () => {
    try {
      // Load synchronization step data
      const { data: step, error: stepError} = await supabase
        .from('synchronization_steps')
        .select('*')
        .eq('id', syncStepId)
        .maybeSingle();

      if (stepError) throw stepError;
      setStepData(step);

      // Load product and batch info if available
      if (step?.medication_product_id || step?.batch_id) {
        const [productRes, batchRes] = await Promise.all([
          step.medication_product_id
            ? supabase.from('products').select('*').eq('id', step.medication_product_id).maybeSingle()
            : Promise.resolve({ data: null }),
          step.batch_id
            ? supabase.from('batches').select('*').eq('id', step.batch_id).maybeSingle()
            : Promise.resolve({ data: null })
        ]);

        if (productRes.data) setProductData(productRes.data);
        if (batchRes.data) {
          setBatchData(batchRes.data);
          setSelectedBatchId(step.batch_id);
        }

        // If visit not completed and no batch selected, load available batches for selection
        if (productRes.data && !step.batch_id && !step.completed) {
          const { data: batches } = await supabase
            .from('batches')
            .select('*')
            .eq('product_id', step.medication_product_id)
            .gt('qty_left', 0)
            .order('expiry_date', { ascending: true });

          if (batches) {
            setAvailableBatches(batches);
          }
        }
      }
    } catch (error) {
      console.error('Error loading sync step medication data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="text-sm text-gray-600">Kraunama...</div>
      </div>
    );
  }

  if (!stepData) {
    return null;
  }

  return (
    <div className="bg-purple-50 border border-purple-300 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <Syringe className="w-5 h-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Sinchronizacijos vaistai</h3>
          <p className="text-xs text-gray-600">{stepData.completed ? 'Panaudoti vaistai šiame vizite' : 'Planuojami vaistai'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-4 border border-purple-200">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-500 mb-1">Vaistas</div>
              <div className="text-base font-semibold text-gray-900">{stepData.step_name}</div>
              {productData && (
                <div className="text-xs text-gray-600 mt-0.5">{productData.name}</div>
              )}
            </div>
            {!stepData.completed && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                <Clock className="w-3.5 h-3.5" />
                Laukiama
              </div>
            )}
            {stepData.completed && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Atlikta
              </div>
            )}
          </div>

          {stepData.dosage && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">
                {stepData.completed ? 'Panaudotas kiekis' : 'Planuojamas kiekis'}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-purple-700">{stepData.dosage}</div>
                <div className="text-lg text-gray-600">{stepData.dosage_unit}</div>
              </div>
            </div>
          )}

          {batchData && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Pakuotė / Serija</div>
              <div className="text-sm text-gray-900 font-medium">{batchData.lot || 'N/A'}</div>
            </div>
          )}

          {!stepData.completed && !batchData && availableBatches.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Pasirinkite pakuotę / seriją *
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => {
                  setSelectedBatchId(e.target.value);
                  if (onBatchSelected) {
                    onBatchSelected(e.target.value);
                  }
                }}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-sm"
                required
              >
                <option value="">-- Pasirinkite seriją --</option>
                {availableBatches.map(batch => (
                  <option key={batch.id} value={batch.id}>
                    {batch.lot} (Likutis: {batch.qty_left} {productData?.primary_pack_unit}) - Galioja iki: {batch.expiry_date}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!stepData.completed && !batchData && availableBatches.length === 0 && productData && (
            <div className="bg-orange-50 border border-orange-200 rounded p-2">
              <p className="text-xs text-orange-800">
                Nėra prieinamų pakuočių su likučiu
              </p>
            </div>
          )}

          {stepData.completed_at && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Panaudota</div>
              <div className="text-sm text-gray-700">{formatDateTimeLT(stepData.completed_at)}</div>
            </div>
          )}

          {!stepData.completed && stepData.scheduled_date && (
            <div>
              <div className="text-xs font-medium text-gray-500 mb-1">Planuojama data</div>
              <div className="text-sm text-gray-700">{formatDateLT(stepData.scheduled_date)}</div>
            </div>
          )}

          {productData && batchData?.purchase_price && batchData?.received_qty && stepData.dosage && (
            <div className="mt-3 pt-3 border-t border-purple-200">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-600">Savikaina:</span>
                <span className="text-lg font-bold text-purple-700">
                  €{((batchData.purchase_price / batchData.received_qty) * stepData.dosage).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
