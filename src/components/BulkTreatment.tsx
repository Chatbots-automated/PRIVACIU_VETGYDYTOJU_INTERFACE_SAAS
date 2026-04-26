import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows, sortByLithuanian } from '../lib/helpers';
import { Product, Animal, StockByBatch, Unit } from '../lib/types';
import { Users, Plus, Trash2, Check, Search, Syringe, Package } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { requireClientId } from '../lib/clientHelpers';

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
  category: 'medicines' | 'prevention' | 'vakcina';
  dose_number?: string;
  next_booster_date?: string;
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
  // Group products by category for easier selection
  const getMedicineProducts = () => products.filter(p => 
    p.category === 'medicines' || 
    p.category === 'treatment_materials' || 
    p.category === 'svirkstukai' ||
    p.category === 'ovules' ||
    p.category === 'bolusas'
  );
  const getVaccineProducts = () => products.filter(p => p.category === 'vakcina');
  const getPreventionProducts = () => products.filter(p => p.category === 'prevention');

  const { user, logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [animals, setAnimals] = useState<SelectedAnimal[]>([]);
  const [filteredAnimals, setFilteredAnimals] = useState<SelectedAnimal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockByBatch[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<SelectedAnimal[]>([]);
  const [selectedMedications, setSelectedMedications] = useState<SelectedMedication[]>([
    { id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment', category: 'medicines' }
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

  // Auto-update vet_name when user changes
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        vet_name: user.full_name || user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  useEffect(() => {
    filterAnimals();
  }, [animals, searchTerm, collarSearch, selectedAgeGroup]);

  const loadData = async () => {
    if (!selectedFarm) return;

    const [animalsRes, batchesRes, vetsRes] = await Promise.all([
      supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no'),
      supabase.from('stock_by_batch').select('*').eq('farm_id', selectedFarm.id).gt('on_hand', 0),
      supabase.from('treatments').select('vet_name').eq('farm_id', selectedFarm.id).not('vet_name', 'is', null),
    ]);

    setAnimals(animalsRes.data || []);
    if (batchesRes.data) setBatches(batchesRes.data);

    // Get unique vet names
    if (vetsRes.data) {
      const uniqueVets = Array.from(new Set(vetsRes.data.map(v => v.vet_name).filter(Boolean))) as string[];
      setVetNames(uniqueVets.sort());
    }

    // Load products that have stock at this farm (from batches)
    // This ensures we show products from warehouse that are allocated to this farm
    if (batchesRes.data && batchesRes.data.length > 0) {
      const productIds = [...new Set(batchesRes.data.map((b: any) => b.product_id))];
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .in('category', ['medicines', 'prevention', 'vakcina', 'ovules']);
      
      if (!productsError && productsData) {
        const sortedProducts = sortByLithuanian(productsData, 'name');
        setProducts(sortedProducts);
      }
    } else {
      // No stock, show empty products list
      setProducts([]);
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
      { id: Date.now().toString(), product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment', category: 'medicines' }
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
    if (!productId || !selectedFarm) return null;

    const { data, error } = await supabase.rpc('fn_fifo_batch', { 
      p_farm_id: selectedFarm.id,
      p_product_id: productId 
    });

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
      alert('Prašome pridėti bent vieną produktą su kiekiu');
      return;
    }

    if (!selectedFarm) {
      alert('Pasirinkite ūkį');
      return;
    }

    // Validate stock availability before starting
    const stockWarnings: string[] = [];
    for (const med of validMedications) {
      const batch = batches.find(b => b.batch_id === med.batch_id);
      const totalNeeded = parseFloat(med.qty) * selectedAnimals.length;
      const available = batch?.on_hand || 0;
      
      if (available < totalNeeded) {
        const product = products.find(p => p.id === med.product_id);
        stockWarnings.push(
          `${product?.name || 'Produktas'}: Reikia ${totalNeeded} ${med.unit}, turima ${available} ${med.unit}`
        );
      }
    }

    if (stockWarnings.length > 0) {
      const proceed = confirm(
        `⚠️ DĖMESIO: Nepakanka atsargų!\n\n` +
        stockWarnings.join('\n') +
        `\n\nTęsti vis tiek? Bus išgydyta tik dalis gyvūnų (kol nepasibaigs atsargos).`
      );
      
      if (!proceed) return;
    }

    setLoading(true);

    try {
      // Load service prices for visit charges
      const clientId = requireClientId(user);
      const { data: servicePricesData, error: pricesError } = await supabase
        .from('service_prices')
        .select('procedure_type, base_price')
        .eq('client_id', clientId);

      if (pricesError) {
        console.error('Error loading service prices:', pricesError);
      }

      const servicePrices = new Map<string, number>();
      (servicePricesData || []).forEach(sp => {
        servicePrices.set(sp.procedure_type, sp.base_price);
      });

      // Group medications by category
      const treatments = validMedications.filter(m => 
        m.category === 'medicines' || 
        m.category === 'treatment_materials' || 
        m.category === 'svirkstukai' ||
        m.category === 'ovules' ||
        m.category === 'bolusas'
      );
      const vaccinations = validMedications.filter(m => m.category === 'vakcina');
      const preventions = validMedications.filter(m => m.category === 'prevention');

      let successCount = 0;
      const errors: string[] = [];

      for (const animal of selectedAnimals) {
        try {
          let mainTreatmentId: string | null = null;
          let visitTreatmentId: string | null = null;

          // Handle treatments (medicines)
          if (treatments.length > 0) {
            const { data: treatment, error: treatmentError } = await supabase
              .from('treatments')
              .insert({
                client_id: clientId,
                farm_id: selectedFarm.id,
                reg_date: formData.treatment_date,
                animal_id: animal.id,
                vet_name: formData.vet_name,
                notes: formData.notes,
                clinical_diagnosis: 'Masinis gydymas',
                animal_condition: 'Patenkinama',
              })
              .select()
              .single();

            if (treatmentError) throw treatmentError;
            mainTreatmentId = treatment.id;
            visitTreatmentId = treatment.id;

            // Add all medicines to this treatment
            const usageItems = treatments.map(med => ({
              client_id: clientId,
              farm_id: selectedFarm.id,
              treatment_id: treatment.id,
              product_id: med.product_id,
              batch_id: med.batch_id,
              quantity: parseFloat(med.qty),
              unit: med.unit,
              administered_date: formData.treatment_date,
            }));

            const { error: usageError } = await supabase
              .from('usage_items')
              .insert(usageItems);

            if (usageError) throw usageError;
          }

        // Handle vaccinations - ALSO create treatment record so they show in reports
        if (vaccinations.length > 0) {
          // Create treatment record for vaccines
          const { data: vaccineTreatment, error: vacTreatmentError } = await supabase
            .from('treatments')
            .insert({
              client_id: clientId,
              farm_id: selectedFarm.id,
              reg_date: formData.treatment_date,
              animal_id: animal.id,
              vet_name: formData.vet_name,
              notes: formData.notes,
              clinical_diagnosis: 'Masinis gydymas (Vakcinos)',
              animal_condition: 'Patenkinama',
            })
            .select()
            .single();

          if (vacTreatmentError) throw vacTreatmentError;
          if (!mainTreatmentId) mainTreatmentId = vaccineTreatment.id;
          if (!visitTreatmentId) visitTreatmentId = vaccineTreatment.id;

          // Create vaccinations (usage_items are created automatically by trigger)
          for (const vac of vaccinations) {
            // Create vaccination record
            // NOTE: Database trigger 'create_usage_from_vaccination' will automatically
            // create a usage_item and deduct stock - DO NOT create usage_item manually!
            const { error: vacError } = await supabase
              .from('vaccinations')
              .insert({
                client_id: clientId,
                farm_id: selectedFarm.id,
                animal_id: animal.id,
                product_id: vac.product_id,
                batch_id: vac.batch_id,
                vaccination_date: formData.treatment_date,
                dose_amount: parseFloat(vac.qty),
                unit: vac.unit,
                dose_number: parseInt(vac.dose_number || '1'),
                next_booster_date: vac.next_booster_date || null,
                administered_by: formData.vet_name,
                notes: formData.notes,
              });

            if (vacError) throw vacError;
            
            // Stock is automatically deducted by the database trigger
            // No need to manually create usage_item here
          }
        }

        // Handle preventions
        for (const prev of preventions) {
          const { data: preventionData, error: prevError } = await supabase
            .from('preventions')
            .insert({
              client_id: clientId,
              farm_id: selectedFarm.id,
              animal_id: animal.id,
              application_date: formData.treatment_date,
              administered_by: formData.vet_name,
              notes: formData.notes,
            })
            .select()
            .single();

          if (prevError) throw prevError;

          // Add usage item for prevention
          const { error: usageError } = await supabase
            .from('usage_items')
            .insert({
              client_id: clientId,
              farm_id: selectedFarm.id,
              prevention_id: preventionData.id,
              product_id: prev.product_id,
              batch_id: prev.batch_id,
              quantity: parseFloat(prev.qty),
              unit: prev.unit,
            });

          if (usageError) throw usageError;
        }

        // ALWAYS create animal visit record for bulk treatment
        const procedures: string[] = [];
        if (treatments.length > 0) procedures.push('Gydymas');
        if (vaccinations.length > 0) procedures.push('Vakcina');
        if (preventions.length > 0) procedures.push('Profilaktika');

        const { data: visitData, error: visitError } = await supabase
          .from('animal_visits')
          .insert({
            client_id: clientId,
            farm_id: selectedFarm.id,
            animal_id: animal.id,
            visit_datetime: new Date(formData.treatment_date).toISOString(),
            procedures: procedures,
            status: 'Baigtas',
            notes: formData.notes || null,
            vet_name: formData.vet_name || null,
            treatment_required: procedures.includes('Gydymas'),
            related_treatment_id: visitTreatmentId,
          })
          .select()
          .single();

        if (visitError) {
          console.warn(`Failed to create visit for animal ${animal.tag_no}:`, visitError);
        } else if (visitData) {
          // Create visit charges for services (procedures)
          const visitCharges: any[] = [];
          
          for (const procedure of procedures) {
            const price = servicePrices.get(procedure) || 0;
            if (price > 0) {
              visitCharges.push({
                client_id: clientId,
                farm_id: selectedFarm.id,
                visit_id: visitData.id,
                animal_id: animal.id,
                charge_type: 'paslauga',
                procedure_type: procedure,
                quantity: 1,
                unit_price: price,
                total_price: price,
                invoiced: false,
              });
            }
          }

          // Create visit charges for products used
          for (const med of validMedications) {
            const product = products.find(p => p.id === med.product_id);
            const batch = batches.find(b => b.batch_id === med.batch_id);
            const unitPrice = batch?.avg_price_before_discount || 0;
            const qty = parseFloat(med.qty) || 0;
            const totalPrice = unitPrice * qty;

            if (product && qty > 0) {
              visitCharges.push({
                client_id: clientId,
                farm_id: selectedFarm.id,
                visit_id: visitData.id,
                animal_id: animal.id,
                charge_type: 'produktas',
                product_id: product.id,
                product_name: product.name,
                quantity: qty,
                unit_price: unitPrice,
                total_price: totalPrice,
                invoiced: false,
              });
            }
          }

          // Insert all visit charges
          if (visitCharges.length > 0) {
            console.log(`Creating ${visitCharges.length} visit charges for animal ${animal.tag_no}:`, visitCharges);
            const { data: chargesData, error: chargesError } = await supabase
              .from('visit_charges')
              .insert(visitCharges)
              .select();

            if (chargesError) {
              console.error(`Failed to create visit charges for animal ${animal.tag_no}:`, chargesError);
            } else {
              console.log(`Successfully created visit charges:`, chargesData);
            }
          }
        }

          successCount++;
        } catch (animalError: any) {
          console.error(`Error treating animal ${animal.tag_no}:`, animalError);
          errors.push(`${animal.tag_no}: ${animalError.message}`);
          // Continue with next animal instead of stopping
        }
      }

      // Log action (non-critical, won't throw)
      await logAction('bulk_treatment_create', null, null, null, {
        animals_count: selectedAnimals.length,
        success_count: successCount,
        error_count: errors.length,
        medications_count: validMedications.length,
        date: formData.treatment_date,
      });

      setSuccess(true);
      
      // Show success notification with details
      let message = `Sėkmingai išgydyta gyvūnų: ${successCount} iš ${selectedAnimals.length}`;
      if (errors.length > 0) {
        message += `\n\nKlaidos (${errors.length}):\n`;
        message += errors.slice(0, 5).join('\n');
        if (errors.length > 5) {
          message += `\n... ir dar ${errors.length - 5} klaidų`;
        }
        message += '\n\nTikėtina priežastis: nepakanka atsargų pasirinktoje serijoje.';
      }
      alert(message);
      
      setTimeout(() => {
        setSuccess(false);
        // Reset form
        setSelectedAnimals([]);
        setSelectedMedications([{ id: '1', product_id: '', batch_id: '', qty: '', unit: 'ml', purpose: 'treatment', category: 'medicines' }]);
        setFormData({
          treatment_date: new Date().toISOString().split('T')[0],
          vet_name: user?.full_name || user?.email || '',
          notes: '',
        });
        loadData();
      }, 2000);
    } catch (error) {
      console.error('Error saving bulk treatment:', error);
      alert('Klaida išsaugant gydymus: ' + (error as any)?.message || 'Nežinoma klaida');
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
            <h2 className="text-2xl font-bold text-gray-900">Masinis Gydymas ir Vakcinacijos</h2>
            <p className="text-sm text-gray-600">Pritaikykite gydymą, vakcinaciją ar profilaktiką keliems gyvūnams vienu metu</p>
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
              <h3 className="text-lg font-semibold text-gray-900">Produktai (Vaistai / Vakcinos / Profilaktika)</h3>
            </div>
            <button
              type="button"
              onClick={addMedication}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Pridėti produktą
            </button>
          </div>

          <div className="space-y-3">
            {selectedMedications.map((med, index) => {
              const selectedProduct = products.find(p => p.id === med.product_id);
              const medicineProducts = products.filter(p => 
                p.category === 'medicines' || 
                p.category === 'treatment_materials' || 
                p.category === 'svirkstukai' ||
                p.category === 'ovules' ||
                p.category === 'bolusas'
              );
              const vaccineProducts = products.filter(p => p.category === 'vakcina');
              const preventionProducts = products.filter(p => p.category === 'prevention');

              return (
              <div key={med.id} className="flex gap-3 items-start bg-gray-50 p-4 rounded-lg border-2 border-gray-200">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Kategorija
                    </label>
                    <select
                      value={med.category}
                      onChange={(e) => {
                        const category = e.target.value as 'medicines' | 'prevention' | 'vakcina';
                        updateMedication(med.id, 'category', category);
                        updateMedication(med.id, 'product_id', '');
                        updateMedication(med.id, 'batch_id', '');
                        updateMedication(med.id, 'purpose', 
                          (category === 'medicines' || 
                           category === 'treatment_materials' || 
                           category === 'svirkstukai' ||
                           category === 'ovules' ||
                           category === 'bolusas') ? 'treatment' : 
                          category === 'vakcina' ? 'vaccination' : 
                          'prevention'
                        );
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="medicines">Vaistai</option>
                      <option value="vakcina">Vakcinos</option>
                      <option value="prevention">Profilaktika</option>
                    </select>
                  </div>

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
                      {med.category === 'medicines' && medicineProducts.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                      {med.category === 'vakcina' && vaccineProducts.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
                      ))}
                      {(med.category === 'prevention' || med.category === 'ovules') && preventionProducts.map(product => (
                        <option key={product.id} value={product.id}>{product.name}</option>
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
                        Kiekis <span className="text-red-600">vienam gyvūnui</span>
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
                      {med.qty && selectedAnimals.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          Iš viso reikės: {(parseFloat(med.qty) * selectedAnimals.length).toFixed(2)} {med.unit}
                        </p>
                      )}
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

                  {/* Vaccine-specific fields */}
                  {med.category === 'vakcina' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Dozės Nr.
                        </label>
                        <input
                          type="number"
                          value={med.dose_number || '1'}
                          onChange={(e) => updateMedication(med.id, 'dose_number', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="1"
                        />
                      </div>
                    </>
                  )}
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
            );
            })}
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
