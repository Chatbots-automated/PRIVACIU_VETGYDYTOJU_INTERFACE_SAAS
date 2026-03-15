import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Supplier } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { Plus, Edit2, Save, X, Building2 } from 'lucide-react';
import { showNotification } from './NotificationToast';

export function Suppliers() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptySupplier = {
    name: '',
    code: '',
    vat_code: '',
    phone: '',
    email: '',
  };

  const [formData, setFormData] = useState(emptySupplier);

  useEffect(() => {
    loadSuppliers();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'suppliers',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback((payload) => {
      setSuppliers(prev => [...prev, payload.new].sort((a, b) => a.name.localeCompare(b.name)));
    }, []),
    onUpdate: useCallback((payload) => {
      setSuppliers(prev => prev.map(s => s.id === payload.new.id ? payload.new : s));
    }, []),
    onDelete: useCallback((payload) => {
      setSuppliers(prev => prev.filter(s => s.id !== payload.old.id));
    }, []),
  });

  const loadSuppliers = async () => {
    try {
      if (!selectedFarm) {
        setSuppliers([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('farm_id', selectedFarm.id)
        .order('name');

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!selectedFarm) {
        alert('Pasirinkite ūkį');
        return;
      }

      const supplierData = {
        farm_id: selectedFarm.id,
        name: formData.name,
        code: formData.code || null,
        vat_code: formData.vat_code || null,
        phone: formData.phone || null,
        email: formData.email || null,
      };

      if (editing) {
        const oldSupplier = suppliers.find(s => s.id === editing);
        const { error } = await supabase
          .from('suppliers')
          .update(supplierData)
          .eq('id', editing);

        if (error) throw error;

        await logAction(
          'update_supplier',
          'suppliers',
          editing,
          oldSupplier,
          supplierData
        );

        setEditing(null);
      } else {
        const { data, error } = await supabase
          .from('suppliers')
          .insert(supplierData)
          .select()
          .single();

        if (error) throw error;

        await logAction(
          'create_supplier',
          'suppliers',
          data.id,
          null,
          supplierData
        );

        setShowAdd(false);
      }

      setFormData(emptySupplier);
      await loadSuppliers();
      showNotification('Tiekėjas sėkmingai išsaugotas', 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditing(supplier.id);
    setFormData({
      name: supplier.name,
      code: supplier.code || '',
      vat_code: supplier.vat_code || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptySupplier);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-50 p-2 rounded-lg">
            <Building2 className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Tiekėjai</h2>
            <p className="text-sm text-gray-600">Manage supplier contacts and information</p>
          </div>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Pridėti tiekėją
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Naujas tiekėjas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Tiekėjo pavadinimas *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="Kodas"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <input
              type="text"
              placeholder="PVM kodas"
              value={formData.vat_code}
              onChange={(e) => setFormData({ ...formData, vat_code: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <input
              type="tel"
              placeholder="Telefonas"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />

            <input
              type="email"
              placeholder="El. paštas"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="md:col-span-2 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
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
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Išsaugoti tiekėją
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pavadinimas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kodas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PVM kodas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kontaktai</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-gray-50 transition-colors">
                  {editing === supplier.id ? (
                    <>
                      <td className="px-6 py-4" colSpan={5}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Tiekėjo pavadinimas"
                          />
                          <input
                            type="text"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Kodas"
                          />
                          <input
                            type="text"
                            value={formData.vat_code}
                            onChange={(e) => setFormData({ ...formData, vat_code: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="PVM kodas"
                          />
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="Telefonas"
                          />
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="md:col-span-2 px-4 py-2 border border-gray-300 rounded-lg"
                            placeholder="El. paštas"
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
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-medium text-gray-900">{supplier.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{supplier.code || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{supplier.vat_code || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{supplier.phone || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{supplier.email || ''}</div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
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
      </div>
    </div>
  );
}
