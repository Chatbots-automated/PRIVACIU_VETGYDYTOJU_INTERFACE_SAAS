import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Save, X, Building2, Phone, Mail, MapPin, Hash, CheckCircle, XCircle } from 'lucide-react';
import { useFarm } from '../contexts/FarmContext';

interface Farm {
  id?: string;
  name: string;
  code: string;
  address?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  vic_username?: string;
  vic_password?: string;
  is_active: boolean;
}

export function Farms() {
  const { loadFarms } = useFarm();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptyFarm: Farm = {
    name: '',
    code: '',
    address: '',
    contact_person: '',
    contact_phone: '',
    contact_email: '',
    vic_username: '',
    vic_password: '',
    is_active: true,
  };

  const [formData, setFormData] = useState<Farm>(emptyFarm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data, error } = await supabase
        .from('farms')
        .select('*')
        .order('name');

      if (error) throw error;
      setFarms(data || []);
    } catch (error) {
      console.error('Error loading farms:', error);
      alert('Klaida kraunant ūkius');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.code) {
        alert('Pavadinimas ir kodas yra privalomi');
        return;
      }

      if (editing) {
        const { error } = await supabase
          .from('farms')
          .update({
            name: formData.name,
            code: formData.code,
            address: formData.address || null,
            contact_person: formData.contact_person || null,
            contact_phone: formData.contact_phone || null,
            contact_email: formData.contact_email || null,
            vic_username: formData.vic_username || null,
            vic_password: formData.vic_password || null,
            is_active: formData.is_active,
          })
          .eq('id', editing);

        if (error) throw error;
        alert('Ūkis atnaujintas!');
      } else {
        const { error } = await supabase
          .from('farms')
          .insert([{
            name: formData.name,
            code: formData.code,
            address: formData.address || null,
            contact_person: formData.contact_person || null,
            contact_phone: formData.contact_phone || null,
            contact_email: formData.contact_email || null,
            vic_username: formData.vic_username || null,
            vic_password: formData.vic_password || null,
            is_active: formData.is_active,
          }]);

        if (error) throw error;
        alert('Ūkis sukurtas!');
      }

      setEditing(null);
      setShowAdd(false);
      setFormData(emptyFarm);
      await loadData();
      await loadFarms();
    } catch (error: any) {
      console.error('Error saving farm:', error);
      alert(`Klaida išsaugant ūkį: ${error.message}`);
    }
  };

  const handleEdit = (farm: Farm) => {
    setFormData(farm);
    setEditing(farm.id!);
    setShowAdd(false);
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyFarm);
  };

  const handleToggleActive = async (farm: Farm) => {
    try {
      const { error } = await supabase
        .from('farms')
        .update({ is_active: !farm.is_active })
        .eq('id', farm.id);

      if (error) throw error;
      await loadData();
      await loadFarms();
    } catch (error: any) {
      console.error('Error toggling farm status:', error);
      alert(`Klaida keičiant ūkio statusą: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Klientų Ūkiai</h2>
          <p className="text-gray-600 mt-1">Valdykite veterinarinių paslaugų klientus</p>
        </div>
        {!showAdd && !editing && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Pridėti ūkį
          </button>
        )}
      </div>

      {(showAdd || editing) && (
        <div className="bg-white border-2 border-emerald-500 rounded-xl p-6 shadow-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editing ? 'Redaguoti ūkį' : 'Naujas ūkis'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pavadinimas *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ūkio pavadinimas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kodas *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="ŪKIO-001"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresas
              </label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Ūkio adresas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kontaktinis asmuo
              </label>
              <input
                type="text"
                value={formData.contact_person || ''}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Vardas Pavardė"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefonas
              </label>
              <input
                type="text"
                value={formData.contact_phone || ''}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="+370 600 00000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                El. paštas
              </label>
              <input
                type="email"
                value={formData.contact_email || ''}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="kontaktas@ukis.lt"
              />
            </div>

            <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-2">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">VIC Duomenys (Veterinarijos informacijos centras)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VIC Vartotojo vardas
                  </label>
                  <input
                    type="text"
                    value={formData.vic_username || ''}
                    onChange={(e) => setFormData({ ...formData, vic_username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="VIC username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    VIC Slaptažodis
                  </label>
                  <input
                    type="password"
                    value={formData.vic_password || ''}
                    onChange={(e) => setFormData({ ...formData, vic_password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    placeholder="VIC password"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-sm font-medium text-gray-700">Aktyvus</span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Išsaugoti
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              <X className="w-4 h-4" />
              Atšaukti
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {farms.map((farm) => (
          <div
            key={farm.id}
            className={`bg-white rounded-xl shadow-md border-2 p-6 transition-all ${
              farm.is_active 
                ? 'border-emerald-200 hover:border-emerald-400' 
                : 'border-gray-200 opacity-60'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  farm.is_active ? 'bg-emerald-100' : 'bg-gray-100'
                }`}>
                  <Building2 className={`w-6 h-6 ${farm.is_active ? 'text-emerald-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{farm.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Hash className="w-3 h-3" />
                    {farm.code}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {farm.is_active ? (
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {farm.address && (
              <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{farm.address}</span>
              </div>
            )}

            {farm.contact_person && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Building2 className="w-4 h-4" />
                <span>{farm.contact_person}</span>
              </div>
            )}

            {farm.contact_phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Phone className="w-4 h-4" />
                <span>{farm.contact_phone}</span>
              </div>
            )}

            {farm.contact_email && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <Mail className="w-4 h-4" />
                <span>{farm.contact_email}</span>
              </div>
            )}

            <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => handleEdit(farm)}
                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
              >
                <Edit2 className="w-4 h-4" />
                Redaguoti
              </button>
              <button
                onClick={() => handleToggleActive(farm)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                  farm.is_active
                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {farm.is_active ? (
                  <>
                    <XCircle className="w-4 h-4" />
                    Deaktyvuoti
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Aktyvuoti
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {farms.length === 0 && !showAdd && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
          <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">Nėra registruotų ūkių</p>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Pridėti pirmą ūkį
          </button>
        </div>
      )}
    </div>
  );
}
