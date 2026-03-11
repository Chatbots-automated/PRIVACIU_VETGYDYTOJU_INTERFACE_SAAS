import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows, sortByLithuanian } from '../lib/helpers';
import { Product, Animal, StockByBatch, Unit } from '../lib/types';
import { Users, Plus, Trash2, Check, Search, Syringe, Package } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';

interface SelectedAnimal extends Animal {
  collar_no: string | null;
}

interface SelectedMedication {
  id: string;
  product_id: string;
  batch_id: string;
  qty: string;
  unit: Unit;
  purpose: string;
}

interface AgeGroup {
  label: string;
  minMonths: number | null;
  maxMonths: number | null;
}

const AGE_GROUPS: AgeGroup[] = [
  { label: 'Visi', minMonths: null, maxMonths: null },
  { label: 'Telyčios (<12 mėn)', minMonths: 0, maxMonths: 11 },
  { label: 'Telyčaitės (12-24 mėn)', minMonths: 12, maxMonths: 24 },
  { label: 'Karvės (>24 mėn)', minMonths: 25, maxMonths: null },
];

export function BulkTreatment() {
  const { user, logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [animals, setAnimals] = useState<SelectedAnimal[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<SelectedAnimal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockByBatch[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<SelectedAnimal[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<SelectedMedication[]>([
    { id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'prevention' }
  ]);
  const [vetNames, setVetNames] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [collarSearch, setCollarSearch] = useState('');
  const [selectedAgeGroup, setSelectedAgeGroup] = useState<AgeGroup>(AGE_GROUPS[0]);

  const [formData, setFormData] = useState({
    treatment_date: new Date().toISOString().split('T')[0],
    vet_name: user?.full_name || user?.email || '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  useEffect(() => {
    filterAnimals();
  }, [animals, searchTerm, collarSearch, selectedAgeGroup]);

  const loadData = async () => {
    if (!selectedFarm) return;

    const [animalsRes, productsRes, batchesRes, vetsRes] = await Promise.all([
      supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no'),
      supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true),
      supabase.from('stock_by_batch').select('*').eq('farm_id', selectedFarm.id).gt('on_hand', 0),
      supabase.from('treatments').select('vet_name').eq('farm_id', selectedFarm.id).not('vet_name', 'is', null),
    ]);

    setAnimals(animalsRes.data || []);
    if (productsRes.data) {
      const sortedProducts = sortByLithuanian(productsRes.data, 'name');
      setProducts(sortedProducts);
    }
    if (batchesRes.data) setBatches(batchesRes.data);

    // Get unique vet names
    if (vetsRes.data) {
      const uniqueVets = Array.from(new Set(vetsRes.data.map(v => v.vet_name).filter(Boolean))) as string[];
      setVetNames(uniqueVets.sort());
    }
  };

  const filterAnimals = () => {
    let filtered = [...animals];

    // Filter by search term (ear tag)
    if (searchTerm.trim()) {
      filtered = filtered.filter(a =>
        a.tag_no?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by collar number - exact match
    if (collarSearch.trim()) {
      filtered = filtered.filter(a =>
        a.collar_no === collarSearch
      );
    }

    // Filter by age group
    if (selectedAgeGroup.minMonths !== null || selectedAgeGroup.maxMonths !== null) {
      filtered = filtered.filter(a => {
        const age = a.age_months;
        if (age === null) return false;

        if (selectedAgeGroup.minMonths !== null && age < selectedAgeGroup.minMonths) {
          return false;
        }
        if (selectedAgeGroup.maxMonths !== null && age > selectedAgeGroup.maxMonths) {
          return false;
        }
        return true;
      });
    }

    setFilteredAnimals(filtered);
  };

  const toggleAnimalSelection = (animal: SelectedAnimal) => {
    if (selectedAnimals.find(a => a.id === animal.id)) {
      setSelectedAnimals(selectedAnimals.filter(a => a.id !== animal.id));
    } else {
      setSelectedAnimals([...selectedAnimals, animal]);
    }
  };

  const selectAllFiltered = () => {
    const newSelections = [...selectedAnimals];
    filteredAnimals.forEach(animal => {
      if (!newSelections.find(a => a.id === animal.id)) {
        newSelections.push(animal);
      }
    });
    setSelectedAnimals(newSelections);
  };

  const clearAllSelections = () => {
    setSelectedAnimals([]);
  };

  const addMedication = () => {
    setSelectedMedications([
      ...selectedMedications,
      { id: Date.now().toString(), product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'prevention' }
    ]);
  };

  const removeMedication = (id: string) => {
    if (selectedMedications.length > 1) {
      setSelectedMedications(selectedMedications.filter(item => item.id !== id));
    }
  };

  const updateMedication = (id: string, field: keyof SelectedMedication, value: string) => {
    setSelectedMedications(prev => prev.map(item =>
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

  const handleProductChange = async (itemId: string, productId: string) => {
    // Update product and clear batch
    setSelectedMedications(prev => prev.map(item =>
      item.id === itemId ? { ...item, product_id: productId, batch_id: '' } : item
    ));

    // Get product details for unit
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedMedications(prev => prev.map(item =>
        item.id === itemId ? { ...item, unit: product.primary_pack_unit } : item
      ));
    }

    // Suggest and set FIFO batch
    const suggestedBatch = await suggestFIFOBatch(productId);
    if (suggestedBatch) {
      setSelectedMedications(prev => prev.map(item =>
        item.id === itemId ? { ...item, batch_id: suggestedBatch } : item
      ));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedAnimals.length === 0) {
      alert('Prašome pasirinkti bent vieną gyvūną');
      return;
    }

    const validMedications = selectedMedications.filter(m =>
      m.product_id && m.batch_id && parseFloat(m.qty) > 0
    );

    if (validMedications.length === 0) {
      alert('Prašome pridėti bent vieną vaistą su kiekiu');
      return;
    }

    if (!selectedFarm) {
      alert('Pasirinkite ūkį');
      return;
    }

    setLoading(true);

    try {
      // For each animal, create a treatment record (not a visit)
      for (const animal of selectedAnimals) {
        // Create treatment
        const { data: treatment, error: treatmentError } = await supabase
          .from('treatments')
          .insert({
            farm_id: selectedFarm.id,
            reg_date: formData.treatment_date,
            animal_id: animal.id,
            vet_name: formData.vet_name,
            notes: formData.notes,
            clinical_diagnosis: 'Masinis gydymas',
          })
          .select()
          .single();

        if (treatmentError) throw treatmentError;

        // Add all medications to this treatment
        const usageItems = validMedications.map(med => ({
          farm_id: selectedFarm.id,
          treatment_id: treatment.id,
          product_id: med.product_id,
          batch_id: med.batch_id,
          qty: parseFloat(med.qty),
          unit: med.unit,
          purpose: med.purpose,
        }));

        const { error: usageError } = await supabase
          .from('usage_items')
          .insert(usageItems);

        if (usageError) throw usageError;
      }

      await logAction('bulk_treatment_create', null, null, null, {
        animals_count: selectedAnimals.length,
        medications_count: validMedications.length,
        date: formData.treatment_date,
      });

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        // Reset form
        setSelectedAnimals([]);
        setSelectedMedications([{ id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'prevention' }]);
        setFormData({
          treatment_date: new Date().toISOString().split('T')[0],
          vet_name: user?.full_name || user?.email || '',
          notes: '',
        });
        loadData();
      }, 2000);
    } catch (error) {
      console.error('Error saving bulk treatment:', error);
      alert('Klaida išsaugant gydymą');
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId: string) => {
    return products.find(p => p.id === productId)?.name || '';
  };

  const getBatchInfo = (batchId: string) => {
    const batch = batches.find(b => b.batch_id === batchId);
    if (!batch) return '';

    const expiry = batch.expiry_date ? ` (Galioja iki: ${formatDateLT(batch.expiry_date)})` : '';
    return `Likutis: ${batch.on_hand}${expiry}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Masinis Gydymas</h2>
            <p className="text-sm text-gray-600">Gydyti kelis gyvūnus vienu metu</p>
          </div>
        </div>

        {success && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
            <Check className="w-5 h-5" />
            <span className="font-medium">Sėkmingai išsaugota!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Pagrindinė informacija</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gydymo data
              </label>
              <input
                type="date"
                value={formData.treatment_date}
                onChange={(e) => setFormData({ ...formData, treatment_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Veterinaras
              </label>
              <input
                type="text"
                value={formData.vet_name}
                onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
                list="vet-names"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Veterinaro vardas"
              />
              <datalist id="vet-names">
                {vetNames.map(name => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pastabos
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Papildoma informacija"
              />
            </div>
          </div>
        </div>

        {/* Medications Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Vaistai ir prevencija</h3>
            </div>
            <button
              type="button"
              onClick={addMedication}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Pridėti vaistą
            </button>
          </div>

          <div className="space-y-3">
            {selectedMedications.map((med, index) => (
              <div key={med.id} className="flex gap-3 items-start bg-gray-50 p-4 rounded-lg">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Produktas
                    </label>
                    <select
                      value={med.product_id}
                      onChange={(e) => handleProductChange(med.id, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                    >
                      <option value="">Pasirinkite produktą</option>
                      {products.filter(p =>
                        p.category === 'medicines' ||
                        p.category === 'prevention' ||
                        p.category === 'hygiene' ||
                        p.category === 'vakcina'
                      ).map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Partija
                    </label>
                    <select
                      value={med.batch_id}
                      onChange={(e) => updateMedication(med.id, 'batch_id', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      required
                      disabled={!med.product_id}
                    >
                      <option value="">Pasirinkite partiją</option>
                      {batches
                        .filter(b => b.product_id === med.product_id)
                        .map(batch => (
                          <option key={batch.batch_id} value={batch.batch_id}>
                            {batch.lot || 'Be partijos'} - {getBatchInfo(batch.batch_id)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Kiekis
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={med.qty}
                        onChange={(e) => updateMedication(med.id, 'qty', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="0"
                        required
                      />
                    </div>
                    <div className="w-20">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Vnt.
                      </label>
                      <select
                        value={med.unit}
                        onChange={(e) => updateMedication(med.id, 'unit', e.target.value as Unit)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      >
                        <option value="ml">ml</option>
                        <option value="l">l</option>
                        <option value="g">g</option>
                        <option value="kg">kg</option>
                        <option value="vnt">vnt</option>
                      </select>
                    </div>
                  </div>
                </div>

                {selectedMedications.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMedication(med.id)}
                    className="mt-6 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Animals Selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Gyvūnai</h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                {selectedAnimals.length} pasirinkta
              </span>
            </div>
          </div>

          {/* Filters - Always visible */}
          <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ausies Nr.
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ieškoti pagal ausies nr..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kaklo Nr.
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={collarSearch}
                    onChange={(e) => setCollarSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Tikslus kaklo numeris..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amžiaus grupė
                </label>
                <select
                  value={AGE_GROUPS.indexOf(selectedAgeGroup)}
                  onChange={(e) => setSelectedAgeGroup(AGE_GROUPS[parseInt(e.target.value)])}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {AGE_GROUPS.map((group, index) => (
                    <option key={index} value={index}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Pasirinkti visus filtruotus ({filteredAnimals.length})
              </button>
              <button
                type="button"
                onClick={clearAllSelections}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                Atžymėti visus
              </button>
            </div>
          </div>

          {/* Animals Grid */}
          <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 p-3">
              {filteredAnimals.map(animal => {
                const isSelected = selectedAnimals.find(a => a.id === animal.id);
                return (
                  <button
                    key={animal.id}
                    type="button"
                    onClick={() => toggleAnimalSelection(animal)}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {animal.tag_no}
                    </div>
                    {animal.collar_no && (
                      <div className="text-xs text-gray-600">
                        Kaklo: {animal.collar_no}
                      </div>
                    )}
                    {animal.age_months !== null && (
                      <div className="text-xs text-gray-500">
                        {animal.age_months} mėn.
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {filteredAnimals.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              Nerasta gyvūnų pagal pasirinktus filtrus
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            disabled={loading || selectedAnimals.length === 0}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Išsaugoma...
              </>
            ) : (
              <>
                <Syringe className="w-5 h-5" />
                Išsaugoti gydymą ({selectedAnimals.length} gyvūnų)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
