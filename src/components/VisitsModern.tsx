import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows, formatAnimalDisplay } from '../lib/helpers';
import { Animal, AnimalVisit, VisitStatus, VisitProcedure } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { Calendar, Search, Filter, Thermometer, Clock, CheckCircle, XCircle, AlertCircle, Trash2, Download, ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { formatDateTimeLT, formatDateLT } from '../lib/formatters';
import { AnimalDetailSidebar } from './AnimalDetailSidebar';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

interface VisitWithAnimal extends AnimalVisit {
  animal?: Animal;
}

interface WithdrawalStatus {
  animal_id: string;
  milk_until: string | null;
  meat_until: string | null;
  milk_active: boolean;
  meat_active: boolean;
}

export function VisitsModern() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [visits, setVisits] = useState<VisitWithAnimal[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [withdrawalStatuses, setWithdrawalStatuses] = useState<Map<string, WithdrawalStatus>>(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [neckNumberSearch, setNeckNumberSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<VisitStatus | 'all'>('all');
  const [filterProcedure, setFilterProcedure] = useState<VisitProcedure | 'all'>('all');
  const [filterVet, setFilterVet] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [showPastVisits, setShowPastVisits] = useState(false);

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  // Real-time subscription for animal_visits
  useRealtimeSubscription({
    table: 'animal_visits',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback(async (payload) => {
      const newVisit = payload.new as AnimalVisit;
      // Fetch the animal data to ensure it's loaded
      const { data: animalData } = await supabase
        .from('animals')
        .select('*')
        .eq('id', newVisit.animal_id)
        .maybeSingle();

      setVisits(prev => [{ ...newVisit, animal: animalData || undefined }, ...prev].sort((a, b) =>
        new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime()
      ));

      // Update animals list if this is a new animal
      if (animalData) {
        setAnimals(prev => {
          if (!prev.find(a => a.id === animalData.id)) {
            return [...prev, animalData];
          }
          return prev;
        });
      }
    }, []),
    onUpdate: useCallback(async (payload) => {
      const updatedVisit = payload.new as AnimalVisit;
      // Fetch the animal data to ensure it's loaded
      const { data: animalData } = await supabase
        .from('animals')
        .select('*')
        .eq('id', updatedVisit.animal_id)
        .maybeSingle();

      setVisits(prev => prev.map(visit =>
        visit.id === updatedVisit.id ? { ...updatedVisit, animal: animalData || undefined } : visit
      ));
    }, []),
    onDelete: useCallback((payload) => {
      setVisits(prev => prev.filter(visit => visit.id !== payload.old.id));
    }, []),
  });

  const loadData = async () => {
    try {
      if (!selectedFarm) {
        setLoading(false);
        return;
      }

      const [visitsRes, animalsRes, withdrawalData] = await Promise.all([
        supabase
          .from('animal_visits')
          .select('*')
          .eq('farm_id', selectedFarm.id)
          .order('visit_datetime', { ascending: false }),
        supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no'),
        supabase.from('vw_withdrawal_status').select('*').eq('farm_id', selectedFarm.id),
      ]);

      console.log('📊 Loaded visits:', visitsRes.data?.length);
      console.log('📊 Loaded animals:', animalsRes.data?.length);

      // Create withdrawal status map
      const withdrawalMap = new Map<string, WithdrawalStatus>();
      (withdrawalData.data || []).forEach((status: any) => {
        withdrawalMap.set(status.animal_id, status);
      });
      setWithdrawalStatuses(withdrawalMap);

      const animalsData = animalsRes.data || [];
      const visitsWithAnimals = (visitsRes.data || []).map(visit => {
        const animal = animalsData.find((a: Animal) => a.id === visit.animal_id);
        console.log(`Visit ${visit.id} with animal_id ${visit.animal_id} -> Found animal:`, animal?.tag_no);
        return {
          ...visit,
          animal,
        };
      });

      console.log('📊 Visits with animals:', visitsWithAnimals.filter(v => v.animal).length);
      setVisits(visitsWithAnimals);
      setAnimals(animalsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async (visitId: string, animalDisplay: string) => {
    if (!confirm(`Ar tikrai norite ištrinti vizitą gyvūnui ${animalDisplay}?`)) {
      return;
    }

    try {
      const { data: treatments, error: treatmentError } = await supabase
        .from('treatments')
        .select('id')
        .eq('visit_id', visitId);

      if (treatmentError) throw treatmentError;

      if (treatments && treatments.length > 0) {
        const treatmentIds = treatments.map(t => t.id);

        const { error: usageError } = await supabase
          .from('usage_items')
          .delete()
          .in('treatment_id', treatmentIds);

        if (usageError) throw usageError;

        const { error: deleteError } = await supabase
          .from('treatments')
          .delete()
          .in('id', treatmentIds);

        if (deleteError) throw deleteError;
      }

      const { error: visitError } = await supabase
        .from('animal_visits')
        .delete()
        .eq('id', visitId);

      if (visitError) throw visitError;

      setVisits(prev => prev.filter(v => v.id !== visitId));
      logAction('delete_visit', 'animal_visits', visitId);

      alert('Vizitas sėkmingai ištrintas');
    } catch (error) {
      console.error('Error deleting visit:', error);
      alert('Klaida trinant vizitą');
    }
  };

  const uniqueVets = Array.from(new Set(visits.map(v => v.vet_name).filter(Boolean)));

  const exportToExcel = () => {
    const visitsToExport = filteredVisits;

    if (visitsToExport.length === 0) {
      alert('Nėra vizitų eksportavimui');
      return;
    }

    const headers = ['Data', 'Gyvūnas', 'Kaklo Nr.', 'Statusas', 'Procedūros', 'Veterinaras', 'Temperatūra', 'Pastabos'];
    const rows = visitsToExport.map(visit => [
      formatDateTimeLT(visit.visit_datetime),
      formatAnimalDisplay(visit.animal),
      visit.animal?.collar_no || '',
      visit.status,
      visit.procedures.join(', '),
      visit.vet_name || '',
      visit.temperature || '',
      visit.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    let filename = 'vizitai';
    if (dateFrom && dateTo) {
      filename += `_${dateFrom}_${dateTo}`;
    } else if (dateFrom) {
      filename += `_nuo_${dateFrom}`;
    } else if (dateTo) {
      filename += `_iki_${dateTo}`;
    } else {
      filename += `_${new Date().toISOString().split('T')[0]}`;
    }
    filename += '.csv';

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isToday = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isTomorrow = (dateStr: string) => {
    const date = new Date(dateStr);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.toDateString() === tomorrow.toDateString();
  };

  const isThisWeek = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    return date > today && date <= nextWeek && !isTomorrow(dateStr);
  };

  const filteredVisits = visits.filter(visit => {
    // Hide cancelled visits (from auto-cancelled synchronization protocols)
    if (visit.status === 'Atšauktas') return false;

    if (filterStatus !== 'all' && visit.status !== filterStatus) return false;
    if (filterProcedure !== 'all' && !visit.procedures.includes(filterProcedure)) return false;
    if (filterVet !== 'all' && visit.vet_name !== filterVet) return false;

    if (dateFrom) {
      const visitDate = new Date(visit.visit_datetime);
      const fromDate = new Date(dateFrom);
      if (visitDate < fromDate) return false;
    }

    if (dateTo) {
      const visitDate = new Date(visit.visit_datetime);
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59);
      if (visitDate > toDate) return false;
    }

    // General search (ID, holder, vet, notes)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesAnimal =
        visit.animal?.tag_no?.toLowerCase().includes(term) ||
        visit.animal?.species.toLowerCase().includes(term) ||
        visit.animal?.holder_name?.toLowerCase().includes(term);
      const matchesNotes = visit.notes?.toLowerCase().includes(term);
      const matchesVet = visit.vet_name?.toLowerCase().includes(term);
      if (!matchesAnimal && !matchesNotes && !matchesVet) return false;
    }

    // Neck number search (exact match on collar_no)
    if (neckNumberSearch) {
      const neckTerm = neckNumberSearch.toLowerCase().trim();
      const collarNo = (visit.animal as any)?.collar_no?.toLowerCase() || (visit.animal as any)?.neck_no?.toLowerCase() || '';
      if (!collarNo.includes(neckTerm)) return false;
    }

    return true;
  });

  // Categorize visits by time
  const todayVisits = filteredVisits.filter(v => isToday(v.visit_datetime));
  const futureVisits = filteredVisits.filter(v => new Date(v.visit_datetime) > new Date());
  const pastVisits = filteredVisits.filter(v => {
    const visitDate = new Date(v.visit_datetime);
    const today = new Date();
    return visitDate < today && visitDate.toDateString() !== today.toDateString();
  });

  // Separate by completion status
  const todayIncomplete = todayVisits.filter(v => v.status !== 'Baigtas');
  const todayCompleted = todayVisits.filter(v => v.status === 'Baigtas');

  const futureIncomplete = futureVisits.filter(v => v.status !== 'Baigtas');
  const futureCompleted = futureVisits.filter(v => v.status === 'Baigtas');

  // Further categorize future incomplete visits
  const tomorrowVisits = futureIncomplete.filter(v => isTomorrow(v.visit_datetime));
  const thisWeekVisits = futureIncomplete.filter(v => isThisWeek(v.visit_datetime));
  const laterVisits = futureIncomplete.filter(v => !isTomorrow(v.visit_datetime) && !isThisWeek(v.visit_datetime));

  const pastIncomplete = pastVisits.filter(v => v.status !== 'Baigtas');
  const pastCompleted = pastVisits.filter(v => v.status === 'Baigtas');

  const getStatusColor = (status: VisitStatus) => {
    switch (status) {
      case 'Planuojamas': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Vykdomas': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Baigtas': return 'bg-green-100 text-green-800 border-green-200';
      case 'Atšauktas': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Neįvykęs': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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

  if (loading) {
    return <div className="flex items-center justify-center h-64">Kraunama...</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Vizitai</h2>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <Download className="w-4 h-4" />
          Eksportuoti į Excel
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
          <h3 className="text-sm sm:text-base font-semibold text-gray-900">Filtrai</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data nuo</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Data iki</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Statusas</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as VisitStatus | 'all')}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="all">Visi</option>
              <option value="Planuojamas">Planuojamas</option>
              <option value="Vykdomas">Vykdomas</option>
              <option value="Baigtas">Baigtas</option>
              <option value="Atšauktas">Atšauktas</option>
              <option value="Neįvykęs">Neįvykęs</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Procedūra</label>
            <select
              value={filterProcedure}
              onChange={(e) => setFilterProcedure(e.target.value as VisitProcedure | 'all')}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="all">Visos</option>
              <option value="Temperatūra">Temperatūra</option>
              <option value="Apžiūra">Apžiūra</option>
              <option value="Profilaktika">Profilaktika</option>
              <option value="Gydymas">Gydymas</option>
              <option value="Vakcina">Vakcina</option>
              <option value="Kita">Kita</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Gydytojas</label>
            <select
              value={filterVet}
              onChange={(e) => setFilterVet(e.target.value)}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
            >
              <option value="all">Visi</option>
              {uniqueVets.map(vet => (
                <option key={vet} value={vet}>{vet}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-3">
            <div className="relative">
              <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Ieškoti pagal gyvūną, savininko vardą, pastabas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
            <div className="relative">
              <Activity className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-emerald-500 w-4 h-4 sm:w-5 sm:h-5" />
              <input
                type="text"
                placeholder="Ieškoti pagal kaklo numerį..."
                value={neckNumberSearch}
                onChange={(e) => setNeckNumberSearch(e.target.value)}
                className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-1.5 sm:py-2 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              />
            </div>
          </div>
          {(searchTerm || neckNumberSearch || dateFrom || dateTo || filterStatus !== 'all' || filterProcedure !== 'all' || filterVet !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setNeckNumberSearch('');
                setDateFrom('');
                setDateTo('');
                setFilterStatus('all');
                setFilterProcedure('all');
                setFilterVet('all');
              }}
              className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Išvalyti filtrus
            </button>
          )}
        </div>
      </div>

      {/* MISSED/OVERDUE VISITS */}
      {pastIncomplete.length > 0 && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0" />
            <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-red-700 break-words">⚠️ Praleisti vizitai - Reikia atlikti! ({pastIncomplete.length})</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pastIncomplete.map(visit => (
              <VisitCard
                key={visit.id}
                visit={visit}
                getStatusColor={getStatusColor}
                getStatusIcon={getStatusIcon}
                onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                onDelete={(e) => {
                  e.stopPropagation();
                  handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                }}
                withdrawalStatus={visit.animal ? withdrawalStatuses.get(visit.animal.id) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* TODAY'S VISITS */}
      {todayVisits.length > 0 && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 flex-shrink-0" />
            <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-orange-700">Šiandienos vizitai ({todayVisits.length})</h3>
          </div>

          {todayIncomplete.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 uppercase tracking-wide">Reikia atlikti</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayIncomplete.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                    }}
                    withdrawalStatus={visit.animal ? withdrawalStatuses.get(visit.animal.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {todayCompleted.length > 0 && (
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-green-700 mb-2 sm:mb-3 uppercase tracking-wide flex items-center gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                Atlikta šiandien
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {todayCompleted.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                    }}
                    withdrawalStatus={visit.animal ? withdrawalStatuses.get(visit.animal.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* FUTURE VISITS */}
      {futureVisits.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
            <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-blue-700">Būsimi vizitai ({futureVisits.length})</h3>
          </div>

          {tomorrowVisits.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs sm:text-sm font-semibold text-orange-700 mb-2 sm:mb-3 uppercase tracking-wide">Rytoj ({tomorrowVisits.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tomorrowVisits.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                    }}
                    withdrawalStatus={visit.animal ? withdrawalStatuses.get(visit.animal.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {thisWeekVisits.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs sm:text-sm font-semibold text-blue-700 mb-2 sm:mb-3 uppercase tracking-wide">Šią savaitę ({thisWeekVisits.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {thisWeekVisits.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                    }}
                    withdrawalStatus={visit.animal ? withdrawalStatuses.get(visit.animal.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {laterVisits.length > 0 && (
            <div className="mb-6">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3 uppercase tracking-wide">Vėliau ({laterVisits.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {laterVisits.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                    }}
                    withdrawalStatus={visit.animal ? withdrawalStatuses.get(visit.animal.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}

          {futureCompleted.length > 0 && (
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-green-700 mb-2 sm:mb-3 uppercase tracking-wide flex items-center gap-2">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                Atlikta iš anksto
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {futureCompleted.map(visit => (
                  <VisitCard
                    key={visit.id}
                    visit={visit}
                    getStatusColor={getStatusColor}
                    getStatusIcon={getStatusIcon}
                    onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    onDelete={(e) => {
                      e.stopPropagation();
                      handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                    }}
                    withdrawalStatus={visit.animal ? withdrawalStatuses.get(visit.animal.id) : undefined}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PAST COMPLETED VISITS */}
      {pastCompleted.length > 0 && (
        <div className="border-t-4 border-gray-300 pt-4 sm:pt-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0" />
              <h3 className="text-sm sm:text-lg lg:text-xl font-bold text-green-700">Ankstesni užbaigti vizitai ({pastCompleted.length})</h3>
            </div>
            {!searchTerm && !neckNumberSearch && !dateFrom && !dateTo && filterStatus === 'all' && filterProcedure === 'all' && filterVet === 'all' && (
              <button
                onClick={() => setShowPastVisits(!showPastVisits)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                {showPastVisits ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    <span className="hidden sm:inline">Paslėpti</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    <span className="hidden sm:inline">Rodyti</span>
                  </>
                )}
              </button>
            )}
          </div>
          {(showPastVisits || searchTerm || neckNumberSearch || dateFrom || dateTo || filterStatus !== 'all' || filterProcedure !== 'all' || filterVet !== 'all') && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Laikas</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvūnas</th>
                    <th className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Procedūros</th>
                    <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Statusas</th>
                    <th className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydytojas</th>
                    <th className="hidden xl:table-cell px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Pastabos</th>
                    <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">Veiksmai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pastCompleted.slice(0, 20).map(visit => (
                    <tr
                      key={visit.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => visit.animal && setSelectedAnimal(visit.animal)}
                    >
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                        <div className="font-medium text-gray-900">{formatDateLT(visit.visit_datetime)}</div>
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                        <div className="font-medium text-gray-900">{formatAnimalDisplay(visit.animal)}</div>
                        {(visit.animal as any)?.neck_no && (
                          <div className="text-xs text-gray-500">Kaklo Nr.: {(visit.animal as any).neck_no}</div>
                        )}
                        <div className="text-gray-600">{visit.animal?.sex}</div>
                      </td>
                      <td className="hidden md:table-cell px-2 sm:px-4 py-2 sm:py-3">
                        <div className="flex flex-wrap gap-1">
                          {visit.procedures.map((proc, idx) => (
                            <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                              {proc}
                            </span>
                          ))}
                        </div>
                        {visit.temperature && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                            <Thermometer className="w-3 h-3" />
                            {visit.temperature}°C
                          </div>
                        )}
                      </td>
                      <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit border ${getStatusColor(visit.status)}`}>
                          {getStatusIcon(visit.status)}
                          {visit.status}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700">
                        {visit.vet_name || '-'}
                      </td>
                      <td className="hidden xl:table-cell px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-700 max-w-xs truncate">
                        {visit.notes || '-'}
                      </td>
                      <td className="px-2 sm:px-4 py-2 sm:py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteVisit(visit.id, formatAnimalDisplay(visit.animal));
                          }}
                          className="p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Ištrinti vizitą"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
              {pastCompleted.length > 20 && (
                <p className="text-xs sm:text-sm text-gray-500 text-center py-2 sm:py-3 bg-gray-50 rounded-lg mt-2">
                  + dar {pastCompleted.length - 20} užbaigti vizitai
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {filteredVisits.length === 0 && (
        <div className="text-center py-8 sm:py-12 text-gray-500">
          <Calendar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 opacity-50" />
          <p className="text-sm sm:text-base">Nerasta vizitų</p>
        </div>
      )}

      {selectedAnimal && (
        <AnimalDetailSidebar
          animal={selectedAnimal}
          defaultTab="visits"
          onClose={() => {
            setSelectedAnimal(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}

function VisitCard({ visit, getStatusColor, getStatusIcon, onClick, onDelete, withdrawalStatus }: {
  visit: VisitWithAnimal;
  getStatusColor: (status: VisitStatus) => string;
  getStatusIcon: (status: VisitStatus) => JSX.Element;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  withdrawalStatus?: WithdrawalStatus;
}) {
  const isCancelled = visit.status === 'Atšauktas';

  return (
    <div className={`bg-white border-2 rounded-lg p-3 sm:p-4 hover:shadow-lg transition-all relative group ${
      isCancelled ? 'border-red-300 bg-gray-50 opacity-75' : 'border-gray-200 hover:border-blue-300'
    }`}>
      <button
        onClick={onDelete}
        className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 p-1 sm:p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        title="Ištrinti vizitą"
      >
        <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>

      <div onClick={onClick} className="cursor-pointer">
        <div className="flex items-start justify-between mb-2 sm:mb-3 pr-7 sm:pr-8">
          <div className="flex-1 min-w-0">
            <div className="flex items-start flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <div className="font-bold text-gray-900 text-base sm:text-lg truncate">
                {formatAnimalDisplay(visit.animal) !== '-' ? formatAnimalDisplay(visit.animal) : <span className="text-red-500">Loading...</span>}
              </div>
              {withdrawalStatus && (withdrawalStatus.milk_active || withdrawalStatus.meat_active) && (
                <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-red-100 border border-red-300 rounded text-xs font-medium text-red-700" title="Karencijos periodas">
                  <AlertCircle className="w-3 h-3" />
                  {withdrawalStatus.milk_active && withdrawalStatus.milk_until && (
                    <span>🥛 {formatDateLT(withdrawalStatus.milk_until)}</span>
                  )}
                  {withdrawalStatus.milk_active && withdrawalStatus.meat_active && <span className="mx-0.5 sm:mx-1">|</span>}
                  {withdrawalStatus.meat_active && withdrawalStatus.meat_until && (
                    <span>🥩 {formatDateLT(withdrawalStatus.meat_until)}</span>
                  )}
                </div>
              )}
            </div>
            {(visit.animal as any)?.neck_no && (
              <div className="text-xs sm:text-sm text-gray-500">Kaklo Nr.: {(visit.animal as any).neck_no}</div>
            )}
            {visit.animal?.sex && (
              <div className="text-xs sm:text-sm font-medium text-gray-700">{visit.animal.sex}</div>
            )}
          </div>
          <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium flex items-center gap-1 border flex-shrink-0 ${getStatusColor(visit.status)}`}>
            {getStatusIcon(visit.status)}
            <span className="hidden sm:inline">{visit.status}</span>
          </span>
        </div>

      <div className="space-y-1.5 sm:space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-gray-700">
          <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
          <span className={`truncate ${isCancelled ? 'line-through text-gray-500' : ''}`}>
            {formatDateLT(visit.visit_datetime)}
          </span>
        </div>

        <div className="flex flex-wrap gap-1">
          {visit.procedures.map((proc, idx) => (
            <span key={idx} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
              {proc}
            </span>
          ))}
        </div>

        {visit.temperature && (
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-red-600 bg-red-50 rounded px-1.5 sm:px-2 py-1">
            <Thermometer className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            {visit.temperature}°C
          </div>
        )}

        {visit.notes && (
          <p className="text-xs sm:text-sm text-gray-700 line-clamp-2">{visit.notes}</p>
        )}

        {visit.vet_name && (
          <p className="text-xs text-gray-500">Gyd.: {visit.vet_name}</p>
        )}
      </div>
      </div>
    </div>
  );
}
