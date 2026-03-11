import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import {
  Animal,
  HoofRecord,
  HoofConditionCode,
  HoofLeg,
  HoofClaw,
  Product,
  Batch,
  Unit
} from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { HoofSelector } from './HoofSelector';
import { SearchableSelect } from './SearchableSelect';
import {
  Activity,
  Plus,
  Save,
  X,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { fetchAllRows, formatAnimalDisplay, sortByLithuanian } from '../lib/helpers';
import { showNotification } from './NotificationToast';

interface ClawExamination {
  leg: HoofLeg;
  claw: HoofClaw;
  condition_code: string;
  severity: number;
  was_trimmed: boolean;
  was_treated: boolean;
  treatment_product_id?: string;
  treatment_batch_id?: string;
  treatment_quantity?: number;
  treatment_unit?: Unit;
  treatment_notes?: string;
  bandage_applied: boolean;
  requires_followup: boolean;
  followup_date?: string;
  notes?: string;
}

export function Hoofs() {
  const { user, logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [conditions, setConditions] = useState<HoofConditionCode[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [hoofRecords, setHoofRecords] = useState<HoofRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExaminationForm, setShowExaminationForm] = useState(false);

  const [selectedAnimalId, setSelectedAnimalId] = useState<string>('');
  const [examinationDate, setExaminationDate] = useState(new Date().toISOString().split('T')[0]);
  const [technicianName, setTechnicianName] = useState(user?.username || '');
  const [generalNotes, setGeneralNotes] = useState('');

  const [selectedLeg, setSelectedLeg] = useState<HoofLeg | null>(null);
  const [selectedClaw, setSelectedClaw] = useState<HoofClaw | null>(null);
  const [currentExaminations, setCurrentExaminations] = useState<ClawExamination[]>([]);

  const [showClawModal, setShowClawModal] = useState(false);
  const [clawFormData, setClawFormData] = useState<Partial<ClawExamination>>({
    condition_code: 'OK',
    severity: 0,
    was_trimmed: false,
    was_treated: false,
    bandage_applied: false,
    requires_followup: false
  });

  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'hoof_records',
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
      setLoading(true);
      if (!selectedFarm) return;

      const [animalsRes, conditionsRes, productsRes, batchesRes, recordsRes] = await Promise.all([
        supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no'),
        supabase.from('hoof_condition_codes').select('*').eq('is_active', true).order('name_lt'),
        supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true).order('name'),
        supabase.from('batches').select('*').eq('farm_id', selectedFarm.id).order('expiry_date', { ascending: false }),
        supabase.from('hoof_records').select('*').eq('farm_id', selectedFarm.id)
      ]);

      setAnimals(animalsRes.data || []);
      setConditions(conditionsRes.data || []);
      setProducts(productsRes.data || []);
      setBatches(batchesRes.data || []);
      setHoofRecords(recordsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHoofSelect = (leg: HoofLeg, claw: HoofClaw) => {
    setSelectedLeg(leg);
    setSelectedClaw(claw);

    const existing = currentExaminations.find(e => e.leg === leg && e.claw === claw);
    if (existing) {
      setClawFormData(existing);
    } else {
      setClawFormData({
        leg,
        claw,
        condition_code: 'OK',
        severity: 0,
        was_trimmed: false,
        was_treated: false,
        bandage_applied: false,
        requires_followup: false
      });
    }

    setShowClawModal(true);
  };

  const saveClawExamination = () => {
    if (!selectedLeg || !selectedClaw) return;

    const examination: ClawExamination = {
      leg: selectedLeg,
      claw: selectedClaw,
      condition_code: clawFormData.condition_code || 'OK',
      severity: clawFormData.severity || 0,
      was_trimmed: clawFormData.was_trimmed || false,
      was_treated: clawFormData.was_treated || false,
      treatment_product_id: clawFormData.treatment_product_id,
      treatment_batch_id: clawFormData.treatment_batch_id,
      treatment_quantity: clawFormData.treatment_quantity,
      treatment_unit: clawFormData.treatment_unit,
      treatment_notes: clawFormData.treatment_notes,
      bandage_applied: clawFormData.bandage_applied || false,
      requires_followup: clawFormData.requires_followup || false,
      followup_date: clawFormData.followup_date,
      notes: clawFormData.notes
    };

    setCurrentExaminations(prev => {
      const filtered = prev.filter(e => !(e.leg === selectedLeg && e.claw === selectedClaw));
      return [...filtered, examination];
    });

    setShowClawModal(false);
    setSelectedLeg(null);
    setSelectedClaw(null);
  };

  const saveAllExaminations = async () => {
    if (!selectedAnimalId || currentExaminations.length === 0) {
      showNotification('Pasirinkite gyvulį ir įveskite bent vieną nago būklę', 'error');
      return;
    }

    try {
      const recordsToInsert = currentExaminations.map(exam => ({
        animal_id: selectedAnimalId,
        examination_date: examinationDate,
        leg: exam.leg,
        claw: exam.claw,
        condition_code: exam.condition_code,
        severity: exam.severity,
        was_trimmed: exam.was_trimmed,
        was_treated: exam.was_treated,
        treatment_product_id: exam.treatment_product_id || null,
        treatment_batch_id: exam.treatment_batch_id || null,
        treatment_quantity: exam.treatment_quantity || null,
        treatment_unit: exam.treatment_unit || null,
        treatment_notes: exam.treatment_notes || null,
        bandage_applied: exam.bandage_applied,
        requires_followup: exam.requires_followup,
        followup_date: exam.followup_date || null,
        technician_name: technicianName,
        notes: exam.notes || generalNotes || null
      }));

      const { error } = await supabase
        .from('hoof_records')
        .insert(recordsToInsert);

      if (error) throw error;

      await logAction('create', 'hoof_records', null,
        `Įrašyta ${currentExaminations.length} nagų apžiūrų gyvuliui ${selectedAnimalId}`);

      setCurrentExaminations([]);
      setSelectedAnimalId('');
      setGeneralNotes('');
      setShowExaminationForm(false);

      await loadData();
      showNotification(`Sėkmingai išsaugota ${currentExaminations.length} nagų apžiūrų!`, 'success');
    } catch (error) {
      console.error('Error saving examinations:', error);
      showNotification('Klaida išsaugant apžiūras', 'error');
    }
  };

  const getExaminedClaws = () => {
    const set = new Set<string>();
    currentExaminations.forEach(exam => {
      set.add(`${exam.leg}-${exam.claw}`);
    });
    return set;
  };

  const getClawSeverities = () => {
    const map = new Map<string, number>();
    currentExaminations.forEach(exam => {
      map.set(`${exam.leg}-${exam.claw}`, exam.severity);
    });
    return map;
  };

  const filteredAnimals = animals.filter(animal => {
    const searchLower = searchTerm.toLowerCase();
    return (
      animal.tag_no?.toLowerCase().includes(searchLower) ||
      animal.collar_no?.toLowerCase().includes(searchLower)
    );
  });

  const filteredRecords = hoofRecords.filter(record => {
    if (filterCondition !== 'all' && record.condition_code !== filterCondition) return false;
    if (filterSeverity !== 'all' && record.severity?.toString() !== filterSeverity) return false;
    if (dateFrom && record.examination_date < dateFrom) return false;
    if (dateTo && record.examination_date > dateTo) return false;
    return true;
  });

  const getAnimalById = (id: string) => animals.find(a => a.id === id);
  const getConditionByCode = (code: string | null) =>
    conditions.find(c => c.code === code);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-8 h-8 text-blue-600" />
            Nagų sveikata
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Nagų kirpimas, būklės registravimas ir stebėsena
          </p>
        </div>
        <button
          onClick={() => setShowExaminationForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nauja apžiūra
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Iš viso apžiūrų</p>
              <p className="text-2xl font-bold text-gray-900">{hoofRecords.length}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Reikia kontrolės</p>
              <p className="text-2xl font-bold text-orange-600">
                {hoofRecords.filter(r => r.requires_followup && !r.followup_completed).length}
              </p>
            </div>
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Su pažeidimais</p>
              <p className="text-2xl font-bold text-red-600">
                {hoofRecords.filter(r => r.condition_code && r.condition_code !== 'OK').length}
              </p>
            </div>
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gydyta šį mėnesį</p>
              <p className="text-2xl font-bold text-green-600">
                {hoofRecords.filter(r => {
                  const date = new Date(r.examination_date);
                  const now = new Date();
                  return r.was_treated &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();
                }).length}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">Apžiūrų istorija</h3>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Paieška</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ausies nr, kaklo nr..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Būklė</label>
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Visos</option>
              {conditions.map(c => (
                <option key={c.code} value={c.code}>{c.name_lt}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sunkumas</label>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Visi</option>
              <option value="0">0 - Sveikas</option>
              <option value="1">1 - Lengvas</option>
              <option value="2">2 - Vidutinis</option>
              <option value="3">3 - Sunkus</option>
              <option value="4">4 - Labai sunkus</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data nuo</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data iki</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gyvulys</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Koja</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nagas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Būklė</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sunkumas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kirpta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gydyta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Technikas</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.slice(0, 50).map(record => {
                const animal = getAnimalById(record.animal_id);
                const condition = getConditionByCode(record.condition_code);
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDateLT(record.examination_date)}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {animal ? formatAnimalDisplay(animal) : record.animal_id}
                    </td>
                    <td className="px-4 py-3 text-sm">{record.leg}</td>
                    <td className="px-4 py-3 text-sm">
                      {record.claw === 'inner' ? 'Vidinis' : 'Išorinis'}
                    </td>
                    <td className="px-4 py-3 text-sm">{condition?.name_lt || record.condition_code}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                        ${record.severity === 0 ? 'bg-green-100 text-green-800' : ''}
                        ${record.severity === 1 ? 'bg-yellow-100 text-yellow-800' : ''}
                        ${record.severity === 2 ? 'bg-orange-100 text-orange-800' : ''}
                        ${record.severity === 3 ? 'bg-red-100 text-red-800' : ''}
                        ${record.severity === 4 ? 'bg-red-200 text-red-900' : ''}
                      `}>
                        {record.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.was_trimmed ? '✓' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {record.was_treated ? '✓' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{record.technician_name}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showExaminationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Nauja nagų apžiūra</h3>
              <button
                onClick={() => {
                  setShowExaminationForm(false);
                  setCurrentExaminations([]);
                  setSelectedAnimalId('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Gyvulys <span className="text-red-500">*</span>
                  </label>
                  <SearchableSelect
                    options={sortByLithuanian(filteredAnimals, (a) => formatAnimalDisplay(a)).map(a => ({
                      value: a.id,
                      label: formatAnimalDisplay(a)
                    }))}
                    value={selectedAnimalId}
                    onChange={setSelectedAnimalId}
                    placeholder="Pasirinkite gyvulį..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Apžiūros data <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={examinationDate}
                    onChange={(e) => setExaminationDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Technikas <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bendros pastabos</label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Bendros pastabos apie apžiūrą..."
                />
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <HoofSelector
                  selectedLeg={selectedLeg}
                  selectedClaw={selectedClaw}
                  onSelect={handleHoofSelect}
                  examinedClaws={getExaminedClaws()}
                  clawSeverities={getClawSeverities()}
                />
              </div>

              {currentExaminations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    Įvestos būklės ({currentExaminations.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {currentExaminations.map((exam, idx) => {
                      const condition = getConditionByCode(exam.condition_code);
                      return (
                        <div key={idx} className="text-sm bg-white p-2 rounded border border-blue-200">
                          <div className="font-medium">{exam.leg} - {exam.claw === 'inner' ? 'V' : 'I'}</div>
                          <div className="text-gray-600">{condition?.name_lt}</div>
                          <div className="text-gray-500">Sunkumas: {exam.severity}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowExaminationForm(false);
                    setCurrentExaminations([]);
                    setSelectedAnimalId('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={saveAllExaminations}
                  disabled={!selectedAnimalId || currentExaminations.length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-5 h-5" />
                  Išsaugoti visas ({currentExaminations.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showClawModal && selectedLeg && selectedClaw && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                {selectedLeg} - {selectedClaw === 'inner' ? 'Vidinis' : 'Išorinis'} nagas
              </h3>
              <button
                onClick={() => {
                  setShowClawModal(false);
                  setSelectedLeg(null);
                  setSelectedClaw(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Būklė</label>
                <select
                  value={clawFormData.condition_code || 'OK'}
                  onChange={(e) => setClawFormData({...clawFormData, condition_code: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {conditions.map(c => (
                    <option key={c.code} value={c.code}>
                      {c.code} - {c.name_lt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sunkumas: {clawFormData.severity || 0}
                </label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={clawFormData.severity || 0}
                  onChange={(e) => setClawFormData({...clawFormData, severity: parseInt(e.target.value)})}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>0 - Sveikas</span>
                  <span>1 - Lengvas</span>
                  <span>2 - Vidutinis</span>
                  <span>3 - Sunkus</span>
                  <span>4 - Labai sunkus</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clawFormData.was_trimmed || false}
                    onChange={(e) => setClawFormData({...clawFormData, was_trimmed: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Kirpta</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clawFormData.was_treated || false}
                    onChange={(e) => setClawFormData({...clawFormData, was_treated: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Gydyta</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clawFormData.bandage_applied || false}
                    onChange={(e) => setClawFormData({...clawFormData, bandage_applied: e.target.checked})}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Uždėtas tvarstis</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={clawFormData.requires_followup || false}
                    onChange={(e) => setClawFormData({
                      ...clawFormData,
                      requires_followup: e.target.checked,
                      followup_date: e.target.checked
                        ? new Date(Date.now() + 14*24*60*60*1000).toISOString().split('T')[0]
                        : undefined
                    })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">Reikia kontrolės</span>
                </label>
              </div>

              {clawFormData.requires_followup && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kontrolės data</label>
                  <input
                    type="date"
                    value={clawFormData.followup_date || ''}
                    onChange={(e) => setClawFormData({...clawFormData, followup_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pastabos</label>
                <textarea
                  value={clawFormData.notes || ''}
                  onChange={(e) => setClawFormData({...clawFormData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Papildomos pastabos apie šį nagą..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowClawModal(false);
                    setSelectedLeg(null);
                    setSelectedClaw(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={saveClawExamination}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Išsaugoti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
