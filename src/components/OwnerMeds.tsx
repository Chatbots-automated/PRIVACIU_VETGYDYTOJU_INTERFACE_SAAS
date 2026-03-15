import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Unit } from '../lib/types';
import { AlertTriangle, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { sortByLithuanian } from '../lib/helpers';
import { showNotification } from './NotificationToast';

export function OwnerMeds() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [products, setProducts] = useState<Product[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    first_admin_date: new Date().toISOString().split('T')[0],
    product_id: '',
    dose_qty: '',
    dose_unit: 'ml' as Unit,
    supplier_name: '',
    purchase_proof: '',
    animal_ident: '',
    prescribing_vet: '',
    prescribing_vet_contacts: '',
    withdrawal_until: '',
    treatment_duration_days: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'owner_med_admin',
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
    if (!selectedFarm) return;

    const [productsRes, recordsRes] = await Promise.all([
      supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('category', 'medicines').eq('is_active', true),
      supabase.from('owner_med_admin').select(`*, products(name)`).eq('farm_id', selectedFarm.id).order('first_admin_date', { ascending: false }).limit(10),
    ]);

    if (productsRes.data) {
      const sortedProducts = sortByLithuanian(productsRes.data, 'name');
      setProducts(sortedProducts);
    }
    if (recordsRes.data) setRecords(recordsRes.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase.from('owner_med_admin').insert({
        first_admin_date: formData.first_admin_date,
        product_id: formData.product_id || null,
        dose_qty: formData.dose_qty ? parseFloat(formData.dose_qty) : null,
        dose_unit: formData.dose_unit,
        supplier_name: formData.supplier_name || null,
        purchase_proof: formData.purchase_proof || null,
        animal_ident: formData.animal_ident || null,
        prescribing_vet: formData.prescribing_vet || null,
        prescribing_vet_contacts: formData.prescribing_vet_contacts || null,
        withdrawal_until: formData.withdrawal_until || null,
        treatment_duration_days: formData.treatment_duration_days ? parseInt(formData.treatment_duration_days) : null,
        notes: formData.notes || null,
      });

      if (error) throw error;

      await logAction(
        'create_owner_med_admin',
        'owner_med_admin',
        null,
        null,
        {
          first_admin_date: formData.first_admin_date,
          product_id: formData.product_id,
          animal_ident: formData.animal_ident,
        }
      );

      setSuccess(true);
      setFormData({
        first_admin_date: new Date().toISOString().split('T')[0],
        product_id: '',
        dose_qty: '',
        dose_unit: 'ml',
        supplier_name: '',
        purchase_proof: '',
        animal_ident: '',
        prescribing_vet: '',
        prescribing_vet_contacts: '',
        withdrawal_until: '',
        treatment_duration_days: '',
        notes: '',
      });

      await loadData();
      showNotification('Ūkininkui išduoti vaistai sėkmingai įrašyti', 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-amber-50 p-2 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Savininko duodami vaistai</h2>
            <p className="text-sm text-gray-600">Registruokite savininko duodamus vaistus</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Įrašas sėkmingai užregistruotas!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pirmo davimo data *</label>
              <input
                type="date"
                value={formData.first_admin_date}
                onChange={(e) => setFormData({ ...formData, first_admin_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vaistas</label>
              <select
                value={formData.product_id}
                onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              >
                <option value="">Pasirinkite vaistą...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dozė</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.dose_qty}
                  onChange={(e) => setFormData({ ...formData, dose_qty: e.target.value })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
                <select
                  value={formData.dose_unit}
                  onChange={(e) => setFormData({ ...formData, dose_unit: e.target.value as Unit })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="ml">ml</option>
                  <option value="l">L</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="pcs">pcs</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Gydymo trukmė (dienos)</label>
              <input
                type="number"
                value={formData.treatment_duration_days}
                onChange={(e) => setFormData({ ...formData, treatment_duration_days: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tiekėjo pavadinimas</label>
              <input
                type="text"
                value={formData.supplier_name}
                onChange={(e) => setFormData({ ...formData, supplier_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pirkimo įrodymas (dok. nr.)</label>
              <input
                type="text"
                value={formData.purchase_proof}
                onChange={(e) => setFormData({ ...formData, purchase_proof: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Gyvūno / grupės identifikacija</label>
              <input
                type="text"
                value={formData.animal_ident}
                onChange={(e) => setFormData({ ...formData, animal_ident: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                placeholder="Ženklinių numeriai arba grupės aprašymas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receptą išrašęs veterinaras</label>
              <input
                type="text"
                value={formData.prescribing_vet}
                onChange={(e) => setFormData({ ...formData, prescribing_vet: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Veterinaro kontaktai</label>
              <input
                type="text"
                value={formData.prescribing_vet_contacts}
                onChange={(e) => setFormData({ ...formData, prescribing_vet_contacts: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Karencija iki</label>
              <input
                type="date"
                value={formData.withdrawal_until}
                onChange={(e) => setFormData({ ...formData, withdrawal_until: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pastabos</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registruojama...' : 'Registruoti įrašą'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Paskutiniai įrašai</h3>
        <div className="space-y-3">
          {records.map((record) => (
            <div key={record.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{record.products?.name || 'Nenurodytas vaistas'}</p>
                  <p className="text-sm text-gray-600">Gyvūnas: {record.animal_ident || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {record.dose_qty ? `${record.dose_qty} ${record.dose_unit}` : 'N/A'}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(record.first_admin_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
