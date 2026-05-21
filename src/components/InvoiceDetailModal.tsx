import { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  FileText, 
  CheckCircle, 
  Send, 
  Ban,
  Calendar,
  Building2,
  User,
  Euro
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { requireClientId } from '../lib/clientHelpers';
import { downloadInvoicePDF, generateInvoicePDFBlob, type InvoiceData } from '../lib/invoiceGenerator';

interface InvoiceDetailModalProps {
  invoiceId: string;
  onClose: () => void;
  onStatusChange?: () => void;
}

export function InvoiceDetailModal({ invoiceId, onClose, onStatusChange }: InvoiceDetailModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    loadInvoiceDetails();
    loadPdfPreview();
  }, [invoiceId]);

  const loadInvoiceDetails = async () => {
    if (!user) return;
    const clientId = requireClientId(user);

    try {
      setLoading(true);

      // Load invoice header
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('service_invoices')
        .select(`
          *,
          farms (
            name,
            code,
            contact_person,
            address,
            contact_phone,
            contact_email
          ),
          users:created_by (
            full_name
          )
        `)
        .eq('id', invoiceId)
        .eq('client_id', clientId)
        .single();

      if (invoiceError) throw invoiceError;
      setInvoice(invoiceData);

      // Load line items
      const { data: charges, error: chargesError } = await supabase
        .from('visit_charges')
        .select(`
          *,
          animal_visits (
            visit_datetime,
            vet_name,
            animals (
              tag_no
            )
          )
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: true });

      if (chargesError) throw chargesError;
      setLineItems(charges || []);
    } catch (error) {
      console.error('Error loading invoice details:', error);
      alert('Klaida įkeliant sąskaitos duomenis');
    } finally {
      setLoading(false);
    }
  };

  const loadPdfPreview = async () => {
    if (!user) return;
    const clientId = requireClientId(user);

    try {
      const blob = await generateInvoicePDFBlob(invoiceId, clientId);
      if (blob) {
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      }
    } catch (error) {
      console.error('Error loading PDF preview:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!user) return;
    const clientId = requireClientId(user);

    try {
      const success = await downloadInvoicePDF(invoiceId, clientId);
      if (!success) {
        alert('Nepavyko atsisiųsti PDF');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('Klaida atsisiunčiant PDF');
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!user) return;
    const clientId = requireClientId(user);

    const confirmMessage = 
      newStatus === 'išsiųsta' ? 'Ar tikrai norite pažymėti sąskaitą kaip išsiųstą?' :
      newStatus === 'apmokėta' ? 'Ar tikrai norite pažymėti sąskaitą kaip apmokėtą?' :
      newStatus === 'atšaukta' ? 'Ar tikrai norite atšaukti sąskaitą?' :
      'Ar tikrai norite pakeisti sąskaitos statusą?';

    if (!confirm(confirmMessage)) return;

    try {
      setChangingStatus(true);

      const updates: any = {
        status: newStatus
      };

      // Set payment date when marking as paid
      if (newStatus === 'apmokėta') {
        updates.payment_date = new Date().toISOString().split('T')[0];
      }

      const { error } = await supabase
        .from('service_invoices')
        .update(updates)
        .eq('id', invoiceId)
        .eq('client_id', clientId);

      if (error) throw error;

      alert('Sąskaitos statusas pakeistas sėkmingai!');
      await loadInvoiceDetails();
      onStatusChange?.();
    } catch (error) {
      console.error('Error changing status:', error);
      alert('Klaida keičiant statusą: ' + (error as Error).message);
    } finally {
      setChangingStatus(false);
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
      'juodraštis': FileText,
      'išsiųsta': Send,
      'apmokėta': CheckCircle,
      'atšaukta': Ban
    };

    const Icon = icons[status as keyof typeof icons] || FileText;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        <Icon className="w-4 h-4" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <p className="text-gray-600">Kraunama...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Sąskaita {invoice.invoice_number}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Sukurta: {new Date(invoice.created_at).toLocaleString('lt-LT')}
              {invoice.users?.full_name && ` • ${invoice.users.full_name}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Left Column - Invoice Info */}
            <div className="space-y-4">
              {/* Status */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Statusas</h3>
                <div className="flex items-center justify-between">
                  {getStatusBadge(invoice.status)}
                  {invoice.payment_date && (
                    <span className="text-sm text-gray-600">
                      Apmokėta: {new Date(invoice.payment_date).toLocaleDateString('lt-LT')}
                    </span>
                  )}
                </div>
              </div>

              {/* Invoice Details */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Sąskaitos detalės
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sąskaitos data:</span>
                    <span className="font-medium">{new Date(invoice.invoice_date).toLocaleDateString('lt-LT')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Paslaugos laikotarpis:</span>
                    <span className="font-medium">
                      {new Date(invoice.date_from).toLocaleDateString('lt-LT')} - {new Date(invoice.date_to).toLocaleDateString('lt-LT')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Farm Info */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Ūkis
                </h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">{invoice.farms.name}</span>
                    {invoice.farms.code && (
                      <span className="text-gray-600 ml-2">({invoice.farms.code})</span>
                    )}
                  </div>
                  {invoice.farms.contact_person && (
                    <div className="text-gray-600">
                      <User className="w-3 h-3 inline mr-1" />
                      {invoice.farms.contact_person}
                    </div>
                  )}
                  {invoice.farms.address && (
                    <div className="text-gray-600">{invoice.farms.address}</div>
                  )}
                  {invoice.farms.contact_phone && (
                    <div className="text-gray-600">Tel.: {invoice.farms.contact_phone}</div>
                  )}
                  {invoice.farms.contact_email && (
                    <div className="text-gray-600">El. p.: {invoice.farms.contact_email}</div>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Euro className="w-4 h-4" />
                  Sumos
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tarpinė suma:</span>
                    <span className="font-medium">€{Number(invoice.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">PVM ({invoice.vat_rate}%):</span>
                    <span className="font-medium">€{Number(invoice.vat_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Viso:</span>
                    <span className="text-blue-600">€{Number(invoice.total_amount).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Pastabos</h3>
                  <p className="text-sm text-gray-700">{invoice.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column - Line Items */}
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Eilutės ({lineItems.length})
                </h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Aprašymas
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          Data
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Kiekis
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Kaina
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          Suma
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {lineItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm text-gray-900">
                            <div>{item.description || item.procedure_type || item.product_name}</div>
                            {item.animal_visits?.animals?.tag_no && (
                              <div className="text-xs text-gray-500">
                                Gyvūnas: {item.animal_visits.animals.tag_no}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600">
                            {item.animal_visits?.visit_datetime 
                              ? new Date(item.animal_visits.visit_datetime).toLocaleDateString('lt-LT')
                              : '-'
                            }
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 text-right">
                            {Number(item.quantity).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 text-right">
                            €{Number(item.unit_price).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">
                            €{Number(item.total_price).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PDF Preview */}
              {pdfUrl && (
                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">PDF peržiūra</h3>
                  <iframe
                    src={pdfUrl}
                    className="w-full h-96 border border-gray-300 rounded"
                    title="Invoice PDF Preview"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {invoice.status === 'juodraštis' && (
              <button
                onClick={() => handleStatusChange('išsiųsta')}
                disabled={changingStatus}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Pažymėti išsiųsta
              </button>
            )}
            {invoice.status === 'išsiųsta' && (
              <button
                onClick={() => handleStatusChange('apmokėta')}
                disabled={changingStatus}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Pažymėti apmokėta
              </button>
            )}
            {(invoice.status === 'juodraštis' || invoice.status === 'išsiųsta') && (
              <button
                onClick={() => handleStatusChange('atšaukta')}
                disabled={changingStatus}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Ban className="w-4 h-4" />
                Atšaukti
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleDownloadPDF}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Atsisiųsti PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
            >
              Uždaryti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
