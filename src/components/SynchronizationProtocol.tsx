import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, Circle, Clock, Syringe, AlertCircle, Plus, X, Edit2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  SynchronizationProtocol,
  AnimalSynchronization,
  AnimalSynchronizationWithDetails,
  SynchronizationStep,
  Product,
  StockByBatch,
} from '../lib/types';

interface SynchronizationProtocolProps {
  animalId: string;
  onProtocolCreated?: () => void;
}

interface StepWithProductSelection extends SynchronizationStep {
  selectedProductId?: string;
  selectedBatchId?: string;
  actualDosage?: number;
  actualUnit?: string;
}

export function SynchronizationProtocolComponent({ animalId, onProtocolCreated }: SynchronizationProtocolProps) {
  const [protocols, setProtocols] = useState<SynchronizationProtocol[]>([]);
  const [activeSync, setActiveSync] = useState<AnimalSynchronizationWithDetails | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProtocolId, setSelectedProtocolId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<StockByBatch[]>([]);
  const [todayStepData, setTodayStepData] = useState<{[key: number]: {batchId: string, dosage: string, unit: string}}>({});
  const [globalDosage, setGlobalDosage] = useState<string>('');
  const [globalUnit, setGlobalUnit] = useState<string>('ml');
  // GEA status removed - no longer tracking pregnancy status from GEA system

  useEffect(() => {
    loadProtocols();
    loadActiveSync();
    loadProducts();
    loadBatches();
    // GEA status loading removed
  }, [animalId]);

  // Set default dosages for G7G and GGPG protocols
  useEffect(() => {
    if (selectedProtocolId && products.length > 0) {
      const selectedProtocol = protocols.find(p => p.id === selectedProtocolId);
      if (selectedProtocol && (selectedProtocol.name === 'G7G' || selectedProtocol.name === 'GGPG')) {
        const updatedData: {[key: number]: {batchId: string, dosage: string, unit: string}} = {};
        const today = new Date(startDate).toISOString().split('T')[0];

        selectedProtocol.steps.forEach(step => {
          const stepDate = new Date(startDate);
          stepDate.setDate(stepDate.getDate() + step.day_offset);

          if (stepDate.toISOString().split('T')[0] === today) {
            const medicationName = step.medication.toLowerCase();
            let defaultDosage = '';

            // Default dosages for synchronization protocols
            // Ovarelin is always 3ml
            // Enzaprost is always 6ml
            if (medicationName.includes('ovarelin')) {
              defaultDosage = '3';
            } else if (medicationName.includes('enzaprost')) {
              defaultDosage = '6';
            }

            if (defaultDosage) {
              updatedData[step.step] = {
                batchId: '',
                dosage: defaultDosage,
                unit: 'ml'
              };
            }
          }
        });

        setTodayStepData(updatedData);
      }
    }
  }, [selectedProtocolId, products, startDate, protocols]);

  const loadProtocols = async () => {
    const { data } = await supabase
      .from('synchronization_protocols')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setProtocols(data);
  };

  const loadActiveSync = async () => {
    // Load the most recent synchronization (Active or Cancelled)
    const { data: syncList } = await supabase
      .from('animal_synchronizations')
      .select('*')
      .eq('animal_id', animalId)
      .order('created_at', { ascending: false })
      .limit(1);

    const syncData = syncList?.[0];

    if (syncData) {
      console.log('🔍 Found sync for animal:', { status: syncData.status, id: syncData.id });
      
      const { data: protocolData } = await supabase
        .from('synchronization_protocols')
        .select('*')
        .eq('id', syncData.protocol_id)
        .single();

      const { data: stepsData } = await supabase
        .from('synchronization_steps')
        .select('*')
        .eq('synchronization_id', syncData.id)
        .order('step_number');

      setActiveSync({
        ...syncData,
        protocol: protocolData || undefined,
        steps: stepsData || [],
      });
    } else {
      console.log('🔍 No sync history for animal');
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (data) setProducts(data);
  };

  const loadBatches = async () => {
    const { data } = await supabase
      .from('stock_by_batch')
      .select('*')
      .gt('on_hand', 0);

    if (data) {
      setBatches(data);
    }
  };

  // GEA status loading function removed - no longer checking pregnancy status from GEA

  const handleCreateProtocol = async () => {
    if (!selectedProtocolId) {
      alert('Pasirinkite protokolą');
      return;
    }

    // Pregnancy check removed - no longer checking GEA status

    // Check if today's steps have required data
    const selectedProtocol = protocols.find(p => p.id === selectedProtocolId);
    if (selectedProtocol) {
      const today = new Date(startDate);
      const todaySteps = selectedProtocol.steps.filter(step => {
        const stepDate = new Date(startDate);
        stepDate.setDate(stepDate.getDate() + step.day_offset);
        return stepDate.toISOString().split('T')[0] === today.toISOString().split('T')[0];
      });

      for (const step of todaySteps) {
        const stepData = todayStepData[step.step];
        if (!stepData || !stepData.batchId || !stepData.dosage) {
          alert(`Užpildykite visus šiandienos žingsnio ${step.step} laukus (pakuotę ir dozę)`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      // Create the animal synchronization record
      const { data: createdSync, error: syncError } = await supabase
        .from('animal_synchronizations')
        .insert({
          animal_id: animalId,
          protocol_id: selectedProtocolId,
          start_date: startDate,
          status: 'Active'
        })
        .select('id')
        .single();

      if (syncError) throw syncError;
      if (!createdSync) throw new Error('Failed to create synchronization');

      // Create synchronization steps from the protocol
      const stepsToCreate = selectedProtocol.steps.map(step => {
        const stepDate = new Date(startDate);
        stepDate.setDate(stepDate.getDate() + step.day_offset);

        // Find the medication product
        const medicationProduct = products.find(p =>
          p.name.toLowerCase() === step.medication.toLowerCase()
        );

        return {
          synchronization_id: createdSync.id,
          step_number: step.step,
          step_name: step.medication,
          scheduled_date: stepDate.toISOString().split('T')[0],
          is_evening: step.is_evening || false,
          medication_product_id: medicationProduct?.id || null,
          completed: false
        };
      });

      const { data: steps, error: stepsError } = await supabase
        .from('synchronization_steps')
        .insert(stepsToCreate)
        .select('*')
        .order('step_number');

      if (stepsError) throw stepsError;

      // Set correct default dosages for G7G and GGPG protocols
      if (selectedProtocol && (selectedProtocol.name === 'G7G' || selectedProtocol.name === 'GGPG') && steps && steps.length > 0) {
        for (const step of steps) {
          // Get medication name from the product using medication_product_id
          if (!step.medication_product_id) continue;

          const product = products.find(p => p.id === step.medication_product_id);
          const medicationName = product?.name?.toLowerCase() || '';

          if (!medicationName) continue;

          let defaultDosage = null;
          let defaultUnit = 'ml';

          // Ovarelin is always 3ml
          // Enzaprost is always 6ml
          if (medicationName.includes('ovarelin')) {
            defaultDosage = 3;
          } else if (medicationName.includes('enzaprost')) {
            defaultDosage = 6;
          }

          if (defaultDosage) {
            await supabase
              .from('synchronization_steps')
              .update({
                dosage: defaultDosage,
                dosage_unit: defaultUnit
              })
              .eq('id', step.id);

            // Update the local step object as well
            step.dosage = defaultDosage;
            step.dosage_unit = defaultUnit;
          }
        }
      }

      // Create a visit for each step and complete today's steps
      if (steps && steps.length > 0) {
        const today = new Date(startDate).toISOString().split('T')[0];

        for (const step of steps) {
          const visitData = {
            animal_id: animalId,
            visit_datetime: new Date(step.scheduled_date).toISOString(),
            procedures: ['Sinchronizacijos protokolas'],
            notes: `Sinchronizacija - ${step.step_name}${step.is_evening ? ' (vakare)' : ''}${step.dosage ? `\nDozė: ${step.dosage} ${step.dosage_unit}` : ''}`,
            status: 'Planuojamas',
            treatment_required: false,
            next_visit_required: false,
            sync_step_id: step.id,
          };

          const { error: visitError } = await supabase
            .from('animal_visits')
            .insert(visitData);

          if (visitError) {
            console.error('Error creating visit for step:', step.step_number, visitError);
          }

          // If this step is today and has data entered, complete it immediately
          const stepDate = new Date(step.scheduled_date).toISOString().split('T')[0];
          if (stepDate === today) {
            const stepData = todayStepData[step.step_number];
            if (stepData && stepData.batchId && stepData.dosage) {
              try {
                // Update the synchronization step with batch and dosage, and mark as completed
                // This will trigger the stock deduction trigger
                const { error: completeError } = await supabase
                  .from('synchronization_steps')
                  .update({
                    batch_id: stepData.batchId,
                    dosage: parseFloat(stepData.dosage),
                    dosage_unit: stepData.unit,
                    completed: true,
                    completed_at: new Date().toISOString()
                  })
                  .eq('id', step.id);

                if (completeError) {
                  console.error('Error completing today step:', step.step_number, completeError);
                } else {
                  console.log('✅ Completed today step:', step.step_number, 'Deducted:', stepData.dosage, stepData.unit);
                }
              } catch (err) {
                console.error('Error completing step:', err);
              }
            }
          }
        }
      }

      setShowCreateForm(false);
      setTodayStepData({});
      loadActiveSync();
      onProtocolCreated?.();
    } catch (error: any) {
      console.error('Error creating protocol:', error);
      alert('Klaida kuriant protokolą: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProtocol = async () => {
    if (!activeSync || !confirm('Ar tikrai norite atšaukti šį protokolą?')) return;

    const { error } = await supabase
      .from('animal_synchronizations')
      .update({ status: 'Cancelled' })
      .eq('id', activeSync.id);

    if (error) {
      alert('Klaida atšaukiant protokolą: ' + error.message);
    } else {
      alert('Protokolas atšauktas');
      setActiveSync(null);
      onProtocolCreated?.();
    }
  };

  const handleUpdateStep = async (stepId: string, updates: Partial<SynchronizationStep>) => {
    const { error } = await supabase
      .from('synchronization_steps')
      .update(updates)
      .eq('id', stepId);

    if (error) {
      alert('Klaida atnaujinant žingsnį: ' + error.message);
    } else {
      loadActiveSync();
    }
  };

  const handleCompleteStep = async (step: SynchronizationStep) => {
    setShowCompleteForm(step.id);
  };

  const [showCompleteForm, setShowCompleteForm] = useState<string | null>(null);
  const [completeFormData, setCompleteFormData] = useState({
    batchId: '',
    dosage: '',
    unit: 'ml',
  });

  const submitCompleteStep = async (stepId: string) => {
    if (!completeFormData.batchId || !completeFormData.dosage) {
      alert('Užpildykite visus laukus');
      return;
    }

    try {
      // Update the synchronization step with batch and dosage, and mark as completed
      // This will trigger the stock deduction trigger
      const { error } = await supabase
        .from('synchronization_steps')
        .update({
          batch_id: completeFormData.batchId,
          dosage: parseFloat(completeFormData.dosage),
          dosage_unit: completeFormData.unit,
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('id', stepId);

      if (error) throw error;

      alert('Žingsnis pažymėtas kaip atliktas! Medikamentas atimtas iš atsargų.');
      setShowCompleteForm(null);
      setCompleteFormData({ batchId: '', dosage: '', unit: 'ml' });
      loadActiveSync();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    }
  };

  const handleUpdateInsemination = async () => {
    if (!activeSync) return;

    const date = prompt('Įveskite sėklinimo datą (YYYY-MM-DD):', activeSync.insemination_date || '');
    if (date === null) return;

    const number = prompt('Įveskite sėklinimo numerį:', activeSync.insemination_number || '');
    if (number === null) return;

    const { error } = await supabase
      .from('animal_synchronizations')
      .update({
        insemination_date: date || null,
        insemination_number: number || null,
      })
      .eq('id', activeSync.id);

    if (error) {
      alert('Klaida: ' + error.message);
    } else {
      alert('Sėklinimo duomenys atnaujinti!');
      loadActiveSync();
    }
  };

  const getStepStatus = (step: SynchronizationStep) => {
    if (step.completed) return 'completed';
    const today = new Date().toISOString().split('T')[0];
    const scheduled = step.scheduled_date;

    if (scheduled === today) return 'today';
    if (scheduled < today) return 'overdue';
    const daysDiff = Math.floor((new Date(scheduled).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff <= 2) return 'upcoming';
    return 'pending';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'today': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-300';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const selectedProtocol = protocols.find(p => p.id === selectedProtocolId);

  if (activeSync) {
    const completedSteps = activeSync.steps?.filter(s => s.completed).length || 0;
    const totalSteps = activeSync.steps?.length || 0;
    const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

    const isCancelled = activeSync.status === 'Cancelled';

    return (
      <div className="space-y-4">
        <div className={`bg-gradient-to-r ${isCancelled ? 'from-gray-100 to-gray-200 border-gray-400' : 'from-purple-50 to-pink-50 border-purple-300'} border-2 rounded-lg p-4`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600" />
                {activeSync.protocol?.name}
                {isCancelled && (
                  <span className="ml-2 px-3 py-1 bg-red-100 text-red-800 text-sm font-semibold rounded-full">
                    ATŠAUKTAS
                  </span>
                )}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Pradėta: {new Date(activeSync.start_date).toLocaleDateString('lt-LT')}
              </p>
              {isCancelled && activeSync.notes && (
                <p className="text-xs text-red-600 mt-1 italic">
                  {activeSync.notes.split('\n').pop()}
                </p>
              )}
            </div>
            {!isCancelled && (
              <button
                onClick={handleCancelProtocol}
                className="text-red-600 hover:text-red-700 text-sm"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>Progresas: {completedSteps} / {totalSteps}</span>
              <span>{progressPercent.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {activeSync.steps?.map((step) => {
              const status = getStepStatus(step);
              const statusColor = isCancelled ? 'bg-gray-100 border-gray-300' : getStatusColor(status);

              return (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border-2 ${statusColor} ${isCancelled && !step.completed ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {step.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        ) : isCancelled ? (
                          <X className="w-5 h-5 text-red-500 flex-shrink-0" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                        )}
                        <span className="font-medium">
                          {step.step_number}. {step.step_name}
                        </span>
                        {step.is_evening && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">Vakare</span>}
                        {isCancelled && !step.completed && (
                          <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                            Atšauktas
                          </span>
                        )}
                      </div>
                      <div className="ml-7 mt-1 text-sm">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(step.scheduled_date).toLocaleDateString('lt-LT')}
                          </span>
                          {step.dosage && (
                            <span className="flex items-center gap-1">
                              <Syringe className="w-4 h-4" />
                              {step.dosage} {step.dosage_unit}
                            </span>
                          )}
                        </div>
                        {step.completed_at && (
                          <div className="text-xs text-gray-600 mt-1">
                            Atlikta: {new Date(step.completed_at).toLocaleString('lt-LT')}
                          </div>
                        )}
                      </div>
                    </div>
                    {!step.completed && !isCancelled && showCompleteForm !== step.id && (
                      <button
                        onClick={() => handleCompleteStep(step)}
                        className="ml-2 px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm"
                      >
                        Atlikti
                      </button>
                    )}
                  </div>

                  {showCompleteForm === step.id && (() => {
                    const medicationProduct = products.find(p =>
                      p.name.toLowerCase() === step.step_name.toLowerCase()
                    );

                    return (
                      <div className="mt-3 p-3 bg-white rounded-lg border-2 border-purple-300 space-y-3">
                        <h5 className="font-semibold text-sm">Įveskite informaciją</h5>

                        <div className="bg-purple-50 p-2 rounded border border-purple-300">
                          <span className="text-xs text-gray-600">Medikamentas:</span>
                          <p className="font-semibold text-sm text-gray-900">{step.step_name}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Pakuotė</label>
                          <select
                            value={completeFormData.batchId}
                            onChange={(e) => setCompleteFormData({ ...completeFormData, batchId: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="">Pasirinkite pakuotę</option>
                            {batches
                              .filter((b) => {
                                if (!medicationProduct) return false;
                                return b.product_id === medicationProduct.id && b.on_hand > 0;
                              })
                              .map((b) => (
                                <option key={b.batch_id} value={b.batch_id}>
                                  {b.lot || 'N/A'} (Likutis: {b.on_hand} {medicationProduct.primary_pack_unit})
                                </option>
                              ))}
                          </select>
                          {!medicationProduct && (
                            <p className="text-xs text-red-600 mt-1">
                              Produktas "{step.step_name}" nerastas inventoriuje
                            </p>
                          )}
                        </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Dozė</label>
                          <input
                            type="number"
                            step="0.1"
                            value={completeFormData.dosage}
                            onChange={(e) => setCompleteFormData({ ...completeFormData, dosage: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                            placeholder={step.dosage?.toString() || ''}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Vienetas</label>
                          <select
                            value={completeFormData.unit}
                            onChange={(e) => setCompleteFormData({ ...completeFormData, unit: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="ml">ml</option>
                            <option value="mg">mg</option>
                            <option value="g">g</option>
                            <option value="vnt">vnt</option>
                          </select>
                        </div>
                      </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => submitCompleteStep(step.id)}
                            className="flex-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm font-medium"
                          >
                            Patvirtinti
                          </button>
                          <button
                            onClick={() => {
                              setShowCompleteForm(null);
                              setCompleteFormData({ batchId: '', dosage: '', unit: 'ml' });
                            }}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                          >
                            Atšaukti
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-purple-200">
            <h4 className="font-semibold text-gray-900 mb-2">Sėklinimas</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Data</label>
                <div className="text-sm font-medium">{activeSync.insemination_date || 'Nenurodyta'}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Numeris</label>
                <div className="text-sm font-medium">{activeSync.insemination_number || 'Nenurodyta'}</div>
              </div>
            </div>
            <button
              onClick={handleUpdateInsemination}
              className="mt-2 w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
            >
              <Edit2 className="w-4 h-4 inline mr-1" />
              Redaguoti sėklinimą
            </button>
          </div>

          {activeSync.result && (
            <div className="mt-4 pt-4 border-t border-purple-200">
              <h4 className="font-semibold text-gray-900 mb-1">Rezultatas</h4>
              <p className="text-sm text-gray-700">{activeSync.result}</p>
            </div>
          )}

          {(isCancelled || activeSync.status === 'Completed') && (
            <div className="mt-4 pt-4 border-t border-gray-300">
              <button
                onClick={async () => {
                  // GEA status reload removed
                  setActiveSync(null);
                  setShowCreateForm(true);
                }}
                disabled={isApsek}
                className={`w-full px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
                  isApsek
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <Plus className="w-5 h-5" />
                Pradėti naują sinchronizacijos protokolą
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const isApsek = false; // GEA pregnancy check removed

  return (
    <div className="space-y-4">
      {!showCreateForm ? (
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={isApsek}
          className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium ${
            isApsek
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
        >
          <Plus className="w-5 h-5" />
          Pradėti sinchronizacijos protokolą
        </button>
      ) : (
        <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-gray-900">Naujas protokolas</h3>
            <button
              onClick={() => setShowCreateForm(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Protokolas</label>
            <select
              value={selectedProtocolId}
              onChange={(e) => setSelectedProtocolId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Pasirinkite protokolą</option>
              {protocols.map((protocol) => (
                <option key={protocol.id} value={protocol.id}>
                  {protocol.name}
                </option>
              ))}
            </select>
            {selectedProtocol && (
              <p className="text-sm text-gray-600 mt-1">{selectedProtocol.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pradžios data</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {selectedProtocol && (
            <div className="bg-white rounded-lg p-3 space-y-3">
              <h4 className="font-semibold text-gray-900 text-sm">Protokolo žingsniai:</h4>
              {selectedProtocol.steps.map((step) => {
                const stepDate = new Date(startDate);
                stepDate.setDate(stepDate.getDate() + step.day_offset);
                const isToday = stepDate.toISOString().split('T')[0] === new Date(startDate).toISOString().split('T')[0];
                const stepData = todayStepData[step.step] || { batchId: '', dosage: '', unit: 'ml' };

                // Find the product by exact medication name match
                const medicationProduct = products.find(p =>
                  p.name.toLowerCase() === step.medication.toLowerCase()
                );

                return (
                  <div key={step.step} className={`p-3 rounded-lg border-2 ${isToday ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="font-medium">
                        {step.step}. {step.medication}
                        {step.is_evening && <span className="ml-2 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">vakare</span>}
                        {isToday && <span className="ml-2 text-xs bg-yellow-600 text-white px-2 py-0.5 rounded font-semibold">ŠIANDIEN</span>}
                      </span>
                      <span className="text-gray-600">{stepDate.toLocaleDateString('lt-LT')}</span>
                    </div>

                    {isToday && (
                      <div className="mt-3 space-y-2 pt-3 border-t border-yellow-200">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Užpildykite informaciją apie šiandienos gydymą:</p>

                        <div className="bg-white p-2 rounded border border-gray-300">
                          <span className="text-xs text-gray-600">Medikamentas:</span>
                          <p className="font-semibold text-sm text-gray-900">{step.medication}</p>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Pakuotė *</label>
                          <select
                            value={stepData.batchId}
                            onChange={(e) => {
                              setTodayStepData({
                                ...todayStepData,
                                [step.step]: { ...stepData, batchId: e.target.value }
                              });
                            }}
                            className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                          >
                            <option value="">Pasirinkite pakuotę</option>
                            {batches
                              .filter((b) => {
                                if (!medicationProduct) return false;
                                return b.product_id === medicationProduct.id && b.on_hand > 0;
                              })
                              .map((b) => (
                                <option key={b.batch_id} value={b.batch_id}>
                                  {b.lot || 'N/A'} (Likutis: {b.on_hand} {medicationProduct.primary_pack_unit})
                                </option>
                              ))}
                          </select>
                          {!medicationProduct && (
                            <p className="text-xs text-red-600 mt-1">
                              Produktas "{step.medication}" nerastas inventoriuje
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Dozė *
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={stepData.dosage}
                              onChange={(e) => {
                                setTodayStepData({
                                  ...todayStepData,
                                  [step.step]: { ...stepData, dosage: e.target.value }
                                });
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                              placeholder="Pvz., 2.5"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Vienetas</label>
                            <select
                              value={stepData.unit}
                              onChange={(e) => {
                                setTodayStepData({
                                  ...todayStepData,
                                  [step.step]: { ...stepData, unit: e.target.value }
                                });
                              }}
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                            >
                              <option value="ml">ml</option>
                              <option value="mg">mg</option>
                              <option value="g">g</option>
                              <option value="vnt">vnt</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={handleCreateProtocol}
            disabled={loading || !selectedProtocolId}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Kuriama...' : 'Pradėti protokolą'}
          </button>
        </div>
      )}
    </div>
  );
}
