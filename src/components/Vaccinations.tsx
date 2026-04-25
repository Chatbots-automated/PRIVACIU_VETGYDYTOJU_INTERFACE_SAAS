import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows, normalizeNumberInput } from '../lib/helpers';
import { Product, Animal, Batch, Unit } from '../lib/types';
import { Syringe, Check, Search, CheckSquare, Square, Calendar, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { requireClientId } from '../lib/clientHelpers';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { showNotification } from './NotificationToast';

interface VaccinationGroup {
  date: string;
  dateLabel: string;
  vaccinations: any[];
}

export function Vaccinations() {
  const { user, logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [vaccinations, setVaccinations] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimals, setSelectedAnimals] = useState<Set<string>>(new Set());
  const [showMassVaccination, setShowMassVaccination] = useState(false);
  const [saving, setSaving] = useState(false);

  const [filterSex, setFilterSex] = useState('');
  const [filterAgeFrom, setFilterAgeFrom] = useState('');
  const [filterAgeTo, setFilterAgeTo] = useState('');
  const [filterTagFrom, setFilterTagFrom] = useState('');
  const [filterTagTo, setFilterTagTo] = useState('');

  const [vacDateFrom, setVacDateFrom] = useState('');
  const [vacDateTo, setVacDateTo] = useState('');
  const [vacSearch, setVacSearch] = useState('');

  const [massVaccines, setMassVaccines] = useState([{
    product_id: '',
    batch_id: '',
    dose_amount: '',
    unit: 'ml' as Unit,
  }]);
  
  const [massVaccinationData, setMassVaccinationData] = useState({
    vaccination_date: new Date().toISOString().split('T')[0],
    next_booster_date: '',
    dose_number: '1',
    administered_by: user?.full_name || user?.email || '',
    notes: '',
  });

  // Auto-update administered_by when user changes
  useEffect(() => {
    if (user) {
      setMassVaccinationData(prev => ({
        ...prev,
        administered_by: user.full_name || user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'vaccinations',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback(() => {
      loadData();
    }, []),
    onUpdate: useCallback(() => {
      loadData();
    }, []),
    onDelete: useCallback(() => {
      loadData();
    }, []),
  });

  const loadData = async () => {
    try {
      if (!selectedFarm) return;

      const clientId = requireClientId(user);
      
      const [vacsRes, prodsRes, animalsRes, batchesRes] = await Promise.all([
        supabase.from('vaccinations').select('*').eq('client_id', clientId).eq('farm_id', selectedFarm.id).order('vaccination_date', { ascending: false }),
        supabase.from('products').select('*').eq('client_id', clientId).or(`farm_id.eq.${selectedFarm.id},farm_id.is.null`).eq('is_active', true).in('category', ['prevention', 'vakcina']).order('name'),
        supabase.from('animals').select('*').eq('client_id', clientId).eq('farm_id', selectedFarm.id).eq('active', true).order('tag_no'),
        supabase.from('batches').select('*').eq('client_id', clientId).eq('farm_id', selectedFarm.id).order('expiry_date', { ascending: false }),
      ]);

      setVaccinations(vacsRes.data || []);
      setProducts(prodsRes.data || []);
      setAnimals(animalsRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getOldestBatchWithStock = async (productId: string): Promise<string> => {
    try {
      if (!selectedFarm) return '';

      const { data, error } = await supabase
        .from('batches')
        .select('id, qty_left, expiry_date')
        .eq('farm_id', selectedFarm.id)
        .eq('product_id', productId)
        .gt('qty_left', 0)
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching batch stock:', error);
        return '';
      }

      if (data && data.length > 0) {
        // Filter out expired batches
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const validBatch = data.find(batch => {
          if (!batch.expiry_date) return true;
          const expiryDate = new Date(batch.expiry_date);
          return expiryDate >= today;
        });

        return validBatch?.id || '';
      }

      return '';
    } catch (error) {
      console.error('Error in getOldestBatchWithStock:', error);
      return '';
    }
  };

  const handleToggleAnimal = (animalId: string) => {
    const newSelected = new Set(selectedAnimals);
    if (newSelected.has(animalId)) {
      newSelected.delete(animalId);
    } else {
      newSelected.add(animalId);
    }
    setSelectedAnimals(newSelected);
  };

  const handleToggleAll = () => {
    if (selectedAnimals.size === filteredAnimals.length) {
      setSelectedAnimals(new Set());
    } else {
      setSelectedAnimals(new Set(filteredAnimals.map(a => a.id)));
    }
  };

  const handleMassVaccinate = async () => {
    const validVaccines = massVaccines.filter(v => v.product_id && v.dose_amount);

    if (validVaccines.length === 0) {
      showNotification('Pasirinkite bent vieną vakciną/prevenciją ir įveskite dozę', 'error');
      return;
    }

    if (selectedAnimals.size === 0) {
      showNotification('Pasirinkite bent vieną gyvūną', 'error');
      return;
    }

    setSaving(true);

    try {
      const allVaccinationEntries = [];

      if (!selectedFarm) {
        showNotification('Pasirinkite ūkį', 'error');
        return;
      }

      const clientId = requireClientId(user);
      
      for (const vaccine of validVaccines) {
        const vaccinationEntries = Array.from(selectedAnimals).map(animalId => ({
          client_id: clientId,
          farm_id: selectedFarm.id,
          animal_id: animalId,
          product_id: vaccine.product_id,
          batch_id: vaccine.batch_id || null,
          vaccination_date: massVaccinationData.vaccination_date,
          next_booster_date: massVaccinationData.next_booster_date || null,
          dose_number: parseInt(massVaccinationData.dose_number),
          dose_amount: parseFloat(vaccine.dose_amount),
          unit: vaccine.unit,
          administered_by: massVaccinationData.administered_by || null,
          notes: massVaccinationData.notes || null,
          created_by_user_id: user?.full_name || user?.email || null,
        }));

        allVaccinationEntries.push(...vaccinationEntries);
      }

      const { error } = await supabase.from('vaccinations').insert(allVaccinationEntries);

      if (error) throw error;

      for (const vaccine of validVaccines) {
        const selectedProduct = products.find(p => p.id === vaccine.product_id);
        await logAction(
          'create_mass_vaccination',
          'vaccinations',
          null,
          null,
          {
            animal_count: selectedAnimals.size,
            product_id: vaccine.product_id,
            product_name: selectedProduct?.name || 'N/A',
            batch_id: vaccine.batch_id,
            vaccination_date: massVaccinationData.vaccination_date,
            dose_amount: vaccine.dose_amount,
            dose_number: massVaccinationData.dose_number,
          }
        );
      }

      if (massVaccinationData.next_booster_date) {
        const productNames = validVaccines.map(v => {
          const prod = products.find(p => p.id === v.product_id);
          return prod?.name || 'N/A';
        }).join(', ');

        const futureVisits = Array.from(selectedAnimals).map(animalId => ({
          client_id: clientId,
          farm_id: selectedFarm.id,
          animal_id: animalId,
          visit_datetime: `${massVaccinationData.next_booster_date}T10:00:00`,
          procedures: ['Vakcina'],
          status: 'Planuojamas',
          notes: `Pakartotinė vakcina: ${productNames}`,
          vet_name: massVaccinationData.administered_by || null,
          next_visit_required: false,
          treatment_required: false,
        }));

        const { error: futureVisitsError } = await supabase
          .from('animal_visits')
          .insert(futureVisits);

        if (futureVisitsError) {
          console.error('Error creating future vaccination visits:', futureVisitsError);
        }
      }

      setSelectedAnimals(new Set());
      setShowMassVaccination(false);
      setMassVaccines([{
        product_id: '',
        batch_id: '',
        dose_amount: '',
        unit: 'ml',
      }]);
      setMassVaccinationData({
        vaccination_date: new Date().toISOString().split('T')[0],
        next_booster_date: '',
        dose_number: '1',
        administered_by: '',
        notes: '',
      });

      await loadData();
      showNotification(`Sėkmingai vakcinuota ${selectedAnimals.size} gyvūnų su ${validVaccines.length} vakcina(-omis)!`, 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const getDateLabel = (dateStr: string): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const vacDate = new Date(dateStr);
    vacDate.setHours(0, 0, 0, 0);

    if (vacDate.getTime() === today.getTime()) {
      return 'Šiandien';
    } else if (vacDate.getTime() === yesterday.getTime()) {
      return 'Vakar';
    } else {
      const daysDiff = Math.floor((today.getTime() - vacDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 0 && daysDiff < 7) {
        return `Prieš ${daysDiff} d.`;
      }
      return dateStr;
    }
  };

  const groupVaccinationsByDate = (): VaccinationGroup[] => {
    const grouped = new Map<string, any[]>();

    vaccinations.forEach(vac => {
      const date = vac.vaccination_date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(vac);
    });

    return Array.from(grouped.entries()).map(([date, vacs]) => ({
      date,
      dateLabel: getDateLabel(date),
      vaccinations: vacs,
    }));
  };

  const filteredAnimals = animals.filter(a => {
    const matchesSearch = a.tag_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.holder_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSex = !filterSex || a.sex?.toLowerCase() === filterSex.toLowerCase();

    const ageInMonths = a.age_months || 0;
    const matchesAgeFrom = !filterAgeFrom || ageInMonths >= parseInt(filterAgeFrom);
    const matchesAgeTo = !filterAgeTo || ageInMonths <= parseInt(filterAgeTo);

    const matchesTagRange = () => {
      if (!filterTagFrom && !filterTagTo) return true;
      const tag = (a.tag_no || '').toUpperCase().trim();
      const tagFrom = filterTagFrom.toUpperCase().trim();
      const tagTo = filterTagTo.toUpperCase().trim();

      if (tagFrom && tagTo) {
        return tag >= tagFrom && tag <= tagTo;
      }
      if (tagFrom) return tag >= tagFrom;
      if (tagTo) return tag <= tagTo;
      return true;
    };

    return matchesSearch && matchesSex && matchesAgeFrom && matchesAgeTo && matchesTagRange();
  });

  const filteredVaccinations = vaccinations.filter(vac => {
    let match = true;

    if (vacDateFrom) {
      match = match && vac.vaccination_date >= vacDateFrom;
    }

    if (vacDateTo) {
      match = match && vac.vaccination_date <= vacDateTo;
    }

    if (vacSearch) {
      const search = vacSearch.toLowerCase();
      const animal = animals.find(a => a.id === vac.animal_id);
      const product = products.find(p => p.id === vac.product_id);

      match = match && (
        animal?.tag_no?.toLowerCase().includes(search) ||
        animal?.holder_name?.toLowerCase().includes(search) ||
        product?.name?.toLowerCase().includes(search) ||
        vac.administered_by?.toLowerCase().includes(search) ||
        vac.notes?.toLowerCase().includes(search) ||
        vac.batch_id?.toLowerCase().includes(search)
      );
    }

    return match;
  });


  const groupVaccinationsByDateFiltered = (): VaccinationGroup[] => {
    const grouped = new Map<string, any[]>();

    filteredVaccinations.forEach(vac => {
      const date = vac.vaccination_date;
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(vac);
    });

    return Array.from(grouped.entries()).map(([date, vacs]) => ({
      date,
      dateLabel: getDateLabel(date),
      vaccinations: vacs,
    }));
  };

  const groupedVaccinations = groupVaccinationsByDateFiltered();

  if (loading) return <div className="text-center py-8">Kraunama...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Syringe className="w-6 h-6 text-blue-600" />
          <h2 className="text-2xl font-bold text-gray-900">Vakcinacijos ir prevencija</h2>
        </div>
        <button
          onClick={() => setShowMassVaccination(!showMassVaccination)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <Syringe className="w-5 h-5" />
          Masinė vakcina/prevencija
        </button>
      </div>

      {showMassVaccination && (
        <div className="bg-white border-2 border-blue-300 rounded-xl p-6 shadow-lg">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Masinė vakcina/prevencija</h3>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-bold text-gray-900">Vakcinos / prevencija</label>
              <button
                type="button"
                onClick={() => setMassVaccines([...massVaccines, { product_id: '', batch_id: '', dose_amount: '', unit: 'ml' }])}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 transition-colors"
              >
                + Pridėti vakciną
              </button>
            </div>

            <div className="space-y-3">
              {massVaccines.map((vaccine, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Vakcina / prevencija *
                      </label>
                      <select
                        value={vaccine.product_id}
                        onChange={async (e) => {
                          const productId = e.target.value;
                          const unit = products.find(p => p.id === productId)?.primary_pack_unit || 'ml';
                          const newVaccines = [...massVaccines];
                          newVaccines[idx].product_id = productId;
                          newVaccines[idx].unit = unit as Unit;
                          if (productId) {
                            const oldestBatchId = await getOldestBatchWithStock(productId);
                            newVaccines[idx].batch_id = oldestBatchId;
                          } else {
                            newVaccines[idx].batch_id = '';
                          }
                          setMassVaccines(newVaccines);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Pasirinkite vakciną</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>

                    {vaccine.product_id && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Partija
                        </label>
                        <select
                          value={vaccine.batch_id}
                          onChange={(e) => {
                            const newVaccines = [...massVaccines];
                            newVaccines[idx].batch_id = e.target.value;
                            setMassVaccines(newVaccines);
                          }}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Pasirinkite partiją</option>
                          {batches.filter(b => b.product_id === vaccine.product_id).map(b => (
                            <option key={b.id} value={b.id}>
                              {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'} · Likutis: {b.qty_left?.toFixed(2) || '0'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Dozė *
                      </label>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={vaccine.dose_amount}
                          onChange={(e) => {
                            const newVaccines = [...massVaccines];
                            newVaccines[idx].dose_amount = normalizeNumberInput(e.target.value);
                            setMassVaccines(newVaccines);
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                          placeholder="2.5"
                        />
                        <select
                          value={vaccine.unit}
                          onChange={(e) => {
                            const newVaccines = [...massVaccines];
                            newVaccines[idx].unit = e.target.value as Unit;
                            setMassVaccines(newVaccines);
                          }}
                          className="w-16 px-1 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="ml">ml</option>
                          <option value="l">l</option>
                          <option value="g">g</option>
                          <option value="kg">kg</option>
                          <option value="vnt">vnt</option>
                        </select>
                      </div>
                    </div>

                    {massVaccines.length > 1 && (
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => {
                            const newVaccines = massVaccines.filter((_, i) => i !== idx);
                            setMassVaccines(newVaccines);
                          }}
                          className="px-3 py-1.5 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                        >
                          Šalinti
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vakcinacijos data
              </label>
              <input
                type="date"
                value={massVaccinationData.vaccination_date}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, vaccination_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kita vakcinacija
              </label>
              <input
                type="date"
                value={massVaccinationData.next_booster_date}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, next_booster_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dozės numeris
              </label>
              <input
                type="number"
                value={massVaccinationData.dose_number}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, dose_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vakcinavo
              </label>
              <input
                type="text"
                value={massVaccinationData.administered_by}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, administered_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                placeholder="Vardas Pavardė"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pastabos
              </label>
              <textarea
                value={massVaccinationData.notes}
                onChange={(e) => setMassVaccinationData({ ...massVaccinationData, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Papildoma informacija..."
              />
            </div>
          </div>

          <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-5 h-5 text-blue-600" />
              <h4 className="font-bold text-gray-900">Filtruoti gyvūnus</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Lytis</label>
                <select
                  value={filterSex}
                  onChange={(e) => setFilterSex(e.target.value)}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Visi</option>
                  <option value="Bulius">Bulius</option>
                  <option value="Karvė">Karvė</option>
                  <option value="Telyčaitė">Telyčaitė</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amžius nuo (mėn.)</label>
                <input
                  type="number"
                  value={filterAgeFrom}
                  onChange={(e) => setFilterAgeFrom(e.target.value)}
                  placeholder="0"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Amžius iki (mėn.)</label>
                <input
                  type="number"
                  value={filterAgeTo}
                  onChange={(e) => setFilterAgeTo(e.target.value)}
                  placeholder="999"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numeris nuo</label>
                <input
                  type="text"
                  value={filterTagFrom}
                  onChange={(e) => setFilterTagFrom(e.target.value)}
                  placeholder="LT000044539555"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Numeris iki</label>
                <input
                  type="text"
                  value={filterTagTo}
                  onChange={(e) => setFilterTagTo(e.target.value)}
                  placeholder="LT000044539571"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  setFilterSex('');
                  setFilterAgeFrom('');
                  setFilterAgeTo('');
                  setFilterTagFrom('');
                  setFilterTagTo('');
                  setSearchTerm('');
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium hover:bg-gray-300 transition-colors"
              >
                Išvalyti filtrus
              </button>
              <span className="text-xs text-gray-600 flex items-center">
                Rasta gyvūnų: <span className="ml-1 font-bold text-blue-600">{filteredAnimals.length}</span>
              </span>
            </div>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="mb-2">
              <p className="text-sm font-medium text-gray-700 mb-2">
                Pasirinkta gyvūnų: <span className="text-blue-600 font-bold">{selectedAnimals.size}</span>
              </p>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ieškoti pagal ID, laikytoją..."
                  className="w-full pl-10 pr-4 py-1.5 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-white">
              <div className="sticky top-0 bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors" onClick={handleToggleAll}>
                {selectedAnimals.size === filteredAnimals.length && filteredAnimals.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-xs font-semibold text-gray-700">
                  {selectedAnimals.size === filteredAnimals.length && filteredAnimals.length > 0 ? 'Atžymėti visus' : 'Pažymėti visus'}
                </span>
              </div>

              {filteredAnimals.map(animal => (
                <div
                  key={animal.id}
                  onClick={() => handleToggleAnimal(animal.id)}
                  className={`px-3 py-2 border-b border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                    selectedAnimals.has(animal.id) ? 'bg-blue-50' : ''
                  }`}
                >
                  {selectedAnimals.has(animal.id) ? (
                    <CheckSquare className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  ) : (
                    <Square className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{animal.tag_no}</p>
                    <p className="text-xs text-gray-500">{animal.holder_name}</p>
                  </div>
                  <span className="text-xs text-gray-500">{animal.species}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setShowMassVaccination(false);
                setSelectedAnimals(new Set());
                setMassVaccines([{ product_id: '', batch_id: '', dose_amount: '', unit: 'ml' }]);
              }}
              className="px-6 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition-colors"
            >
              Atšaukti
            </button>
            <button
              onClick={handleMassVaccinate}
              disabled={saving || selectedAnimals.size === 0 || massVaccines.filter(v => v.product_id && v.dose_amount).length === 0}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Check className="w-5 h-5" />
              {saving ? 'Išsaugoma...' : `Vakcinuoti (${selectedAnimals.size})`}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-bold text-gray-900">Vakcinacijų ir prevencijos istorija</h3>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-600" />
            <h4 className="font-semibold text-gray-900">Filtrai</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data nuo</label>
              <input
                type="date"
                value={vacDateFrom}
                onChange={(e) => setVacDateFrom(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Data iki</label>
              <input
                type="date"
                value={vacDateTo}
                onChange={(e) => setVacDateTo(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Paieška</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={vacSearch}
                  onChange={(e) => setVacSearch(e.target.value)}
                  placeholder="Gyvūnas, vakcina/prevencija, serija..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Rasta: <strong>{filteredVaccinations.length}</strong> iš {vaccinations.length}
            </span>
            {(vacDateFrom || vacDateTo || vacSearch) && (
              <button
                onClick={() => {
                  setVacDateFrom('');
                  setVacDateTo('');
                  setVacSearch('');
                }}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Išvalyti filtrus
              </button>
            )}
          </div>
        </div>

        {groupedVaccinations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-8 text-center">
            <Syringe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nėra vakcinacijų ar prevencijos</p>
          </div>
        ) : (
          groupedVaccinations.map(group => (
            <div key={group.date} className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{group.dateLabel}</h4>
                  <p className="text-sm text-gray-600">{group.date}</p>
                </div>
                <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-blue-200 shadow-sm">
                  <Syringe className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-bold text-blue-700">
                    {group.vaccinations.length} vakcinacij{group.vaccinations.length === 1 ? 'a' : 'os'}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Gyvūnas</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vakcina / prevencija</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Dozė</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Kita vakcina</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vakcinavo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.vaccinations.map((vac: any) => (
                      <tr key={vac.id} className="hover:bg-blue-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {animals.find(a => a.id === vac.animal_id)?.tag_no || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {products.find(p => p.id === vac.product_id)?.name}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          <span className="font-medium">{vac.dose_amount} {vac.unit}</span>
                          {vac.dose_number > 1 && <span className="ml-1 text-xs text-gray-500">(#{vac.dose_number})</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {vac.next_booster_date || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {vac.administered_by || <span className="text-gray-400">-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
