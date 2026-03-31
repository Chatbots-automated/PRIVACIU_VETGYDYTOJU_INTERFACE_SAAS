import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Animal, AnimalVisitSummary } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { Plus, Edit2, Save, X, Search, RefreshCw, Calendar, Clock } from 'lucide-react';
import { AnimalDetailSidebar } from './AnimalDetailSidebar';
import { formatDateTimeLT } from '../lib/formatters';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { fetchAllRows, formatAnimalDisplay } from '../lib/helpers';

export function AnimalsCompact() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [visitSummaries, setVisitSummaries] = useState<Map<string, AnimalVisitSummary>>(new Map());
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    tag_no: '',
    species: 'bovine',
    sex: '',
    breed: '',
    birth_date: '',
    age_months: '',
    holder_name: '',
    holder_address: '',
  });

  // Calculate age in months from birth date
  const calculateAgeMonths = (birthDate: string): number => {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 + 
                   (today.getMonth() - birth.getMonth());
    return Math.max(0, months);
  };

  // Update age when birth_date changes
  useEffect(() => {
    if (formData.birth_date) {
      const calculatedAge = calculateAgeMonths(formData.birth_date);
      setFormData(prev => ({ ...prev, age_months: calculatedAge.toString() }));
    }
  }, [formData.birth_date]);

  // Update holder info when farm changes
  useEffect(() => {
    if (selectedFarm && showAdd) {
      setFormData(prev => ({
        ...prev,
        holder_name: selectedFarm.name,
        holder_address: selectedFarm.address || '',
      }));
    }
  }, [selectedFarm, showAdd]);

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  // Real-time subscription for animals
  useRealtimeSubscription({
    table: 'animals',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback((payload) => {
      setAnimals(prev => [...prev, payload.new as Animal].sort((a, b) =>
        (a.tag_no || '').localeCompare(b.tag_no || '')
      ));
    }, []),
    onUpdate: useCallback((payload) => {
      setAnimals(prev => prev.map(animal =>
        animal.id === payload.new.id ? payload.new as Animal : animal
      ));
      if (selectedAnimal?.id === payload.new.id) {
        setSelectedAnimal(payload.new as Animal);
      }
    }, [selectedAnimal]),
    onDelete: useCallback((payload) => {
      setAnimals(prev => prev.filter(animal => animal.id !== payload.old.id));
      if (selectedAnimal?.id === payload.old.id) {
        setSelectedAnimal(null);
      }
    }, [selectedAnimal]),
  });

  const loadData = async () => {
    try {
      if (!selectedFarm) {
        setAnimals([]);
        setVisitSummaries(new Map());
        setLoading(false);
        return;
      }

      // Fetch animals for the selected farm only
      const { data: allAnimals, error: animalsError } = await supabase
        .from('animals')
        .select('*')
        .eq('farm_id', selectedFarm.id)
        .order('tag_no');

      if (animalsError) throw animalsError;

      // Fetch visit summaries for the selected farm
      const { data: summariesData, error: summariesError } = await supabase
        .from('animal_visit_summary')
        .select('*')
        .eq('farm_id', selectedFarm.id);

      if (summariesError) throw summariesError;

      console.log('🐄 Animals loaded for farm:', selectedFarm.name, allAnimals?.length || 0);

      setAnimals(allAnimals || []);

      const summaryMap = new Map<string, AnimalVisitSummary>();
      (summariesData || []).forEach((summary: AnimalVisitSummary) => {
        summaryMap.set(summary.animal_id, summary);
      });
      setVisitSummaries(summaryMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshAnimals = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('https://n8n-up8s.onrender.com/webhook-test/112e7037-0627-4635-a9a0-93db432b8f02', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        setTimeout(async () => {
          await loadData();
          alert('Gyvūnų duomenys atnaujinti!');
        }, 2000);
      } else {
        throw new Error('Failed to trigger refresh');
      }
    } catch (error) {
      console.error('Error refreshing animals:', error);
      alert('Klaida atnaujinant gyvūnus');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAdd = async () => {
    try {
      if (!selectedFarm) {
        alert('Pasirinkite ūkį');
        return;
      }

      const { data, error } = await supabase
        .from('animals')
        .insert({
          farm_id: selectedFarm.id,
          tag_no: formData.tag_no || null,
          species: formData.species,
          sex: formData.sex || null,
          breed: formData.breed || null,
          birth_date: formData.birth_date || null,
          age_months: formData.age_months ? parseInt(formData.age_months) : null,
          holder_name: formData.holder_name || null,
          holder_address: formData.holder_address || null,
        })
        .select()
        .single();

      if (error) throw error;

      await logAction('create_animal', 'animals', data.id);
      setShowAdd(false);
      setFormData({
        tag_no: '',
        species: 'bovine',
        sex: '',
        breed: '',
        birth_date: '',
        age_months: '',
        holder_name: selectedFarm.name,
        holder_address: selectedFarm.address || '',
      });
      loadData();
    } catch (error: any) {
      alert('Klaida kuriant gyvūną: ' + error.message);
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const animal = animals.find(a => a.id === id);
      if (!animal) return;

      const { error } = await supabase
        .from('animals')
        .update({
          tag_no: animal.tag_no || null,
          species: animal.species,
          sex: animal.sex || null,
          breed: animal.breed || null,
          birth_date: animal.birth_date || null,
          age_months: animal.age_months,
          holder_name: animal.holder_name || null,
          holder_address: animal.holder_address || null,
        })
        .eq('id', id);

      if (error) throw error;

      await logAction('update_animal', 'animals', id);
      setEditing(null);
      setFormData({
        tag_no: '',
        species: 'bovine',
        sex: '',
        breed: '',
        birth_date: '',
        age_months: '',
        holder_name: selectedFarm?.name || '',
        holder_address: selectedFarm?.address || '',
      });
      loadData();
    } catch (error: any) {
      alert('Klaida atnaujinant gyvūną: ' + error.message);
    }
  };

  const filteredAnimals = animals.filter(animal => {
    // Filter by general search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        animal.tag_no?.toLowerCase().includes(searchLower) ||
        animal.species.toLowerCase().includes(searchLower) ||
        animal.holder_name?.toLowerCase().includes(searchLower) ||
        false
      );
    }

    return true;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-64">Kraunama...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Ieškoti pagal ID, rūšį, laikytoją..."
            value={searchTerm}
            onChange={(e) => {
              const newValue = e.target.value;
              setSearchTerm(newValue);
              if (newValue.length >= 3) {
                logAction('search_animals', null, null, null, { search_term: newValue });
              }
            }}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleRefreshAnimals}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Atnaujinti iš VIC
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Pridėti gyvūną
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rūšis</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amžius</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sekantis vizitas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paskutinis vizitas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAnimals.map((animal) => {
                const summary = visitSummaries.get(animal.id);
                return (
                  <tr
                    key={animal.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedAnimal(animal);
                      logAction('view_animal_detail', 'animals', animal.id, null, {
                        tag_no: animal.tag_no,
                        species: animal.species,
                        holder_name: animal.holder_name
                      });
                    }}
                  >
                    {editing === animal.id ? (
                      <>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={animal.tag_no || ''}
                            onChange={(e) => {
                              const updated = animals.map(a =>
                                a.id === animal.id ? { ...a, tag_no: e.target.value } : a
                              );
                              setAnimals(updated);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={animal.sex || ''}
                            onChange={(e) => {
                              const updated = animals.map(a =>
                                a.id === animal.id ? { ...a, sex: e.target.value } : a
                              );
                              setAnimals(updated);
                            }}
                            placeholder="Karvė, Telyčaitė..."
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="number"
                            value={animal.age_months || ''}
                            onChange={(e) => {
                              const updated = animals.map(a =>
                                a.id === animal.id ? { ...a, age_months: e.target.value ? parseInt(e.target.value) : null } : a
                              );
                              setAnimals(updated);
                            }}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </td>
                        <td className="px-4 py-3" colSpan={2}></td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleUpdate(animal.id)}
                              className="p-1 text-green-600 hover:bg-green-50 rounded"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setEditing(null);
                                loadData();
                              }}
                              className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {animal.tag_no}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {animal.sex || animal.species}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {animal.age_months ? `${animal.age_months} mėn.` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                          {summary?.next_visit ? (
                            <div className="flex items-center gap-2 text-green-600 cursor-pointer hover:underline">
                              <Calendar className="w-4 h-4" />
                              {formatDateTimeLT(summary.next_visit)}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {summary?.last_visit ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Clock className="w-4 h-4" />
                              {formatDateTimeLT(summary.last_visit)}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setEditing(animal.id)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAnimals.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>Nerasta gyvūnų</p>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Pridėti gyvūną</h3>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ID</label>
                <input
                  type="text"
                  value={formData.tag_no}
                  onChange={(e) => setFormData({ ...formData, tag_no: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rūšis</label>
                <select
                  value={formData.species}
                  onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bovine">Galvijas</option>
                  <option value="porcine">Kiaulė</option>
                  <option value="ovine">Avis</option>
                  <option value="caprine">Ožka</option>
                  <option value="equine">Arklys</option>
                  <option value="other">Kita</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lytis</label>
                <input
                  type="text"
                  value={formData.sex}
                  onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                  placeholder="Karvė, Telyčaitė, Bulius..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Veislė</label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  placeholder="Holšteinas, Limuzinas..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gimimo data</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amžius (mėn.) {formData.birth_date && <span className="text-blue-600 text-xs">- Auto</span>}
                </label>
                <input
                  type="number"
                  value={formData.age_months}
                  readOnly={!!formData.birth_date}
                  onChange={(e) => !formData.birth_date && setFormData({ ...formData, age_months: e.target.value })}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 ${formData.birth_date ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder={formData.birth_date ? 'Automatiškai' : 'Įveskite amžių'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Laikytojas</label>
                <input
                  type="text"
                  value={formData.holder_name}
                  onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adresas</label>
                <input
                  type="text"
                  value={formData.holder_address}
                  onChange={(e) => setFormData({ ...formData, holder_address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdd(false);
                  setFormData({
                    tag_no: '',
                    species: 'bovine',
                    sex: '',
                    breed: '',
                    birth_date: '',
                    age_months: '',
                    holder_name: selectedFarm?.name || '',
                    holder_address: selectedFarm?.address || '',
                  });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Atšaukti
              </button>
              <button
                onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Pridėti
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedAnimal && (
        <AnimalDetailSidebar
          animal={selectedAnimal}
          onClose={() => {
            setSelectedAnimal(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
