import { useState, useEffect } from 'react';
import { Calendar, Plus, Trash2, AlertCircle, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { SearchableSelect } from './SearchableSelect';

interface Product {
  id: string;
  name: string;
  primary_pack_unit: string;
  withdrawal_days_milk?: number;
  withdrawal_days_meat?: number;
  withdrawal_iv_meat?: number;
  withdrawal_iv_milk?: number;
  withdrawal_im_meat?: number;
  withdrawal_im_milk?: number;
  withdrawal_sc_meat?: number;
  withdrawal_sc_milk?: number;
  withdrawal_iu_meat?: number;
  withdrawal_iu_milk?: number;
  withdrawal_imm_meat?: number;
  withdrawal_imm_milk?: number;
  withdrawal_pos_meat?: number;
  withdrawal_pos_milk?: number;
}

interface Batch {
  id: string;
  lot: string | null;
  qty_left: number;
}

interface ScheduledMedication {
  id: string;
  product_id: string;
  batch_id: string | null;
  qty: string | null;
  unit: string;
  teat: string | null;
  purpose: string;
  administration_route?: string;
}

interface DateMedications {
  date: string;
  medications: ScheduledMedication[];
}

interface CourseMedicationSchedulerProps {
  animalId: string;
  farmId: string;
  onConfirm: (schedule: DateMedications[]) => void;
  onCancel: () => void;
  initialStartDate?: string;
  initialSchedule?: DateMedications[];
}

export function CourseMedicationScheduler({
  animalId,
  farmId,
  onConfirm,
  onCancel,
  initialStartDate,
  initialSchedule
}: CourseMedicationSchedulerProps) {
  const [step, setStep] = useState<'dates' | 'medications' | 'review'>('dates');
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Map<string, Batch[]>>(new Map());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dateSchedule, setDateSchedule] = useState<Map<string, ScheduledMedication[]>>(new Map());
  const [currentDateIndex, setCurrentDateIndex] = useState(0);

  useEffect(() => {
    loadProducts();

    // Load initial schedule if provided (for editing existing courses)
    if (initialSchedule && initialSchedule.length > 0) {
      console.log('📥 Loading existing course schedule:', initialSchedule);

      const dates = initialSchedule.map(s => s.date).sort();
      setSelectedDates(dates);

      const scheduleMap = new Map<string, ScheduledMedication[]>();
      initialSchedule.forEach(daySchedule => {
        const meds = daySchedule.medications.map(med => ({
          ...med,
          id: med.id || crypto.randomUUID() // Ensure each med has an id
        }));
        scheduleMap.set(daySchedule.date, meds);

        // Pre-load batches for each product
        meds.forEach(med => {
          if (med.product_id) {
            loadBatchesForProduct(med.product_id);
          }
        });
      });
      setDateSchedule(scheduleMap);

      console.log('✅ Schedule loaded with', dates.length, 'dates');
    } else if (initialStartDate) {
      const today = new Date(initialStartDate);
      setSelectedDates([today.toISOString().split('T')[0]]);
    }
  }, [initialStartDate, initialSchedule]);

  const loadProducts = async () => {
    // Load products that have stock at this farm (from batches)
    const { data: batchesData, error: batchError } = await supabase
      .from('batches')
      .select('product_id')
      .eq('farm_id', farmId)
      .gt('qty_left', 0);
    
    if (batchError) {
      console.error('Error loading batches:', batchError);
      return;
    }
    
    if (batchesData && batchesData.length > 0) {
      const productIds = [...new Set(batchesData.map((b: any) => b.product_id))];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .order('name');

      if (!error && data) {
        console.log('📦 CourseMedicationScheduler loaded products:', data.length, data.map(p => ({ name: p.name, category: p.category })));
        setProducts(data);
      }
    } else {
      console.log('⚠️ CourseMedicationScheduler: No batches found');
      setProducts([]);
    }
  };

  const loadBatchesForProduct = async (productId: string) => {
    if (batches.has(productId)) return;

    console.log('Loading batches for product:', productId, 'farm:', farmId);
    const { data, error } = await supabase
      .from('batches')
      .select('id, lot, qty_left')
      .eq('product_id', productId)
      .eq('farm_id', farmId)
      .gt('qty_left', 0)
      .order('expiry_date', { ascending: true });

    console.log('Batches data:', data, 'error:', error);

    if (error) {
      console.error('Error loading batches:', error);
      return;
    }

    if (data) {
      const newBatches = new Map(batches);
      newBatches.set(productId, data);
      setBatches(newBatches);
      console.log('Updated batches state:', newBatches);
    }
  };

  const addDate = () => {
    const lastDate = selectedDates.length > 0
      ? new Date(selectedDates[selectedDates.length - 1])
      : new Date(initialStartDate || new Date());

    lastDate.setDate(lastDate.getDate() + 1);
    const newDate = lastDate.toISOString().split('T')[0];

    if (!selectedDates.includes(newDate)) {
      setSelectedDates([...selectedDates, newDate]);
      const newSchedule = new Map(dateSchedule);
      newSchedule.set(newDate, []);
      setDateSchedule(newSchedule);
    }
  };

  const removeDate = (dateToRemove: string) => {
    setSelectedDates(selectedDates.filter(d => d !== dateToRemove));
    const newSchedule = new Map(dateSchedule);
    newSchedule.delete(dateToRemove);
    setDateSchedule(newSchedule);
  };

  const addMedicationToDate = (date: string) => {
    const currentMeds = dateSchedule.get(date) || [];
    const newMed: ScheduledMedication = {
      id: crypto.randomUUID(),
      product_id: '',
      batch_id: null,
      qty: null,
      unit: 'ml',
      teat: null,
      purpose: 'Gydymas',
      administration_route: ''
    };
    const newSchedule = new Map(dateSchedule);
    newSchedule.set(date, [...currentMeds, newMed]);
    setDateSchedule(newSchedule);
  };

  const updateMedication = async (date: string, medId: string, field: keyof ScheduledMedication, value: any) => {
    const meds = dateSchedule.get(date) || [];
    let updated = meds.map(m => {
      if (m.id === medId) {
        const updatedMed = { ...m, [field]: value };

        // Auto-load unit when product is selected
        if (field === 'product_id' && value) {
          console.log('Product selected:', value);
          const selectedProduct = products.find(p => p.id === value);
          if (selectedProduct?.primary_pack_unit) {
            updatedMed.unit = selectedProduct.primary_pack_unit;
          }
        }

        return updatedMed;
      }
      return m;
    });

    // Auto-select first available batch when product is selected
    if (field === 'product_id' && value) {
      console.log('Calling loadBatchesForProduct...');
      await loadBatchesForProduct(value);

      const { data: batchData } = await supabase
        .from('batches')
        .select('id')
        .eq('product_id', value)
        .eq('farm_id', farmId)
        .gt('qty_left', 0)
        .order('expiry_date', { ascending: true })
        .limit(1);

      updated = updated.map(m => {
        if (m.id === medId) {
          return { ...m, batch_id: batchData?.[0]?.id || null };
        }
        return m;
      });
    }

    const newSchedule = new Map(dateSchedule);
    newSchedule.set(date, updated);
    setDateSchedule(newSchedule);
  };

  const removeMedication = (date: string, medId: string) => {
    const meds = dateSchedule.get(date) || [];
    const newSchedule = new Map(dateSchedule);
    newSchedule.set(date, meds.filter(m => m.id !== medId));
    setDateSchedule(newSchedule);
  };

  const canProceedToMedications = selectedDates.length >= 2;

  const canProceedToReview = () => {
    // Check all dates have medications and products selected
    for (let i = 0; i < selectedDates.length; i++) {
      const date = selectedDates[i];
      const meds = dateSchedule.get(date) || [];

      if (meds.length === 0) return false;
      if (meds.some(m => !m.product_id)) return false;
    }

    // Only TODAY (first date) needs batch_id and qty
    const todayDate = selectedDates[0];
    const todayMeds = dateSchedule.get(todayDate) || [];
    
    for (const med of todayMeds) {
      if (!med.batch_id) return false;
      if (!med.qty || parseFloat(med.qty) <= 0) return false;
    }

    return true;
  };

  const formatDateLT = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('lt-LT', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleConfirm = () => {
    const schedule: DateMedications[] = selectedDates.map(date => ({
      date,
      medications: dateSchedule.get(date) || []
    }));
    onConfirm(schedule);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Gydymo kurso planavimas</h2>
            <p className="text-purple-100 text-sm mt-1">
              {step === 'dates' && 'Pasirinkite gydymo dienas'}
              {step === 'medications' && 'Priskirkite vaistus kiekvienai dienai'}
              {step === 'review' && 'Peržiūrėkite ir patvirtinkite'}
            </p>
          </div>
          <button onClick={onCancel} className="text-white hover:bg-white hover:bg-opacity-20 rounded p-2">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center justify-center py-4 px-6 bg-gray-50 border-b">
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 ${step === 'dates' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'dates' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                1
              </div>
              <span>Datos</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step === 'medications' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'medications' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span>Vaistai</span>
            </div>
            <div className="w-12 h-0.5 bg-gray-300"></div>
            <div className={`flex items-center gap-2 ${step === 'review' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'review' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}>
                3
              </div>
              <span>Peržiūra</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'dates' && (
            <div>
              <div className="mb-4">
                <p className="text-gray-700 mb-4">
                  Pasirinkite visas dienas, kada bus atliekamas gydymas. Kursui reikia bent 2 dienų.
                </p>
                <button
                  onClick={addDate}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Plus className="w-4 h-4" />
                  Pridėti dieną
                </button>
              </div>

              <div className="space-y-2">
                {selectedDates.length === 0 ? (
                  <div className="text-center py-12 text-gray-400">
                    <Calendar className="w-16 h-16 mx-auto mb-3 opacity-50" />
                    <p>Paspauskite "Pridėti dieną" kad pradėtumėte</p>
                  </div>
                ) : (
                  selectedDates.map((date, index) => (
                    <div key={date} className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex-shrink-0 w-12 h-12 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => {
                            const newDates = [...selectedDates];
                            newDates[index] = e.target.value;
                            setSelectedDates(newDates);
                          }}
                          className="px-3 py-2 border border-gray-300 rounded-lg w-full"
                        />
                      </div>
                      {selectedDates.length > 1 && (
                        <button
                          onClick={() => removeDate(date)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {step === 'medications' && (
            <div className="space-y-4">
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  📅 Įveskite šiandienos dozę. Kitos dienos bus suplanuotos kaip atskiri vizitai.
                </p>
              </div>
              {selectedDates.map((date, dayIndex) => {
                const dayMeds = dateSchedule.get(date) || [];
                const isToday = dayIndex === 0; // First date is today
                const isFutureDate = !isToday;
                return (
                  <div key={date} className={`border-2 rounded-lg p-4 ${isFutureDate ? 'border-gray-300 bg-gray-50' : 'border-purple-200 bg-purple-50'}`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`w-10 h-10 text-white rounded-lg flex items-center justify-center font-bold ${isFutureDate ? 'bg-gray-500' : 'bg-purple-600'}`}>
                        {dayIndex + 1}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {isToday ? '📅 Šiandien' : `Diena ${dayIndex + 1}`} {isFutureDate && '(Planuojama)'}
                        </h3>
                        <p className="text-sm text-gray-600">{formatDateLT(date)}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {dayMeds.map((med) => {
                        const selectedProduct = products.find(p => p.id === med.product_id);
                        const productBatches = batches.get(med.product_id) || [];
                        console.log('Rendering med:', med.product_id, 'batches:', productBatches, 'all batches:', batches);
                        return (
                          <div key={med.id} className="p-4 bg-white border border-gray-200 rounded-lg">
                            <div className="grid grid-cols-2 gap-3">
                              <SearchableSelect
                                options={products.map(p => ({
                                  value: p.id,
                                  label: p.name
                                }))}
                                value={med.product_id}
                                onChange={(value) => updateMedication(date, med.id, 'product_id', value)}
                                placeholder="Pasirinkite produktą..."
                                label="Produktas"
                              />

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vienetas</label>
                                <input
                                  type="text"
                                  value={med.unit}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                                  placeholder={selectedProduct?.primary_pack_unit || 'ml'}
                                />
                              </div>

                              {isToday && (
                                <>
                                  <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Serija *</label>
                                    <select
                                      value={med.batch_id || ''}
                                      onChange={(e) => updateMedication(date, med.id, 'batch_id', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                      disabled={!med.product_id}
                                    >
                                      <option value="">Pasirinkite seriją...</option>
                                      {productBatches.map((batch) => (
                                        <option key={batch.id} value={batch.id}>
                                          {batch.lot || 'N/A'} (Likutis: {batch.qty_left})
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kiekis *</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={med.qty || ''}
                                      onChange={(e) => updateMedication(date, med.id, 'qty', e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </>
                              )}
                              {isFutureDate && (
                                <div className="col-span-2">
                                  <p className="text-sm text-gray-600 italic">
                                    ⏳ Kiekis bus įvestas vėliau, kai bus užbaigtas vizitas
                                  </p>
                                </div>
                              )}

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Spenis (jei reikia)</label>
                                <select
                                  value={med.teat || ''}
                                  onChange={(e) => updateMedication(date, med.id, 'teat', e.target.value || null)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                >
                                  <option value="">Nėra</option>
                                  <option value="d1">D1 (Dešinė priekis)</option>
                                  <option value="d2">D2 (Dešinė galas)</option>
                                  <option value="k1">K1 (Kairė priekis)</option>
                                  <option value="k2">K2 (Kairė galas)</option>
                                </select>
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Paskirtis</label>
                                <input
                                  type="text"
                                  value={med.purpose}
                                  onChange={(e) => updateMedication(date, med.id, 'purpose', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                                />
                              </div>
                            </div>

                            {/* Administration Route Buttons - Only show if product has withdrawal periods */}
                            {selectedProduct && (selectedProduct.withdrawal_days_milk || selectedProduct.withdrawal_days_meat) && (
                              <div className="mt-3 space-y-2">
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
                                      onClick={() => updateMedication(date, med.id, 'administration_route', route.code)}
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

                            {/* Withdrawal Display */}
                            {selectedProduct && (selectedProduct.withdrawal_days_milk || selectedProduct.withdrawal_days_meat) && med.administration_route && (
                              <div className="mt-3 text-xs bg-amber-50 border-2 border-amber-300 rounded px-3 py-2">
                                <div className="flex items-center gap-1 mb-1">
                                  <AlertCircle className="w-4 h-4 text-amber-600" />
                                  <span className="font-bold text-amber-900">Karencinės dienos:</span>
                                </div>
                                <div className="flex gap-4">
                                  {(() => {
                                    const meatDays = selectedProduct[`withdrawal_${med.administration_route}_meat` as keyof Product] || selectedProduct.withdrawal_days_meat;
                                    const milkDays = selectedProduct[`withdrawal_${med.administration_route}_milk` as keyof Product] || selectedProduct.withdrawal_days_milk;
                                    return (
                                      <>
                                        {meatDays !== null && meatDays !== undefined && (
                                          <div>
                                            <span className="font-semibold text-amber-900">Mėsa:</span>
                                            <span className="ml-1 text-amber-800">{meatDays} d.</span>
                                          </div>
                                        )}
                                        {milkDays !== null && milkDays !== undefined && (
                                          <div>
                                            <span className="font-semibold text-amber-900">Pienas:</span>
                                            <span className="ml-1 text-amber-800">{milkDays} d.</span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                            )}

                            <button
                              onClick={() => removeMedication(date, med.id)}
                              className="mt-3 text-red-600 hover:text-red-700 text-sm flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                              Pašalinti
                            </button>
                          </div>
                        );
                      })}

                      <button
                        onClick={() => addMedicationToDate(date)}
                        className="w-full py-3 border-2 border-dashed border-purple-300 rounded-lg text-purple-600 hover:bg-purple-100 flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Pridėti vaistą šiai dienai
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step === 'review' && (
            <div>
              <div className="space-y-4">
                {selectedDates.map((date, index) => {
                  const meds = dateSchedule.get(date) || [];
                  return (
                    <div key={date} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-purple-600 text-white rounded-lg flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {formatDateLT(date)}
                          </div>
                          <div className="text-sm text-gray-600">{meds.length} vaistai</div>
                        </div>
                      </div>
                      <div className="space-y-2 ml-13">
                        {meds.map((med) => {
                          const product = products.find(p => p.id === med.product_id);
                          const batch = batches.get(med.product_id)?.find(b => b.id === med.batch_id);
                          return (
                            <div key={med.id} className="flex items-center gap-2 text-sm bg-purple-50 px-3 py-2 rounded">
                              <CheckCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                              <span className="font-medium">{product?.name || 'Nežinomas'}</span>
                              {med.qty && <span className="text-gray-700 font-medium">{med.qty} {med.unit}</span>}
                              {batch && <span className="text-gray-600 text-xs">({batch.lot})</span>}
                              {med.teat && <span className="text-gray-600">({med.teat})</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
          >
            Atšaukti
          </button>

          <div className="flex gap-2">
            {step === 'medications' && (
              <button
                onClick={() => setStep('dates')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Grįžti į datas
              </button>
            )}
            {step === 'review' && (
              <button
                onClick={() => setStep('medications')}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                Grįžti į vaistus
              </button>
            )}

            {step === 'dates' && (
              <button
                onClick={() => setStep('medications')}
                disabled={!canProceedToMedications}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Toliau
              </button>
            )}

            {step === 'medications' && (
              <button
                onClick={() => setStep('review')}
                disabled={!canProceedToReview()}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Peržiūrėti
              </button>
            )}

            {step === 'review' && (
              <button
                onClick={handleConfirm}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Patvirtinti kursą
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
