import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useFarm } from '../contexts/FarmContext';
import { FileText, Package, Calendar, Building2, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDateLT } from '../lib/formatters';

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  doc_title: string;
  supplier_name: string;
  supplier_code: string;
  supplier_vat: string;
  currency: string;
  total_net: number;
  total_vat: number;
  total_gross: number;
  vat_rate: number;
  created_at: string;
  farm_id: string | null;
  farm?: {
    name: string;
    code: string;
  };
}

interface InvoiceItem {
  id: string;
  invoice_id: string;
  product_id: string;
  line_no: number;
  description: string;
  sku: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount_percent: number | null;
  batch_id: string;
  product?: {
    id: string;
    name: string;
    category: string;
  };
}

interface InvoiceViewerProps {
  showAllInvoices?: boolean;
}

export function InvoiceViewer({ showAllInvoices = false }: InvoiceViewerProps) {
  const { selectedFarm } = useFarm();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoices();
  }, [selectedFarm, showAllInvoices]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('invoices')
        .select('*, farm:farms(name, code)')
        .order('invoice_date', { ascending: false });

      // If showAllInvoices is true, don't filter by farm at all
      if (!showAllInvoices) {
        if (selectedFarm) {
          query = query.eq('farm_id', selectedFarm.id);
        } else {
          query = query.is('farm_id', null);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setInvoices(data || []);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoiceItems = async (invoiceId: string) => {
    try {
      const { data, error } = await supabase
        .from('invoice_items')
        .select(`
          *,
          product:products(id, name, category)
        `)
        .eq('invoice_id', invoiceId)
        .order('line_no');

      if (error) throw error;
      setInvoiceItems(data || []);
    } catch (error) {
      console.error('Error loading invoice items:', error);
    }
  };

  const toggleInvoice = (invoiceId: string) => {
    if (selectedInvoice === invoiceId) {
      setSelectedInvoice(null);
      setInvoiceItems([]);
    } else {
      setSelectedInvoice(invoiceId);
      loadInvoiceItems(invoiceId);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      medicines: 'Vaistai',
      prevention: 'Prevencija',
      hygiene: 'Higiena',
      biocide: 'Biocidas',
    };
    return labels[category] || category;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Kraunama...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-blue-50 to-blue-50 p-4 rounded-lg border-2 border-blue-200">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {showAllInvoices 
                ? 'Visos Sąskaitos' 
                : selectedFarm 
                  ? `${selectedFarm.name} Sąskaitos` 
                  : 'Sandėlio Sąskaitos'}
            </h3>
            <p className="text-sm text-gray-600">
              {showAllInvoices 
                ? 'Peržiūrėkite visas sandėlio ir ūkių sąskaitas' 
                : selectedFarm 
                  ? 'Peržiūrėkite ūkio sąskaitas ir jų produktus' 
                  : 'Peržiūrėkite sandėlio sąskaitas ir jų produktus'}
            </p>
          </div>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">Sąskaitų nerasta</p>
          <p className="text-sm text-gray-500 mt-1">
            {showAllInvoices 
              ? 'Sąskaitos bus rodomos po produktų priėmimo (Pajamavimas) arba paskirstymo' 
              : selectedFarm 
                ? 'Ūkio sąskaitos bus rodomos po produktų paskirstymo' 
                : 'Sandėlio sąskaitos bus rodomos po produktų priėmimo (Pajamavimas)'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="bg-white rounded-lg border-2 border-gray-200 overflow-hidden hover:border-blue-300 transition-colors"
            >
              <button
                onClick={() => toggleInvoice(invoice.id)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1 text-left">
                  <div className="bg-blue-100 p-2 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-bold text-gray-900">#{invoice.invoice_number}</span>
                      <span className="text-sm text-gray-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateLT(invoice.invoice_date)}
                      </span>
                      {showAllInvoices && (
                        <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                          invoice.farm_id 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {invoice.farm_id ? invoice.farm?.name || 'Ūkis' : 'Sandėlis'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Building2 className="w-4 h-4" />
                      <span className="font-medium">{invoice.supplier_name}</span>
                      {invoice.supplier_code && (
                        <span className="text-xs text-gray-500">({invoice.supplier_code})</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-blue-700">
                      {invoice.currency} {invoice.total_gross.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">
                      PVM: {invoice.currency} {invoice.total_vat.toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="ml-4">
                  {selectedInvoice === invoice.id ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {selectedInvoice === invoice.id && (
                <div className="border-t-2 border-gray-200 bg-gray-50 p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Produktai ({invoiceItems.length})
                  </h4>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b-2 border-gray-300">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Produkto pavadinimas</th>
                          <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">Kiekis</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Vnt. kaina (be nuol.)</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Vnt. kaina (su nuol.)</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Suma (be nuol.)</th>
                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">Suma (su nuol.)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invoiceItems.map((item) => {
                          // Calculate prices without discount
                          const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                          const unitPriceBeforeDiscount = hasDiscount 
                            ? item.unit_price / (1 - item.discount_percent / 100)
                            : item.unit_price;
                          const totalPriceBeforeDiscount = unitPriceBeforeDiscount * item.quantity;
                          
                          return (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-500 font-medium">
                              {item.line_no}
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex flex-col">
                                <span className="font-semibold text-gray-900">
                                  {item.product?.name || item.description}
                                </span>
                                <div className="flex items-center gap-2 mt-1">
                                  {item.product && (
                                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                      {getCategoryLabel(item.product.category)}
                                    </span>
                                  )}
                                  {item.sku && (
                                    <span className="text-xs text-gray-500">SKU: {item.sku}</span>
                                  )}
                                  {hasDiscount && (
                                    <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded font-medium">
                                      -{Number(item.discount_percent).toFixed(0)}% nuolaida
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center font-medium text-gray-900">
                              {item.quantity}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {invoice.currency} {unitPriceBeforeDiscount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-700">
                              {invoice.currency} {item.unit_price.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600">
                              {invoice.currency} {totalPriceBeforeDiscount.toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-right font-bold text-blue-700">
                              {invoice.currency} {item.total_price.toFixed(2)}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        {/* Subtotals row */}
                        <tr className="border-t-2 border-gray-300">
                          <td colSpan={3} className="px-3 py-3"></td>
                          <td colSpan={2} className="px-3 py-3 text-right text-sm font-semibold text-gray-700">
                            Tarpinė suma (be nuolaidos):
                          </td>
                          <td colSpan={2} className="px-3 py-3 text-right text-base font-bold text-gray-900">
                            {invoice.currency} {(() => {
                              const totalBeforeDiscount = invoiceItems.reduce((sum, item) => {
                                const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                                const unitPriceBeforeDiscount = hasDiscount 
                                  ? item.unit_price / (1 - item.discount_percent / 100)
                                  : item.unit_price;
                                return sum + (unitPriceBeforeDiscount * item.quantity);
                              }, 0);
                              return totalBeforeDiscount.toFixed(2);
                            })()}
                          </td>
                        </tr>
                        
                        {/* Discount row - only show if there's a discount */}
                        {invoiceItems.some(item => item.discount_percent != null && item.discount_percent > 0) && (
                          <tr className="bg-amber-50">
                            <td colSpan={3} className="px-3 py-2"></td>
                            <td colSpan={2} className="px-3 py-2 text-right text-sm font-semibold text-amber-700">
                              Nuolaida:
                            </td>
                            <td colSpan={2} className="px-3 py-2 text-right text-base font-bold text-amber-700">
                              -{invoice.currency} {(invoiceItems.reduce((sum, item) => {
                                const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                                const unitPriceBeforeDiscount = hasDiscount 
                                  ? item.unit_price / (1 - item.discount_percent / 100)
                                  : item.unit_price;
                                const totalBeforeDiscount = unitPriceBeforeDiscount * item.quantity;
                                return sum + (totalBeforeDiscount - item.total_price);
                              }, 0)).toFixed(2)}
                            </td>
                          </tr>
                        )}
                        
                        {/* Total after discount (before VAT) - calculated from items */}
                        <tr className="bg-blue-50 border-t border-gray-300">
                          <td colSpan={3} className="px-3 py-3"></td>
                          <td colSpan={2} className="px-3 py-3 text-right text-sm font-semibold text-blue-900">
                            Suma su nuolaida (be PVM):
                          </td>
                          <td colSpan={2} className="px-3 py-3 text-right text-lg font-bold text-blue-700">
                            {invoice.currency} {(() => {
                              const totalAfterDiscount = invoiceItems.reduce((sum, item) => {
                                return sum + item.total_price;
                              }, 0);
                              return totalAfterDiscount.toFixed(2);
                            })()}
                          </td>
                        </tr>
                        
                        {/* VAT row - calculated from items */}
                        <tr className="bg-gray-100">
                          <td colSpan={3} className="px-3 py-2"></td>
                          <td colSpan={2} className="px-3 py-2 text-right text-sm font-semibold text-gray-700">
                            PVM ({invoice.vat_rate}%):
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-right text-base font-bold text-gray-900">
                            {invoice.currency} {(() => {
                              const totalAfterDiscount = invoiceItems.reduce((sum, item) => {
                                return sum + item.total_price;
                              }, 0);
                              const vat = totalAfterDiscount * (invoice.vat_rate / 100);
                              return vat.toFixed(2);
                            })()}
                          </td>
                        </tr>
                        
                        {/* Final total WITHOUT discount (with VAT) - MAIN PRICE */}
                        <tr className="bg-blue-50 border-t-2 border-blue-300">
                          <td colSpan={3} className="px-3 py-4"></td>
                          <td colSpan={2} className="px-3 py-4 text-right text-base font-bold text-blue-900">
                            IŠ VISO MOKĖTI (be nuolaidos, su PVM):
                          </td>
                          <td colSpan={2} className="px-3 py-4 text-right text-xl font-bold text-blue-700">
                            {invoice.currency} {(() => {
                              const totalBeforeDiscount = invoiceItems.reduce((sum, item) => {
                                const hasDiscount = item.discount_percent != null && item.discount_percent > 0;
                                const unitPriceBeforeDiscount = hasDiscount 
                                  ? item.unit_price / (1 - item.discount_percent / 100)
                                  : item.unit_price;
                                return sum + (unitPriceBeforeDiscount * item.quantity);
                              }, 0);
                              const totalWithVAT = totalBeforeDiscount * (1 + invoice.vat_rate / 100);
                              return totalWithVAT.toFixed(2);
                            })()}
                          </td>
                        </tr>
                        
                        {/* Discounted price - only show if there's a discount */}
                        {invoiceItems.some(item => item.discount_percent != null && item.discount_percent > 0) && (
                          <tr className="bg-green-50">
                            <td colSpan={3} className="px-3 py-3"></td>
                            <td colSpan={2} className="px-3 py-3 text-right text-sm font-semibold text-green-700">
                              Su pritaikyta nuolaida:
                            </td>
                            <td colSpan={2} className="px-3 py-3 text-right text-lg font-bold text-green-700">
                              {invoice.currency} {(() => {
                                const totalAfterDiscount = invoiceItems.reduce((sum, item) => {
                                  return sum + item.total_price;
                                }, 0);
                                const totalWithVAT = totalAfterDiscount * (1 + invoice.vat_rate / 100);
                                return totalWithVAT.toFixed(2);
                              })()}
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
