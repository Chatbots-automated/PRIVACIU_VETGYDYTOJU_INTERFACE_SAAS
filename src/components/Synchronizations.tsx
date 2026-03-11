import { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Syringe, AlertCircle, Filter, Search, X, Activity, Trash2, Heart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SynchronizationStepWithDetails, Animal } from '../lib/types';
import { formatDateLT, formatDateTimeLT } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { fetchAllRows, formatAnimalDisplay } from '../lib/helpers';
import { AnimalDetailSidebar } from './AnimalDetailSidebar';
import { InseminationModal } from './InseminationModal';

interface SyncStepDisplay extends SynchronizationStepWithDetails {
  animal?: Animal;
  protocol_name?: string;
  sync_status?: string;
  is_cancelled?: boolean;
}

export function Synchronizations() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [syncSteps, setSyncSteps] = useState<SyncStepDisplay[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState<string>('week');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('pending');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [inseminationStep, setInseminationStep] = useState<SyncStepDisplay | null>(null);

  useEffect(() => {
    loadData();
  }, [selectedFarm, filterDate, customDateFrom, customDateTo, statusFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (!selectedFarm) return;

      // Load animals
      const animalsRes = await supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no');
      setAnimals(animalsRes.data || []);

      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const weekFromNow = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

      let query = supabase
        .from('synchronization_steps')
        .select(`
          *,
          product:medication_product_id(id, name, primary_pack_unit),
          batch:batch_id(id, lot, expiry_date)
        `)
        .eq('farm_id', selectedFarm.id)
        .order('scheduled_date', { ascending: true })
        .order('step_number', { ascending: true });

      if (filterDate === 'today') {
        query = query.eq('scheduled_date', today);
      } else if (filterDate === 'tomorrow') {
        query = query.eq('scheduled_date', tomorrow);
      } else if (filterDate === 'week') {
        query = query.gte('scheduled_date', today).lte('scheduled_date', weekFromNow);
      } else if (filterDate === 'custom' && customDateFrom && customDateTo) {
        query = query.gte('scheduled_date', customDateFrom).lte('scheduled_date', customDateTo);
      } else if (filterDate === 'custom' && customDateFrom) {
        query = query.eq('scheduled_date', customDateFrom);
      }

      if (statusFilter === 'pending') {
        query = query.eq('completed', false);
      } else if (statusFilter === 'completed') {
        query = query.eq('completed', true);
      }

      const { data: stepsData, error } = await query;

      if (error) throw error;

      if (stepsData) {
        const syncIds = [...new Set(stepsData.map(s => s.synchronization_id))];
        const { data: syncsData } = await supabase
          .from('animal_synchronizations')
          .select('id, animal_id, protocol_id, status, synchronization_protocols(name)')
          .in('id', syncIds);

        const syncsMap = new Map(syncsData?.map(s => [s.id, s]) || []);

        const enrichedSteps = stepsData.map(step => {
          const sync = syncsMap.get(step.synchronization_id);
          const animal = enrichedAnimals.find(a => a.id === sync?.animal_id);
          const isCancelled = sync?.status === 'Cancelled';

          return {
            ...step,
            animal,
            protocol_name: (sync?.synchronization_protocols as any)?.name,
            sync_status: sync?.status,
            is_cancelled: isCancelled,
          };
        });

        setSyncSteps(enrichedSteps);
      }
    } catch (error) {
      console.error('Error loading synchronizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStepClick = (step: SyncStepDisplay) => {
    if (step.step_name === 'Sėklinti' && !step.completed && step.animal) {
      setInseminationStep(step);
    } else if (step.animal) {
      setSelectedAnimal(step.animal);
    }
  };

  const handleDeleteSync = async (e: React.MouseEvent, step: SyncStepDisplay) => {
    e.stopPropagation();

    if (!step.synchronization_id) return;

    const confirmMessage = `Ar tikrai norite ištrinti sinchronizacijos protokolą gyvūnui ${step.animal ? formatAnimalDisplay(step.animal) : 'nežinomam'}?\n\nTai ištrins:\n- Visus sinchronizacijos žingsnius\n- Visus susietus vizitus\n- Sinchronizacijos protokolą\n\nŠio veiksmo negalima atšaukti!`;

    if (!window.confirm(confirmMessage)) return;

    try {
      // First, get all step IDs for this synchronization
      const { data: steps, error: fetchError } = await supabase
        .from('synchronization_steps')
        .select('id')
        .eq('synchronization_id', step.synchronization_id);

      if (fetchError) throw fetchError;

      // Delete visits linked to these steps (via sync_step_id)
      if (steps && steps.length > 0) {
        const stepIds = steps.map(s => s.id);
        const { error: visitsError } = await supabase
          .from('animal_visits')
          .delete()
          .in('sync_step_id', stepIds);

        if (visitsError) throw visitsError;
      }

      // Delete synchronization steps
      const { error: stepsError } = await supabase
        .from('synchronization_steps')
        .delete()
        .eq('synchronization_id', step.synchronization_id);

      if (stepsError) throw stepsError;

      // Delete the synchronization itself
      const { error: syncError } = await supabase
        .from('animal_synchronizations')
        .delete()
        .eq('id', step.synchronization_id);

      if (syncError) throw syncError;

      await logAction('delete', 'animal_synchronizations', step.synchronization_id, {
        animal_tag: step.animal?.tag_no,
        protocol: step.protocol_name
      });

      alert('Sinchronizacija sėkmingai ištrinta!');
      loadData();
    } catch (error) {
      console.error('Error deleting synchronization:', error);
      alert('Klaida trinant sinchronizaciją. Bandykite dar kartą.');
    }
  };

  const filteredSteps = syncSteps.filter(step => {
    const animal = step.animal;

    // General search (tag_no, step name, protocol name)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesGeneral = (
        animal?.tag_no?.toLowerCase().includes(searchLower) ||
        step.step_name?.toLowerCase().includes(searchLower) ||
        step.protocol_name?.toLowerCase().includes(searchLower)
      );
      if (!matchesGeneral) return false;
    }

    return true;
  });

  const getStatusColor = (step: SyncStepDisplay) => {
    if (step.is_cancelled && !step.completed) return 'bg-gray-100 text-gray-700 border-gray-400';
    if (step.completed) return 'bg-green-100 text-green-800 border-green-300';
    const today = new Date().toISOString().split('T')[0];
    if (step.scheduled_date < today) return 'bg-red-100 text-red-800 border-red-300';
    if (step.scheduled_date === today) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  const getStatusIcon = (step: SyncStepDisplay) => {
    if (step.is_cancelled && !step.completed) return <X className="w-4 h-4" />;
    if (step.completed) return <CheckCircle2 className="w-4 h-4" />;
    const today = new Date().toISOString().split('T')[0];
    if (step.scheduled_date < today) return <AlertCircle className="w-4 h-4" />;
    if (step.scheduled_date === today) return <Clock className="w-4 h-4" />;
    return <Circle className="w-4 h-4" />;
  };

  const getStatusText = (step: SyncStepDisplay) => {
    if (step.is_cancelled && !step.completed) return 'Atšauktas';
    if (step.completed) return 'Atlikta';
    const today = new Date().toISOString().split('T')[0];
    if (step.scheduled_date < today) return 'Praleista';
    if (step.scheduled_date === today) return 'Šiandien';
    return 'Planuojama';
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Sinchronizacijos</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ieškoti..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Šiandien</option>
              <option value="tomorrow">Rytoj</option>
              <option value="week">Ši savaitė</option>
              <option value="custom">Pasirinkti datą</option>
            </select>
          </div>

          {filterDate === 'custom' && (
            <>
              <input
                type="date"
                value={customDateFrom}
                onChange={(e) => setCustomDateFrom(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={customDateTo}
                onChange={(e) => setCustomDateTo(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </>
          )}

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Visi</option>
              <option value="pending">Nebaigti</option>
              <option value="completed">Baigti</option>
            </select>
          </div>
        </div>

        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium mb-4"
          >
            Išvalyti paieškos filtrus
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Kraunama...</p>
        </div>
      ) : filteredSteps.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Sinchronizacijų nerasta</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredSteps.map((step) => (
            <div
              key={step.id}
              className={`border-2 rounded-lg p-4 transition-all ${getStatusColor(step)} hover:shadow-lg cursor-pointer ${
                step.is_cancelled && !step.completed ? 'opacity-60' : ''
              }`}
              onClick={() => handleStepClick(step)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`font-bold text-lg ${step.is_cancelled && !step.completed ? 'line-through' : ''}`}>
                      {step.animal ? formatAnimalDisplay(step.animal) : 'Nežinomas gyvūnas'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1.5 border-2`}>
                      {getStatusIcon(step)}
                      {getStatusText(step)}
                    </span>
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="font-medium text-gray-700">
                      Protokolas: <span className="font-bold">{step.protocol_name || 'Nežinomas'}</span>
                    </div>
                    <div className="font-medium text-gray-700 flex items-center gap-2">
                      <span>Žingsnis {step.step_number}:</span>
                      <span className="font-semibold">{step.step_name}</span>
                      {step.step_name === 'Sėklinti' && (
                        <Heart className="w-4 h-4 text-rose-600 fill-rose-600" />
                      )}
                    </div>
                    {step.is_evening && (
                      <div className="text-orange-600 font-medium">🌙 Vakare</div>
                    )}
                    {step.step_name === 'Sėklinti' && !step.completed && (
                      <div className="mt-1 text-sm text-rose-600 font-medium">
                        ➜ Spustelėkite, kad įrašytumėte sėklinimą
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <button
                    onClick={(e) => handleDeleteSync(e, step)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Ištrinti sinchronizaciją"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="text-right">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4" />
                    <span className="font-semibold">{formatDateLT(step.scheduled_date)}</span>
                  </div>
                    {step.completed && step.completed_at && (
                      <div className="text-xs text-gray-500 mt-1">
                        Atlikta: {formatDateTimeLT(step.completed_at)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {step.product && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-current/20">
                  <Syringe className="w-4 h-4" />
                  <span className="font-medium">{(step.product as any).name}</span>
                  {step.dosage && (
                    <span className="text-sm">
                      ({step.dosage} {step.dosage_unit || (step.product as any).primary_pack_unit})
                    </span>
                  )}
                  {step.batch && (
                    <span className="text-sm ml-auto">
                      Partija: {(step.batch as any).lot}
                    </span>
                  )}
                </div>
              )}

              {step.notes && (
                <div className="mt-3 pt-3 border-t border-current/20 text-sm">
                  <span className="font-medium">Pastabos:</span> {step.notes}
                </div>
              )}
            </div>
          ))}
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

      {inseminationStep && inseminationStep.animal && (
        <InseminationModal
          animal={inseminationStep.animal}
          syncStepId={inseminationStep.id}
          scheduledDate={inseminationStep.scheduled_date}
          onClose={() => setInseminationStep(null)}
          onSuccess={() => {
            setInseminationStep(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
