import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Building2, ArrowRight, Calendar, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';
import { SearchableSelect } from './SearchableSelect';
import { useAuth } from '../contexts/AuthContext';
import { requireClientId } from '../lib/clientHelpers';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  supplier_name: string;
  supplier_code: string;
  currency: string;
  total_gross: number;
  total_net: number;
  total_vat: number;
  farm_id: string | null;
}

interface InvoiceItem {
  id: string;
  line_no: number;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_percent: number | null;
  product?: {
    name: string;
    category: string;
  };
}

interface Farm {
  id: string;
  name: string;
  code: string;
}

export function InvoiceAllocation() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<string>('');
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [invoicesRes, farmsRes] = await Promise.all([
        supabase
          .from('invoices')
          .select('*')
          .is('farm_id', null) // Only unassigned invoices
          .order('invoice_date', { ascending: false }),
        supabase
          .from('farms')
          .select('id, name, code')
          .eq('is_active', true)
          .order('name'),
      ]);

      if (invoicesRes.error) throw invoicesRes.error;
      if (farmsRes.error) throw farmsRes.error;

      setInvoices(invoicesRes.data || []);
      setFarms(farmsRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceItems = async (invoiceId: string) => {
    setLoadingItems(true);
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          id,
          line_no,
          description,
          quantity,
          unit_price,
          total_price,
          discount_percent,
          product:products(name, category)
        `)
        .eq('invoice_id', invoiceId)
        .order('line_no');

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (error) {
      console.error('Error loading invoice items:', error);
      setInvoiceItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  useEffect(() => {
    if (selectedInvoice) {
      loadInvoiceItems(selectedInvoice);
    } else {
      setInvoiceItems([]);
    }
  }, [selectedInvoice]);

  const handleAssignInvoice = async () => {
    if (!selectedInvoice || !selectedFarm) {
      alert('Pasirinkite sąskaitą ir ūkį');
      return;
    }

    const invoice = invoices.find(inv => inv.id === selectedInvoice);
    const farm = farms.find(f => f.id === selectedFarm);

    if (!invoice || !farm) return;

    const confirmed = confirm(
      `Ar tikrai norite priskirti sąskaitą #${invoice.invoice_number} ūkiui "${farm.name}"?\n\n` +
      `Visi produktai bus perkelti į ūkio atsargas.`
    );

    if (!confirmed) return;

    try {
      const clientId = requireClientId(user);
      
      // 1. Update invoice to assign to farm
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ farm_id: selectedFarm })
        .eq('id', selectedInvoice);

      if (invoiceError) throw invoiceError;

      // 2. Get all invoice items (including supplier services without warehouse batches)
      const { data: allInvoiceItems, error: itemsError } = await supabase
        .from('invoice_items')
        .select('*, products(name, category, primary_pack_unit)')
        .eq('invoice_id', selectedInvoice);

      if (itemsError) throw itemsError;

      // 3. Move warehouse batches to farm batches
      const { data: warehouseBatches, error: batchesError } = await supabase
        .from('warehouse_batches')
        .select('*, invoice_items!inner(invoice_id)')
        .eq('invoice_items.invoice_id', selectedInvoice);

      if (batchesError) throw batchesError;

      if (warehouseBatches && warehouseBatches.length > 0) {
        // Create farm batches from warehouse batches
        const farmBatches = warehouseBatches.map(batch => ({
          client_id: clientId,
          farm_id: selectedFarm,
          product_id: batch.product_id,
          lot: batch.lot,
          mfg_date: batch.mfg_date,
          expiry_date: batch.expiry_date,
          qty_received: batch.received_qty,
          package_size: batch.package_size,
          package_count: batch.package_count,
          purchase_price: batch.purchase_price,
          currency: batch.currency,
          supplier_id: batch.supplier_id,
          doc_title: batch.doc_title,
          doc_number: batch.doc_number,
          doc_date: batch.doc_date,
          invoice_id: selectedInvoice,
        }));

        const { data: newFarmBatches, error: farmBatchError } = await supabase
          .from('batches')
          .insert(farmBatches)
          .select();

        if (farmBatchError) throw farmBatchError;

        // Update invoice_items to link to new farm batches
        if (newFarmBatches) {
          for (let i = 0; i < warehouseBatches.length; i++) {
            const oldBatch = warehouseBatches[i];
            const newBatch = newFarmBatches[i];

            await supabase
              .from('invoice_items')
              .update({ 
                batch_id: newBatch.id,
                warehouse_batch_id: null 
              })
              .eq('warehouse_batch_id', oldBatch.id);
          }
        }

        // Delete old warehouse batches
        const warehouseBatchIds = warehouseBatches.map(b => b.id);
        const { error: deleteError } = await supabase
          .from('warehouse_batches')
          .delete()
          .in('id', warehouseBatchIds);

        if (deleteError) throw deleteError;
      }

      // 4. Create batches for supplier_services and other items without warehouse_batches
      const itemsWithoutBatches = allInvoiceItems?.filter(item => 
        !item.warehouse_batch_id && !item.batch_id
      ) || [];

      if (itemsWithoutBatches.length > 0) {
        const supplierServiceBatches = itemsWithoutBatches.map(item => ({
          client_id: clientId,
          farm_id: selectedFarm,
          product_id: item.product_id,
          lot: null,
          mfg_date: null,
          expiry_date: null,
          qty_received: item.quantity,
          purchase_price: item.unit_price,
          currency: 'EUR',
          supplier_id: invoice.supplier_id,
          doc_number: invoice.invoice_number,
          doc_date: invoice.invoice_date,
          invoice_id: selectedInvoice,
        }));

        const { data: newServiceBatches, error: serviceBatchError } = await supabase
          .from('batches')
          .insert(supplierServiceBatches)
          .select();

        if (serviceBatchError) throw serviceBatchError;

        // Link invoice_items to new batches
        if (newServiceBatches) {
          for (let i = 0; i < itemsWithoutBatches.length; i++) {
            await supabase
              .from('invoice_items')
              .update({ batch_id: newServiceBatches[i].id })
              .eq('id', itemsWithoutBatches[i].id);
          }
        }
      }

      alert(`Sąskaita #${invoice.invoice_number} sėkmingai priskirta ūkiui "${farm.name}"!`);
      setSelectedInvoice(null);
      setSelectedFarm('');
      setInvoiceItems([]);
      loadData(); // Reload
    } catch (error: any) {
      console.error('Error assigning invoice:', error);
      alert('Klaida priskiriant sąskaitą: ' + error.message);
    }
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
      <div className="bg-gradient-to-r from-blue-50 to-blue-50 p-4 rounded-lg border-2 border-blue-200">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Sandėlio Atsargos (Sąskaitomis)</h3>
            <p className="text-sm text-gray-600">
              Priskirkite visą sąskaitą su jos produktais konkrečiam ūkiui
            </p>
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Nėra nepriskirty sąskaitų</p>
          <p className="text-sm text-gray-500 mt-1">
            Visos sąskaitos jau priskirtos ūkiams arba nepriimta jokių sąskaitų
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Invoice selection */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">1. Pasirinkite sąskaitą</h4>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <button
                  key={invoice.id}
                  onClick={() => setSelectedInvoice(invoice.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedInvoice === invoice.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 mb-1">
                        #{invoice.invoice_number}
                      </div>
                      <div className="text-sm text-gray-600 flex items-center gap-2 mb-2">
                        <Calendar className="w-3 h-3" />
                        {formatDateLT(invoice.invoice_date)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {invoice.supplier_name}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-700">
                        {invoice.currency} {invoice.total_gross.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right: Farm selection, products, and action */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">2. Pasirinkite ūkį</h4>
            <SearchableSelect
              options={farms.map(farm => ({
                value: farm.id,
                label: `${farm.name} (${farm.code})`
              }))}
              value={selectedFarm}
              onChange={(value) => setSelectedFarm(value)}
              placeholder="Ieškoti ūkio..."
              disabled={!selectedInvoice}
            />

            {/* Products in selected invoice */}
            {selectedInvoice && invoiceItems.length > 0 && (
              <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-blue-600" />
                  <h5 className="font-semibold text-gray-900">Produktai sąskaitoje ({invoiceItems.length})</h5>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {invoiceItems.map((item) => {
                    const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                    const priceBeforeDiscount = hasDiscount 
                      ? item.unit_price / (1 - item.discount_percent / 100)
                      : item.unit_price;
                    
                    return (
                      <div key={item.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {item.product?.name || item.description}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {item.product && (
                                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                  {item.product.category}
                                </span>
                              )}
                              {hasDiscount && (
                                <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                                  -{item.discount_percent.toFixed(0)}% nuolaida
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-2 space-y-1">
                              <div className="flex justify-between">
                                <span>Kiekis:</span>
                                <span className="font-medium">{item.quantity} vnt.</span>
                              </div>
                              {hasDiscount && (
                                <div className="flex justify-between text-gray-500">
                                  <span>Kaina (be nuol.):</span>
                                  <span className="line-through">
                                    {invoices.find(i => i.id === selectedInvoice)?.currency} {priceBeforeDiscount.toFixed(2)}
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span>Vieneto kaina:</span>
                                <span className="font-medium text-blue-700">
                                  {invoices.find(i => i.id === selectedInvoice)?.currency} {item.unit_price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-base font-semibold border-t border-gray-300 pt-1 mt-1">
                                <span>Suma:</span>
                                <span className="text-blue-700">
                                  {invoices.find(i => i.id === selectedInvoice)?.currency} {item.total_price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-3 pt-3 border-t-2 border-gray-300">
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900">Bendra suma:</span>
                    <span className="text-blue-700">
                      {invoices.find(i => i.id === selectedInvoice)?.currency}{' '}
                      {invoices.find(i => i.id === selectedInvoice)?.total_gross.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {loadingItems && (
              <div className="text-center py-4 text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-sm">Kraunami produktai...</p>
              </div>
            )}

            <button
              onClick={handleAssignInvoice}
              disabled={!selectedInvoice || !selectedFarm}
              className="w-full px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg"
            >
              <ArrowRight className="w-6 h-6" />
              Priskirti sąskaitą ūkiui
            </button>

            {selectedInvoice && selectedFarm && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Veiksmas:</strong> Sąskaita #{invoices.find(i => i.id === selectedInvoice)?.invoice_number} 
                  {' '}bus priskirta ūkiui{' '}
                  <strong>{farms.find(f => f.id === selectedFarm)?.name}</strong>
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
