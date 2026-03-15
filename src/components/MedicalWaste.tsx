import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Trash2, Check, Package, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { MedicalWasteWithDetails } from '../lib/types';
import { showNotification } from './NotificationToast';

type WasteFilter = 'all' | 'automatic' | 'manual';

export function MedicalWaste() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [records, setRecords] = useState<MedicalWasteWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [wasteFilter, setWasteFilter] = useState<WasteFilter>('all');

  const [formData, setFormData] = useState({
    waste_code: '',
    name: '',
    period: '',
    date: new Date().toISOString().split('T')[0],
    qty_generated: '',
    qty_transferred: '',
    carrier: '',
    processor: '',
    transfer_date: '',
    doc_no: '',
    responsible: '',
  });

  useEffect(() => {
    loadRecords();
  }, []);

  useRealtimeSubscription({
    table: 'medical_waste',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback(async (payload: any) => {
      await loadRecords();

      if (payload.new.auto_generated) {
        const { data: productData } = await supabase
          .from('products')
          .select('name')
          .eq('id', payload.new.source_product_id)
          .maybeSingle();

        const { data: batchData } = await supabase
          .from('batches')
          .select('lot')
          .eq('id', payload.new.source_batch_id)
          .maybeSingle();

        const weight = payload.new.qty_generated ? `${(payload.new.qty_generated / 1000).toFixed(3)} kg` : 'N/A';
        const productName = productData?.name || 'Nežinomas produktas';
        const lotInfo = batchData?.lot ? ` (Partija: ${batchData.lot})` : '';

        showNotification(
          `Automatiškai sukurtas medicininių atliekų įrašas: ${productName}${lotInfo} - ${weight}`,
          'info'
        );
      }
    }, []),
    onUpdate: useCallback(() => {
      loadRecords();
    }, []),
    onDelete: useCallback(() => {
      loadRecords();
    }, []),
  });

  const loadRecords = async () => {
    const { data } = await supabase
      .from('vw_medical_waste_with_details')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) setRecords(data as MedicalWasteWithDetails[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      if (!selectedFarm) {
        alert('Pasirinkite ūkį');
        return;
      }

      const { error } = await supabase.from('medical_waste').insert({
        farm_id: selectedFarm.id,
        waste_code: formData.waste_code,
        name: formData.name,
        period: formData.period || null,
        date: formData.date || null,
        qty_generated: formData.qty_generated ? parseFloat(formData.qty_generated) : null,
        qty_transferred: formData.qty_transferred ? parseFloat(formData.qty_transferred) : null,
        carrier: formData.carrier || null,
        processor: formData.processor || null,
        transfer_date: formData.transfer_date || null,
        doc_no: formData.doc_no || null,
        responsible: formData.responsible || null,
      });

      if (error) throw error;

      await logAction(
        'create_medical_waste',
        'medical_waste',
        null,
        null,
        {
          waste_code: formData.waste_code,
          name: formData.name,
          qty_generated: formData.qty_generated,
          qty_transferred: formData.qty_transferred,
          carrier: formData.carrier,
          transfer_date: formData.transfer_date,
        }
      );

      setSuccess(true);
      setFormData({
        waste_code: '',
        name: '',
        period: '',
        date: new Date().toISOString().split('T')[0],
        qty_generated: '',
        qty_transferred: '',
        carrier: '',
        processor: '',
        transfer_date: '',
        doc_no: '',
        responsible: '',
      });

      setTimeout(() => setSuccess(false), 3000);
      await loadRecords();
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-50 p-2 rounded-lg">
            <Trash2 className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 uppercase">
              Veterinarinių Medicininių Atliekų Susidarymo Apskaitos Žurnalas
            </h2>
            <p className="text-xs text-gray-600 mt-1">Oficialus veterinarinių medicininių atliekų registras pagal LR reikalavimus</p>
          </div>
        </div>

        <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium mb-1">Automatinis atliekų registravimas</p>
          <p className="text-xs text-blue-700">
            Sistema automatiškai užregistruoja medicininių atliekų susidarymą kai naudojami vaistai per apsilankymus.
            Šią formą naudokite tik rankiniam atliekų registravimui (pvz., pernešant atliekas tvarkymo įmonei).
          </p>
        </div>

        {success && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Atliekų įrašas sėkmingai užregistruotas!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Basic Information */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Atliekų identifikavimas</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Veterinarinių medicininių atliekų kodas *
                </label>
                <input
                  type="text"
                  value={formData.waste_code}
                  onChange={(e) => setFormData({ ...formData, waste_code: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Pvz.: 18 02 02"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">18 02 02 - Nepavojingos atliekos, 18 02 01 - Aštrūs daiktai</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Veterinarinių medicininių atliekų pavadinimas *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Atliekų aprašymas"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Generation Information */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Atliekų susidarymo informacija</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Veterinarinių medicininių atliekų susidarymo periodas
                </label>
                <input
                  type="text"
                  value={formData.period}
                  onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="2025 K1, Sausis, ir t.t."
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Veterinarinių medicininių atliekų susidarymo data
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Veterinarinių medicininių atliekų kiekis (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.qty_generated}
                  onChange={(e) => setFormData({ ...formData, qty_generated: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="0.000"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Transfer Information */}
          <div className="border-b border-gray-200 pb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Atliekų perdavimo informacija</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Perduotas veterinarinių medicininių atliekų kiekis (kg)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.qty_transferred}
                  onChange={(e) => setFormData({ ...formData, qty_transferred: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="0.000"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Veterinarinių medicininių atliekų perdavimo data
                </label>
                <input
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Atliekų vežėjas, kuriam perduotos veterinarinės medicininės atliekos
                </label>
                <input
                  type="text"
                  value={formData.carrier}
                  onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Įmonės pavadinimas"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Atliekų tvarkytojas, kuris tvarkys veterinarines medicinines atliekas
                </label>
                <input
                  type="text"
                  value={formData.processor}
                  onChange={(e) => setFormData({ ...formData, processor: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Įmonės pavadinimas"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Atliekų perdavimą patvirtinančio dokumento numeris ir data
                </label>
                <input
                  type="text"
                  value={formData.doc_no}
                  onChange={(e) => setFormData({ ...formData, doc_no: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                  placeholder="Pvz.: Nr. A123456, 2025-01-15"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Responsible Person */}
          <div className="pb-2">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase">Atsakingas asmuo</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Veterinarinių medicininių atliekų darytojo atsakingo asmens v. pavardė ir parašas
              </label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-sm"
                placeholder="Vardas Pavardė"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Registruojama...' : 'Registruoti atliekų įrašą'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 uppercase">Registruotų atliekų žurnalas</h3>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={wasteFilter}
              onChange={(e) => setWasteFilter(e.target.value as WasteFilter)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-red-500"
            >
              <option value="all">Visi įrašai</option>
              <option value="automatic">Tik automatiniai</option>
              <option value="manual">Tik rankiniai</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-300">
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Kodas</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Pavadinimas</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Periodas / Data</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 border-r border-gray-300">Kiekis (kg)</th>
                <th className="px-3 py-2 text-right font-semibold text-gray-700 border-r border-gray-300">Perduota (kg)</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Vežėjas</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Tvarkytojas</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Perdavimo data</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700 border-r border-gray-300">Dok. nr.</th>
                <th className="px-3 py-2 text-left font-semibold text-gray-700">Atsakingas</th>
              </tr>
            </thead>
            <tbody>
              {records
                .filter(record => {
                  if (wasteFilter === 'all') return true;
                  return record.source_type === wasteFilter;
                })
                .map((record) => (
                  <tr
                    key={record.id}
                    className={`border-b border-gray-200 hover:bg-gray-50 ${
                      record.auto_generated ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <td className="px-3 py-3 border-r border-gray-200">
                      <div className="flex items-center gap-1">
                        <span className="font-mono">{record.waste_code}</span>
                        {record.auto_generated && (
                          <Package className="w-3 h-3 text-blue-600" title="Automatinis" />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200">
                      <div>
                        <div className="font-medium">{record.name}</div>
                        {record.auto_generated && record.product_name && (
                          <div className="text-blue-700 mt-0.5">
                            {record.product_name}
                            {record.batch_lot && <span className="text-gray-600"> ({record.batch_lot})</span>}
                          </div>
                        )}
                        {record.package_count && (
                          <div className="text-gray-600 mt-0.5">{record.package_count} pakuotės</div>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200">
                      {record.period && <div>{record.period}</div>}
                      {record.date && <div className="text-gray-600">{new Date(record.date).toLocaleDateString('lt-LT')}</div>}
                      {record.auto_generated_at && (
                        <div className="text-blue-600 text-[10px] mt-0.5">
                          Auto: {new Date(record.auto_generated_at).toLocaleDateString('lt-LT')}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right border-r border-gray-200 font-mono">
                      {record.qty_generated ? `${(record.qty_generated / 1000).toFixed(3)}` : '-'}
                    </td>
                    <td className="px-3 py-3 text-right border-r border-gray-200 font-mono">
                      {record.qty_transferred ? `${(record.qty_transferred / 1000).toFixed(3)}` : '-'}
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200">{record.carrier || '-'}</td>
                    <td className="px-3 py-3 border-r border-gray-200">{record.processor || '-'}</td>
                    <td className="px-3 py-3 border-r border-gray-200">
                      {record.transfer_date ? new Date(record.transfer_date).toLocaleDateString('lt-LT') : '-'}
                    </td>
                    <td className="px-3 py-3 border-r border-gray-200">{record.doc_no || '-'}</td>
                    <td className="px-3 py-3">{record.responsible || '-'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {records.filter(record => {
            if (wasteFilter === 'all') return true;
            return record.source_type === wasteFilter;
          }).length === 0 && (
            <div className="text-center py-8 text-gray-500 text-sm">
              Atliekų įrašų nerasta
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
