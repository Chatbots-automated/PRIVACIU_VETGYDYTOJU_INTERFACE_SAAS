import { useState, useEffect } from 'react';
import { 
  Euro, 
  FileText, 
  Calendar, 
  Filter,
  Download,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Settings,
  TrendingUp
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { requireClientId } from '../lib/clientHelpers';

type ViewTab = 'unpaid' | 'invoices' | 'pricing' | 'analytics';

interface UnpaidCharge {
  id: string;
  visit_id: string;
  animal_id: string;
  charge_type: string;
  procedure_type?: string;
  product_name?: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  visit_datetime: string;
  animal_name?: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  date_from: string;
  date_to: string;
  farm_name: string;
  total_amount: number;
  status: string;
  payment_date?: string;
  charge_count: number;
}

interface ServicePrice {
  id: string;
  procedure_type: string;
  base_price: number;
  description: string;
  active: boolean;
}

export function FinancesModule() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<ViewTab>('unpaid');
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [farms, setFarms] = useState<any[]>([]);
  const [unpaidCharges, setUnpaidCharges] = useState<UnpaidCharge[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [servicePrices, setServicePrices] = useState<ServicePrice[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Invoice generator state
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCharges, setSelectedCharges] = useState<Set<string>>(new Set());
  
  useEffect(() => {
    loadFarms();
  }, []);

  useEffect(() => {
    if (selectedFarmId) {
      if (currentTab === 'unpaid') {
        loadUnpaidCharges();
      } else if (currentTab === 'invoices') {
        loadInvoices();
      }
    }
    if (currentTab === 'pricing') {
      loadServicePrices();
    }
  }, [currentTab, selectedFarmId]);

  const loadFarms = async () => {
    if (!user) return;
    const clientId = requireClientId(user);

    try {
      const { data, error } = await supabase
        .from('farms')
        .select('id, name, contact_person, address')
        .eq('client_id', clientId)
        .order('name');

      if (error) throw error;
      setFarms(data || []);
      
      if (data && data.length > 0 && !selectedFarmId) {
        setSelectedFarmId(data[0].id);
      }
    } catch (error) {
      console.error('Error loading farms:', error);
    }
  };

  const loadUnpaidCharges = async () => {
    if (!user || !selectedFarmId) return;
    const clientId = requireClientId(user);
    setLoading(true);

    try {
      // Load all uninvoiced visits for the farm
      const { data: visitsData, error: visitsError } = await supabase
        .from('animal_visits')
        .select(`
          id,
          visit_datetime,
          procedures,
          animal_id,
          animals(tag_no)
        `)
        .eq('farm_id', selectedFarmId)
        .eq('status', 'Baigtas')
        .order('visit_datetime', { ascending: false });

      if (visitsError) throw visitsError;

      // Check which visits have already been invoiced via visit_charges
      const visitIds = visitsData?.map(v => v.id) || [];
      const { data: invoicedCharges } = await supabase
        .from('visit_charges')
        .select('visit_id')
        .in('visit_id', visitIds)
        .eq('charge_type', 'paslauga')
        .eq('invoiced', true);

      const invoicedVisitIds = new Set(invoicedCharges?.map(c => c.visit_id) || []);

      // Filter out visits that are already invoiced
      const uninvoicedVisits = visitsData?.filter(v => !invoicedVisitIds.has(v.id)) || [];

      // Load service prices to calculate costs
      const { data: servicePricesData } = await supabase
        .from('service_prices')
        .select('procedure_type, base_price')
        .eq('client_id', clientId)
        .eq('active', true);

      const servicePrices = new Map<string, number>();
      (servicePricesData || []).forEach(sp => {
        servicePrices.set(sp.procedure_type, sp.base_price);
      });

      // Calculate service costs for each visit and expand by procedure
      const charges: UnpaidCharge[] = [];
      for (const visit of uninvoicedVisits) {
        const procedures = Array.isArray(visit.procedures) ? visit.procedures : [];
        
        for (const procedure of procedures) {
          const price = servicePrices.get(procedure) || 0;
          charges.push({
            id: `${visit.id}-${procedure}`,
            visit_id: visit.id,
            animal_id: visit.animal_id,
            charge_type: 'paslauga',
            procedure_type: procedure,
            description: procedure,
            quantity: 1,
            unit_price: price,
            total_price: price,
            visit_datetime: visit.visit_datetime,
            animal_name: visit.animals?.tag_no
          });
        }
      }

      console.log('Uninvoiced service charges:', charges);
      console.log('Total service charges:', charges.reduce((sum, c) => sum + c.total_price, 0));
      setUnpaidCharges(charges);
    } catch (error) {
      console.error('Error loading unpaid charges:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    if (!user || !selectedFarmId) return;
    const clientId = requireClientId(user);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('vw_invoice_summary')
        .select('*')
        .eq('client_id', clientId)
        .eq('farm_id', selectedFarmId)
        .order('invoice_date', { ascending: false });

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadServicePrices = async () => {
    if (!user) return;
    const clientId = requireClientId(user);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('service_prices')
        .select('*')
        .eq('client_id', clientId)
        .eq('vet_user_id', user.id)
        .order('procedure_type');

      if (error) throw error;
      setServicePrices(data || []);
    } catch (error) {
      console.error('Error loading service prices:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoice = async () => {
    if (!user || !selectedFarmId || selectedCharges.size === 0) {
      alert('Pasirinkite bent vieną mokestį');
      return;
    }

    const clientId = requireClientId(user);
    setLoading(true);

    try {
      // Calculate totals
      const chargesToInvoice = unpaidCharges.filter(c => selectedCharges.has(c.id));
      const subtotal = chargesToInvoice.reduce((sum, c) => sum + c.total_price, 0);
      const vatRate = 21.0;
      const vatAmount = subtotal * (vatRate / 100);
      const totalAmount = subtotal + vatAmount;

      // Generate invoice number
      const { data: invoiceNumber, error: numberError } = await supabase
        .rpc('generate_invoice_number', { p_client_id: clientId });

      if (numberError) throw numberError;

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from('service_invoices')
        .insert({
          client_id: clientId,
          farm_id: selectedFarmId,
          invoice_number: invoiceNumber,
          invoice_date: new Date().toISOString().split('T')[0],
          date_from: dateFrom,
          date_to: dateTo,
          subtotal,
          vat_rate: vatRate,
          vat_amount: vatAmount,
          total_amount: totalAmount,
          status: 'juodraštis',
          created_by: user.id
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create or update visit_charges records
      // Group charges by visit_id to avoid duplicates
      const visitChargesMap = new Map<string, any[]>();
      for (const charge of chargesToInvoice) {
        if (!visitChargesMap.has(charge.visit_id)) {
          visitChargesMap.set(charge.visit_id, []);
        }
        visitChargesMap.get(charge.visit_id)!.push(charge);
      }

      // Create visit_charges for each visit+procedure combination
      const chargeRecords = [];
      for (const [visitId, charges] of visitChargesMap.entries()) {
        for (const charge of charges) {
          chargeRecords.push({
            client_id: clientId,
            farm_id: selectedFarmId,
            visit_id: visitId,
            animal_id: charge.animal_id,
            charge_type: 'paslauga',
            procedure_type: charge.procedure_type,
            quantity: charge.quantity,
            unit_price: charge.unit_price,
            total_price: charge.total_price,
            invoiced: true,
            invoice_id: invoice.id
          });
        }
      }

      // Insert visit_charges (or update if they already exist)
      if (chargeRecords.length > 0) {
        const { error: chargesError } = await supabase
          .from('visit_charges')
          .upsert(chargeRecords, {
            onConflict: 'visit_id,procedure_type',
            ignoreDuplicates: false
          });

        if (chargesError) {
          console.warn('Error upserting visit charges:', chargesError);
          // Try inserting instead
          const { error: insertError } = await supabase
            .from('visit_charges')
            .insert(chargeRecords);
          
          if (insertError) throw insertError;
        }
      }

      alert(`Sąskaita ${invoiceNumber} sukurta sėkmingai!`);
      setSelectedCharges(new Set());
      setDateFrom('');
      setDateTo('');
      loadUnpaidCharges();
      setCurrentTab('invoices');
    } catch (error) {
      console.error('Error generating invoice:', error);
      alert('Klaida kuriant sąskaitą: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const saveServicePrice = async (price: Partial<ServicePrice>) => {
    if (!user) return;
    const clientId = requireClientId(user);

    try {
      if (price.id) {
        // Update existing
        const { error } = await supabase
          .from('service_prices')
          .update({
            base_price: price.base_price,
            description: price.description,
            active: price.active
          })
          .eq('id', price.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('service_prices')
          .insert({
            client_id: clientId,
            vet_user_id: user.id,
            procedure_type: price.procedure_type,
            base_price: price.base_price,
            description: price.description,
            active: true
          });

        if (error) throw error;
      }

      loadServicePrices();
      alert('Kaina išsaugota sėkmingai!');
    } catch (error) {
      console.error('Error saving price:', error);
      alert('Klaida išsaugant kainą: ' + (error as Error).message);
    }
  };

  const toggleChargeSelection = (chargeId: string) => {
    const newSelection = new Set(selectedCharges);
    if (newSelection.has(chargeId)) {
      newSelection.delete(chargeId);
    } else {
      newSelection.add(chargeId);
    }
    setSelectedCharges(newSelection);
  };

  const selectAllCharges = () => {
    if (selectedCharges.size === unpaidCharges.length) {
      setSelectedCharges(new Set());
    } else {
      setSelectedCharges(new Set(unpaidCharges.map(c => c.id)));
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      'juodraštis': 'bg-gray-100 text-gray-800',
      'išsiųsta': 'bg-blue-100 text-blue-800',
      'apmokėta': 'bg-green-100 text-green-800',
      'atšaukta': 'bg-red-100 text-red-800'
    };

    const icons = {
      'juodraštis': Clock,
      'išsiųsta': FileText,
      'apmokėta': CheckCircle,
      'atšaukta': XCircle
    };

    const Icon = icons[status as keyof typeof icons] || Clock;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Euro className="w-8 h-8 text-blue-600" />
            Finansai
          </h1>
          <p className="text-gray-600 mt-2">Paslaugų apskaita ir sąskaitų faktūrų generavimas</p>
        </div>

        {/* Farm Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pasirinkite ūkį
          </label>
          <select
            value={selectedFarmId || ''}
            onChange={(e) => setSelectedFarmId(e.target.value)}
            className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {farms.map(farm => (
              <option key={farm.id} value={farm.id}>
                {farm.name} {farm.contact_person ? `- ${farm.contact_person}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 px-6" aria-label="Tabs">
              <button
                onClick={() => setCurrentTab('unpaid')}
                className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors ${
                  currentTab === 'unpaid'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Neapmokėti mokesčiai
                </div>
              </button>
              <button
                onClick={() => setCurrentTab('invoices')}
                className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors ${
                  currentTab === 'invoices'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Sąskaitos faktūros
                </div>
              </button>
              <button
                onClick={() => setCurrentTab('pricing')}
                className={`py-4 px-4 font-medium text-sm border-b-2 transition-colors ${
                  currentTab === 'pricing'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Kainų valdymas
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Unpaid Charges Tab */}
            {currentTab === 'unpaid' && (
              <div>
                {!selectedFarmId ? (
                  <p className="text-gray-500">Pasirinkite ūkį</p>
                ) : loading ? (
                  <p className="text-gray-500">Kraunama...</p>
                ) : unpaidCharges.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Nėra neapmokėtų mokesčių</p>
                  </div>
                ) : (
                  <>
                    {/* Date Range Filter for Invoice */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Generuoti sąskaitą
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data nuo
                          </label>
                          <input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Data iki
                          </label>
                          <input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="flex items-end">
                          <button
                            onClick={generateInvoice}
                            disabled={loading || selectedCharges.size === 0 || !dateFrom || !dateTo}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            Sukurti sąskaitą ({selectedCharges.size})
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Info Note */}
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        💡 <strong>Pastaba:</strong> Čia rodomi tik paslaugų mokesčiai. Produktų kainos jau įtrauktos paskirstant atsargas iš sandėlio.
                      </p>
                    </div>

                    {/* Charges Table */}
                    <div className="mb-4 flex items-center justify-between">
                      <button
                        onClick={selectAllCharges}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        {selectedCharges.size === unpaidCharges.length ? 'Atžymėti visus' : 'Pažymėti visus'}
                      </button>
                      <p className="text-sm text-gray-600">
                        Pasirinkta: {selectedCharges.size} iš {unpaidCharges.length}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Pažymėti
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Data
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gyvūnas
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tipas
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Aprašymas
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kiekis
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Kaina
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Suma
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {unpaidCharges.map((charge) => (
                            <tr key={charge.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedCharges.has(charge.id)}
                                  onChange={() => toggleChargeSelection(charge.id)}
                                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {new Date(charge.visit_datetime).toLocaleDateString('lt-LT')}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {charge.animal_name || '-'}
                              </td>
                              <td className="px-4 py-3 text-sm">
                                <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  Paslauga
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {charge.description}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                {charge.quantity}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                €{charge.unit_price.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                                €{charge.total_price.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan={7} className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                              Bendra suma:
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-blue-600">
                              €{unpaidCharges.reduce((sum, c) => sum + c.total_price, 0).toFixed(2)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Invoices Tab */}
            {currentTab === 'invoices' && (
              <div>
                {!selectedFarmId ? (
                  <p className="text-gray-500">Pasirinkite ūkį</p>
                ) : loading ? (
                  <p className="text-gray-500">Kraunama...</p>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">Sąskaitų nerasta</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Numeris
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Laikotarpis
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Statusas
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Suma
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Veiksmai
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {invoice.invoice_number}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {new Date(invoice.invoice_date).toLocaleDateString('lt-LT')}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {new Date(invoice.date_from).toLocaleDateString('lt-LT')} - {new Date(invoice.date_to).toLocaleDateString('lt-LT')}
                            </td>
                            <td className="px-4 py-3">
                              {getStatusBadge(invoice.status)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                              €{invoice.total_amount.toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                className="text-blue-600 hover:text-blue-700 p-1"
                                title="Peržiūrėti"
                              >
                                <Eye className="w-5 h-5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Pricing Management Tab */}
            {currentTab === 'pricing' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Mano paslaugų kainos</h3>
                  <p className="text-sm text-gray-600">
                    Nustatykite savo standartines kainas procedūroms. Jos bus naudojamos automatiškai įkainojant vizitus.
                  </p>
                </div>

                {loading ? (
                  <p className="text-gray-500">Kraunama...</p>
                ) : (
                  <div className="space-y-4">
                    {['Gydymas', 'Vakcina', 'Profilaktika', 'Apžiūra', 'Konsultacija', 'Diagnostika'].map(procType => {
                      const existing = servicePrices.find(p => p.procedure_type === procType);
                      return (
                        <div key={procType} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Procedūra
                              </label>
                              <input
                                type="text"
                                value={procType}
                                readOnly
                                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-700"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Bazinė kaina (€)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                defaultValue={existing?.base_price || 0}
                                onBlur={(e) => {
                                  const price = parseFloat(e.target.value) || 0;
                                  saveServicePrice({
                                    id: existing?.id,
                                    procedure_type: procType,
                                    base_price: price,
                                    description: existing?.description || '',
                                    active: true
                                  });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Aprašymas
                              </label>
                              <input
                                type="text"
                                defaultValue={existing?.description || ''}
                                placeholder="Papildoma informacija"
                                onBlur={(e) => {
                                  if (existing) {
                                    saveServicePrice({
                                      id: existing.id,
                                      procedure_type: procType,
                                      base_price: existing.base_price,
                                      description: e.target.value,
                                      active: existing.active
                                    });
                                  }
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
