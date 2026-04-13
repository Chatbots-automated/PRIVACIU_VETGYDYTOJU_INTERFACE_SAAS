import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Building2, ArrowRight, Calendar } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';

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

interface Farm {
  id: string;
  name: string;
  code: string;
}

export function InvoiceAllocation() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [selectedFarm, setSelectedFarm] = useState<string>('');

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
      // 1. Update invoice to assign to farm
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({ farm_id: selectedFarm })
        .eq('id', selectedInvoice);

      if (invoiceError) throw invoiceError;

      // 2. Move warehouse batches to farm batches
      const { data: warehouseBatches, error: batchesError } = await supabase
        .from('warehouse_batches')
        .select('*, invoice_items!inner(invoice_id)')
        .eq('invoice_items.invoice_id', selectedInvoice);

      if (batchesError) throw batchesError;

      if (warehouseBatches && warehouseBatches.length > 0) {
        // Create farm batches from warehouse batches
        const farmBatches = warehouseBatches.map(batch => ({
          farm_id: selectedFarm,
          product_id: batch.product_id,
          lot: batch.lot,
          mfg_date: batch.mfg_date,
          expiry_date: batch.expiry_date,
          received_qty: batch.received_qty,
          qty_left: batch.qty_left,
          status: batch.status,
          purchase_price: batch.purchase_price,
          currency: batch.currency,
          supplier_id: batch.supplier_id,
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

      alert(`Sąskaita #${invoice.invoice_number} sėkmingai priskirta ūkiui "${farm.name}"!`);
      setSelectedInvoice(null);
      setSelectedFarm('');
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

          {/* Right: Farm selection and action */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">2. Pasirinkite ūkį</h4>
            <select
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!selectedInvoice}
            >
              <option value="">-- Pasirinkite ūkį --</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>
                  {farm.name} ({farm.code})
                </option>
              ))}
            </select>

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
