import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFarm } from '../contexts/FarmContext';
import { Activity, Calendar, FileText, Pill, Syringe, AlertCircle, ChevronDown, ChevronUp, Filter, Search, Trash2 } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { Animal } from '../lib/types';
import { AnimalDetailSidebar } from './AnimalDetailSidebar';
import { TeatDisplay } from './TeatSelector';

interface TreatmentHistoryItem {
  treatment_id: string;
  reg_date: string;
  first_symptoms_date: string | null;
  animal_condition: string | null;
  tests: string | null;
  clinical_diagnosis: string | null;
  outcome: string | null;
  services: string | null;
  vet_name: string | null;
  notes: string | null;
  mastitis_teat: string | null;
  mastitis_type: string | null;
  sick_teats: string[] | null;
  affected_teats: string[] | null;
  syringe_count: number | null;
  withdrawal_until_meat: string | null;
  withdrawal_until_milk: string | null;
  created_at: string;
  animal_id: string;
  animal_tag: string;
  species: string;
  owner_name: string | null;
  disease_id: string;
  disease_code: string | null;
  disease_name: string;
  products_used: any[] | null;
  treatment_courses: any[] | null;
}

interface TreatmentGroup {
  date: string;
  dateLabel: string;
  treatments: TreatmentHistoryItem[];
}

