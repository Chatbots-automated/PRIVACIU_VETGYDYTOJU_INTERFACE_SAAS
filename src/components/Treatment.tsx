import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows, sortByLithuanian } from '../lib/helpers';
import { Product, Animal, Disease, StockByBatch, Unit } from '../lib/types';
import { Syringe, Plus, Trash2, Check, Search } from 'lucide-react';
import { formatDateLT, getDaysUntil } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';

interface UsageLine {
  id: string;
  product_id: string;
  batch_id: string;
  qty: string;
  unit: Unit;
  purpose: string;
}

export function Treatment() {
  const { user, logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<(StockByBatch & { products?: { name: string }; batches?: { expiry_date: string | null } })[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [animalSearch, setAnimalSearch] = useState('');

  const [formData, setFormData] = useState({
    reg_date: new Date().toISOString().split('T')[0],
    animal_id: '',
    disease_id: '',
    first_symptoms_date: '',
    animal_condition: '',
    tests: '',
    clinical_diagnosis: '',
    services: '',
    outcome: '',
    vet_name: user?.full_name || user?.email || '',
    notes: '',
    withdrawal_until: '',
  });

  const [usageItems, setUsageItems] = useState<UsageLine[]>([
    { id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment' }
  ]);

  const [showNewDiseaseModal, setShowNewDiseaseModal] = useState(false);
  const [newDiseaseName, setNewDiseaseName] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  const loadData = async () => {
    if (!selectedFarm) return;

    const [animalsRes, diseasesRes, productsRes, batchesRes] = await Promise.all([
      supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no'),
      supabase.from('diseases').select('*').eq('farm_id', selectedFarm.id).order('name'),
      supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true),
      supabase.from('stock_by_batch').select(`
        *,
        products!inner(name)
      `).eq('farm_id', selectedFarm.id).gt('on_hand', 0),
    ]);

    if (animalsRes.data) setAnimals(animalsRes.data);
    if (diseasesRes.data) setDiseases(diseasesRes.data);
    if (productsRes.data) {
      const sortedProducts = sortByLithuanian(productsRes.data, 'name');
      setProducts(sortedProducts);
    }
    if (batchesRes.data) setBatches(batchesRes.data);
  };

  const addUsageLine = () => {
    setUsageItems([
      ...usageItems,
      { id: Date.now().toString(), product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment' }
    ]);
  };

  const removeUsageLine = (id: string) => {
    if (usageItems.length > 1) {
      setUsageItems(usageItems.filter(item => item.id !== id));
    }
  };

  const updateUsageLine = (id: string, field: keyof UsageLine, value: string) => {
    setUsageItems(usageItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const suggestFIFOBatch = async (productId: string) => {
    if (!productId) return null;

    const { data, error } = await supabase.rpc('fn_fifo_batch', { p_product_id: productId });

    if (error) {
      console.error('FIFO error:', error);
      return null;
    }

    return data;
  };

  const handleCreateDisease = async () => {
    if (!newDiseaseName.trim()) {
      alert('Įveskite ligos pavadinimą');
      return;
    }

    if (!selectedFarm || !selectedFarm.id) {
      alert('Pasirinkite ūkį');
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
      setFormData({ ...formData, disease_id: data.id });
      setNewDiseaseName('');
      setShowNewDiseaseModal(false);

      await logAction('create_disease', 'diseases', data.id, null, { name: data.name });
    } catch (error: any) {
      console.error('Error creating disease:', error);
      alert('Klaida kuriant ligą: ' + error.message);
    }
  };

  const calculateWithdrawalDate = () => {
    let maxWithdrawalDays = 0;

    for (const item of usageItems) {
      if (item.product_id) {
        const product = products.find(p => p.id === item.product_id);
        if (product && product.withdrawal_days && product.withdrawal_days > maxWithdrawalDays) {
          maxWithdrawalDays = product.withdrawal_days;
        }
      }
    }

    if (maxWithdrawalDays > 0) {
      const regDate = new Date(formData.reg_date);
      regDate.setDate(regDate.getDate() + maxWithdrawalDays);
      setFormData({ ...formData, withdrawal_until: regDate.toISOString().split('T')[0] });
    }
  };

  const handleProductChange = async (lineId: string, productId: string) => {
    updateUsageLine(lineId, 'product_id', productId);
    updateUsageLine(lineId, 'batch_id', '');

    const product = products.find(p => p.id === productId);
    if (product) {
      updateUsageLine(lineId, 'unit', product.primary_pack_unit);
    }

    const suggestedBatch = await suggestFIFOBatch(productId);
    if (suggestedBatch) {
      updateUsageLine(lineId, 'batch_id', suggestedBatch);
    }

    setTimeout(calculateWithdrawalDate, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🚀 FORM SUBMITTED - handleSubmit called');
    alert('DEBUG: Form submitted, starting treatment creation...');
    setLoading(true);
    setSuccess(false);

    console.log('🔍 Validating usage items...');

    // Check for incomplete medication entries
    const incompleteMeds = usageItems.filter(item =>
      item.product_id && (!item.batch_id || !item.qty || item.qty <= 0)
    );

    if (incompleteMeds.length > 0) {
      console.log('❌ Incomplete medications detected');
      alert('Klaida: Visi vaistai turi turėti pasirinktą partiją ir kiekį. Patikrinkite vaistų sąrašą.');
      setLoading(false);
      return;
    }

    for (const item of usageItems) {
      if (item.product_id && item.batch_id && item.qty) {
        const batch = batches.find(b => b.batch_id === item.batch_id);
        if (batch) {
          const expiryDate = batch.batches?.expiry_date || null;
          const daysUntil = getDaysUntil(expiryDate);
          if (daysUntil !== null && daysUntil < 0) {
            console.log('❌ Expired batch detected');
            alert(`Klaida: Partija ${batch.lot || 'N/A'} yra pasibaigusi. Negalima naudoti.`);
            setLoading(false);
            return;
          }

          const requestedQty = parseFloat(item.qty);
          if (requestedQty > batch.on_hand) {
            console.log('❌ Insufficient stock');
            alert(`Klaida: Partijoje ${batch.lot || 'N/A'} nepakanka atsargų. Likutis: ${batch.on_hand}, prašoma: ${requestedQty}`);
            setLoading(false);
            return;
          }
        }
      }
    }

    if (!selectedFarm) {
      alert('Pasirinkite ūkį');
      return;
    }

    console.log('✅ Validation passed, inserting treatment...');
    alert('DEBUG: Validation passed, creating treatment in database...');
    try {
      const { data: treatment, error: treatmentError } = await supabase
        .from('treatments')
        .insert({
          farm_id: selectedFarm.id,
          reg_date: formData.reg_date,
          animal_id: formData.animal_id || null,
          disease_id: formData.disease_id || null,
          first_symptoms_date: formData.first_symptoms_date || null,
          animal_condition: formData.animal_condition || null,
          tests: formData.tests || null,
          clinical_diagnosis: formData.clinical_diagnosis || null,
          services: formData.services || null,
          outcome: formData.outcome || null,
          vet_name: formData.vet_name || null,
          created_by_user_id: user?.id || null,
          notes: formData.notes || null,
          withdrawal_until: formData.withdrawal_until || null,
        })
        .select()
        .single();

      if (treatmentError) throw treatmentError;

      console.log('✅ Treatment created:', treatment);
      alert('DEBUG: Treatment created with ID: ' + treatment.id);

      const selectedAnimal = animals.find(a => a.id === formData.animal_id);
      const selectedDisease = diseases.find(d => d.id === formData.disease_id);

      console.log('🔍 About to log action...');
      alert('DEBUG: About to log action for treatment ' + treatment.id);

      try {
        await logAction(
          'create_treatment',
          'treatments',
          treatment.id,
          null,
          {
            animal_id: formData.animal_id,
            animal_tag: selectedAnimal?.tag_no || 'N/A',
            disease_id: formData.disease_id,
            disease_name: selectedDisease?.name || 'N/A',
            vet_name: formData.vet_name,
            reg_date: formData.reg_date,
            clinical_diagnosis: formData.clinical_diagnosis,
            outcome: formData.outcome,
          }
        );
        console.log('✅ Action logged successfully');
        alert('DEBUG: Action logged successfully!');
      } catch (logError: any) {
        console.error('❌ Failed to log action:', logError);
        alert('DEBUG ERROR: Failed to log action: ' + logError.message);
      }

      const usageInserts = usageItems
        .filter(item => item.product_id && item.batch_id && item.qty)
        .map(item => ({
          treatment_id: treatment.id,
          product_id: item.product_id,
          batch_id: item.batch_id,
          qty: parseFloat(item.qty),
          unit: item.unit,
          purpose: item.purpose,
        }));

      if (usageInserts.length > 0) {
        const { error: usageError } = await supabase
          .from('usage_items')
          .insert(usageInserts);

        if (usageError) throw usageError;

        console.log('📦 Logging usage items...');
        try {
          await logAction(
            'create_usage_items',
            'usage_items',
            treatment.id,
            null,
            { count: usageInserts.length, items: usageInserts }
          );
          console.log('✅ Usage items logged');
        } catch (logError: any) {
          console.error('❌ Failed to log usage items:', logError);
        }
      }

      setSuccess(true);
      setFormData({
        reg_date: new Date().toISOString().split('T')[0],
        animal_id: '',
        disease_id: '',
        first_symptoms_date: '',
        animal_condition: '',
        tests: '',
        clinical_diagnosis: '',
        services: '',
        outcome: '',
        vet_name: user?.full_name || user?.email || '',
        notes: '',
        withdrawal_until: '',
      });
      setUsageItems([
        { id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment' }
      ]);

      setTimeout(() => setSuccess(false), 3000);
      await loadData();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailableBatches = (productId: string) => {
    return batches.filter(b => b.product_id === productId);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Syringe className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gydymas ir nurašymas</h2>
            <p className="text-sm text-gray-600">Užregistruokite gydymą ir sumažinkite atsargas</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Gydymas sėkmingai užregistruotas!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gydymo informacija</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Registracijos data *
                </label>
                <input
                  type="date"
                  value={formData.reg_date}
                  onChange={(e) => setFormData({ ...formData, reg_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pirmųjų simptomų data
                </label>
                <input
                  type="date"
                  value={formData.first_symptoms_date}
                  onChange={(e) => setFormData({ ...formData, first_symptoms_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gyvūnas
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Ieškoti pagal paskutinius 5 skaitmenis..."
                    value={animalSearch}
                    onChange={(e) => setAnimalSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
                  />
                </div>
                <select
                  value={formData.animal_id}
                  onChange={(e) => setFormData({ ...formData, animal_id: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  size={5}
                >
                  <option value="">Pasirinkite gyvūną...</option>
                  {animals
                    .filter(animal => {
                      if (!animalSearch) return true;
                      const last5 = animal.tag_no.slice(-5);
                      const reversed = last5.split('').reverse().join('');
                      return reversed.toLowerCase().includes(animalSearch.toLowerCase()) ||
                             animal.tag_no.toLowerCase().includes(animalSearch.toLowerCase()) ||
                             animal.holder_name?.toLowerCase().includes(animalSearch.toLowerCase());
                    })
                    .map((animal) => (
                      <option key={animal.id} value={animal.id}>
                        {animal.tag_no} - {animal.species} ({animal.holder_name})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Liga
                </label>
                <div className="flex gap-2">
                  <select
                    value={formData.disease_id}
                    onChange={(e) => {
                      if (e.target.value === '__new__') {
                        setShowNewDiseaseModal(true);
                      } else {
                        setFormData({ ...formData, disease_id: e.target.value });
                      }
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Pasirinkite ligą...</option>
                    {diseases.map((disease) => (
                      <option key={disease.id} value={disease.id}>
                        {disease.name}
                      </option>
                    ))}
                    <option value="__new__">+ Sukurti naują ligą</option>
                  </select>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gyvūno būklė
                </label>
                <textarea
                  value={formData.animal_condition}
                  onChange={(e) => setFormData({ ...formData, animal_condition: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Aprašykite gyvūno būklę..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Atlikti tyrimai
                </label>
                <textarea
                  value={formData.tests}
                  onChange={(e) => setFormData({ ...formData, tests: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Išvardykite atliktus tyrimus..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Klinikinė diagnozė
                </label>
                <textarea
                  value={formData.clinical_diagnosis}
                  onChange={(e) => setFormData({ ...formData, clinical_diagnosis: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Įveskite diagnozę..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Suteiktos paslaugos
                </label>
                <input
                  type="text"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paslaugos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rezultatas
                </label>
                <input
                  type="text"
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Gydymo rezultatas..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Veterinaro vardas
                </label>
                <input
                  type="text"
                  value={formData.vet_name}
                  onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Gydytojo vardas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Karencija iki
                </label>
                <input
                  type="date"
                  value={formData.withdrawal_until}
                  onChange={(e) => setFormData({ ...formData, withdrawal_until: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Automatiškai apskaičiuojama iš produktų</p>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pastabos
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Papildomos pastabos..."
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Panaudoti produktai</h3>
              <button
                type="button"
                onClick={addUsageLine}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Pridėti produktą
              </button>
            </div>

            <div className="space-y-4">
              {usageItems.map((item) => (
                <div key={item.id} className="flex gap-3 items-start">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                    <select
                      value={item.product_id}
                      onChange={(e) => handleProductChange(item.id, e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Pasirinkite produktą...</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={item.batch_id}
                      onChange={(e) => updateUsageLine(item.id, 'batch_id', e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!item.product_id}
                    >
                      <option value="">Pasirinkite partiją...</option>
                      {getAvailableBatches(item.product_id).map((batch) => {
                        const expiryDate = batch.batches?.expiry_date || null;
                        const daysUntil = getDaysUntil(expiryDate);
                        const isExpired = daysUntil !== null && daysUntil < 0;
                        const expiryInfo = expiryDate ? ` · Galioja iki ${formatDateLT(expiryDate)}` : '';

                        return (
                          <option key={batch.batch_id} value={batch.batch_id} disabled={isExpired}>
                            LOT: {batch.lot || 'N/A'}{expiryInfo} · Likutis: {batch.on_hand} {isExpired ? '(PASIBAIGĘS)' : ''}
                          </option>
                        );
                      })}
                    </select>

                    <input
                      type="number"
                      step="0.01"
                      value={item.qty}
                      onChange={(e) => updateUsageLine(item.id, 'qty', e.target.value)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Kiekis"
                    />

                    <select
                      value={item.unit}
                      onChange={(e) => updateUsageLine(item.id, 'unit', e.target.value as Unit)}
                      className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-100"
                      disabled
                      title="Vienetas nustatytas iš produkto"
                    >
                      <option value="ml">ml</option>
                      <option value="l">L</option>
                      <option value="g">g</option>
                      <option value="kg">kg</option>
                      <option value="vnt">vnt</option>
                      <option value="tabletkė">tabletkė</option>
                      <option value="bolus">bolus</option>
                      <option value="syringe">syringe</option>
                    </select>
                  </div>

                  {usageItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeUsageLine(item.id)}
                      className="p-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Išsaugoma...' : 'Užregistruoti gydymą'}
            </button>
          </div>
        </form>
      </div>

      {showNewDiseaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Sukurti naują ligą</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ligos pavadinimas *
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
    </div>
  );
}
