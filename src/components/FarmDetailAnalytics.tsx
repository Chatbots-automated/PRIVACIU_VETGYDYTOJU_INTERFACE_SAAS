import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { allocationUnitPricesFromBatchAndInvoice } from '../lib/invoicePricing';
import { 
  ArrowLeft, 
  Package, 
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';

interface FarmDetailProps {
  farmId: string;
  farmName: string;
  farmCode: string;
  onBack: () => void;
}

interface AllocatedStockSummary {
  product_name: string;
  category: string;
  unit: string;
  total_allocated_qty: number;
  total_used_qty: number;
  remaining_qty: number;
  avg_purchase_price: number;
  avg_price_before_discount: number;
  total_discount: number;
  total_value: number;
  /** Remaining stock value at pre-discount unit price */
  remaining_value_before_discount: number;
}

export function FarmDetailAnalytics({ farmId, farmName, farmCode, onBack }: FarmDetailProps) {
  const [allocatedStock, setAllocatedStock] = useState<AllocatedStockSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    loadFarmData();
  }, [farmId, dateFrom, dateTo]);

  const loadFarmData = async () => {
    try {
      setLoading(true);

      // Load allocated stock with warehouse batch prices and invoice items for discount info
      let query = supabase
        .from('farm_stock_allocations')
        .select(`
          id,
          product_id,
          allocated_qty,
          created_at,
          warehouse_batch_id,
          warehouse_batches (
            purchase_price,
            received_qty,
            invoice_id
          ),
          products (
            name,
            category,
            primary_pack_unit
          )
        `)
        .eq('farm_id', farmId);

      if (dateFrom) query = query.gte('created_at', dateFrom);
      if (dateTo) query = query.lte('created_at', dateTo + 'T23:59:59');

      const { data: allocationsData, error: allocError } = await query;
      
      if (allocError) {
        console.error('Error loading allocations:', allocError);
        throw allocError;
      }

      // Load directly assigned batches (from invoices assigned directly to this farm)
      let directBatchQuery = supabase
        .from('batches')
        .select(`
          id,
          product_id,
          received_qty,
          qty_left,
          purchase_price,
          invoice_id,
          created_at,
          allocation_id,
          products (
            name,
            category,
            primary_pack_unit
          )
        `)
        .eq('farm_id', farmId)
        .not('invoice_id', 'is', null);

      if (dateFrom) directBatchQuery = directBatchQuery.gte('created_at', dateFrom);
      if (dateTo) directBatchQuery = directBatchQuery.lte('created_at', dateTo + 'T23:59:59');

      const { data: directBatchesData, error: directBatchError } = await directBatchQuery;
      
      if (directBatchError) {
        console.error('Error loading direct batches:', directBatchError);
      }

      // Also get usage data for allocated stock (from warehouse)
      const { data: batchesData, error: batchError } = await supabase
        .from('batches')
        .select('product_id, received_qty, qty_left, allocation_id')
        .eq('farm_id', farmId)
        .not('allocation_id', 'is', null);
      
      if (batchError) {
        console.error('Error loading batches:', batchError);
      }

      // Get invoice items with discount info using warehouse_batch_id
      const warehouseBatchIds = [...new Set(allocationsData?.map(a => a.warehouse_batch_id).filter(Boolean))];
      let invoiceItemsData: any[] = [];
      
      if (warehouseBatchIds.length > 0) {
        const { data, error: itemsError } = await supabase
          .from('invoice_items')
          .select('warehouse_batch_id, product_id, discount_percent, unit_price, quantity, total_price')
          .in('warehouse_batch_id', warehouseBatchIds);
        
        if (itemsError) {
          console.error('Error loading invoice items:', itemsError);
        }
        
        invoiceItemsData = data || [];
      }

      // Get invoice items for directly assigned batches
      const directBatchIds = [...new Set(directBatchesData?.map(b => b.id).filter(Boolean))];
      let directInvoiceItemsData: any[] = [];
      
      if (directBatchIds.length > 0) {
        const { data, error: directItemsError } = await supabase
          .from('invoice_items')
          .select('batch_id, product_id, discount_percent, unit_price, quantity, total_price')
          .in('batch_id', directBatchIds);
        
        if (directItemsError) {
          console.error('Error loading direct invoice items:', directItemsError);
        }
        
        directInvoiceItemsData = data || [];
      }

      if (allocationsData) {
        // Group by product and calculate totals
        const productMap = new Map<string, AllocatedStockSummary>();

        allocationsData.forEach(allocation => {
          const product = allocation.products as any;
          const warehouseBatch = allocation.warehouse_batches as any;
          if (!product || !warehouseBatch) return;

          const productName = product.name;
          const allocatedQty = parseFloat(allocation.allocated_qty) || 0;
          const purchasePrice = parseFloat(warehouseBatch.purchase_price) || 0;
          const warehouseReceivedQty = parseFloat(warehouseBatch.received_qty) || 1;

          const invoiceItem =
            invoiceItemsData?.find(
              (ii) =>
                ii.warehouse_batch_id === allocation.warehouse_batch_id &&
                (ii.product_id === allocation.product_id || !ii.product_id)
            ) ||
            invoiceItemsData?.find((ii) => ii.warehouse_batch_id === allocation.warehouse_batch_id);

          const { unitAfterDiscount, unitBeforeDiscount } = allocationUnitPricesFromBatchAndInvoice({
            purchasePrice,
            receivedQty: warehouseReceivedQty,
            invoiceItem,
          });

          // Find corresponding farm batch to get usage
          const farmBatch = batchesData?.find(b => b.allocation_id === allocation.id);
          const qtyLeft = farmBatch ? parseFloat(farmBatch.qty_left) || 0 : allocatedQty;
          const usedQty = allocatedQty - qtyLeft;

          const lineDiscountAmount = (unitBeforeDiscount - unitAfterDiscount) * allocatedQty;

          if (productMap.has(productName)) {
            const existing = productMap.get(productName)!;
            existing.total_allocated_qty += allocatedQty;
            existing.total_used_qty += usedQty;
            existing.remaining_qty += qtyLeft;
            existing.total_discount += lineDiscountAmount;

            const prevTotalQty = existing.total_allocated_qty - allocatedQty;
            existing.avg_purchase_price =
              ((existing.avg_purchase_price * prevTotalQty) + (unitAfterDiscount * allocatedQty)) /
              existing.total_allocated_qty;
            existing.avg_price_before_discount =
              ((existing.avg_price_before_discount * prevTotalQty) + (unitBeforeDiscount * allocatedQty)) /
              existing.total_allocated_qty;
            existing.total_value = existing.remaining_qty * existing.avg_purchase_price;
            existing.remaining_value_before_discount =
              existing.remaining_qty * existing.avg_price_before_discount;
          } else {
            productMap.set(productName, {
              product_name: productName,
              category: product.category || 'N/A',
              unit: product.primary_pack_unit || 'ml',
              total_allocated_qty: allocatedQty,
              total_used_qty: usedQty,
              remaining_qty: qtyLeft,
              avg_purchase_price: unitAfterDiscount,
              avg_price_before_discount: unitBeforeDiscount,
              total_discount: lineDiscountAmount,
              total_value: qtyLeft * unitAfterDiscount,
              remaining_value_before_discount: qtyLeft * unitBeforeDiscount,
            });
          }
        });

        // Process directly assigned batches (from invoices assigned directly to farm)
        if (directBatchesData) {
          directBatchesData.forEach(batch => {
            const product = batch.products as any;
            if (!product) return;

            const productName = product.name;
            const receivedQty = parseFloat(batch.received_qty) || 0;
            const qtyLeft = parseFloat(batch.qty_left) || 0;
            const usedQty = receivedQty - qtyLeft;
            const purchasePrice = parseFloat(batch.purchase_price) || 0;

            // Find invoice item for this batch
            const invoiceItem = directInvoiceItemsData?.find(
              (ii) => ii.batch_id === batch.id && ii.product_id === batch.product_id
            );

            const { unitAfterDiscount, unitBeforeDiscount } = allocationUnitPricesFromBatchAndInvoice({
              purchasePrice,
              receivedQty,
              invoiceItem,
            });

            const lineDiscountAmount = (unitBeforeDiscount - unitAfterDiscount) * receivedQty;

            if (productMap.has(productName)) {
              const existing = productMap.get(productName)!;
              existing.total_allocated_qty += receivedQty;
              existing.total_used_qty += usedQty;
              existing.remaining_qty += qtyLeft;
              existing.total_discount += lineDiscountAmount;

              const prevTotalQty = existing.total_allocated_qty - receivedQty;
              existing.avg_purchase_price =
                ((existing.avg_purchase_price * prevTotalQty) + (unitAfterDiscount * receivedQty)) /
                existing.total_allocated_qty;
              existing.avg_price_before_discount =
                ((existing.avg_price_before_discount * prevTotalQty) + (unitBeforeDiscount * receivedQty)) /
                existing.total_allocated_qty;
              existing.total_value = existing.remaining_qty * existing.avg_purchase_price;
              existing.remaining_value_before_discount =
                existing.remaining_qty * existing.avg_price_before_discount;
            } else {
              productMap.set(productName, {
                product_name: productName,
                category: product.category || 'N/A',
                unit: product.primary_pack_unit || 'ml',
                total_allocated_qty: receivedQty,
                total_used_qty: usedQty,
                remaining_qty: qtyLeft,
                avg_purchase_price: unitAfterDiscount,
                avg_price_before_discount: unitBeforeDiscount,
                total_discount: lineDiscountAmount,
                total_value: qtyLeft * unitAfterDiscount,
                remaining_value_before_discount: qtyLeft * unitBeforeDiscount,
              });
            }
          });
        }

        productMap.forEach((row) => {
          row.remaining_value_before_discount = row.remaining_qty * row.avg_price_before_discount;
        });

        setAllocatedStock(Array.from(productMap.values()).sort((a, b) => b.total_value - a.total_value));
      }
    } catch (error) {
      console.error('Error loading farm data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStockValue = allocatedStock.reduce((sum, item) => sum + item.total_value, 0);
  const totalStockValueBeforeDiscount = allocatedStock.reduce(
    (sum, item) => sum + item.remaining_qty * item.avg_price_before_discount,
    0
  );

  const handleExport = () => {
    const exportData = allocatedStock.map(item => ({
      'Produktas': item.product_name,
      'Kategorija': item.category,
      'Paskirstyta': item.total_allocated_qty,
      'Sunaudota': item.total_used_qty,
      'Vienetas': item.unit,
      'Kaina (be nuol.)': item.avg_price_before_discount.toFixed(4),
      'Kaina (su nuol.)': item.avg_purchase_price.toFixed(4),
      'Nuolaida': item.total_discount.toFixed(2),
      'Likutis vertė (be nuol.)': item.remaining_value_before_discount.toFixed(2),
      'Likutis vertė (su nuol.)': item.total_value.toFixed(2)
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Paskirstytos atsargos');
    XLSX.writeFile(wb, `${farmName}_paskirstytos_atsargos.xlsx`);
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
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-white/90 hover:text-white mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Grįžti į sąrašą
        </button>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold">{farmName}</h1>
            <p className="text-blue-100 mt-1">Ūkio kodas: {farmCode}</p>
          </div>
          <div className="text-right space-y-1">
            <div>
              <p className="text-sm text-blue-100">Vertė be nuolaidos (likutis)</p>
              <p className="text-2xl font-bold text-white/95">€{totalStockValueBeforeDiscount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-blue-100">Vertė su nuolaida (likutis)</p>
              <p className="text-4xl font-bold">€{totalStockValue.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Allocated Stock Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-3 rounded-xl">
              <Package className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Paskirstytos atsargos</h2>
              <p className="text-sm text-gray-600">Produktai paskirstyti iš sandėlio</p>
            </div>
          </div>
          <button
            onClick={handleExport}
            disabled={allocatedStock.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Eksportuoti
          </button>
        </div>

        {/* Date Filters */}
        <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuo datos</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Iki datos</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Išvalyti
            </button>
          </div>
        </div>

        {allocatedStock.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-600">Nėra paskirstytų atsargų</p>
            <p className="text-sm text-gray-500 mt-2">Paskirstykite produktus iš Vetpraktika UAB sandėlio</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Produktas</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Kategorija</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Paskirstyta</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Sunaudota</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Kaina (be nuol.)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Kaina (su nuol.)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Nuolaida</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Likutis be nuol.</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">Likutis su nuol.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allocatedStock.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.product_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {item.total_allocated_qty.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-900">
                      {item.total_used_qty.toFixed(2)} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-700">
                      €{item.avg_price_before_discount.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-700 font-medium">
                      €{item.avg_purchase_price.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-amber-700 font-medium">
                      {item.total_discount > 0 ? `- €${item.total_discount.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-semibold text-gray-800">
                      €{item.remaining_value_before_discount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-bold text-gray-900">
                      €{item.total_value.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-amber-50 border-t-2 border-amber-200">
                  <td colSpan={6} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    Bendra nuolaida (paskirstyta):
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-amber-700 text-right">
                    - €{allocatedStock.reduce((sum, item) => sum + item.total_discount, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                </tr>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={7} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    Likutis bendra vertė be nuolaidos:
                  </td>
                  <td className="px-4 py-3 text-sm font-bold text-slate-800 text-right">
                    €{totalStockValueBeforeDiscount.toFixed(2)}
                  </td>
                  <td className="px-4 py-3"></td>
                </tr>
                <tr className="bg-gray-50 border-t-2 border-gray-300">
                  <td colSpan={7} className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                    Likutis bendra vertė su nuolaida:
                  </td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-sm font-bold text-green-600 text-right">
                    €{totalStockValue.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
