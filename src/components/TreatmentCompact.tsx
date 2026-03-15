import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows } from '../lib/helpers';
import { Animal, Product, Batch, Disease, Unit } from '../lib/types';
import { Syringe, Plus, Save, X, AlertTriangle, Calendar } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { SearchableSelect } from './SearchableSelect';
import { showNotification } from './NotificationToast';

interface WithdrawalStatus {
  animal_id: string;
  tag_no: string;
  milk_until: string | null;
  meat_until: string | null;
  milk_active: boolean;
  meat_active: boolean;
}

interface UsageLine {
  id: string;
  product_id: string;
  batch_id: string;
  qty: string;
  unit: Unit;
  is_course: boolean;
  course_days: string;
  course_start_date: string;
}

export function TreatmentCompact() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  const [animalId, setAnimalId] = useState('');
  const [diseaseId, setDiseaseId] = useState('');
  const [regDate, setRegDate] = useState(new Date().toISOString().split('T')[0]);
  const [teat, setTeat] = useState<'LF' | 'RF' | 'LR' | 'RR' | ''>('');
  const [caseType, setCaseType] = useState<'new' | 'recurring' | ''>('');
  const [vetName, setVetName] = useState('');
  const [notes, setNotes] = useState('');
  const [usageLines, setUsageLines] = useState<UsageLine[]>([]);
  const [withdrawalStatus, setWithdrawalStatus] = useState<WithdrawalStatus | null>(null);
  const [stockLevels, setStockLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  // Real-time subscriptions
  useRealtimeSubscription({
    table: 'batches',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback((payload) => {
      setBatches(prev => [...prev, payload.new as Batch].sort((a, b) => {
        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        return dateA - dateB;
      }));
    }, []),
    onUpdate: useCallback((payload) => {
      setBatches(prev => prev.map(batch =>
        batch.id === payload.new.id ? payload.new as Batch : batch
      ));
    }, []),
    onDelete: useCallback((payload) => {
      setBatches(prev => prev.filter(batch => batch.id !== payload.old.id));
    }, []),
  });

  useRealtimeSubscription({
    table: 'products',
    onUpdate: useCallback((payload) => {
      setProducts(prev => prev.map(product =>
        product.id === payload.new.id ? payload.new as Product : product
      ));
    }, []),
  });

  useEffect(() => {
    if (animalId) {
      loadWithdrawalStatus(animalId);
    } else {
      setWithdrawalStatus(null);
    }
  }, [animalId]);

  const loadData = async () => {
    try {
      if (!selectedFarm) return;

      const [animalsRes, productsRes, diseasesRes, batchesRes] = await Promise.all([
        supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no'),
        supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true).order('name'),
        supabase.from('diseases').select('*').eq('farm_id', selectedFarm.id).order('name'),
        supabase.from('batches').select('*').eq('farm_id', selectedFarm.id).order('expiry_date'),
      ]);

      setAnimals(animalsRes.data || []);
      setProducts(productsRes.data || []);
      setDiseases(diseasesRes.data || []);
      setBatches(batchesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawalStatus = async (animal_id: string) => {
    try {
      const { data, error } = await supabase
        .from('vw_withdrawal_status')
        .select('*')
        .eq('animal_id', animal_id)
        .maybeSingle();

      if (error) throw error;
      setWithdrawalStatus(data);
    } catch (error) {
      console.error('Error loading withdrawal status:', error);
    }
  };

  const fetchStockLevel = async (productId: string) => {
    const { data, error } = await supabase
      .from('batches')
      .select('qty_left, expiry_date')
      .eq('product_id', productId)
      .gt('qty_left', 0);

    if (error || !data) return 0;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const total = data
      .filter(batch => {
        if (!batch.expiry_date) return true;
        const expiryDate = new Date(batch.expiry_date);
        return expiryDate >= today;
      })
      .reduce((sum, batch) => sum + (batch.qty_left || 0), 0);

    setStockLevels(prev => ({ ...prev, [productId]: total }));
    return total;
  };

  const addUsageLine = () => {
    setUsageLines([
      ...usageLines,
      {
        id: Math.random().toString(),
        product_id: '',
        batch_id: '',
        qty: '',
        unit: 'ml',
        is_course: false,
        course_days: '1',
        course_start_date: regDate,
      },
    ]);
  };

  const updateUsageLine = (id: string, updates: Partial<UsageLine>) => {
    setUsageLines(usageLines.map(line =>
      line.id === id ? { ...line, ...updates } : line
    ));
  };

  const removeUsageLine = (id: string) => {
    setUsageLines(usageLines.filter(line => line.id !== id));
  };

  const getAvailableBatches = (productId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return batches
      .filter(b => {
        if (b.product_id !== productId) return false;
        if ((b.qty_left || 0) <= 0) return false;
        if (b.expiry_date) {
          const expiryDate = new Date(b.expiry_date);
          if (expiryDate < today) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dateA = a.expiry_date ? new Date(a.expiry_date).getTime() : Infinity;
        const dateB = b.expiry_date ? new Date(b.expiry_date).getTime() : Infinity;
        return dateA - dateB;
      });
  };

  const getOldestBatchWithStock = async (productId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, qty_left, expiry_date')
        .eq('product_id', productId)
        .gt('qty_left', 0)
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching batch stock:', error);
        return '';
      }

      if (data && data.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const availableBatch = data.find(batch => {
          if (!batch.expiry_date) return true;
          const expiryDate = new Date(batch.expiry_date);
          return expiryDate >= today;
        });

        return availableBatch?.id || '';
      }

      return '';
    } catch (error) {
      console.error('Error in getOldestBatchWithStock:', error);
      return '';
    }
  };

  const handleSave = async () => {
    if (!animalId) {
      showNotification('Pasirinkite gyvūną', 'error');
      return;
    }

    const completeLines = usageLines.filter(line => line.product_id && line.batch_id && line.qty);
    const incompleteLines = usageLines.filter(line =>
      line.product_id && (!line.batch_id || !line.qty || parseFloat(line.qty) <= 0)
    );

    if (completeLines.length === 0) {
      showNotification('Pridėkite ir užpildykite bent vieną vaistą (produktas, serija ir kiekis)', 'error');
      return;
    }

    if (incompleteLines.length > 0) {
      showNotification(
        `Dėmesio: ${incompleteLines.length} neužpildyti vaistai nebus išsaugoti. Visi vaistai turi turėti pasirinktą partiją ir kiekį.`,
        'error'
      );
      return;
    }

    if (!selectedFarm) {
      showNotification('Pasirinkite ūkį', 'error');
      return;
    }

    try {
      const { data: treatment, error: treatmentError } = await supabase
        .from('treatments')
        .insert({
          farm_id: selectedFarm.id,
          animal_id: animalId,
          disease_id: diseaseId || null,
          reg_date: regDate,
          vet_name: vetName || null,
          notes: notes || null,
          mastitis_teat: teat || null,
          mastitis_type: caseType || null,
        })
        .select()
        .single();

      if (treatmentError) throw treatmentError;

      console.log('✅ Treatment created:', treatment);

      const selectedAnimal = animals.find(a => a.id === animalId);
      const selectedDisease = diseases.find(d => d.id === diseaseId);

      await logAction(
        'create_treatment',
        'treatments',
        treatment.id,
        null,
        {
          animal_id: animalId,
          animal_tag: selectedAnimal?.tag_no || 'N/A',
          disease_id: diseaseId,
          disease_name: selectedDisease?.name || 'N/A',
          vet_name: vetName,
          reg_date: regDate,
          mastitis_teat: teat,
          mastitis_type: caseType,
          notes: notes,
        }
      );

      console.log('✅ Treatment logged successfully');

      for (const line of usageLines) {
        const isCourse = line.is_course && parseInt(line.course_days) > 1;

        // For courses, only product_id is required (batch selected per visit)
        // For single doses, product_id, batch_id, and qty are all required
        if (!line.product_id) continue;
        if (!isCourse && (!line.batch_id || !line.qty)) continue;

        if (isCourse) {
          const totalQty = line.qty ? parseFloat(line.qty) : null;
          const days = parseInt(line.course_days);
          const dailyDose = totalQty ? totalQty / days : null;

          const { data: course, error: courseError } = await supabase
            .from('treatment_courses')
            .insert({
              farm_id: selectedFarm.id,
              treatment_id: treatment.id,
              product_id: line.product_id,
              batch_id: line.batch_id || null,
              total_dose: totalQty,
              days: days,
              daily_dose: dailyDose,
              unit: line.unit,
              start_date: line.course_start_date,
            })
            .select()
            .single();

          if (courseError) throw courseError;
        } else {
          const { error: usageError } = await supabase
            .from('usage_items')
            .insert({
              farm_id: selectedFarm.id,
              treatment_id: treatment.id,
              product_id: line.product_id,
              batch_id: line.batch_id,
              qty: parseFloat(line.qty),
              unit: line.unit,
              purpose: 'treatment',
            });

          if (usageError) throw usageError;
        }
      }

      await supabase.rpc('calculate_withdrawal_dates', { p_treatment_id: treatment.id });

      await logAction(
        'create_usage_items',
        'usage_items',
        treatment.id,
        null,
        { count: completeLines.length, items: completeLines }
      );

      console.log('✅ Usage items logged');

      setAnimalId('');
      setDiseaseId('');
      setRegDate(new Date().toISOString().split('T')[0]);
      setTeat('');
      setCaseType('');
      setVetName('');
      setNotes('');
      setUsageLines([]);
      setWithdrawalStatus(null);
      showNotification('Gydymas sėkmingai užregistruotas!', 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Syringe className="w-5 h-5 text-blue-600" />
        <h2 className="text-lg font-bold text-gray-900">Gydymas / Nurašymas</h2>
      </div>

      {withdrawalStatus && (withdrawalStatus.milk_active || withdrawalStatus.meat_active) && (
        <div className="bg-amber-50 border-2 border-amber-400 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold text-amber-900">⚠ Karencinė nepasibaigusi:</p>
            <div className="mt-1 space-y-1">
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
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <SearchableSelect
            options={animals.map(a => ({
              value: a.id,
              label: a.tag_no || `ID: ${a.id.slice(0, 8)}`
            }))}
            value={animalId}
            onChange={setAnimalId}
            placeholder="Pasirinkti gyvūną *"
          />

          <select
            value={diseaseId}
            onChange={(e) => setDiseaseId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Liga (nebūtina)</option>
            {diseases.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={regDate}
            onChange={(e) => setRegDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Spenelis</label>
            <div className="flex gap-2">
              {(['LF', 'RF', 'LR', 'RR'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTeat(teat === t ? '' : t)}
                  className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                    teat === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Atvejis</label>
            <div className="flex gap-2">
              <button
                onClick={() => setCaseType(caseType === 'new' ? '' : 'new')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                  caseType === 'new'
                    ? 'bg-green-600 text-white border-green-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
                }`}
              >
                Naujas
              </button>
              <button
                onClick={() => setCaseType(caseType === 'recurring' ? '' : 'recurring')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg border-2 transition-colors ${
                  caseType === 'recurring'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-amber-400'
                }`}
              >
                Besikartojantis
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="Veterinaras"
            value={vetName}
            onChange={(e) => setVetName(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />

          <input
            type="text"
            placeholder="Pastabos"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Panaudoti vaistai</h3>
            <button
              onClick={addUsageLine}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs"
            >
              <Plus className="w-4 h-4" />
              Pridėti vaistą
            </button>
          </div>

          <div className="space-y-2">
            {usageLines.map(line => {
              const selectedProduct = products.find(p => p.id === line.product_id);
              const availBatches = getAvailableBatches(line.product_id);
              const stockLevel = line.product_id ? stockLevels[line.product_id] : undefined;

              return (
                <div key={line.id} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                    <div className="col-span-2">
                      <select
                        value={line.product_id}
                        onChange={async (e) => {
                          const productId = e.target.value;
                          const unit = products.find(p => p.id === productId)?.primary_pack_unit || 'ml';

                          if (productId) {
                            const oldestBatchId = await getOldestBatchWithStock(productId);
                            updateUsageLine(line.id, {
                              product_id: productId,
                              batch_id: oldestBatchId,
                              unit: unit
                            });
                            fetchStockLevel(productId);
                          } else {
                            updateUsageLine(line.id, {
                              product_id: '',
                              batch_id: '',
                              unit: unit
                            });
                          }
                        }}
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Produktas *</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      {stockLevel !== undefined && (
                        <div className="text-xs text-gray-500 mt-0.5 px-1">
                          Likutis: <span className={stockLevel > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-bold'}>{stockLevel.toFixed(2)}</span> {selectedProduct?.primary_pack_unit}
                        </div>
                      )}
                    </div>

                    <select
                      value={line.batch_id}
                      onChange={(e) => updateUsageLine(line.id, { batch_id: e.target.value })}
                      className="col-span-2 px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                      disabled={!line.product_id}
                    >
                      <option value="">Serija *</option>
                      {availBatches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.lot || b.serial_number || b.id.slice(0, 8)} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'} · Likutis: {b.qty_left?.toFixed(2) || '0'}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      placeholder={line.is_course ? 'Visa dozė' : 'Kiekis'}
                      value={line.qty}
                      onChange={(e) => updateUsageLine(line.id, { qty: e.target.value })}
                      className="px-2 py-1.5 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="flex gap-1">
                      <span className="px-2 py-1.5 bg-gray-200 rounded text-xs text-gray-700">
                        {selectedProduct?.primary_pack_unit || line.unit}
                      </span>
                      <button
                        onClick={() => removeUsageLine(line.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Pašalinti"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {selectedProduct && selectedProduct.category === 'medicines' &&
                   (selectedProduct.withdrawal_days_meat || selectedProduct.withdrawal_days_milk) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border-2 border-amber-300 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                      <div className="text-sm">
                        <span className="font-bold text-amber-900">Karencinės dienos:</span>
                        <div className="flex gap-4 mt-1">
                          {selectedProduct.withdrawal_days_meat && (
                            <span className="text-red-700 font-semibold">
                              🥩 Mėsa: {selectedProduct.withdrawal_days_meat} d.
                            </span>
                          )}
                          {selectedProduct.withdrawal_days_milk && (
                            <span className="text-blue-700 font-semibold">
                              🥛 Pienas: {selectedProduct.withdrawal_days_milk} d.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={line.is_course}
                        onChange={(e) => updateUsageLine(line.id, { is_course: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-gray-700">Kursas (keli dienas)</span>
                    </label>

                    {line.is_course && (
                      <>
                        <input
                          type="number"
                          min="2"
                          placeholder="Dienų"
                          value={line.course_days}
                          onChange={(e) => updateUsageLine(line.id, { course_days: e.target.value })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                        />
                        <input
                          type="date"
                          value={line.course_start_date}
                          onChange={(e) => updateUsageLine(line.id, { course_start_date: e.target.value })}
                          className="px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-blue-500"
                        />
                        {parseInt(line.course_days) > 1 && line.qty && (
                          <span className="text-xs text-gray-600">
                            = {(parseFloat(line.qty) / parseInt(line.course_days)).toFixed(2)} {line.unit} / dieną
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Save className="w-4 h-4" />
            Išsaugoti gydymą
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
        <p><strong>Spenelio žymėjimas:</strong> LF (Kairys priekis), RF (Dešinys priekis), LR (Kairys gal.), RR (Dešinys gal.)</p>
        <p className="mt-1"><strong>Kursas:</strong> Pažymėjus "Kursas" sistema automatiškai padalins dozę per nurodytas dienas ir sukurs atskirą įrašą kiekvienai dienai.</p>
      </div>

      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 text-xs">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">⚠️ SVARBU: Karencinių dienų skaičiavimas</p>
            <p className="text-amber-800 mt-2">
              <strong>Karencija prasideda nuo PASKUTINĖS gydymo dienos!</strong>
            </p>
            <div className="mt-2 space-y-1 text-amber-800">
              <p><strong>Pavyzdys:</strong></p>
              <p>• Gydymas pradėtas: <strong>spalio 10 d.</strong></p>
              <p>• Kursas: <strong>3 dienos</strong> (spalio 10, 11, 12)</p>
              <p>• Paskutinė gydymo diena: <strong>spalio 12 d.</strong></p>
              <p>• Vaisto karencija pienui: <strong>5 dienos</strong></p>
              <p>• Apsaugos diena: <strong>+1 diena</strong></p>
              <p className="font-bold text-amber-900 mt-1">
                ➜ Saugiai melžti galima: <strong>spalio 12 + 5 + 1 = spalio 19 dieną</strong>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
