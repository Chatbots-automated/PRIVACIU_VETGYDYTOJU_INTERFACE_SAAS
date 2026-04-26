import { useState, useEffect } from 'react';
import { X, Trash2, Euro, Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { requireClientId } from '../lib/clientHelpers';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  visitData: {
    id: string;
    animal_id: string;
    farm_id: string;
    procedures: string[];
    visit_datetime: string;
  };
  animalName?: string;
  productsUsed?: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    cost_price?: number;
  }>;
}

interface ServiceCharge {
  procedure_type: string;
  unit_price: number;
  description: string;
}

interface ProductCharge {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  cost_price?: number;
}

export function PricingModal({ isOpen, onClose, visitData, animalName = '', productsUsed = [] }: PricingModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [serviceCharges, setServiceCharges] = useState<ServiceCharge[]>([]);
  const [productCharges, setProductCharges] = useState<ProductCharge[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen && visitData) {
      loadDefaultPrices();
      loadProductsUsed();
    }
  }, [isOpen, visitData]);

  const loadDefaultPrices = async () => {
    if (!user) return;
    
    const clientId = requireClientId(user);

    try {
      // Load vet's default service prices
      const { data: prices, error } = await supabase
        .from('service_prices')
        .select('*')
        .eq('client_id', clientId)
        .eq('vet_user_id', user.id)
        .eq('active', true);

      if (error) throw error;

      // Create service charges for each procedure
      const charges: ServiceCharge[] = visitData.procedures.map(proc => {
        const defaultPrice = prices?.find(p => p.procedure_type === proc);
        return {
          procedure_type: proc,
          unit_price: defaultPrice?.base_price || 0,
          description: defaultPrice?.description || ''
        };
      });

      setServiceCharges(charges);
    } catch (error) {
      console.error('Error loading prices:', error);
      // Set charges with zero prices if error
      const charges: ServiceCharge[] = visitData.procedures.map(proc => ({
        procedure_type: proc,
        unit_price: 0,
        description: ''
      }));
      setServiceCharges(charges);
    }
  };

  const loadProductsUsed = () => {
    // Convert productsUsed to productCharges with suggested markup
    const charges: ProductCharge[] = productsUsed.map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      quantity: p.quantity,
      cost_price: p.cost_price || 0,
      unit_price: p.cost_price ? p.cost_price * 1.3 : 0 // 30% markup
    }));
    setProductCharges(charges);
  };

  const updateServiceCharge = (index: number, field: keyof ServiceCharge, value: any) => {
    const updated = [...serviceCharges];
    updated[index] = { ...updated[index], [field]: value };
    setServiceCharges(updated);
  };

  const updateProductCharge = (index: number, field: keyof ProductCharge, value: any) => {
    const updated = [...productCharges];
    updated[index] = { ...updated[index], [field]: value };
    setProductCharges(updated);
  };

  const removeProductCharge = (index: number) => {
    setProductCharges(productCharges.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    // Only count service charges (products are already paid for via warehouse)
    const serviceTotal = serviceCharges.reduce((sum, c) => sum + (c.unit_price || 0), 0);
    return serviceTotal;
  };

  const handleSave = async () => {
    if (!user) return;
    
    setLoading(true);
    const clientId = requireClientId(user);

    try {
      const charges = [];

      // Add ONLY service charges
      // Product costs are already tracked when allocated from warehouse to farm
      for (const service of serviceCharges) {
        if (service.unit_price > 0) {
          charges.push({
            client_id: clientId,
            farm_id: visitData.farm_id,
            visit_id: visitData.id,
            animal_id: visitData.animal_id,
            charge_type: 'paslauga',
            procedure_type: service.procedure_type,
            description: service.description || service.procedure_type,
            quantity: 1,
            unit_price: service.unit_price,
            total_price: service.unit_price,
            invoiced: false
          });
        }
      }

      // NOTE: Product charges are NOT saved!
      // Products are already paid for when allocated from warehouse.
      // We only charge for services (procedures).

      if (charges.length > 0) {
        const { error } = await supabase
          .from('visit_charges')
          .insert(charges);

        if (error) throw error;
      }

      onClose();
    } catch (error) {
      console.error('Error saving charges:', error);
      alert('Klaida išsaugant mokesčius: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Vizito kainodara</h2>
            <p className="text-blue-100 text-sm mt-1">
              Gyvūnas: {animalName} • {new Date(visitData.visit_datetime).toLocaleDateString('lt-LT')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-blue-800 rounded-lg p-2 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Service Charges */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Euro className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Paslaugos</h3>
            </div>
            
            <div className="space-y-3">
              {serviceCharges.map((charge, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Procedūra
                      </label>
                      <input
                        type="text"
                        value={charge.procedure_type}
                        readOnly
                        className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kaina (€)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={charge.unit_price}
                        onChange={(e) => updateServiceCharge(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Aprašymas
                      </label>
                      <input
                        type="text"
                        value={charge.description}
                        onChange={(e) => updateServiceCharge(index, 'description', e.target.value)}
                        placeholder="Papildoma informacija"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Product Information (Read-only, for reference) */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900">Produktai (tik peržiūrai)</h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                Produktų kainos jau įtrauktos paskirstymo metu
              </span>
            </div>
            
            {productCharges.length === 0 ? (
              <p className="text-gray-500 text-sm italic">Produktų nesunaudota</p>
            ) : (
              <div className="space-y-3">
                {productCharges.map((charge, index) => (
                  <div key={index} className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{charge.product_name}</p>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p>Kiekis: <span className="font-semibold">{charge.quantity}</span></p>
                          <p>Savikaina: <span className="font-semibold">€{charge.cost_price.toFixed(2)}/vnt</span></p>
                          <p className="text-xs text-blue-700 mt-2">
                            💡 Produkto kaina jau įtraukta paskirstymo metu iš sandėlio
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total (Services Only) */}
          <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-semibold text-gray-900">Paslaugų suma:</span>
                <p className="text-xs text-gray-600 mt-1">Produktų kainos neįskaičiuotos</p>
              </div>
              <span className="text-2xl font-bold text-blue-600">€{calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
          <button
            onClick={handleSkip}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-md transition-colors"
          >
            Praleisti (įkainoti vėliau)
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
          >
            {loading ? 'Išsaugoma...' : 'Išsaugoti mokesčius'}
          </button>
        </div>
      </div>
    </div>
  );
}
