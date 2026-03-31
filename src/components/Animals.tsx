import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Animal, Product, Disease } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { fetchAllRows, formatAnimalDisplay } from '../lib/helpers';
import { Plus, Edit2, Save, X, Stethoscope, Search, Syringe, Activity, FileText, Calendar, AlertCircle, User, MapPin, RefreshCw, ExternalLink } from 'lucide-react';

interface AnimalDetail extends Animal {
  treatments?: any[];
  vaccinations?: any[];
  treatment_courses?: any[];
  visits?: any[];
}

export function Animals() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimal, setSelectedAnimal] = useState<AnimalDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [neckNumberSearch, setNeckNumberSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [diseases, setDiseases] = useState<Disease[]>([]);

  const emptyAnimal = {
    tag_no: '',
    species: 'bovine',
    sex: '',
    breed: '',
    birth_date: '',
    age_months: '',
    holder_name: '',
    holder_address: '',
  };

  const [formData, setFormData] = useState(emptyAnimal);

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

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  const loadData = async () => {
    try {
      if (!selectedFarm) {
        setAnimals([]);
        setProducts([]);
        setDiseases([]);
        setLoading(false);
        return;
      }

      const [animalsRes, productsRes, diseasesRes] = await Promise.all([
        supabase.from('animals').select('*').eq('farm_id', selectedFarm.id).order('tag_no'),
        supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true),
        supabase.from('diseases').select('*').eq('farm_id', selectedFarm.id),
      ]);

      setAnimals(animalsRes.data || []);
      setProducts(productsRes.data || []);
      setDiseases(diseasesRes.data || []);
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

  const loadAnimalDetails = async (animalId: string) => {
    setDetailLoading(true);
    try {
      const [treatmentsRes, vaccinationsRes, coursesRes, visitsRes, syncRes] = await Promise.all([
        supabase
          .from('treatments')
          .select('*')
          .eq('animal_id', animalId)
          .order('reg_date', { ascending: false }),
        supabase
          .from('vaccinations')
          .select('*')
          .eq('animal_id', animalId)
          .order('vaccination_date', { ascending: false }),
        supabase
          .from('treatment_courses')
          .select(`
            *,
            treatments!inner(animal_id)
          `)
          .eq('treatments.animal_id', animalId)
          .order('start_date', { ascending: false }),
        supabase
          .from('animal_visits')
          .select('*')
          .eq('animal_id', animalId)
          .order('visit_date', { ascending: false }),
        supabase
          .from('animal_synchronizations')
          .select('*, synchronization_protocols(name)')
          .eq('animal_id', animalId)
          .order('created_at', { ascending: false }),
      ]);

      const animal = animals.find(a => a.id === animalId);
      if (animal) {
        setSelectedAnimal({
          ...animal,
          treatments: treatmentsRes.data || [],
          vaccinations: vaccinationsRes.data || [],
          treatment_courses: coursesRes.data || [],
          visits: visitsRes.data || [],
          synchronizations: syncRes.data || [],
        });
      }
    } catch (error) {
      console.error('Error loading animal details:', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedFarm) {
        alert('Pasirinkite ūkį prieš kurdami gyvūną');
        return;
      }

      const animalData = {
        farm_id: selectedFarm.id,
        tag_no: formData.tag_no || null,
        species: formData.species,
        sex: formData.sex || null,
        breed: formData.breed || null,
        birth_date: formData.birth_date || null,
        age_months: formData.age_months ? parseInt(formData.age_months) : null,
        holder_name: formData.holder_name || null,
        holder_address: formData.holder_address || null,
      };

      if (editing) {
        const oldAnimal = animals.find(a => a.id === editing);
        const { error } = await supabase
          .from('animals')
          .update(animalData)
          .eq('id', editing);

        if (error) throw error;

        await logAction(
          'update_animal',
          'animals',
          editing,
          oldAnimal,
          animalData
        );

        setEditing(null);
      } else {
        const { data, error } = await supabase
          .from('animals')
          .insert(animalData)
          .select()
          .single();

        if (error) throw error;

        await logAction(
          'create_animal',
          'animals',
          data.id,
          null,
          animalData
        );

        setShowAdd(false);
      }

      setFormData(emptyAnimal);
      await loadData();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    }
  };

  const handleEdit = (animal: Animal) => {
    logAction('view_animal_edit', 'animals', animal.id, null, { tag_no: animal.tag_no });
    setEditing(animal.id);
    setFormData({
      tag_no: animal.tag_no || '',
      species: animal.species,
      sex: animal.sex || '',
      breed: animal.breed || '',
      birth_date: animal.birth_date || '',
      age_months: animal.age_months?.toString() || '',
      holder_name: animal.holder_name || '',
      holder_address: animal.holder_address || '',
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyAnimal);
  };

  const handleOpenExternalSearch = () => {
    if (!selectedAnimal?.tag_no) {
      alert('Nėra ženklo numerio');
      return;
    }

    const tagNo = encodeURIComponent(selectedAnimal.tag_no);
    const url = `https://app.brolisherdline.com/animals?page=1#search=${tagNo}`;

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const searchAnimals = (generalTerm: string, neckTerm: string): Animal[] => {
    return animals.filter(animal => {
      let matchesGeneral = true;
      let matchesNeck = true;

      // Filter by general search term
      if (generalTerm) {
        const searchLower = generalTerm.toLowerCase().trim();
        const tagNo = animal.tag_no?.toLowerCase() || '';
        const holderName = animal.holder_name?.toLowerCase() || '';
        const holderAddress = animal.holder_address?.toLowerCase() || '';

        const last5Digits = tagNo.slice(-5);
        const reversed = last5Digits.split('').reverse().join('');

        matchesGeneral =
          tagNo.includes(searchLower) ||
          holderName.includes(searchLower) ||
          holderAddress.includes(searchLower) ||
          reversed.includes(searchLower);
      }

      // Filter by neck number search term (exact match)
      if (neckTerm) {
        const neckTrimmed = neckTerm.trim();
        const collarNo = animal.collar_no || '';
        matchesNeck = collarNo === neckTrimmed;
      }

      return matchesGeneral && matchesNeck;
    });
  };

  const filteredAnimals = searchAnimals(searchTerm, neckNumberSearch);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedAnimal) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSelectedAnimal(null)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            <X className="w-4 h-4" />
            Grįžti
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">Gyvūno detalės</h2>
            <p className="text-sm text-gray-600">Pilna informacija apie gyvūną</p>
          </div>
          <button
            onClick={handleOpenExternalSearch}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            <ExternalLink className="w-4 h-4" />
            Ieškoti VIC sistemoje
          </button>
        </div>

        {detailLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-blue-600 rounded-lg shadow-sm p-6 text-white border border-blue-700">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-white/20 p-3 rounded-lg">
                    <Stethoscope className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-100">Ženklo numeris</p>
                    <p className="text-2xl font-bold">{selectedAnimal.tag_no || 'N/A'}</p>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-blue-500">
                  {(selectedAnimal as any).neck_no && (
                    <div className="flex items-center justify-between">
                      <span className="text-blue-100">Kaklo Nr.:</span>
                      <span className="font-semibold">{(selectedAnimal as any).neck_no}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-blue-100">Rūšis:</span>
                    <span className="font-semibold">{selectedAnimal.sex || selectedAnimal.species}</span>
                  </div>
                  {selectedAnimal.age_months && (
                    <div className="flex items-center justify-between">
                      <span className="text-blue-100">Amžius:</span>
                      <span className="font-semibold">{selectedAnimal.age_months} mėn.</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-600" />
                  Savininko informacija
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Savininkas</p>
                    <p className="font-medium text-gray-900">{selectedAnimal.holder_name || 'N/A'}</p>
                  </div>
                  {selectedAnimal.holder_address && (
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Adresas
                      </p>
                      <p className="font-medium text-gray-900">{selectedAnimal.holder_address}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Statistika</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Syringe className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-900">Vakcinacijos</span>
                    </div>
                    <span className="text-2xl font-bold text-green-700">
                      {selectedAnimal.vaccinations?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">Gydymai</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-700">
                      {selectedAnimal.treatments?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium text-purple-900">Kursai</span>
                    </div>
                    <span className="text-2xl font-bold text-purple-700">
                      {selectedAnimal.treatment_courses?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-pink-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-pink-600" />
                      <span className="text-sm font-medium text-pink-900">Sinchronizacijos</span>
                    </div>
                    <span className="text-2xl font-bold text-pink-700">
                      {selectedAnimal.synchronizations?.filter((s: any) => s.status === 'Active').length || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-600" />
                    <h3 className="text-lg font-bold text-gray-900">Planuojamas vizitas</h3>
                  </div>
                </div>
                <div className="p-6">
                  {(() => {
                    const futureVisits = selectedAnimal.visits?.filter((v: any) =>
                      new Date(v.visit_date) >= new Date() && v.status === 'scheduled'
                    ).sort((a: any, b: any) =>
                      new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
                    ) || [];

                    const nextVisit = futureVisits[0];

                    if (!nextVisit) {
                      return (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">Nėra suplanuotų vizitų</p>
                        </div>
                      );
                    }

                    return (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl font-bold text-amber-700">
                                {new Date(nextVisit.visit_date).toLocaleDateString('lt-LT')}
                              </span>
                              <span className="bg-amber-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                                {nextVisit.visit_type === 'checkup' ? 'Patikrinimas' :
                                 nextVisit.visit_type === 'vaccination' ? 'Vakcinacija' :
                                 nextVisit.visit_type === 'treatment' ? 'Gydymas' :
                                 nextVisit.visit_type === 'follow-up' ? 'Pakartotinis' :
                                 nextVisit.visit_type === 'emergency' ? 'Skubus' : 'Kita'}
                              </span>
                            </div>
                            {nextVisit.purpose && (
                              <p className="text-gray-900 font-medium mb-2">{nextVisit.purpose}</p>
                            )}
                            {nextVisit.vet_name && (
                              <p className="text-sm text-gray-600">
                                <span className="font-medium">Veterinaras:</span> {nextVisit.vet_name}
                              </p>
                            )}
                            {nextVisit.notes && (
                              <p className="text-sm text-gray-600 italic mt-2">{nextVisit.notes}</p>
                            )}
                          </div>
                        </div>
                        {futureVisits.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-amber-200 text-sm text-gray-600">
                            Dar {futureVisits.length - 1} būsimas(-i) vizitas(-ai)
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-slate-600" />
                    <h3 className="text-lg font-bold text-gray-900">Vizitų istorija</h3>
                    <span className="ml-auto bg-slate-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedAnimal.visits?.filter((v: any) => v.status === 'completed').length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {(() => {
                    const pastVisits = selectedAnimal.visits?.filter((v: any) =>
                      v.status === 'completed'
                    ).sort((a: any, b: any) =>
                      new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime()
                    ) || [];

                    if (pastVisits.length === 0) {
                      return (
                        <div className="text-center py-8">
                          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-500">Nėra įvykusių vizitų</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {pastVisits.slice(0, 5).map((visit: any) => (
                          <div key={visit.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-slate-300 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <span className="font-semibold text-gray-900">
                                    {new Date(visit.visit_date).toLocaleDateString('lt-LT')}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                    visit.visit_type === 'checkup' ? 'bg-blue-100 text-blue-700' :
                                    visit.visit_type === 'vaccination' ? 'bg-green-100 text-green-700' :
                                    visit.visit_type === 'treatment' ? 'bg-red-100 text-red-700' :
                                    visit.visit_type === 'follow-up' ? 'bg-purple-100 text-purple-700' :
                                    visit.visit_type === 'emergency' ? 'bg-orange-100 text-orange-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {visit.visit_type === 'checkup' ? 'Patikrinimas' :
                                     visit.visit_type === 'vaccination' ? 'Vakcinacija' :
                                     visit.visit_type === 'treatment' ? 'Gydymas' :
                                     visit.visit_type === 'follow-up' ? 'Pakartotinis' :
                                     visit.visit_type === 'emergency' ? 'Skubus' : 'Kita'}
                                  </span>
                                </div>
                                {visit.purpose && (
                                  <p className="text-sm text-gray-700 mb-1">{visit.purpose}</p>
                                )}
                                {visit.vet_name && (
                                  <p className="text-xs text-gray-600">
                                    Veterinaras: {visit.vet_name}
                                  </p>
                                )}
                                {visit.notes && (
                                  <p className="text-xs text-gray-500 italic mt-1">{visit.notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {pastVisits.length > 5 && (
                          <p className="text-sm text-gray-500 text-center pt-2">
                            Ir dar {pastVisits.length - 5} vizitas(-ai)
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Syringe className="w-5 h-5 text-green-600" />
                    <h3 className="text-lg font-bold text-gray-900">Vakcinacijų istorija</h3>
                    <span className="ml-auto bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedAnimal.vaccinations?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {!selectedAnimal.vaccinations || selectedAnimal.vaccinations.length === 0 ? (
                    <div className="text-center py-8">
                      <Syringe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nėra vakcinacijų įrašų</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedAnimal.vaccinations.map((vac: any) => (
                        <div key={vac.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-green-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {products.find(p => p.id === vac.product_id)?.name || 'Nežinoma vakcina'}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {vac.vaccination_date}
                                </span>
                                <span className="font-medium">{vac.dose_amount} {vac.unit}</span>
                                {vac.dose_number > 1 && (
                                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                                    Dozė #{vac.dose_number}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {vac.next_booster_date && (
                            <div className="mt-2 pt-2 border-t border-gray-200 text-sm">
                              <span className="text-gray-600">Kita vakcina: </span>
                              <span className="font-medium text-gray-900">{vac.next_booster_date}</span>
                            </div>
                          )}
                          {vac.administered_by && (
                            <div className="mt-1 text-sm text-gray-600">
                              <span>Vakcinavo: </span>
                              <span className="font-medium">{vac.administered_by}</span>
                            </div>
                          )}
                          {vac.notes && (
                            <div className="mt-2 text-sm text-gray-600 italic">
                              {vac.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-bold text-gray-900">Gydymų istorija</h3>
                    <span className="ml-auto bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedAnimal.treatments?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {!selectedAnimal.treatments || selectedAnimal.treatments.length === 0 ? (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nėra gydymų įrašų</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedAnimal.treatments.map((treatment: any) => {
                        const disease = diseases.find(d => d.id === treatment.disease_id);
                        return (
                          <div key={treatment.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition-colors">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                {disease && (
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <h4 className="font-semibold text-gray-900">
                                      {disease.name}
                                      {disease.code && <span className="text-gray-500 text-sm ml-2">({disease.code})</span>}
                                    </h4>
                                  </div>
                                )}
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {treatment.reg_date}
                                  </span>
                                  {treatment.outcome && (
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      treatment.outcome === 'recovered' ? 'bg-green-100 text-green-700' :
                                      treatment.outcome === 'ongoing' ? 'bg-yellow-100 text-yellow-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>
                                      {treatment.outcome === 'recovered' ? 'Pasveiko' :
                                       treatment.outcome === 'ongoing' ? 'Tęsiasi' :
                                       treatment.outcome === 'died' ? 'Žuvo' : treatment.outcome}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {treatment.clinical_diagnosis && (
                              <div className="mt-2 text-sm">
                                <span className="text-gray-600">Diagnozė: </span>
                                <span className="text-gray-900">{treatment.clinical_diagnosis}</span>
                              </div>
                            )}

                            {treatment.animal_condition && (
                              <div className="mt-1 text-sm">
                                <span className="text-gray-600">Būklė: </span>
                                <span className="text-gray-900">{treatment.animal_condition}</span>
                              </div>
                            )}

                            {treatment.mastitis_teat && (
                              <div className="mt-1 text-sm">
                                <span className="text-gray-600">Spenys: </span>
                                <span className="text-gray-900">{treatment.mastitis_teat}</span>
                                {treatment.mastitis_type && (
                                  <span className="ml-2 text-gray-600">
                                    ({treatment.mastitis_type === 'new' ? 'Nauja' : 'Pasikartojanti'})
                                  </span>
                                )}
                              </div>
                            )}

                            {(treatment.withdrawal_until_meat || treatment.withdrawal_until_milk) && (
                              <div className="mt-2 pt-2 border-t border-gray-200 text-sm">
                                {treatment.withdrawal_until_meat && (
                                  <div className="text-orange-600 font-medium">
                                    ⚠ Skerdimo karantinas iki: {treatment.withdrawal_until_meat}
                                  </div>
                                )}
                                {treatment.withdrawal_until_milk && (
                                  <div className="text-orange-600 font-medium">
                                    ⚠ Pieno karantinas iki: {treatment.withdrawal_until_milk}
                                  </div>
                                )}
                              </div>
                            )}

                            {treatment.vet_name && (
                              <div className="mt-2 text-sm text-gray-600">
                                <span>Gydė: </span>
                                <span className="font-medium">{treatment.vet_name}</span>
                              </div>
                            )}

                            {treatment.notes && (
                              <div className="mt-2 text-sm text-gray-600 italic">
                                {treatment.notes}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-purple-600" />
                    <h3 className="text-lg font-bold text-gray-900">Gydymo kursai</h3>
                    <span className="ml-auto bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedAnimal.treatment_courses?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {!selectedAnimal.treatment_courses || selectedAnimal.treatment_courses.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">Nėra gydymo kursų</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedAnimal.treatment_courses.map((course: any) => (
                        <div key={course.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {products.find(p => p.id === course.product_id)?.name || 'Nežinomas produktas'}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Nuo {course.start_date}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  course.status === 'active' ? 'bg-green-100 text-green-700' :
                                  course.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {course.status === 'active' ? 'Aktyvus' :
                                   course.status === 'completed' ? 'Baigtas' :
                                   'Atšauktas'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            <div>
                              <span className="text-gray-600">Dienos: </span>
                              <span className="font-medium">{course.days}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Dozė/dieną: </span>
                              <span className="font-medium">{course.daily_dose} {course.unit}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Viso dozė: </span>
                              <span className="font-medium">{course.total_dose} {course.unit}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Duota dozių: </span>
                              <span className="font-medium">{course.doses_administered || 0} / {course.days}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 overflow-hidden">
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-pink-600" />
                    <h3 className="text-lg font-bold text-gray-900">Sinchronizacijos protokolai</h3>
                    <span className="ml-auto bg-pink-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {selectedAnimal.synchronizations?.length || 0}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  {!selectedAnimal.synchronizations || selectedAnimal.synchronizations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                      <p>Šis gyvūnas nedalyvauja sinchronizacijos protokoluose</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {selectedAnimal.synchronizations.map((sync: any) => (
                        <div key={sync.id} className="p-4 bg-pink-50 rounded-lg border border-pink-200 hover:border-pink-300 transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900">
                                {sync.synchronization_protocols?.name || 'Protokolas'}
                              </h4>
                              <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  Pradėta: {new Date(sync.start_date).toLocaleDateString('lt-LT')}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  sync.status === 'Active' ? 'bg-green-100 text-green-700' :
                                  sync.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {sync.status === 'Active' ? 'Aktyvus' :
                                   sync.status === 'Completed' ? 'Baigtas' :
                                   'Atšauktas'}
                                </span>
                              </div>
                            </div>
                          </div>
                          {sync.insemination_date && (
                            <div className="mt-3 p-3 bg-white rounded border border-pink-200">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-600">Sėklinimo data: </span>
                                  <span className="font-medium">{sync.insemination_date}</span>
                                </div>
                                {sync.insemination_number && (
                                  <div>
                                    <span className="text-gray-600">Numeris: </span>
                                    <span className="font-medium">{sync.insemination_number}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                          {sync.result && (
                            <div className="mt-2 text-sm">
                              <span className="text-gray-600">Rezultatas: </span>
                              <span className="font-medium text-gray-900">{sync.result}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Stethoscope className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Gyvūnų registras</h2>
            <p className="text-sm text-gray-600">Ieškokite pagal paskutinius 5 skaitmenis (atvirkštine tvarka)</p>
          </div>
        </div>
        {!showAdd && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefreshAnimals}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atnaujinama...' : 'Atnaujinti iš VIC'}
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Pridėti gyvūną
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ieškoti pagal ženklo numerį, savininką, paskutinius 5 skaitmenis..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="relative">
          <Activity className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
          <input
            type="text"
            value={neckNumberSearch}
            onChange={(e) => setNeckNumberSearch(e.target.value)}
            placeholder="Ieškoti pagal kaklo numerį..."
            className="w-full pl-12 pr-4 py-3 border-2 border-blue-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Naujas gyvūnas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Ženklo numeris *"
              value={formData.tag_no}
              onChange={(e) => setFormData({ ...formData, tag_no: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Rūšis"
              value={formData.species}
              onChange={(e) => setFormData({ ...formData, species: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <select
              value={formData.sex}
              onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pasirinkite lytį...</option>
              <option value="male">Patinas</option>
              <option value="female">Patelė</option>
            </select>

            <input
              type="text"
              placeholder="Veislė"
              value={formData.breed}
              onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gimimo data</label>
              <input
                type="date"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Amžius (mėn.) {formData.birth_date && <span className="text-blue-600">- Automatiškai apskaičiuota</span>}
              </label>
              <input
                type="number"
                placeholder="Amžius (mėn.)"
                value={formData.age_months}
                readOnly={!!formData.birth_date}
                onChange={(e) => !formData.birth_date && setFormData({ ...formData, age_months: e.target.value })}
                className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formData.birth_date ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              />
            </div>

            <input
              type="text"
              placeholder="Savininko vardas"
              value={formData.holder_name}
              onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Savininko adresas"
              value={formData.holder_address}
              onChange={(e) => setFormData({ ...formData, holder_address: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Atšaukti
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Išsaugoti gyvūną
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kaklo nr.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rūšis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amžius</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Savininkas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAnimals.map((animal) => (
                <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                  {editing === animal.id ? (
                    <>
                      <td className="px-6 py-4" colSpan={6}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={formData.tag_no}
                            onChange={(e) => setFormData({ ...formData, tag_no: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Ženklo numeris"
                          />
                          <input
                            type="text"
                            value={formData.species}
                            onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Rūšis"
                          />
                          <select
                            value={formData.sex}
                            onChange={(e) => setFormData({ ...formData, sex: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="">Pasirinkite lytį...</option>
                            <option value="male">Patinas</option>
                            <option value="female">Patelė</option>
                          </select>
                          <input
                            type="text"
                            value={formData.breed}
                            onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Veislė"
                          />
                          <div>
                            <input
                              type="date"
                              value={formData.birth_date}
                              onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
                              placeholder="Gimimo data"
                            />
                          </div>
                          <div>
                            <input
                              type="number"
                              value={formData.age_months}
                              readOnly={!!formData.birth_date}
                              onChange={(e) => !formData.birth_date && setFormData({ ...formData, age_months: e.target.value })}
                              className={`px-4 py-2 border border-gray-300 rounded-lg w-full ${formData.birth_date ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                              placeholder={formData.birth_date ? 'Auto-apskaičiuota' : 'Amžius (mėn.)'}
                            />
                          </div>
                          <input
                            type="text"
                            value={formData.holder_name}
                            onChange={(e) => setFormData({ ...formData, holder_name: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Savininko vardas"
                          />
                          <input
                            type="text"
                            value={formData.holder_address}
                            onChange={(e) => setFormData({ ...formData, holder_address: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Savininko adresas"
                          />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button
                            onClick={handleCancel}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleSave}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => loadAnimalDetails(animal.id)}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {formatAnimalDisplay(animal)}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{(animal as any).neck_no || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{animal.sex || animal.species}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {animal.age_months ? `${animal.age_months} mėn.` : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{animal.holder_name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{animal.holder_address || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEdit(animal)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAnimals.length === 0 && (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Nerasta gyvūnų</p>
            <p className="text-gray-400 text-sm mt-1">Pabandykite kitą paieškos užklausą</p>
          </div>
        )}
      </div>
    </div>
  );
}