export function TreatmentHistory() {
  const { selectedFarm } = useFarm();
  const [treatments, setTreatments] = useState<TreatmentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTreatments, setExpandedTreatments] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnimal, setSelectedAnimal] = useState<Animal | null>(null);
  const [deletingTreatmentId, setDeletingTreatmentId] = useState<string | null>(null);

  useEffect(() => {
    loadTreatments();
  }, [selectedFarm]);

  const loadTreatments = async () => {
    try {
      if (!selectedFarm) {
        setTreatments([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('treatment_history_view')
        .select('*')
        .eq('farm_id', selectedFarm.id)
        .order('reg_date', { ascending: false });

      if (error) throw error;
      setTreatments(data || []);
    } catch (error) {
      console.error('Error loading treatments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (treatmentId: string) => {
    const newExpanded = new Set(expandedTreatments);
    if (newExpanded.has(treatmentId)) {
      newExpanded.delete(treatmentId);
    } else {
      newExpanded.add(treatmentId);
    }
    setExpandedTreatments(newExpanded);
  };

  const handleDeleteTreatment = async (treatmentId: string, animalTag: string) => {
    if (!confirm(`Ar tikrai norite ištrinti šį gydymą gyvūnui ${animalTag}?\n\nŠis veiksmas:\n• Ištrina gydymo įrašą\n• Grąžina panaudotus vaistus į atsargas\n• Pašalina karencijos laikotarpius\n• Negali būti atšauktas`)) {
      return;
    }

    setDeletingTreatmentId(treatmentId);

    try {
      // Step 1: Get all usage_items for this treatment to revert stock
      const { data: usageItems, error: usageError } = await supabase
        .from('usage_items')
        .select('id, batch_id, qty')
        .eq('treatment_id', treatmentId);

      if (usageError) throw usageError;

      // Step 2: Revert stock for each usage item
      if (usageItems && usageItems.length > 0) {
        for (const item of usageItems) {
          // Get current batch qty_left
          const { data: batch, error: batchError } = await supabase
            .from('batches')
            .select('qty_left, status')
            .eq('id', item.batch_id)
            .single();

          if (batchError) {
            console.error('Error fetching batch:', batchError);
            continue;
          }

          // Add quantity back to batch
          const newQtyLeft = (batch.qty_left || 0) + item.qty;
          const newStatus = batch.status === 'depleted' && newQtyLeft > 0 ? 'active' : batch.status;

          const { error: updateError } = await supabase
            .from('batches')
            .update({ 
              qty_left: newQtyLeft,
              status: newStatus,
              updated_at: new Date().toISOString()
            })
            .eq('id', item.batch_id);

          if (updateError) {
            console.error('Error updating batch:', updateError);
          }
        }
      }

      // Step 3: Delete treatment_courses (will cascade to course_doses)
      const { error: coursesError } = await supabase
        .from('treatment_courses')
        .delete()
        .eq('treatment_id', treatmentId);

      if (coursesError) {
        console.error('Error deleting courses:', coursesError);
      }

      // Step 4: Delete usage_items
      const { error: deleteUsageError } = await supabase
        .from('usage_items')
        .delete()
        .eq('treatment_id', treatmentId);

      if (deleteUsageError) throw deleteUsageError;

      // Step 5: Delete the treatment itself
      const { error: deleteTreatmentError } = await supabase
        .from('treatments')
        .delete()
        .eq('id', treatmentId);

      if (deleteTreatmentError) throw deleteTreatmentError;

      // Show success message
      alert(`Gydymas sėkmingai ištrintas!\n\nGrąžinta produktų į atsargas: ${usageItems?.length || 0}`);

      // Reload treatments
      await loadTreatments();
    } catch (error: any) {
      console.error('Error deleting treatment:', error);
      alert(`Klaida trinant gydymą: ${error.message}`);
    } finally {
      setDeletingTreatmentId(null);
    }
  };

  const filteredTreatments = treatments.filter(treatment => {
    let match = true;

    if (dateFrom) {
      match = match && treatment.reg_date >= dateFrom;
    }

    if (dateTo) {
      match = match && treatment.reg_date <= dateTo;
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      match = match && (
        treatment.animal_tag?.toLowerCase().includes(search) ||
        treatment.disease_name?.toLowerCase().includes(search) ||
        treatment.owner_name?.toLowerCase().includes(search) ||
        treatment.vet_name?.toLowerCase().includes(search) ||
        treatment.clinical_diagnosis?.toLowerCase().includes(search) ||
        treatment.notes?.toLowerCase().includes(search)
      );
    }

    return match;
  });

  const groupTreatmentsByDate = (treatments: TreatmentHistoryItem[]): TreatmentGroup[] => {
    const groups: { [key: string]: TreatmentHistoryItem[] } = {};

    treatments.forEach((treatment) => {
      const date = treatment.reg_date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(treatment);
    });

    return Object.entries(groups).map(([date, treatments]) => ({
      date,
      dateLabel: formatDateLT(date),
      treatments,
    }));
  };

  const treatmentGroups = groupTreatmentsByDate(filteredTreatments);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gydymų Istorija</h2>
          <p className="text-sm text-gray-600 mt-1">Visi atlikti gydymai</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Activity className="w-5 h-5" />
          <span className="font-semibold">{treatments.length}</span>
          <span>gydymų</span>
        </div>
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
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Data iki</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Paieška</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Gyvūnas, liga, vet..."
                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Rasta: <strong>{filteredTreatments.length}</strong> iš {treatments.length}
          </span>
          {(dateFrom || dateTo || searchTerm) && (
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
                setSearchTerm('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Išvalyti filtrus
            </button>
          )}
        </div>
      </div>

      {treatmentGroups.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
          <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Gydymų nėra</h3>
          <p className="text-gray-500">Gydymai bus rodomi čia po to, kai bus įrašyti.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {treatmentGroups.map((group) => (
            <div key={group.date} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">{group.dateLabel}</h3>
                  <span className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                    {group.treatments.length} {group.treatments.length === 1 ? 'gydymas' : 'gydymai'}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-200">
                {group.treatments.map((treatment) => {
                  const isExpanded = expandedTreatments.has(treatment.treatment_id);

                  return (
                    <div key={treatment.treatment_id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-blue-600" />
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-2">
                                <h4
                                  className="text-lg font-bold text-blue-600 hover:text-blue-700 cursor-pointer hover:underline"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const { data: animalData } = await supabase
                                      .from('animals')
                                      .select('*')
                                      .eq('id', treatment.animal_id)
                                      .maybeSingle();
                                    if (animalData) {
                                      setSelectedAnimal(animalData);
                                    }
                                  }}
                                >
                                  {treatment.animal_tag}
                                </h4>
                                <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                                  {treatment.species}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar className="w-4 h-4 text-gray-500" />
                                  <span className="text-gray-700">{formatDateLT(treatment.reg_date)}</span>
                                  {treatment.created_at && (
                                    <span className="text-xs text-gray-500">
                                      {new Date(treatment.created_at).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-sm">
                                  <FileText className="w-4 h-4 text-blue-600" />
                                  <span className="font-semibold text-gray-900">{treatment.disease_name}</span>
                                  {treatment.disease_code && (
                                    <span className="text-gray-500">({treatment.disease_code})</span>
                                  )}
                                </div>

                                {treatment.clinical_diagnosis && (
                                  <div className="text-sm bg-blue-50 rounded px-2 py-1 text-gray-700">
                                    <span className="font-medium">Diagnozė:</span> {treatment.clinical_diagnosis.length > 100 ? treatment.clinical_diagnosis.substring(0, 100) + '...' : treatment.clinical_diagnosis}
                                  </div>
                                )}

                                {treatment.products_used && treatment.products_used.length > 0 && (
                                  <div className="text-sm">
                                    <div className="flex items-center gap-2">
                                      <Pill className="w-4 h-4 text-orange-600" />
                                      <span className="font-medium text-gray-900">Vaistai:</span>
                                    </div>
                                    <div className="ml-6 mt-1 space-y-1">
                                      {treatment.products_used.slice(0, 3).map((prod: any, idx: number) => (
                                        <div key={idx} className="text-xs text-gray-700">
                                          • {prod.product_name} - {prod.qty} {prod.unit}
                                        </div>
                                      ))}
                                      {treatment.products_used.length > 3 && (
                                        <div className="text-xs text-blue-600 font-medium">
                                          +{treatment.products_used.length - 3} daugiau...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {treatment.owner_name && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">Savininkas:</span> {treatment.owner_name}
                                  </div>
                                )}

                                {treatment.vet_name && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">Veterinaras:</span> {treatment.vet_name}
                                  </div>
                                )}

                                {(treatment.sick_teats && treatment.sick_teats.length > 0) && (
                                  <TeatDisplay sickTeats={treatment.sick_teats} disabledTeats={[]} />
                                )}

                                {(treatment.withdrawal_until_meat || treatment.withdrawal_until_milk) && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {treatment.withdrawal_until_meat && (
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        🥩 Mėsa: {formatDateLT(treatment.withdrawal_until_meat)}
                                      </div>
                                    )}
                                    {treatment.withdrawal_until_milk && (
                                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        🥛 Pienas: {formatDateLT(treatment.withdrawal_until_milk)}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 ml-16 space-y-4">
                              {treatment.clinical_diagnosis && (
                                <div className="bg-blue-50 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-gray-900 mb-2">Klinikinis Diagnozė:</h5>
                                  <p className="text-sm text-gray-700">{treatment.clinical_diagnosis}</p>
                                </div>
                              )}

                              {treatment.animal_condition && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-gray-900 mb-2">Gyvūno Būklė:</h5>
                                  <p className="text-sm text-gray-700">{treatment.animal_condition}</p>
                                </div>
                              )}

                              {treatment.tests && (
                                <div className="bg-purple-50 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-gray-900 mb-2">Atlikti Tyrimai:</h5>
                                  <p className="text-sm text-gray-700">{treatment.tests}</p>
                                </div>
                              )}

                              {treatment.products_used && treatment.products_used.length > 0 && (
                                <div className="bg-blue-50 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Pill className="w-4 h-4" />
                                    Panaudoti Produktai:
                                  </h5>
                                  <div className="space-y-2">
                                    {treatment.products_used.map((product, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-sm bg-white rounded-md p-2">
                                        <span className="font-medium text-gray-900">{product.product_name}</span>
                                        <div className="flex items-center gap-2">
                                          <span className="text-gray-700">{product.quantity} {product.unit}</span>
                                          {product.batch_lot && (
                                            <span className="text-xs text-gray-500">Serija: {product.batch_lot}</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {treatment.treatment_courses && treatment.treatment_courses.length > 0 && (
                                <div className="bg-sky-50 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <Syringe className="w-4 h-4" />
                                    Gydymo Kursai:
                                  </h5>
                                  <div className="space-y-3">
                                    {treatment.treatment_courses.map((course, idx) => (
                                      <div key={idx} className="bg-white rounded-md p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                          <span className="font-medium text-gray-900">{course.product_name}</span>
                                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                            course.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                            course.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {course.status === 'completed' ? '✓ Baigtas' :
                                             course.status === 'active' ? '⟳ Aktyvus' :
                                             course.status}
                                          </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                                          <div>Paros dozė: <span className="font-semibold text-gray-900">{course.daily_dose} {course.unit}</span></div>
                                          <div>Bendra dozė: <span className="font-semibold text-gray-900">{course.total_dose} {course.unit}</span></div>
                                          <div>Trukmė: <span className="font-semibold text-gray-900">{course.days} d.</span></div>
                                          <div>Duota dozių: <span className="font-semibold text-gray-900">{course.doses_administered}/{course.days}</span></div>
                                        </div>
                                        {course.batch_lot && (
                                          <div className="text-xs text-gray-500">Serija: {course.batch_lot}</div>
                                        )}
                                        {course.start_date && (
                                          <div className="text-xs text-gray-500">Pradėta: {formatDateLT(course.start_date)}</div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {treatment.outcome && (
                                <div className="bg-green-50 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-gray-900 mb-2">Rezultatas:</h5>
                                  <p className="text-sm text-gray-700">{treatment.outcome}</p>
                                </div>
                              )}

                              {treatment.notes && (
                                <div className="bg-amber-50 rounded-lg p-4">
                                  <h5 className="text-sm font-bold text-gray-900 mb-2">Pastabos:</h5>
                                  <p className="text-sm text-gray-700">{treatment.notes}</p>
                                </div>
                              )}

                              {treatment.mastitis_teat && (
                                <div className="flex gap-4 text-sm">
                                  {treatment.mastitis_teat && (
                                    <div className="text-gray-600">
                                      <span className="font-medium">Mastitinė spenio:</span> {treatment.mastitis_teat}
                                    </div>
                                  )}
                                  {treatment.mastitis_type && (
                                    <div className="text-gray-600">
                                      <span className="font-medium">Tipas:</span> {treatment.mastitis_type === 'new' ? 'Nauja' : 'Pasikartojanti'}
                                    </div>
                                  )}
                                  {treatment.syringe_count && (
                                    <div className="text-gray-600">
                                      <span className="font-medium">Švirkštų:</span> {treatment.syringe_count}
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                                Įrašyta: {new Date(treatment.created_at).toLocaleString('lt-LT')}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTreatment(treatment.treatment_id, treatment.animal_tag);
                            }}
                            disabled={deletingTreatmentId === treatment.treatment_id}
                            className="p-2 rounded-lg hover:bg-red-50 transition-colors group disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Ištrinti gydymą"
                          >
                            <Trash2 className={`w-5 h-5 ${deletingTreatmentId === treatment.treatment_id ? 'text-gray-400' : 'text-gray-400 group-hover:text-red-600'}`} />
                          </button>
                          <button
                            onClick={() => toggleExpanded(treatment.treatment_id)}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedAnimal && (
        <AnimalDetailSidebar
          animal={selectedAnimal}
          defaultTab="treatments"
          onClose={() => {
            setSelectedAnimal(null);
            loadTreatments();
          }}
        />
      )}
    </div>
  );
}
