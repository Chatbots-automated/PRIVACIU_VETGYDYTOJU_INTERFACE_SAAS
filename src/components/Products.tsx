import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, ProductCategory, Unit } from '../lib/types';
import { normalizeNumberInput, sortByLithuanian } from '../lib/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { Plus, Edit2, Save, X, Pill, AlertTriangle } from 'lucide-react';
import { getSubcategories, getNestedSubcategories, hasSubcategories, hasNestedSubcategories } from '../lib/categoryHierarchy';
import { showNotification } from './NotificationToast';

export function Products() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const emptyProduct = {
    name: '',
    category: 'medicines' as ProductCategory,
    subcategory: '',
    subcategory_2: '',
    primary_pack_unit: 'ml' as Unit,
    primary_pack_size: '',
    package_weight_g: '',
    active_substance: '',
    withdrawal_days_meat: '0',
    withdrawal_days_milk: '0',
    dosage_notes: '',
  };

  const [formData, setFormData] = useState(emptyProduct);

  useEffect(() => {
    loadProducts();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'products',
    filter: selectedFarm ? `farm_id=eq.${selectedFarm.id}` : undefined,
    enabled: !!selectedFarm,
    onInsert: useCallback((payload) => {
      setProducts(prev => sortByLithuanian([...prev, payload.new], 'name'));
    }, []),
    onUpdate: useCallback((payload) => {
      setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
    }, []),
    onDelete: useCallback((payload) => {
      setProducts(prev => prev.filter(p => p.id !== payload.old.id));
    }, []),
  });

  const loadProducts = async () => {
    try {
      if (!selectedFarm) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('farm_id', selectedFarm.id);

      if (error) throw error;
      // Sort by Lithuanian alphabet
      const sortedData = sortByLithuanian(data || [], 'name');
      setProducts(sortedData);
    } catch (error) {
      console.error('Error loading products:', error);
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

      const productData = {
        farm_id: selectedFarm.id,
        name: formData.name,
        category: formData.category,
        subcategory: formData.subcategory || null,
        subcategory_2: formData.subcategory_2 || null,
        primary_pack_unit: formData.primary_pack_unit,
        primary_pack_size: formData.primary_pack_size ? parseFloat(formData.primary_pack_size) : null,
        package_weight_g: formData.package_weight_g ? parseFloat(formData.package_weight_g) : null,
        active_substance: formData.active_substance || null,
        withdrawal_days_meat: (['medicines', 'svirkstukai'].includes(formData.category) && formData.withdrawal_days_meat) ? parseInt(formData.withdrawal_days_meat) : null,
        withdrawal_days_milk: (['medicines', 'svirkstukai'].includes(formData.category) && formData.withdrawal_days_milk) ? parseInt(formData.withdrawal_days_milk) : null,
        dosage_notes: formData.dosage_notes || null,
        is_active: true,
      };

      if (editing) {
        const oldProduct = products.find(p => p.id === editing);
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editing);

        if (error) throw error;

        await logAction(
          'update_product',
          'products',
          editing,
          oldProduct,
          productData
        );

        setEditing(null);
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (error) throw error;

        await logAction(
          'create_product',
          'products',
          data.id,
          null,
          productData
        );

        setShowAdd(false);
      }

      setFormData(emptyProduct);
      await loadProducts();
      showNotification('Produktas sėkmingai išsaugotas', 'success');
    } catch (error: any) {
      showNotification('Klaida: ' + error.message, 'error');
    }
  };

  const handleEdit = (product: Product) => {
    setEditing(product.id);
    setFormData({
      name: product.name,
      category: product.category,
      primary_pack_unit: product.primary_pack_unit,
      primary_pack_size: product.primary_pack_size?.toString() || '',
      package_weight_g: product.package_weight_g?.toString() || '',
      active_substance: product.active_substance || '',
      withdrawal_days_meat: product.withdrawal_days_meat?.toString() || '',
      withdrawal_days_milk: product.withdrawal_days_milk?.toString() || '',
      dosage_notes: product.dosage_notes || '',
    });
  };

  const handleCancel = () => {
    setEditing(null);
    setShowAdd(false);
    setFormData(emptyProduct);
  };

  const formFields = useMemo(() => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pavadinimas *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Produkto pavadinimas"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategorija *
          </label>
          <select
            value={formData.category}
            onChange={(e) => {
              const newCategory = e.target.value as ProductCategory;
              setFormData({
                ...formData,
                category: newCategory,
                subcategory: '',
                subcategory_2: '',
                primary_pack_unit: newCategory === 'svirkstukai' ? 'syringe' : formData.primary_pack_unit,
                withdrawal_days_meat: newCategory === 'medicines' ? '0' : formData.withdrawal_days_meat,
                withdrawal_days_milk: newCategory === 'medicines' ? '0' : formData.withdrawal_days_milk,
              });
            }}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="medicines">Vaistai</option>
            <option value="prevention">Prevencija</option>
            <option value="vakcina">Vakcina</option>
            <option value="bolusas">Bolusas</option>
            <option value="svirkstukai">Švirkštukai</option>
            <option value="hygiene">Higiena</option>
            <option value="biocide">Biocidas</option>
            <option value="technical">Techniniai</option>
            <option value="treatment_materials">Gydymo medžiagos</option>
            <option value="reproduction">Reprodukcija</option>
          </select>
        </div>

        {hasSubcategories(formData.category) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subkategorija
            </label>
            <select
              value={formData.subcategory}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  subcategory: e.target.value,
                  subcategory_2: '',
                });
              }}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pasirinkite subkategoriją</option>
              {getSubcategories(formData.category).map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}

        {formData.subcategory && hasNestedSubcategories(formData.category, formData.subcategory) && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detali subkategorija
            </label>
            <select
              value={formData.subcategory_2}
              onChange={(e) => setFormData({ ...formData, subcategory_2: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Pasirinkite detalią subkategoriją</option>
              {getNestedSubcategories(formData.category, formData.subcategory).map(sub2 => (
                <option key={sub2} value={sub2}>{sub2}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pakuotės dydis
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.primary_pack_size}
            onChange={(e) => setFormData({ ...formData, primary_pack_size: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="100"
          />
          <p className="text-xs text-gray-500 mt-1">Standartinės pakuotės dydis</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Vienetas
          </label>
          <select
            value={formData.primary_pack_unit}
            onChange={(e) => setFormData({ ...formData, primary_pack_unit: e.target.value as Unit })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={formData.category === 'svirkstukai'}
          >
            <option value="ml">ml</option>
            <option value="l">L</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="vnt">vnt</option>
            <option value="tabletkė">tabletkė</option>
            <option value="bolus">bolus</option>
            <option value="syringe">syringe</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
            Pakuotės svoris (tuščios)
            <span className="text-xs text-gray-500 font-normal">g</span>
          </label>
          <input
            type="number"
            step="0.1"
            value={formData.package_weight_g}
            onChange={(e) => setFormData({ ...formData, package_weight_g: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="pvz., 45.5"
          />
          <p className="text-xs text-gray-500 mt-1">
            Tuščios pakuotės svoris gramais. Automatiškai sukuriamas medicininių atliekų įrašas kai visas paketas panaudotas.
          </p>
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Veiklioji medžiaga
          </label>
          <input
            type="text"
            value={formData.active_substance}
            onChange={(e) => setFormData({ ...formData, active_substance: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Pvz: Penicilinas"
          />
        </div>

        {(formData.category === 'medicines' || formData.category === 'svirkstukai') && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  Karencija: Mėsa (dienų) *
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                </span>
              </label>
              <input
                type="number"
                value={formData.withdrawal_days_meat}
                onChange={(e) => setFormData({ ...formData, withdrawal_days_meat: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-amber-50"
                placeholder="7"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  Karencija: Pienas (dienų) *
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                </span>
              </label>
              <input
                type="number"
                value={formData.withdrawal_days_milk}
                onChange={(e) => setFormData({ ...formData, withdrawal_days_milk: e.target.value })}
                className="w-full px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50"
                placeholder="5"
              />
            </div>
          </>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dozavimo pastabos
          </label>
          <textarea
            value={formData.dosage_notes}
            onChange={(e) => setFormData({ ...formData, dosage_notes: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Papildomos dozavimo instrukcijos..."
            rows={3}
          />
        </div>
      </div>

      {formData.category === 'medicines' && (
        <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900 mb-1">
                Karencijos dienų nurodymas yra privalomas vaistams!
              </p>
              <p className="text-xs text-amber-700">
                Šie duomenys naudojami apskaičiuoti gyvulių gydymo periodo pabaigą ir užtikrinti maisto saugą.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end">
        <button
          onClick={handleCancel}
          className="flex items-center gap-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
        >
          <X className="w-4 h-4" />
          Atšaukti
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
        >
          <Save className="w-4 h-4" />
          Išsaugoti
        </button>
      </div>
    </div>
  ), [formData, handleSave, handleCancel]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Pill className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-bold text-gray-900">Produktai</h2>
        </div>
        {!showAdd && !editing && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Naujas
          </button>
        )}
      </div>

      {showAdd && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Naujas produktas</h3>
          {formFields}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Pavadinimas</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Kategorija</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Pakuotė</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">V. medžiaga</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Karencija</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Veiksmai</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {products.map((product) => (
              editing === product.id ? (
                <tr key={product.id} className="bg-amber-50">
                  <td colSpan={6} className="px-3 py-3">
                    {formFields}
                  </td>
                </tr>
              ) : (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-900">{product.name}</td>
                  <td className="px-3 py-2 text-gray-600">
                    {product.category === 'medicines' && 'Vaistai'}
                    {product.category === 'prevention' && 'Prevencija'}
                    {product.category === 'vakcina' && 'Vakcina'}
                    {product.category === 'bolusas' && 'Bolusas'}
                    {product.category === 'svirkstukai' && 'Švirkštukai'}
                    {product.category === 'hygiene' && 'Higiena'}
                    {product.category === 'biocide' && 'Biocidas'}
                    {product.category === 'technical' && 'Techniniai'}
                    {product.category === 'treatment_materials' && 'Gydymo medž.'}
                    {product.category === 'reproduction' && 'Reprodukcija'}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {product.primary_pack_size} {product.primary_pack_unit}
                  </td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{product.active_substance || '-'}</td>
                  <td className="px-3 py-2">
                    {(product.category === 'medicines' || product.category === 'svirkstukai') ? (
                      <div className="flex gap-1 text-xs">
                        {product.withdrawal_days_meat !== null && product.withdrawal_days_meat !== undefined && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded font-medium">
                            🥩 {product.withdrawal_days_meat}d
                          </span>
                        )}
                        {product.withdrawal_days_milk !== null && product.withdrawal_days_milk !== undefined && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            🥛 {product.withdrawal_days_milk}d
                          </span>
                        )}
                        {(product.withdrawal_days_meat === null || product.withdrawal_days_meat === undefined) &&
                         (product.withdrawal_days_milk === null || product.withdrawal_days_milk === undefined) && (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                      title="Redaguoti"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            ))}
          </tbody>
        </table>
      </div>

      {products.some(p => p.category === 'medicines') && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 flex items-start gap-2 text-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900">⚠️ SVARBU: Karencinės dienos</p>
            <p className="text-amber-800 text-xs mt-1">
              <strong>Vaistams (medicines)</strong> būtina nurodyti karencines dienas:<br/>
              • <strong className="text-red-700">🥩 Mėsa</strong> - kiek dienų negalima skerdžiati ir parduoti mėsos<br/>
              • <strong className="text-blue-700">🥛 Pienas</strong> - kiek dienų negalima melžti ir parduoti pieno<br/>
              Sistema automatiškai blokuos veiksmus, jei karencija dar nepasibaigusi.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
