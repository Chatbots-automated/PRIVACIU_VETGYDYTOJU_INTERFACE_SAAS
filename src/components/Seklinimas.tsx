import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFarm } from '../contexts/FarmContext';
import {
  Heart,
  Package,
  FileText,
  BarChart3,
  Search,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Trash2,
  Check,
  X
} from 'lucide-react';
import {
  InseminationRecord,
  InseminationProduct,
  InseminationInventory
} from '../lib/types';
import { formatAnimalDisplay } from '../lib/helpers';

type Tab = 'records' | 'inventory' | 'products' | 'analytics';

export function Seklinimas() {
  const { selectedFarm } = useFarm();
  const [activeTab, setActiveTab] = useState<Tab>('records');
  const [records, setRecords] = useState<InseminationRecord[]>([]);
  const [inventory, setInventory] = useState<InseminationInventory[]>([]);
  const [products, setProducts] = useState<InseminationProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [showReceiveStockForm, setShowReceiveStockForm] = useState(false);
  const [productFormData, setProductFormData] = useState({
    name: '',
    product_type: 'SPERM',
    supplier_group: '',
    unit: 'vnt',
    price: 0,
  });
  const [stockFormData, setStockFormData] = useState({
    product_id: '',
    quantity: 0,
    batch_number: '',
    expiry_date: '',
    notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedFarm, activeTab]);

  useEffect(() => {
    if (showReceiveStockForm) {
      loadProducts();
    }
  }, [showReceiveStockForm]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'records') {
        await loadRecords();
      } else if (activeTab === 'inventory') {
        await loadInventory();
      } else if (activeTab === 'products') {
        await loadProducts();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecords = async () => {
    if (!selectedFarm) return;

    const { data } = await supabase
      .from('insemination_records')
      .select(`
        *,
        animal:animals(*),
        sperm_product:insemination_products!insemination_records_sperm_product_id_fkey(*),
        glove_product:insemination_products!insemination_records_glove_product_id_fkey(*)
      `)
      .eq('farm_id', selectedFarm.id)
      .order('insemination_date', { ascending: false });

    if (data) setRecords(data as any);
  };

  const loadInventory = async () => {
    if (!selectedFarm) return;

    const { data } = await supabase
      .from('insemination_inventory')
      .select(`
        *,
        product:insemination_products(*)
      `)
      .eq('farm_id', selectedFarm.id)
      .order('expiry_date', { ascending: true });

    if (data) setInventory(data as any);
  };

  const loadProducts = async () => {
    if (!selectedFarm) return;

    const { data } = await supabase
      .from('insemination_products')
      .select('*')
      .eq('farm_id', selectedFarm.id)
      .eq('is_active', true)
      .order('product_type')
      .order('name');

    if (data) setProducts(data);
  };

  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!selectedFarm) {
        alert('Pasirinkite ūkį');
        return;
      }

      const { error } = await supabase.from('insemination_products').insert({
        farm_id: selectedFarm.id,
        name: productFormData.name,
        product_type: productFormData.product_type,
        supplier_group: productFormData.supplier_group,
        unit: productFormData.unit,
        price: productFormData.price,
        is_active: true,
      });

      if (error) throw error;

      setShowNewProductForm(false);
      setProductFormData({
        name: '',
        product_type: 'SPERM',
        supplier_group: '',
        unit: 'vnt',
        price: 0,
      });

      await loadProducts();
      alert('Produktas sėkmingai sukurtas!');
    } catch (error) {
      console.error('Error creating product:', error);
      alert('Klaida kuriant produktą');
    }
  };

  const handleSubmitReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase.from('insemination_inventory').insert({
        product_id: stockFormData.product_id,
        quantity: stockFormData.quantity,
        batch_number: stockFormData.batch_number || null,
        expiry_date: stockFormData.expiry_date || null,
        notes: stockFormData.notes || null,
      });

      if (error) throw error;

      setShowReceiveStockForm(false);
      setStockFormData({
        product_id: '',
        quantity: 0,
        batch_number: '',
        expiry_date: '',
        notes: '',
      });

      await loadInventory();
      alert('Atsargos sėkmingai priimtos!');
    } catch (error) {
      console.error('Error receiving stock:', error);
      alert('Klaida priimant atsargas');
    }
  };

  const handleDeleteInsemination = async (recordId: string, animalId: string, syncStepId: string | null) => {
    if (!confirm('Ar tikrai norite ištrinti šį sėklinimo įrašą? Visa susijusi informacija bus ištrinta.')) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('insemination_records')
        .delete()
        .eq('id', recordId);

      if (deleteError) throw deleteError;

      if (syncStepId) {
        const { data: syncData } = await supabase
          .from('synchronization_steps')
          .select('synchronization_id')
          .eq('id', syncStepId)
          .single();

        if (syncData) {
          const { data: step6 } = await supabase
            .from('synchronization_steps')
            .select('id')
            .eq('synchronization_id', syncData.synchronization_id)
            .eq('step_number', 6)
            .single();

          if (step6) {
            const { data: allSteps } = await supabase
              .from('synchronization_steps')
              .select('id, step_number')
              .eq('synchronization_id', syncData.synchronization_id)
              .gt('step_number', 6)
              .order('step_number');

            if (allSteps) {
              for (const step of allSteps) {
                await supabase
                  .from('synchronization_steps')
                  .update({ completed: false, completed_at: null })
                  .eq('id', step.id);
              }
            }
          }
        }
      }

      await loadRecords();
      alert('Sėklinimo įrašas sėkmingai ištrintas!');
    } catch (error) {
      console.error('Error deleting insemination:', error);
      alert('Klaida trinant įrašą');
    }
  };

  const handleUpdatePregnancyStatus = async (recordId: string, confirmed: boolean) => {
    try {
      const { error } = await supabase
        .from('insemination_records')
        .update({
          pregnancy_confirmed: confirmed,
          pregnancy_check_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', recordId);

      if (error) throw error;

      await loadRecords();
      alert(`Nėštumas ${confirmed ? 'patvirtintas' : 'nepatvirtintas'}!`);
    } catch (error) {
      console.error('Error updating pregnancy status:', error);
      alert('Klaida atnaujinant nėštumo statusą');
    }
  };

  const getPregnancyStatusBadge = (record: InseminationRecord) => {
    if (record.pregnancy_confirmed === true) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Patvirtinta
        </span>
      );
    } else if (record.pregnancy_confirmed === false) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="w-3 h-3 mr-1" />
          Nepatvirtinta
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          <Clock className="w-3 h-3 mr-1" />
          Laukiama
        </span>
      );
    }
  };

  const renderRecords = () => {
    const filteredRecords = records.filter(r =>
      r.animal && (
        formatAnimalDisplay(r.animal).toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sperm_product?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti pagal gyvūną ar spermą..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gyvūnas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sperma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kiekis
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nėštumas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Veiksmai
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Sėklinimo įrašų nerasta
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.insemination_date).toLocaleDateString('lt-LT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.animal ? formatAnimalDisplay(record.animal) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {record.sperm_product?.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {record.sperm_quantity} {record.sperm_product?.unit || 'vnt'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getPregnancyStatusBadge(record)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {record.pregnancy_confirmed === null && (
                          <>
                            <button
                              onClick={() => handleUpdatePregnancyStatus(record.id, true)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Patvirtinti nėštumą"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUpdatePregnancyStatus(record.id, false)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Nepatvirtinti nėštumo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteInsemination(record.id, record.animal_id, record.sync_step_id || null)}
                          className="p-1.5 text-gray-600 hover:bg-gray-100 hover:text-red-600 rounded transition-colors"
                          title="Ištrinti"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderInventory = () => {
    const filteredInventory = inventory.filter(inv =>
      inv.product?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Ieškoti produkto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
            />
          </div>
          <button
            onClick={() => setShowReceiveStockForm(true)}
            className="ml-4 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Priimti atsargas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((inv) => {
            const isLowStock = inv.quantity < 5;
            const isExpiringSoon = inv.expiry_date &&
              new Date(inv.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            return (
              <div key={inv.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-rose-500">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{inv.product?.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {inv.product?.product_type === 'SPERM' ? 'Sperma' : 'Pirštinės'}
                    </p>
                  </div>
                  {(isLowStock || isExpiringSoon) && (
                    <AlertTriangle className={`w-5 h-5 ${isExpiringSoon ? 'text-red-500' : 'text-yellow-500'}`} />
                  )}
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Kiekis:</span>
                    <span className={`font-medium ${isLowStock ? 'text-yellow-600' : 'text-gray-900'}`}>
                      {inv.quantity} {inv.product?.unit}
                    </span>
                  </div>
                  {inv.batch_number && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Partija:</span>
                      <span className="text-gray-900">{inv.batch_number}</span>
                    </div>
                  )}
                  {inv.expiry_date && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Galioja iki:</span>
                      <span className={`${isExpiringSoon ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                        {new Date(inv.expiry_date).toLocaleDateString('lt-LT')}
                      </span>
                    </div>
                  )}
                </div>

                {isLowStock && (
                  <div className="mt-3 text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                    Mažos atsargos
                  </div>
                )}
                {isExpiringSoon && (
                  <div className="mt-3 text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
                    Baigiasi galiojimas
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderProducts = () => {
    const spermProducts = products.filter(p => p.product_type === 'SPERM');
    const gloveProducts = products.filter(p => p.product_type === 'GLOVES');

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Produktų sąrašas</h3>
          <button
            onClick={() => setShowNewProductForm(true)}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Pridėti produktą
          </button>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Sperma ({spermProducts.length})</h4>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pavadinimas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiekėjas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vienetas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kaina</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {spermProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.supplier_group}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.price ? `${product.price.toFixed(2)} EUR` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Pirštinės ({gloveProducts.length})</h4>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pavadinimas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tiekėjas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vienetas</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kaina</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gloveProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.supplier_group}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{product.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.price ? `${product.price.toFixed(2)} EUR` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAnalytics = () => {
    const totalInseminations = records.length;
    const confirmedPregnancies = records.filter(r => r.pregnancy_confirmed === true).length;
    const pendingConfirmations = records.filter(r => r.pregnancy_confirmed === null).length;
    const successRate = totalInseminations > 0
      ? ((confirmedPregnancies / totalInseminations) * 100).toFixed(1)
      : '0';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Viso sėklinimų</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalInseminations}</p>
              </div>
              <Heart className="w-8 h-8 text-rose-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Patvirtinti nėštumai</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{confirmedPregnancies}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sėkmės rodiklis</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{successRate}%</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Laukiama patvirtinimo</p>
                <p className="text-2xl font-bold text-gray-600 mt-1">{pendingConfirmations}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Statistika pagal spermą</h3>
          <p className="text-gray-500">Analizė bus parodyti po tiesioginės migracijų pritaikymo</p>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'records' as Tab, label: 'Įrašai', icon: FileText },
    { id: 'inventory' as Tab, label: 'Atsargos', icon: Package },
    { id: 'products' as Tab, label: 'Produktai', icon: Heart },
    { id: 'analytics' as Tab, label: 'Analitika', icon: BarChart3 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sėklinimas</h1>
          <p className="text-gray-600 mt-1">Dirbtinio apsėklinimo valdymas ir statistika</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchTerm('');
                }}
                className={`
                  flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors
                  ${activeTab === tab.id
                    ? 'border-rose-500 text-rose-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose-600"></div>
        </div>
      ) : (
        <div>
          {activeTab === 'records' && renderRecords()}
          {activeTab === 'inventory' && renderInventory()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'analytics' && renderAnalytics()}
        </div>
      )}

      {showNewProductForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-rose-50 to-pink-50">
              <h3 className="text-2xl font-semibold text-gray-900">Naujas produktas</h3>
              <p className="text-sm text-gray-600 mt-1">Pridėkite naują spermos ar pirštinių produktą</p>
            </div>

            <form onSubmit={handleSubmitNewProduct} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pavadinimas *
                  </label>
                  <input
                    type="text"
                    required
                    value={productFormData.name}
                    onChange={(e) => setProductFormData({ ...productFormData, name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                    placeholder="Pvz: HO XYZ 123456 arba Pirštinės uždengiančios petį"
                  />
                  <p className="text-xs text-gray-500 mt-1">Įveskite pilną produkto pavadinimą</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipas *
                  </label>
                  <select
                    required
                    value={productFormData.product_type}
                    onChange={(e) => setProductFormData({ ...productFormData, product_type: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white transition-colors"
                  >
                    <option value="SPERM">Sperma</option>
                    <option value="GLOVES">Pirštinės</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tiekėjas
                  </label>
                  <input
                    type="text"
                    value={productFormData.supplier_group}
                    onChange={(e) => setProductFormData({ ...productFormData, supplier_group: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                    placeholder="Pvz: VikingGenetics"
                    list="supplier-suggestions"
                  />
                  <datalist id="supplier-suggestions">
                    <option value="PASARU GRUPE" />
                    <option value="VikingGenetics" />
                    <option value="CRV" />
                    <option value="Semex" />
                    <option value="ABS Global" />
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vienetas *
                  </label>
                  <select
                    required
                    value={productFormData.unit}
                    onChange={(e) => setProductFormData({ ...productFormData, unit: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 bg-white transition-colors"
                  >
                    <option value="vnt">vnt (vienetai)</option>
                    <option value="ml">ml (mililitrai)</option>
                    <option value="pak">pak (pakuotė)</option>
                    <option value="doz">doz (dozė)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Kaina už vienetą (€) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={productFormData.price}
                      onChange={(e) => setProductFormData({ ...productFormData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-rose-500 transition-colors"
                      placeholder="0.00"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Įveskite kainą už vieną vienetą</p>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNewProductForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-rose-600 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-rose-700 hover:to-pink-700 font-medium transition-all shadow-lg shadow-rose-500/30"
                >
                  Sukurti produktą
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceiveStockForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Priimti atsargas</h3>
              <form onSubmit={handleSubmitReceiveStock} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Produktas *
                  </label>
                  <select
                    required
                    value={stockFormData.product_id}
                    onChange={(e) => setStockFormData({ ...stockFormData, product_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="">Pasirinkite produktą</option>
                    {products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} ({product.product_type === 'SPERM' ? 'Sperma' : 'Pirštinės'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kiekis *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    value={stockFormData.quantity}
                    onChange={(e) => setStockFormData({ ...stockFormData, quantity: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partijos numeris
                  </label>
                  <input
                    type="text"
                    value={stockFormData.batch_number}
                    onChange={(e) => setStockFormData({ ...stockFormData, batch_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="Pvz: BATCH-2024-001"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Galiojimo data
                  </label>
                  <input
                    type="date"
                    value={stockFormData.expiry_date}
                    onChange={(e) => setStockFormData({ ...stockFormData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pastabos
                  </label>
                  <textarea
                    value={stockFormData.notes}
                    onChange={(e) => setStockFormData({ ...stockFormData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                    placeholder="Papildoma informacija..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-rose-600 text-white px-4 py-2 rounded-lg hover:bg-rose-700 font-medium"
                  >
                    Priimti atsargas
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowReceiveStockForm(false)}
                    className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
                  >
                    Atšaukti
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
