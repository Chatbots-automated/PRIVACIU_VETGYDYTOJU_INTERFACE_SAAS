import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Unit } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { Droplet, Check } from 'lucide-react';
import { showNotification } from './NotificationToast';

export function Biocides() {
  const { user, logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [usageRecords, setUsageRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    product_id: '',
    batch_id: '',
    use_date: new Date().toISOString().split('T')[0],
    purpose: '',
    work_scope: '',
    qty: '',
    unit: 'l' as Unit,
    used_by_name: user?.full_name || user?.email || '',
  });

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'biocide_usage',
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

    const [productsRes, batchesRes, usageRes] = await Promise.all([
      supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('category', 'biocide').eq('is_active', true),
      supabase.from('stock_by_batch').select(`*, products!inner(name)`).eq('farm_id', selectedFarm.id).eq('products.category', 'biocide').gt('on_hand', 0),
      supabase.from('biocide_usage').select(`*, products(name)`).eq('farm_id', selectedFarm.id).order('use_date', { ascending: false }).limit(10),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (batchesRes.data) setBatches(batchesRes.data);
    if (usageRes.data) setUsageRecords(usageRes.data);
  };

  const getOldestBatchWithStock = async (productId: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('batches')
        .select('id, qty_left, expiry_date')
        .eq('product_id', productId)
        .gt('qty_left', 0)
        .order('expiry_date', { ascending: true });

      if (error) {
        console.error('Error fetching batch stock:', error);
        return '';
      }

      if (data && data.length > 0) {
        // Filter out expired batches
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const validBatch = data.find(batch => {
          if (!batch.expiry_date) return true;
          const expiryDate = new Date(batch.expiry_date);
          return expiryDate >= today;
        });

        return validBatch?.id || '';
      }
      return '';
    } catch (err) {
      console.error('Error getting oldest batch:', err);
      return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      if (!selectedFarm) {
        showNotification('Pasirinkite ūkį', 'error');
        return;
      }

      const { error } = await supabase.from('biocide_usage').insert({
        farm_id: selectedFarm.id,
        product_id: formData.product_id,
        batch_id: formData.batch_id || null,
        use_date: formData.use_date,
        purpose: formData.purpose || null,
        work_scope: formData.work_scope || null,
        qty: parseFloat(formData.qty),
        unit: formData.unit,
        used_by_name: formData.used_by_name || null,
      });

      if (error) throw error;

      await logAction(
        'create_biocide_usage',
        'biocide_usage',
        null,
        null,
        {
          product_id: formData.product_id,
          use_date: formData.use_date,
          qty: formData.qty,
          used_by_name: formData.used_by_name,
        }
      );

      setSuccess(true);
      setFormData({
        product_id: '',
        batch_id: '',
        use_date: new Date().toISOString().split('T')[0],
        purpose: '',
        work_scope: '',
        qty: '',
        unit: 'l',
        used_by_name: user?.full_name || user?.email || '',
      });

      await loadData();
      showNotification('Biocidai sėkmingai naudoti', 'success');
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
          <div className="bg-cyan-50 p-2 rounded-lg">
            <Droplet className="w-6 h-6 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Biocidų naudojimas</h2>
            <p className="text-sm text-gray-600">Registruokite biocidų panaudojimą</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Biocidų panaudojimas sėkmingai užregistruotas!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Naudojimo data *</label>
              <input
                type="date"
                value={formData.use_date}
                onChange={(e) => setFormData({ ...formData, use_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Biocidinis produktas *</label>
              <select
                value={formData.product_id}
                onChange={async (e) => {
                  const productId = e.target.value;
                  if (productId) {
                    const oldestBatchId = await getOldestBatchWithStock(productId);
                    setFormData({ ...formData, product_id: productId, batch_id: oldestBatchId });
                  } else {
                    setFormData({ ...formData, product_id: '', batch_id: '' });
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                required
              >
                <option value="">Pasirinkite produktą...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partija (Nebūtina)</label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                disabled={!formData.product_id}
              >
                <option value="">Pasirinkite partiją...</option>
                {batches.filter(b => b.product_id === formData.product_id).map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    {b.lot || 'N/A'} · Exp: {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString('lt') : 'N/A'} · Likutis: {b.on_hand?.toFixed(2) || '0'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kiekis *</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  required
                />
                <select
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value as Unit })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="ml">ml</option>
                  <option value="l">L</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Paskirtis</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="Dezinfekcija, kenkėjų kontrolė ir t.t."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Darbų apimtis</label>
              <textarea
                value={formData.work_scope}
                onChange={(e) => setFormData({ ...formData, work_scope: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                rows={3}
                placeholder="Aprašykite vietą/atliktus darbus..."
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Naudojo</label>
              <input
                type="text"
                value={formData.used_by_name}
                onChange={(e) => setFormData({ ...formData, used_by_name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                placeholder="Biocidą naudojusio asmens vardas"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-cyan-600 text-white rounded-lg font-medium hover:bg-cyan-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registruojama...' : 'Registruoti panaudojimą'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Paskutiniai panaudojimai</h3>
        <div className="space-y-3">
          {usageRecords.map((record) => (
            <div key={record.id} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-gray-900">{record.products?.name}</p>
                  <p className="text-sm text-gray-600">{record.purpose || 'Nenurodyta paskirtis'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{record.qty} {record.unit}</p>
                  <p className="text-xs text-gray-500">{new Date(record.use_date).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
