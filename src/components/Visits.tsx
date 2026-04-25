import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { fetchAllRows } from '../lib/helpers';
import { Animal } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { requireClientId } from '../lib/clientHelpers';
import { Calendar, Plus, Edit2, Save, X, Check, XCircle, Clock, Search, AlertCircle } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';

interface Visit {
  id: string;
  animal_id: string;
  visit_date: string;
  visit_type: 'checkup' | 'vaccination' | 'treatment' | 'follow-up' | 'emergency' | 'other';
  status: 'scheduled' | 'completed' | 'cancelled';
  purpose?: string;
  notes?: string;
  vet_name?: string;
  created_at: string;
  updated_at: string;
}

interface VisitWithAnimal extends Visit {
  animal?: Animal;
}

export function Visits() {
  const { user, logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [visits, setVisits] = useState<VisitWithAnimal[]>([]);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');

  const emptyVisit = {
    animal_id: '',
    visit_date: '',
    visit_type: 'checkup' as const,
    status: 'scheduled' as const,
    purpose: '',
    notes: '',
    vet_name: '',
  };

  const [formData, setFormData] = useState({
    ...emptyVisit,
    vet_name: user?.full_name || user?.email || '',
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

  const loadData = async () => {
    try {
      if (!selectedFarm) return;

      const clientId = requireClientId(user);
      
      const [visitsRes, animalsRes] = await Promise.all([
        supabase.from('animal_visits').select('*').eq('client_id', clientId).eq('farm_id', selectedFarm.id).order('visit_date', { ascending: false }),
        supabase.from('animals').select('*').eq('client_id', clientId).eq('farm_id', selectedFarm.id).order('tag_no'),
      ]);

      const animalsData = animalsRes.data || [];
      const visitsData = (visitsRes.data || []).map((visit: Visit) => ({
        ...visit,
        animal: animalsData.find(a => a.id === visit.animal_id),
      }));

      setVisits(visitsData);
      setAnimals(animalsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.animal_id || !formData.visit_date) {
        alert('Prašome užpildyti visus privalomus laukus');
        return;
      }

      const clientId = requireClientId(user);
      
      const visitData = {
        client_id: clientId,
        farm_id: selectedFarm.id,
        animal_id: formData.animal_id,
        visit_date: formData.visit_date,
        visit_type: formData.visit_type,
        status: formData.status,
        purpose: formData.purpose || null,
        notes: formData.notes || null,
        vet_name: formData.vet_name || null,
      };

      if (editing) {
        const oldVisit = visits.find(v => v.id === editing);
        const { error } = await supabase
          .from('animal_visits')
          .update(visitData)
          .eq('id', editing);

        if (error) throw error;

        await logAction(
          'update_visit',
          'animal_visits',
          editing,
          oldVisit,
          visitData
        );

        setEditing(null);
      } else {
        const { data, error } = await supabase
          .from('animal_visits')
          .insert(visitData)
          .select()
          .single();

        if (error) throw error;

        await logAction(
          'create_visit',
          'animal_visits',
          data.id,
          null,
          visitData
        );

        setShowAdd(false);
      }

      setFormData({
        ...emptyVisit,
        vet_name: user?.full_name || user?.email || '',
      });
      await loadData();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    }
  };

  const handleEdit = (visit: VisitWithAnimal) => {
    setEditing(visit.id);
    setFormData({
      animal_id: visit.animal_id,
      visit_date: visit.visit_date,
      visit_type: visit.visit_type,
      status: visit.status,
      purpose: visit.purpose || '',
      notes: visit.notes || '',
      vet_name: visit.vet_name || '',
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyVisit);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ar tikrai norite ištrinti šį vizitą?')) return;

    try {
      const { error } = await supabase
        .from('animal_visits')
        .delete()
        .eq('id', id);

      if (error) throw error;

      const deletedVisit = visits.find(v => v.id === id);
      await logAction(
        'delete_visit',
        'animal_visits',
        id,
        deletedVisit,
        null
      );

      await loadData();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    }
  };

  const filteredVisits = visits.filter(visit => {
    if (filterStatus !== 'all' && visit.status !== filterStatus) return false;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const animalTag = visit.animal?.tag_no?.toLowerCase() || '';
      const holderName = visit.animal?.holder_name?.toLowerCase() || '';
      const purpose = visit.purpose?.toLowerCase() || '';
      const vetName = visit.vet_name?.toLowerCase() || '';

      return animalTag.includes(searchLower) ||
             holderName.includes(searchLower) ||
             purpose.includes(searchLower) ||
             vetName.includes(searchLower);
    }

    return true;
  });

  const scheduledVisits = filteredVisits.filter(v => v.status === 'scheduled');
  const completedVisits = filteredVisits.filter(v => v.status === 'completed');

  const getVisitTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      checkup: 'Patikrinimas',
      vaccination: 'Vakcinacija',
      treatment: 'Gydymas',
      'follow-up': 'Pakartotinis',
      emergency: 'Skubus',
      other: 'Kita',
    };
    return labels[type] || type;
  };

  const getVisitTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      checkup: 'bg-blue-100 text-blue-700',
      vaccination: 'bg-green-100 text-green-700',
      treatment: 'bg-red-100 text-red-700',
      'follow-up': 'bg-purple-100 text-purple-700',
      emergency: 'bg-orange-100 text-orange-700',
      other: 'bg-gray-100 text-gray-700',
    };
    return colors[type] || colors.other;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const VisitForm = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {editing ? 'Redaguoti vizitą' : 'Naujas vizitas'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Gyvūnas *
          </label>
          <SearchableSelect
            options={animals.map(a => ({
              value: a.id,
              label: `${a.tag_no} - ${a.holder_name || 'N/A'}`,
            }))}
            value={formData.animal_id}
            onChange={(value) => setFormData({ ...formData, animal_id: value })}
            placeholder="Pasirinkite gyvūną..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vizito data *
          </label>
          <input
            type="date"
            value={formData.visit_date}
            onChange={(e) => setFormData({ ...formData, visit_date: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vizito tipas *
          </label>
          <select
            value={formData.visit_type}
            onChange={(e) => setFormData({ ...formData, visit_type: e.target.value as any })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="checkup">Patikrinimas</option>
            <option value="vaccination">Vakcinacija</option>
            <option value="treatment">Gydymas</option>
            <option value="follow-up">Pakartotinis</option>
            <option value="emergency">Skubus</option>
            <option value="other">Kita</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Statusas *
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="scheduled">Suplanuotas</option>
            <option value="completed">Įvykęs</option>
            <option value="cancelled">Atšauktas</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Veterinaras
          </label>
          <input
            type="text"
            value={formData.vet_name}
            onChange={(e) => setFormData({ ...formData, vet_name: e.target.value })}
            placeholder="Veterinaro vardas"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tikslas
          </label>
          <input
            type="text"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
            placeholder="Vizito tikslas ar priežastis"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pastabos
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Papildomos pastabos..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
          Išsaugoti
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 p-2 rounded-lg">
            <Calendar className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Vizitų valdymas</h2>
            <p className="text-sm text-gray-600">Planuokite ir valdykite gyvūnų vizitus</p>
          </div>
        </div>
        {!showAdd && !editing && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Pridėti vizitą
          </button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ieškoti pagal ženklo nr., savininką, tikslą, veterinarą..."
            className="w-full pl-12 pr-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-3 border-2 border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Visi vizitai</option>
            <option value="scheduled">Suplanuoti</option>
            <option value="completed">Įvykę</option>
            <option value="cancelled">Atšaukti</option>
          </select>
        </div>
      </div>

      {(showAdd || editing) && <VisitForm />}

      <div className="bg-white rounded-xl shadow-sm border-2 border-amber-200 overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-bold text-gray-900">Planuojami vizitai</h3>
            <span className="ml-auto bg-amber-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {scheduledVisits.length}
            </span>
          </div>
        </div>
        <div className="p-6">
          {scheduledVisits.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nėra suplanuotų vizitų</p>
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledVisits.map((visit) => (
                <div key={visit.id} className="p-4 bg-amber-50 rounded-lg border border-amber-200 hover:border-amber-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-bold text-amber-700">
                          {new Date(visit.visit_date).toLocaleDateString('lt-LT')}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getVisitTypeColor(visit.visit_type)}`}>
                          {getVisitTypeLabel(visit.visit_type)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Gyvūnas: {visit.animal?.tag_no || 'N/A'} - {visit.animal?.holder_name || 'N/A'}
                      </p>
                      {visit.purpose && (
                        <p className="text-sm text-gray-700 mb-1">{visit.purpose}</p>
                      )}
                      {visit.vet_name && (
                        <p className="text-xs text-gray-600">Veterinaras: {visit.vet_name}</p>
                      )}
                      {visit.notes && (
                        <p className="text-xs text-gray-500 italic mt-2">{visit.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(visit)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Redaguoti"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(visit.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Ištrinti"
                      >
                        <X className="w-4 h-4" />
                      </button>
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
            <Check className="w-5 h-5 text-slate-600" />
            <h3 className="text-lg font-bold text-gray-900">Įvykę vizitai</h3>
            <span className="ml-auto bg-slate-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {completedVisits.length}
            </span>
          </div>
        </div>
        <div className="p-6">
          {completedVisits.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nėra įvykusių vizitų</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completedVisits.map((visit) => (
                <div key={visit.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-semibold text-gray-900">
                          {new Date(visit.visit_date).toLocaleDateString('lt-LT')}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getVisitTypeColor(visit.visit_type)}`}>
                          {getVisitTypeLabel(visit.visit_type)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 mb-1">
                        Gyvūnas: {visit.animal?.tag_no || 'N/A'} - {visit.animal?.holder_name || 'N/A'}
                      </p>
                      {visit.purpose && (
                        <p className="text-sm text-gray-700 mb-1">{visit.purpose}</p>
                      )}
                      {visit.vet_name && (
                        <p className="text-xs text-gray-600">Veterinaras: {visit.vet_name}</p>
                      )}
                      {visit.notes && (
                        <p className="text-xs text-gray-500 italic mt-2">{visit.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(visit)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Redaguoti"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(visit.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Ištrinti"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
