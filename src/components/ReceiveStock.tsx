import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Supplier, InseminationProduct } from '../lib/types';
import { normalizeNumberInput } from '../lib/helpers';
import { useAuth } from '../contexts/AuthContext';
import { useFarm } from '../contexts/FarmContext';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';
import { Plus, Check, Upload, FileText, X, AlertCircle, CheckCircle, PlusCircle, CreditCard as Edit2, Save, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { getSubcategories, getNestedSubcategories, hasSubcategories, hasNestedSubcategories } from '../lib/categoryHierarchy';

export function ReceiveStock() {
  const { logAction } = useAuth();
  const { selectedFarm } = useFarm();
  const [products, setProducts] = useState<Product[]>([]);
  const [inseminationProducts, setInseminationProducts] = useState<InseminationProduct[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState('');
  const [invoicesData, setInvoicesData] = useState<any[]>([]);
  const [currentInvoiceIndex, setCurrentInvoiceIndex] = useState<number>(0);
  const [matchedProducts, setMatchedProducts] = useState<Map<number, Product | null>>(new Map());
  const [editedItems, setEditedItems] = useState<Map<number, any>>(new Map());
  const [itemsToReceive, setItemsToReceive] = useState<Map<number, boolean>>(new Map());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState<any>(null);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'medicines' as const,
    subcategory: '',
    subcategory_2: '',
    primary_pack_unit: 'ml' as const,
    primary_pack_size: '',
    package_weight_g: '',
    active_substance: '',
    withdrawal_days_meat: '',
    withdrawal_days_milk: '',
    withdrawal_iv_meat: '',
    withdrawal_iv_milk: '',
    withdrawal_im_meat: '',
    withdrawal_im_milk: '',
    withdrawal_sc_meat: '',
    withdrawal_sc_milk: '',
    withdrawal_iu_meat: '',
    withdrawal_iu_milk: '',
    withdrawal_imm_meat: '',
    withdrawal_imm_milk: '',
    withdrawal_pos_meat: '',
    withdrawal_pos_milk: '',
    dosage_notes: '',
    package_count: '',
    total_quantity: '',
  });
  const [bulkReceiveData, setBulkReceiveData] = useState({
    lot: '',
  });
  const [bulkReceiving, setBulkReceiving] = useState(false);
  const [editingHeader, setEditingHeader] = useState(false);
  const [headerData, setHeaderData] = useState<any>(null);
  const [pdfUrls, setPdfUrls] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    product_id: '',
    lot: '',
    mfg_date: '',
    expiry_date: '',
    supplier_id: '',
    doc_title: 'Invoice',
    doc_number: '',
    doc_date: new Date().toISOString().split('T')[0],
    purchase_price: '',
    unit_price: '',
    currency: 'EUR',
    package_size: '',
    package_count: '',
    received_qty: '',
  });

  const [manualCreateMode, setManualCreateMode] = useState(false);
  const [manualProductForm, setManualProductForm] = useState({
    name: '',
    category: 'medicines' as const,
    subcategory: '',
    subcategory_2: '',
    primary_pack_unit: 'ml' as const,
    primary_pack_size: '',
    active_substance: '',
    withdrawal_days_meat: '',
    withdrawal_days_milk: '',
    withdrawal_iv_meat: '',
    withdrawal_iv_milk: '',
    withdrawal_im_meat: '',
    withdrawal_im_milk: '',
    withdrawal_sc_meat: '',
    withdrawal_sc_milk: '',
    withdrawal_iu_meat: '',
    withdrawal_iu_milk: '',
    withdrawal_imm_meat: '',
    withdrawal_imm_milk: '',
    withdrawal_pos_meat: '',
    withdrawal_pos_milk: '',
    dosage_notes: '',
  });

  useEffect(() => {
    loadData();
  }, [selectedFarm]);

  useRealtimeSubscription({
    table: 'products',
    onInsert: useCallback(() => {
      loadData();
    }, []),
    onUpdate: useCallback(() => {
      loadData();
    }, []),
  });

  const loadData = async () => {
    if (!selectedFarm) return;

    const [productsRes, inseminationProductsRes, suppliersRes] = await Promise.all([
      supabase.from('products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true).order('name'),
      supabase.from('insemination_products').select('*').eq('farm_id', selectedFarm.id).eq('is_active', true).order('name'),
      supabase.from('suppliers').select('*').eq('farm_id', selectedFarm.id).order('name'),
    ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (inseminationProductsRes.data) setInseminationProducts(inseminationProductsRes.data);
    if (suppliersRes.data) setSuppliers(suppliersRes.data);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      alert('Prašome pasirinkti bent vieną PDF failą');
      e.target.value = '';
      return;
    }

    if (pdfFiles.length !== files.length) {
      alert(`${files.length - pdfFiles.length} failų praleidžiama (tik PDF palaikomi)`);
    }

    setSelectedFiles(pdfFiles);
    setUploadStatus('idle');
    setUploadMessage('');

    const urls = pdfFiles.map(file => URL.createObjectURL(file));
    setPdfUrls(urls);
  };

  const searchProductMatch = async (itemDescription: string): Promise<Product | null> => {
    const searchTerm = itemDescription.toLowerCase();
    const match = products.find(p =>
      p.name.toLowerCase().includes(searchTerm) ||
      searchTerm.includes(p.name.toLowerCase())
    );
    return match || null;
  };

  const sanitizeFilename = (filename: string): string => {
    return filename
      .replace(/[()]/g, '')
      .replace(/[^\w\s.-]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_');
  };

  const parseInvoiceFile = async (file: File): Promise<any> => {
    const arrayBuffer = await file.arrayBuffer();
    const sanitizedFilename = sanitizeFilename(file.name);

    const response = await fetch('https://n8n-up8s.onrender.com/webhook/36549f46-a08b-4790-bf56-40cdc919e121as', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
      },
      body: arrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error response:', errorText);
      throw new Error(`Serverio klaida: ${response.status} (${file.name})`);
    }

    const responseText = await response.text();
    console.log(`Raw webhook response for ${file.name}:`, responseText);

    if (!responseText || responseText.trim() === '') {
      throw new Error(`Serveris grąžino tuščią atsakymą (${file.name})`);
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error('JSON parse error:', jsonError);
      console.error('Response text:', responseText);
      throw new Error(`Nepavyko perskaityti serverio atsakymo (${file.name})`);
    }

    let invoiceObject;
    if (Array.isArray(data) && data.length > 0) {
      invoiceObject = data[0];
    } else if (data && typeof data === 'object' && !Array.isArray(data)) {
      invoiceObject = data;
    } else {
      throw new Error(`Netinkamas atsakymo formatas (${file.name})`);
    }

    if (!invoiceObject.items || !Array.isArray(invoiceObject.items)) {
      throw new Error(`Atsakyme nerasta prekių sąrašo (${file.name})`);
    }

    return { ...invoiceObject, filename: file.name };
  };

  const handleFileUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploadStatus('uploading');
    setUploadMessage(`Apdorojama ${selectedFiles.length} failų...`);

    try {
      const parsePromises = selectedFiles.map(file => parseInvoiceFile(file));
      const results = await Promise.allSettled(parsePromises);

      const successfulInvoices: any[] = [];
      const failedFiles: string[] = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulInvoices.push(result.value);
        } else {
          failedFiles.push(`${selectedFiles[index].name}: ${result.reason.message}`);
        }
      });

      if (successfulInvoices.length === 0) {
        throw new Error(`Visi failai nepavyko apdoroti:\n${failedFiles.join('\n')}`);
      }

      setInvoicesData(successfulInvoices);
      setCurrentInvoiceIndex(0);

      const firstInvoice = successfulInvoices[0];
      setHeaderData({
        invoice_number: firstInvoice.invoice.number,
        invoice_date: firstInvoice.invoice.date,
        supplier_name: firstInvoice.supplier.name,
        supplier_code: firstInvoice.supplier.code,
        supplier_vat: firstInvoice.supplier.vat_code,
        total_net: firstInvoice.invoice.total_net,
        total_vat: firstInvoice.invoice.total_vat,
        total_gross: firstInvoice.invoice.total_gross,
      });

      const matches = new Map<number, Product | null>();
      const receiveFlags = new Map<number, boolean>();
      for (let i = 0; i < firstInvoice.items.length; i++) {
        const match = await searchProductMatch(firstInvoice.items[i].description);
        matches.set(i, match);
        receiveFlags.set(i, true);
      }
      setMatchedProducts(matches);
      setItemsToReceive(receiveFlags);

      setUploadStatus('success');
      const successMsg = `Sėkmingai apdorota ${successfulInvoices.length} failų! Rasta ${firstInvoice.items.length} prekių pirmoje sąskaitoje.`;
      const warningMsg = failedFiles.length > 0 ? `\n\nKlaidos (${failedFiles.length}):\n${failedFiles.join('\n')}` : '';
      setUploadMessage(successMsg + warningMsg);
    } catch (error: any) {
      setUploadStatus('error');
      setUploadMessage(`Klaida: ${error.message}`);
    }
  };

  const handleRemoveFile = () => {
    pdfUrls.forEach(url => URL.revokeObjectURL(url));
    setPdfUrls([]);
    setSelectedFiles([]);
    setUploadStatus('idle');
    setUploadMessage('');
    setInvoicesData([]);
    setCurrentInvoiceIndex(0);
    setMatchedProducts(new Map());
    setEditedItems(new Map());
    setItemsToReceive(new Map());
    setHeaderData(null);
    setEditingHeader(false);
  };

  const switchToInvoice = async (index: number) => {
    if (index < 0 || index >= invoicesData.length) return;

    setCurrentInvoiceIndex(index);
    const invoice = invoicesData[index];

    setHeaderData({
      invoice_number: invoice.invoice.number,
      invoice_date: invoice.invoice.date,
      supplier_name: invoice.supplier.name,
      supplier_code: invoice.supplier.code,
      supplier_vat: invoice.supplier.vat_code,
      total_net: invoice.invoice.total_net,
      total_vat: invoice.invoice.total_vat,
      total_gross: invoice.invoice.total_gross,
    });

    const matches = new Map<number, Product | null>();
    const receiveFlags = new Map<number, boolean>();
    for (let i = 0; i < invoice.items.length; i++) {
      const match = await searchProductMatch(invoice.items[i].description);
      matches.set(i, match);
      receiveFlags.set(i, true);
    }
    setMatchedProducts(matches);
    setItemsToReceive(receiveFlags);
    setEditedItems(new Map());
  };

  const getCurrentInvoice = () => {
    return invoicesData.length > 0 ? invoicesData[currentInvoiceIndex] : null;
  };

  const handleSaveHeader = () => {
    if (headerData && invoicesData.length > 0) {
      const updatedInvoices = [...invoicesData];
      updatedInvoices[currentInvoiceIndex] = {
        ...updatedInvoices[currentInvoiceIndex],
        invoice: {
          ...updatedInvoices[currentInvoiceIndex].invoice,
          number: headerData.invoice_number,
          date: headerData.invoice_date,
          total_net: parseFloat(headerData.total_net) || 0,
          total_vat: parseFloat(headerData.total_vat) || 0,
          total_gross: parseFloat(headerData.total_gross) || 0,
        },
        supplier: {
          ...updatedInvoices[currentInvoiceIndex].supplier,
          name: headerData.supplier_name,
          code: headerData.supplier_code,
          vat_code: headerData.supplier_vat,
        },
      };
      setInvoicesData(updatedInvoices);
    }
    setEditingHeader(false);
  };

  const getItemData = (item: any, index: number) => {
    const edited = editedItems.get(index);
    return edited || item;
  };

  const handleItemEdit = (index: number, field: string, value: any) => {
    const invoiceData = getCurrentInvoice();
    if (!invoiceData) return;
    
    const currentItem = invoiceData.items[index];
    const edited = editedItems.get(index) || { ...currentItem };
    edited[field] = value;
    const newEdited = new Map(editedItems);
    newEdited.set(index, edited);
    setEditedItems(newEdited);
  };

  const handleProductMatch = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    const newMatches = new Map(matchedProducts);
    newMatches.set(index, product || null);
    setMatchedProducts(newMatches);
  };

  const handleCreateProduct = (item: any, index: number) => {
    // Get the edited data if it exists
    const itemData = getItemData(item, index);
    setCreatingProduct({ ...itemData, index });
    setNewProductForm({
      name: itemData.description || '',
      category: 'medicines',
      subcategory: '',
      subcategory_2: '',
      primary_pack_unit: 'ml',
      primary_pack_size: itemData.package_size?.toString() || '',
      package_weight_g: '',
      active_substance: '',
      withdrawal_days_meat: '0',
      withdrawal_days_milk: '0',
      dosage_notes: '',
      package_count: itemData.package_count?.toString() || '',
      total_quantity: itemData.qty?.toString() || '',
    });
    setShowCreateModal(true);
  };

  const handleSaveNewProduct = async () => {
    if (!newProductForm.name || !newProductForm.category) {
      alert('Užpildykite privalomus laukus');
      return;
    }

    if (['medicines', 'svirkstukai'].includes(newProductForm.category) && (!newProductForm.withdrawal_days_meat || !newProductForm.withdrawal_days_milk)) {
      alert('Vaistams ir švirkštukams privaloma nurodyti karencines dienas');
      return;
    }

    try {
      if (!selectedFarm) {
        alert('Pasirinkite ūkį');
        return;
      }

      const productData = {
        farm_id: selectedFarm.id,
        name: newProductForm.name,
        category: newProductForm.category,
        subcategory: newProductForm.subcategory || null,
        subcategory_2: newProductForm.subcategory_2 || null,
        primary_pack_unit: newProductForm.primary_pack_unit,
        primary_pack_size: newProductForm.primary_pack_size ? parseFloat(newProductForm.primary_pack_size) : null,
        package_weight_g: newProductForm.package_weight_g ? parseFloat(newProductForm.package_weight_g) : null,
        active_substance: newProductForm.active_substance || null,
        withdrawal_days_meat: (['medicines', 'svirkstukai'].includes(newProductForm.category) && newProductForm.withdrawal_days_meat) ? parseInt(newProductForm.withdrawal_days_meat) : null,
        withdrawal_days_milk: (['medicines', 'svirkstukai'].includes(newProductForm.category) && newProductForm.withdrawal_days_milk) ? parseInt(newProductForm.withdrawal_days_milk) : null,
        withdrawal_iv_meat: newProductForm.withdrawal_iv_meat ? parseInt(newProductForm.withdrawal_iv_meat) : null,
        withdrawal_iv_milk: newProductForm.withdrawal_iv_milk ? parseInt(newProductForm.withdrawal_iv_milk) : null,
        withdrawal_im_meat: newProductForm.withdrawal_im_meat ? parseInt(newProductForm.withdrawal_im_meat) : null,
        withdrawal_im_milk: newProductForm.withdrawal_im_milk ? parseInt(newProductForm.withdrawal_im_milk) : null,
        withdrawal_sc_meat: newProductForm.withdrawal_sc_meat ? parseInt(newProductForm.withdrawal_sc_meat) : null,
        withdrawal_sc_milk: newProductForm.withdrawal_sc_milk ? parseInt(newProductForm.withdrawal_sc_milk) : null,
        withdrawal_iu_meat: newProductForm.withdrawal_iu_meat ? parseInt(newProductForm.withdrawal_iu_meat) : null,
        withdrawal_iu_milk: newProductForm.withdrawal_iu_milk ? parseInt(newProductForm.withdrawal_iu_milk) : null,
        withdrawal_imm_meat: newProductForm.withdrawal_imm_meat ? parseInt(newProductForm.withdrawal_imm_meat) : null,
        withdrawal_imm_milk: newProductForm.withdrawal_imm_milk ? parseInt(newProductForm.withdrawal_imm_milk) : null,
        withdrawal_pos_meat: newProductForm.withdrawal_pos_meat ? parseInt(newProductForm.withdrawal_pos_meat) : null,
        withdrawal_pos_milk: newProductForm.withdrawal_pos_milk ? parseInt(newProductForm.withdrawal_pos_milk) : null,
        dosage_notes: newProductForm.dosage_notes || null,
        is_active: true,
      };

      const { data: newProduct, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (error) throw error;

      // Do NOT insert batches here: masinis priėmimas / priėmimas iš sąskaitos jau kuria partijas.
      // Auto-creating stock on product save caused duplicate batches and doubled quantities.

      await loadData();

      // Use the stored index from creatingProduct
      if (creatingProduct.index !== undefined) {
        const newMatches = new Map(matchedProducts);
        newMatches.set(creatingProduct.index, newProduct);
        setMatchedProducts(newMatches);
      }

      setShowCreateModal(false);
      setCreatingProduct(null);
      setNewProductForm({
        name: '',
        category: 'medicines',
        subcategory: '',
        subcategory_2: '',
        primary_pack_unit: 'ml',
        primary_pack_size: '',
        package_weight_g: '',
        active_substance: '',
        withdrawal_days_meat: '',
        withdrawal_days_milk: '',
        dosage_notes: '',
        package_count: '',
        total_quantity: '',
      });
      alert('Produktas sėkmingai sukurtas! Atsargas įkelkite paspaudę „Masinis priėmimas“ (arba vieną eilutę – Priimti).');
    } catch (error: any) {
      alert('Klaida kuriant produktą: ' + error.message);
    }
  };

  const handleBulkReceive = async () => {
    const invoiceData = getCurrentInvoice();
    if (!invoiceData || !invoiceData.supplier) {
      alert('Nėra sąskaitos duomenų');
      return;
    }

    const matchedItems = invoiceData.items.filter((_: any, index: number) => {
      const matched = matchedProducts.get(index);
      return matched !== undefined && matched !== null;
    });

    if (matchedItems.length === 0) {
      alert('Nėra susieti produktai. Prašome susieti produktus prieš priėmimą.');
      return;
    }

    const allItemsHaveData = invoiceData.items.every((_: any, index: number) => {
      if (!matchedProducts.get(index)) return true;
      const shouldReceive = itemsToReceive.get(index) !== false;
      if (!shouldReceive) return true;
      const itemData = getItemData(invoiceData.items[index], index);
      return (itemData.batch || bulkReceiveData.lot) && itemData.expiry;
    });

    if (!allItemsHaveData) {
      alert('Prašome užpildyti serijos numerius ir galiojimo datas pažymėtoms prekėms.');
      return;
    }

    setBulkReceiving(true);

    try {
      let supplierId = invoiceData.supplier_id;

      if (!supplierId) {
        const { data: existingSupplier } = await supabase
          .from('suppliers')
          .select('id')
          .eq('name', invoiceData.supplier.name)
          .maybeSingle();

        if (existingSupplier) {
          supplierId = existingSupplier.id;
        } else {
          const { data: newSupplier, error: supplierError } = await supabase
            .from('suppliers')
            .insert({
              farm_id: selectedFarm.id,
              name: invoiceData.supplier.name,
              code: invoiceData.supplier.code || null,
              vat_code: invoiceData.supplier.vat_code || null,
            })
            .select()
            .single();

          if (supplierError) throw supplierError;
          supplierId = newSupplier.id;
        }
      }

      // First, create the invoice record
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          farm_id: selectedFarm.id,
          invoice_number: invoiceData.invoice.number,
          invoice_date: invoiceData.invoice.date || new Date().toISOString().split('T')[0],
          doc_title: 'Invoice',
          supplier_id: supplierId,
          supplier_name: invoiceData.supplier.name,
          supplier_code: invoiceData.supplier.code || null,
          supplier_vat: invoiceData.supplier.vat_code || null,
          currency: invoiceData.invoice.currency || 'EUR',
          total_net: parseFloat(invoiceData.invoice.total_net) || 0,
          total_vat: parseFloat(invoiceData.invoice.total_vat) || 0,
          total_gross: parseFloat(invoiceData.invoice.total_gross) || 0,
          vat_rate: parseFloat(invoiceData.invoice.vat_rate) || 0,
          pdf_filename: invoiceData.filename || null,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Now create batches and invoice items
      const stockEntries = [];
      const invoiceItemsEntries = [];

      for (let i = 0; i < invoiceData.items.length; i++) {
        const matched = matchedProducts.get(i);
        const shouldReceive = itemsToReceive.get(i) !== false;
        if (!matched || !shouldReceive) continue;

        const itemData = getItemData(invoiceData.items[i], i);

        // Use extracted package data if available, otherwise use product defaults
        const packageSize = itemData.package_size ? parseFloat(itemData.package_size) : null;
        const packageCount = itemData.package_count ? parseFloat(itemData.package_count) : null;

        // Get quantity from itemData
        const qty = parseFloat(itemData.qty) || 0;

        // Get total price: NEVER multiply, use extracted net value or user's edited value
        const totalPrice = itemData.editable_total_price !== undefined
          ? parseFloat(itemData.editable_total_price)
          : parseFloat(itemData.net) || 0;

        // Calculate unit price
        const unitPrice = qty > 0 ? (totalPrice / qty) : 0;

        stockEntries.push({
          farm_id: selectedFarm.id,
          product_id: matched.id,
          lot: itemData.batch || bulkReceiveData.lot || null,
          mfg_date: null,
          expiry_date: itemData.expiry || null,
          supplier_id: supplierId,
          doc_title: 'Invoice',
          doc_number: invoiceData.invoice.number,
          doc_date: invoiceData.invoice.date || new Date().toISOString().split('T')[0],
          purchase_price: totalPrice,
          currency: invoiceData.invoice.currency || 'EUR',
          package_size: packageSize,
          package_count: packageCount,
          received_qty: packageSize && packageCount ? packageSize * packageCount : qty,
        });

        // Store invoice item data for later insertion (use webhook's original values)
        const discountPct =
          itemData.discount != null && itemData.discount !== ''
            ? parseFloat(String(itemData.discount))
            : null;

        invoiceItemsEntries.push({
          farm_id: selectedFarm.id,
          invoice_id: invoice.id,
          product_id: matched.id,
          line_no: itemData.line_no,
          description: itemData.description,
          sku: itemData.sku,
          quantity: qty,
          unit_price: unitPrice,
          total_price: totalPrice,
          discount_percent: discountPct != null && Number.isFinite(discountPct) ? discountPct : null,
        });
      }

      const { data: batches, error: batchesError } = await supabase
        .from('batches')
        .insert(stockEntries)
        .select();

      if (batchesError) throw batchesError;

      // Link batches to invoice items
      const invoiceItemsWithBatches = invoiceItemsEntries.map((item, index) => ({
        ...item,
        batch_id: batches[index]?.id || null,
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItemsWithBatches);

      if (itemsError) throw itemsError;

      alert(`Sėkmingai priimta ${stockEntries.length} produktų!`);
      
      // Remove current invoice from the list
      const updatedInvoices = invoicesData.filter((_, idx) => idx !== currentInvoiceIndex);
      const updatedFiles = selectedFiles.filter((_, idx) => idx !== currentInvoiceIndex);
      const updatedUrls = pdfUrls.filter((_, idx) => idx !== currentInvoiceIndex);
      
      // Revoke the current PDF URL
      if (pdfUrls[currentInvoiceIndex]) {
        URL.revokeObjectURL(pdfUrls[currentInvoiceIndex]);
      }
      
      setInvoicesData(updatedInvoices);
      setSelectedFiles(updatedFiles);
      setPdfUrls(updatedUrls);
      
      // Reset to first invoice or clear if none left
      if (updatedInvoices.length > 0) {
        const newIndex = Math.min(currentInvoiceIndex, updatedInvoices.length - 1);
        await switchToInvoice(newIndex);
      } else {
        setCurrentInvoiceIndex(0);
        setMatchedProducts(new Map());
        setEditedItems(new Map());
        setItemsToReceive(new Map());
        setHeaderData(null);
        setUploadStatus('idle');
      }
      
      setBulkReceiveData({
        lot: '',
      });

      await loadData();
    } catch (error: any) {
      alert('Klaida priimant produktus: ' + error.message);
    } finally {
      setBulkReceiving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      let productId = formData.product_id;

      // If in manual create mode, create the product first
      if (manualCreateMode) {
        const productData: any = {
          name: manualProductForm.name,
          category: manualProductForm.category,
          subcategory: manualProductForm.subcategory || null,
          subcategory_2: manualProductForm.subcategory_2 || null,
          primary_pack_unit: manualProductForm.primary_pack_unit,
          primary_pack_size: parseFloat(manualProductForm.primary_pack_size),
          active_substance: manualProductForm.active_substance || null,
          dosage_notes: manualProductForm.dosage_notes || null,
          is_active: true,
        };

        if (manualProductForm.withdrawal_days_meat) {
          productData.withdrawal_days_meat = parseInt(manualProductForm.withdrawal_days_meat);
        }
        if (manualProductForm.withdrawal_days_milk) {
          productData.withdrawal_days_milk = parseInt(manualProductForm.withdrawal_days_milk);
        }
        if (manualProductForm.withdrawal_iv_meat) {
          productData.withdrawal_iv_meat = parseInt(manualProductForm.withdrawal_iv_meat);
        }
        if (manualProductForm.withdrawal_iv_milk) {
          productData.withdrawal_iv_milk = parseInt(manualProductForm.withdrawal_iv_milk);
        }
        if (manualProductForm.withdrawal_im_meat) {
          productData.withdrawal_im_meat = parseInt(manualProductForm.withdrawal_im_meat);
        }
        if (manualProductForm.withdrawal_im_milk) {
          productData.withdrawal_im_milk = parseInt(manualProductForm.withdrawal_im_milk);
        }
        if (manualProductForm.withdrawal_sc_meat) {
          productData.withdrawal_sc_meat = parseInt(manualProductForm.withdrawal_sc_meat);
        }
        if (manualProductForm.withdrawal_sc_milk) {
          productData.withdrawal_sc_milk = parseInt(manualProductForm.withdrawal_sc_milk);
        }
        if (manualProductForm.withdrawal_iu_meat) {
          productData.withdrawal_iu_meat = parseInt(manualProductForm.withdrawal_iu_meat);
        }
        if (manualProductForm.withdrawal_iu_milk) {
          productData.withdrawal_iu_milk = parseInt(manualProductForm.withdrawal_iu_milk);
        }
        if (manualProductForm.withdrawal_imm_meat) {
          productData.withdrawal_imm_meat = parseInt(manualProductForm.withdrawal_imm_meat);
        }
        if (manualProductForm.withdrawal_imm_milk) {
          productData.withdrawal_imm_milk = parseInt(manualProductForm.withdrawal_imm_milk);
        }
        if (manualProductForm.withdrawal_pos_meat) {
          productData.withdrawal_pos_meat = parseInt(manualProductForm.withdrawal_pos_meat);
        }
        if (manualProductForm.withdrawal_pos_milk) {
          productData.withdrawal_pos_milk = parseInt(manualProductForm.withdrawal_pos_milk);
        }

        const { data: newProduct, error: productError } = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();

        if (productError) throw productError;
        productId = newProduct.id;

        await logAction(
          'create',
          'products',
          newProduct.id,
          null,
          { name: newProduct.name, category: newProduct.category }
        );

        // Reset manual create mode
        setManualCreateMode(false);
        setManualProductForm({
          name: '',
          category: 'medicines' as const,
          subcategory: '',
          subcategory_2: '',
          primary_pack_unit: 'ml' as const,
          primary_pack_size: '',
          active_substance: '',
          withdrawal_days_meat: '',
          withdrawal_days_milk: '',
          dosage_notes: '',
        });
      }

      const isInseminationProduct = productId.startsWith('insem-');

      if (isInseminationProduct) {
        const actualProductId = productId.replace('insem-', '');
        let receivedQty = 0;

        if (formData.package_size && formData.package_count) {
          receivedQty = parseFloat(formData.package_size) * parseFloat(formData.package_count);
        } else if (formData.received_qty) {
          receivedQty = parseFloat(formData.received_qty);
        }

        if (!selectedFarm) {
          alert('Pasirinkite ūkį');
          return;
        }

        const inventoryData = {
          farm_id: selectedFarm.id,
          product_id: actualProductId,
          quantity: receivedQty,
          batch_number: formData.lot || null,
          expiry_date: formData.expiry_date || null,
          received_date: new Date().toISOString().split('T')[0],
          notes: formData.doc_number ? `Sąskaita: ${formData.doc_number}` : null,
        };

        const { error } = await supabase.from('insemination_inventory').insert(inventoryData);
        if (error) throw error;

        await logAction(
          'receive_stock',
          'insemination_inventory',
          null,
          null,
          {
            product_id: actualProductId,
            quantity: receivedQty,
            batch_number: formData.lot,
          }
        );
      } else {
        if (!selectedFarm) {
          alert('Pasirinkite ūkį');
          return;
        }

        const batchData: any = {
          farm_id: selectedFarm.id,
          product_id: productId,
          lot: formData.lot || null,
          mfg_date: formData.mfg_date || null,
          expiry_date: formData.expiry_date || null,
          supplier_id: formData.supplier_id || null,
          doc_title: formData.doc_title,
          doc_number: formData.doc_number || null,
          doc_date: formData.doc_date || null,
          purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
          currency: formData.currency,
        };

        if (formData.package_size && formData.package_count) {
          batchData.package_size = parseFloat(formData.package_size);
          batchData.package_count = parseFloat(formData.package_count);
          batchData.received_qty = parseFloat(formData.package_size) * parseFloat(formData.package_count);
        } else if (formData.received_qty) {
          batchData.received_qty = parseFloat(formData.received_qty);
        }

        const { error } = await supabase.from('batches').insert(batchData);
        if (error) throw error;

        await logAction(
          'receive_stock',
          'batches',
          null,
          null,
          {
            product_id: productId,
            lot: formData.lot,
            received_qty: formData.received_qty,
            doc_number: formData.doc_number,
          }
        );
      }

      setSuccess(true);
      setFormData({
        product_id: '',
        lot: '',
        mfg_date: '',
        expiry_date: '',
        supplier_id: '',
        doc_title: 'Invoice',
        doc_number: '',
        doc_date: new Date().toISOString().split('T')[0],
        purchase_price: '',
        unit_price: '',
        currency: 'EUR',
        package_size: '',
        package_count: '',
        received_qty: '',
      });

      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      alert('Klaida: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const invoiceData = getCurrentInvoice();
  const currentPdfUrl = pdfUrls.length > 0 ? pdfUrls[currentInvoiceIndex] : null;

  return (
    <div className={invoiceData && currentPdfUrl ? "flex gap-6 h-[calc(100vh-8rem)]" : "max-w-3xl mx-auto"}>
      {invoiceData && currentPdfUrl && (
        <div className="w-1/2 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              PDF Sąskaita {invoicesData.length > 1 && `(${currentInvoiceIndex + 1}/${invoicesData.length})`}
            </h3>
            {invoicesData.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => switchToInvoice(currentInvoiceIndex - 1)}
                  disabled={currentInvoiceIndex === 0}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Ankstesnė sąskaita"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => switchToInvoice(currentInvoiceIndex + 1)}
                  disabled={currentInvoiceIndex === invoicesData.length - 1}
                  className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Kita sąskaita"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
          <iframe
            src={currentPdfUrl}
            className="w-full flex-1 border-2 border-gray-200 rounded-lg"
            title="Invoice PDF"
          />
        </div>
      )}
      <div className={invoiceData && currentPdfUrl ? "flex-1 overflow-y-auto bg-white rounded-xl shadow-sm border border-gray-100" : "bg-white rounded-xl shadow-sm border border-gray-100"}>
        <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-50 p-2 rounded-lg">
            <Plus className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Priėmimo registravimas</h2>
            <p className="text-sm text-gray-600">Pridėti naują partiją į atsargas</p>
          </div>
        </div>

        {success && (
          <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <Check className="w-5 h-5" />
            <span>Atsargos sėkmingai priimtos!</span>
          </div>
        )}

        <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">PDF dokumento įkėlimas</h3>
              <p className="text-sm text-gray-600">Įkelkite priėmimo dokumentą (sąskaitą, važtaraštį ir kt.)</p>
            </div>
          </div>

          {selectedFiles.length === 0 ? (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                  multiple
                />
                <FileText className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Spustelėkite arba tempkite PDF failus čia
                </p>
                <p className="text-xs text-gray-500">Palaikomi tik PDF failai (galima pasirinkti kelis)</p>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-gray-50 rounded-lg">
                {selectedFiles.map((file, idx) => {
                  const isProcessed = idx < invoicesData.length;
                  const isCurrent = idx === currentInvoiceIndex && invoicesData.length > 0;
                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isCurrent 
                          ? 'bg-blue-100 border-blue-400 border-2' 
                          : isProcessed 
                          ? 'bg-white border-blue-200' 
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <FileText className={`w-6 h-6 flex-shrink-0 ${isCurrent ? 'text-blue-700' : 'text-blue-600'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate text-sm ${isCurrent ? 'text-blue-900' : 'text-gray-900'}`}>
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(file.size / 1024).toFixed(1)} KB
                          {isCurrent && ' • Dabartinė'}
                          {isProcessed && !isCurrent && ' • Apdorota'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">
                  Pasirinkta failų: {selectedFiles.length}
                </span>
                <button
                  onClick={handleRemoveFile}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  disabled={uploadStatus === 'uploading'}
                >
                  Išvalyti
                </button>
              </div>

              {uploadMessage && (
                <div className={`px-4 py-3 rounded-lg flex items-start gap-2 ${
                  uploadStatus === 'success'
                    ? 'bg-blue-50 border border-blue-200 text-blue-700'
                    : uploadStatus === 'error'
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-blue-50 border border-blue-200 text-blue-700'
                }`}>
                  {uploadStatus === 'success' && <Check className="w-5 h-5 flex-shrink-0" />}
                  <span className="text-sm font-medium whitespace-pre-line">{uploadMessage}</span>
                </div>
              )}

              <button
                onClick={handleFileUpload}
                disabled={uploadStatus === 'uploading'}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Upload className="w-5 h-5" />
                {uploadStatus === 'uploading' ? 'Apdorojama...' : `Apdoroti ${selectedFiles.length} failų`}
              </button>
            </div>
          )}
        </div>

        {invoiceData && headerData && (
          <div className="mb-6 p-6 bg-white border-2 border-gray-200 rounded-xl">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900">Sąskaitos duomenys</h3>
                {!editingHeader ? (
                  <button
                    onClick={() => setEditingHeader(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Redaguoti
                  </button>
                ) : (
                  <button
                    onClick={handleSaveHeader}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Išsaugoti
                  </button>
                )}
              </div>

              {!editingHeader ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Sąskaita Nr.</p>
                      <p className="font-semibold text-gray-900">{invoiceData.invoice.number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Data</p>
                      <p className="font-semibold text-gray-900">{invoiceData.invoice.date}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Valiuta</p>
                      <p className="font-semibold text-gray-900">{invoiceData.invoice.currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Tiekėjas</p>
                      <p className="font-semibold text-gray-900">{invoiceData.supplier.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Tiekėjo kodas</p>
                      <p className="font-semibold text-gray-900">{invoiceData.supplier.code || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">PVM kodas</p>
                      <p className="font-semibold text-gray-900">{invoiceData.supplier.vat_code || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-50 rounded-lg border-2 border-blue-200">
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Suma be PVM</p>
                      <p className="font-bold text-blue-700 text-lg">
                        €{invoiceData.invoice.total_net?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">PVM ({invoiceData.invoice.vat_rate || 0}%)</p>
                      <p className="font-bold text-orange-700 text-lg">
                        €{invoiceData.invoice.total_vat?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 mb-1">Viso su PVM</p>
                      <p className="font-bold text-blue-700 text-xl">
                        €{invoiceData.invoice.total_gross?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Sąskaita Nr.</label>
                      <input
                        type="text"
                        value={headerData.invoice_number}
                        onChange={(e) => setHeaderData({ ...headerData, invoice_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Data</label>
                      <input
                        type="date"
                        value={headerData.invoice_date}
                        onChange={(e) => setHeaderData({ ...headerData, invoice_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Valiuta</label>
                      <input
                        type="text"
                        value={invoiceData.invoice.currency}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tiekėjas</label>
                      <input
                        type="text"
                        value={headerData.supplier_name}
                        onChange={(e) => setHeaderData({ ...headerData, supplier_name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Tiekėjo kodas</label>
                      <input
                        type="text"
                        value={headerData.supplier_code || ''}
                        onChange={(e) => setHeaderData({ ...headerData, supplier_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">PVM kodas</label>
                      <input
                        type="text"
                        value={headerData.supplier_vat || ''}
                        onChange={(e) => setHeaderData({ ...headerData, supplier_vat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 bg-white rounded-lg border border-gray-300">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Suma be PVM (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={headerData.total_net || 0}
                        onChange={(e) => setHeaderData({ ...headerData, total_net: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">PVM (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={headerData.total_vat || 0}
                        onChange={(e) => setHeaderData({ ...headerData, total_vat: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-orange-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Viso su PVM (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={headerData.total_gross || 0}
                        onChange={(e) => setHeaderData({ ...headerData, total_gross: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold text-blue-700 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-900 mb-3">Prekės ({invoiceData.items.length})</h4>
              <div className="space-y-2">
                {invoiceData.items.map((item: any, index: number) => {
                  const matchedProduct = matchedProducts.get(index);
                  const isMatched = matchedProduct !== undefined && matchedProduct !== null;

                  const isChecked = itemsToReceive.get(index) !== false;
                  return (
                    <div
                      key={item.line_no}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        !isChecked
                          ? 'bg-gray-100 border-gray-300 opacity-50'
                          : isMatched
                          ? 'bg-blue-50 border-blue-300'
                          : 'bg-amber-50 border-amber-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          checked={itemsToReceive.get(index) !== false}
                          onChange={(e) => {
                            const newFlags = new Map(itemsToReceive);
                            newFlags.set(index, e.target.checked);
                            setItemsToReceive(newFlags);
                          }}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                          title={itemsToReceive.get(index) !== false ? "Pašalinti žymėjimą" : "Įtraukti į pajamimą"}
                        />
                        {isMatched ? (
                          <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-semibold text-gray-700 text-sm">#{item.line_no}:</span>
                          <input
                            type="text"
                            value={getItemData(item, index).description}
                            onChange={(e) => handleItemEdit(index, 'description', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 text-xs mb-2">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          <div>
                            <span className="text-gray-600">SKU:</span>{' '}
                            <input
                              type="text"
                              value={getItemData(item, index).sku}
                              onChange={(e) => handleItemEdit(index, 'sku', e.target.value)}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">Nuolaida %:</span>{' '}
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={(() => {
                                const d = getItemData(item, index).discount;
                                return d != null && d !== '' ? String(d) : '';
                              })()}
                              onChange={(e) => {
                                const v = e.target.value;
                                handleItemEdit(index, 'discount', v === '' ? null : v);
                              }}
                              className="w-14 px-1 py-0.5 border border-gray-300 rounded text-xs"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">Pak. dydis:</span>{' '}
                            <input
                              type="number"
                              step="0.01"
                              value={getItemData(item, index).package_size || ''}
                              onChange={(e) => {
                                handleItemEdit(index, 'package_size', e.target.value);
                                const pkgSize = parseFloat(e.target.value) || 0;
                                const pkgCount = parseFloat(getItemData(item, index).package_count) || 0;
                                if (pkgSize && pkgCount) {
                                  const newQty = (pkgSize * pkgCount).toString();
                                  handleItemEdit(index, 'qty', newQty);
                                  const itemData = getItemData(item, index);
                                  const totalPrice = itemData.editable_total_price !== undefined
                                    ? parseFloat(itemData.editable_total_price)
                                    : (itemData.net ? parseFloat(itemData.net) : 0);
                                  const qty = parseFloat(newQty) || 0;
                                  if (qty > 0 && totalPrice) {
                                    const perUnitPrice = (totalPrice / qty).toFixed(4);
                                    handleItemEdit(index, 'price_per_unit', perUnitPrice);
                                  }
                                }
                              }}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                              placeholder="10"
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">Kiek pak.:</span>{' '}
                            <input
                              type="number"
                              step="0.01"
                              value={getItemData(item, index).package_count || ''}
                              onChange={(e) => {
                                handleItemEdit(index, 'package_count', e.target.value);
                                const pkgSize = parseFloat(getItemData(item, index).package_size) || 0;
                                const pkgCount = parseFloat(e.target.value) || 0;
                                if (pkgSize && pkgCount) {
                                  const newQty = (pkgSize * pkgCount).toString();
                                  handleItemEdit(index, 'qty', newQty);
                                  const itemData = getItemData(item, index);
                                  const totalPrice = itemData.editable_total_price !== undefined
                                    ? parseFloat(itemData.editable_total_price)
                                    : (itemData.net ? parseFloat(itemData.net) : 0);
                                  const qty = parseFloat(newQty) || 0;
                                  if (qty > 0 && totalPrice) {
                                    const perUnitPrice = (totalPrice / qty).toFixed(4);
                                    handleItemEdit(index, 'price_per_unit', perUnitPrice);
                                  }
                                }
                              }}
                              className="w-16 px-1 py-0.5 border border-gray-300 rounded text-xs"
                              placeholder="6"
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">Viso:</span>{' '}
                            <input
                              type="number"
                              step="0.01"
                              value={getItemData(item, index).qty}
                              onChange={(e) => {
                                const newQty = e.target.value;
                                handleItemEdit(index, 'qty', newQty);
                                const itemData = getItemData(item, index);
                                const totalPrice = itemData.editable_total_price !== undefined
                                  ? parseFloat(itemData.editable_total_price)
                                  : (itemData.net ? parseFloat(itemData.net) : 0);
                                const qty = parseFloat(newQty) || 0;
                                if (qty > 0 && totalPrice) {
                                  const perUnitPrice = (totalPrice / qty).toFixed(4);
                                  handleItemEdit(index, 'price_per_unit', perUnitPrice);
                                }
                              }}
                              className="w-16 px-1 py-0.5 border border-blue-300 rounded text-xs font-semibold bg-blue-50"
                              readOnly={!!(getItemData(item, index).package_size && getItemData(item, index).package_count)}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-gray-600">Galutinė kaina:</span>{' '}
                            <input
                              type="number"
                              step="0.01"
                              value={(() => {
                                const itemData = getItemData(item, index);
                                // If user edited, use that value
                                if (itemData.editable_total_price !== undefined) {
                                  return itemData.editable_total_price;
                                }
                                // Otherwise use webhook's net field - NEVER calculate
                                return itemData.net ? parseFloat(itemData.net).toFixed(2) : '0.00';
                              })()}
                              onChange={(e) => {
                                const totalPrice = e.target.value;
                                handleItemEdit(index, 'editable_total_price', totalPrice);
                                const qty = parseFloat(getItemData(item, index).qty) || 0;
                                if (qty > 0 && totalPrice) {
                                  const perUnitPrice = (parseFloat(totalPrice) / qty).toFixed(4);
                                  handleItemEdit(index, 'price_per_unit', perUnitPrice);
                                }
                              }}
                              className="w-20 px-1 py-0.5 border-2 border-blue-300 rounded text-xs font-semibold bg-blue-50"
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">
                              {(() => {
                                const unit = matchedProduct?.primary_pack_unit || 'vnt';
                                const unitLabels: Record<string, string> = {
                                  'ml': 'ml',
                                  'l': 'l',
                                  'g': 'g',
                                  'kg': 'kg',
                                  'vnt': 'vnt',
                                  'tablet': 'tab',
                                  'bolus': 'bol',
                                  'syringe': 'švir'
                                };
                                return `${unitLabels[unit] || 'vnt'} kaina:`;
                              })()}
                            </span>{' '}
                            <input
                              type="number"
                              step="0.0001"
                              value={getItemData(item, index).price_per_unit || ''}
                              readOnly
                              className="w-20 px-1 py-0.5 border-2 border-blue-300 rounded text-xs font-semibold bg-blue-50"
                            />
                          </div>
                        </div>
                        {matchedProduct && (
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            📦 {matchedProduct.name} - Matavimo vienetas: {matchedProduct.primary_pack_unit}
                            {(() => {
                              const itemData = getItemData(item, index);
                              // Get the final total price (edited or webhook) - NEVER calculate
                              const finalPrice = itemData.editable_total_price !== undefined
                                ? itemData.editable_total_price
                                : (itemData.net ? parseFloat(itemData.net).toFixed(2) : '0.00');
                              const qty = parseFloat(itemData.qty) || 0;
                              if (finalPrice && qty) {
                                return (
                                  <span className="ml-2">
                                    ({finalPrice} ÷ {qty} = {itemData.price_per_unit || '...'} EUR/{matchedProduct.primary_pack_unit})
                                  </span>
                                );
                              }
                              return null;
                            })()}
                            {getItemData(item, index).price_per_unit && getItemData(item, index).qty && (
                              <span className="ml-2 text-blue-600">
                                | Tikrinimas: {getItemData(item, index).price_per_unit} × {getItemData(item, index).qty} = {(() => {
                                  const qty = parseFloat(getItemData(item, index).qty) || 0;
                                  const perUnit = parseFloat(getItemData(item, index).price_per_unit) || 0;
                                  return (qty * perUnit).toFixed(2);
                                })()} EUR
                              </span>
                            )}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
                          <div>
                            <span className="text-gray-600">Serija:</span>{' '}
                            <input
                              type="text"
                              value={getItemData(item, index).batch || ''}
                              onChange={(e) => handleItemEdit(index, 'batch', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                              placeholder="Serijos Nr."
                            />
                          </div>
                          <div>
                            <span className="text-gray-600">Galioja iki:</span>{' '}
                            <input
                              type="date"
                              value={getItemData(item, index).expiry || ''}
                              onChange={(e) => handleItemEdit(index, 'expiry', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {isMatched ? (
                        <div className="flex items-center justify-between text-xs bg-white px-2 py-1 rounded border border-blue-200">
                          <div className="flex items-center gap-2">
                            <span className="text-blue-800"><strong>Produktas:</strong></span>
                            <select
                              value={matchedProduct.id}
                              onChange={(e) => handleProductMatch(index, e.target.value)}
                              className="px-2 py-0.5 border border-blue-300 rounded text-xs bg-white"
                            >
                              {products.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.category})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <p className="text-xs text-amber-800 font-semibold">
                              Produktas nerastas
                            </p>
                            <select
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleProductMatch(index, e.target.value);
                                }
                              }}
                              className="px-2 py-0.5 border border-amber-300 rounded text-xs bg-white"
                              defaultValue=""
                            >
                              <option value="">Pasirinkti esamą...</option>
                              {products.filter(p => p.is_active).map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.category})
                                </option>
                              ))}
                            </select>
                          </div>
                          <button
                            onClick={() => handleCreateProduct(item, index)}
                            className="flex items-center gap-1 px-3 py-1 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-700 transition-colors"
                          >
                            <PlusCircle className="w-3 h-3" />
                            Sukurti naują
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-xl">
              <h4 className="text-lg font-bold text-gray-900 mb-2">Masinis priėmimas</h4>
              <p className="text-xs text-gray-600 mb-4">
                💡 <strong>Patarimas:</strong> Jei kiekviena prekė turi savo seriją ir galiojimo datą (automatiškai ištraukta iš PDF), galite priimti be šių laukų pildymo. Arba užpildinkit šiuos laukus, jei norite naudoti tą pačią datą visoms prekėms.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partija (global)
                  </label>
                  <input
                    type="text"
                    value={bulkReceiveData.lot}
                    onChange={(e) => setBulkReceiveData({ ...bulkReceiveData, lot: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    placeholder="Jei neustatyta prekėje"
                  />
                </div>
              </div>
              <button
                onClick={handleBulkReceive}
                disabled={bulkReceiving}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check className="w-5 h-5" />
                {bulkReceiving ? 'Priimama...' : `Priimti pažymėtus produktus (${
                  Array.from(matchedProducts.entries())
                    .filter(([index, product]) => product !== null && itemsToReceive.get(index) !== false)
                    .length
                })`}
              </button>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Sukurti naują produktą</h3>

              {creatingProduct && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <h4 className="text-sm font-bold text-blue-900 mb-2">Duomenys iš sąskaitos:</h4>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Pakuotės dydis:</span>
                      <p className="font-bold text-blue-900">{creatingProduct.package_size || 'Nenustatyta'}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Pakuočių skaičius:</span>
                      <p className="font-bold text-blue-900">{creatingProduct.package_count || 'Nenustatyta'}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Viso:</span>
                      <p className="font-bold text-blue-700">{creatingProduct.qty || 'Nenustatyta'}</p>
                    </div>
                  </div>
                  {creatingProduct.package_size && creatingProduct.package_count ? (
                    <p className="text-xs text-blue-600 mt-2 font-medium">
                      {creatingProduct.package_count} pak. × {creatingProduct.package_size} = {creatingProduct.qty} viso
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600 mt-2 font-medium">
                      Pakuočių informacija nebuvo automatiškai ištraukta iš PDF
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Pavadinimas *
                    </label>
                    <input
                      type="text"
                      value={newProductForm.name}
                      onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Produkto pavadinimas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kategorija *
                    </label>
                    <select
                      value={newProductForm.category}
                      onChange={(e) => {
                        const newCategory = e.target.value as any;
                        setNewProductForm({
                          ...newProductForm,
                          category: newCategory,
                          subcategory: '',
                          subcategory_2: '',
                          // Force vnt unit for Švirkštukai category
                          primary_pack_unit: newCategory === 'svirkstukai' ? 'vnt' : newProductForm.primary_pack_unit,
                          // Auto-fill withdrawal days with 0 when switching to medicines
                          withdrawal_days_meat: newCategory === 'medicines' ? '0' : newProductForm.withdrawal_days_meat,
                          withdrawal_days_milk: newCategory === 'medicines' ? '0' : newProductForm.withdrawal_days_milk,
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

                  {hasSubcategories(newProductForm.category) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Subkategorija
                      </label>
                      <select
                        value={newProductForm.subcategory}
                        onChange={(e) => {
                          setNewProductForm({
                            ...newProductForm,
                            subcategory: e.target.value,
                            subcategory_2: '',
                          });
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Pasirinkite subkategoriją</option>
                        {getSubcategories(newProductForm.category).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {newProductForm.subcategory && hasNestedSubcategories(newProductForm.category, newProductForm.subcategory) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Detali subkategorija
                      </label>
                      <select
                        value={newProductForm.subcategory_2}
                        onChange={(e) => setNewProductForm({ ...newProductForm, subcategory_2: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Pasirinkite detalią subkategoriją</option>
                        {getNestedSubcategories(newProductForm.category, newProductForm.subcategory).map(sub2 => (
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
                      value={newProductForm.primary_pack_size}
                      onChange={(e) => setNewProductForm({ ...newProductForm, primary_pack_size: e.target.value })}
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
                      value={newProductForm.primary_pack_unit}
                      onChange={(e) => setNewProductForm({ ...newProductForm, primary_pack_unit: e.target.value as any })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={newProductForm.category === 'svirkstukai'}
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

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Veiklioji medžiaga
                    </label>
                    <input
                      type="text"
                      value={newProductForm.active_substance}
                      onChange={(e) => setNewProductForm({ ...newProductForm, active_substance: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Pvz: Penicilinas"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      Pakuotės svoris (tuščios)
                      <span className="text-xs text-gray-500 font-normal">g</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={newProductForm.package_weight_g}
                      onChange={(e) => setNewProductForm({ ...newProductForm, package_weight_g: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="pvz., 45.5"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Tuščios pakuotės svoris gramais. Automatiškai sukuriamas medicininių atliekų įrašas kai visas paketas panaudotas.
                    </p>
                  </div>

                  {(newProductForm.category === 'medicines' || newProductForm.category === 'svirkstukai') && (
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
                          value={newProductForm.withdrawal_days_meat}
                          onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_days_meat: e.target.value })}
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
                          value={newProductForm.withdrawal_days_milk}
                          onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_days_milk: e.target.value })}
                          className="w-full px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-blue-50"
                          placeholder="5"
                        />
                      </div>

                      {/* Route-specific withdrawal periods */}
                      <div className="md:col-span-2 bg-gray-50 border border-gray-300 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Karencijos pagal būdą (dienomis)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.v (į veną) - Mėsa</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_iv_meat}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_iv_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.v - Pienas</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_iv_milk}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_iv_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.m (į raumenį) - Mėsa</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_im_meat}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_im_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.m - Pienas</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_im_milk}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_im_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">s.c (po oda) - Mėsa</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_sc_meat}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_sc_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">s.c - Pienas</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_sc_milk}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_sc_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.u (į gimdą) - Mėsa</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_iu_meat}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_iu_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.u - Pienas</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_iu_milk}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_iu_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.mm (į spenį) - Mėsa</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_imm_meat}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_imm_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.mm - Pienas</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_imm_milk}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_imm_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">p.o.s (per burną) - Mėsa</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_pos_meat}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_pos_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">p.o.s - Pienas</label>
                            <input
                              type="number"
                              value={newProductForm.withdrawal_pos_milk}
                              onChange={(e) => setNewProductForm({ ...newProductForm, withdrawal_pos_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Dozavimo pastabos
                    </label>
                    <textarea
                      value={newProductForm.dosage_notes}
                      onChange={(e) => setNewProductForm({ ...newProductForm, dosage_notes: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Papildomos dozavimo instrukcijos..."
                      rows={3}
                    />
                  </div>
                </div>

                {newProductForm.category === 'medicines' && (
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
              </div>

              <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreatingProduct(null);
                    setNewProductForm({
                      name: '',
                      category: 'medicines',
                      subcategory: '',
                      subcategory_2: '',
                      primary_pack_unit: 'ml',
                      primary_pack_size: '',
                      package_weight_g: '',
                      active_substance: '',
                      withdrawal_days_meat: '',
                      withdrawal_days_milk: '',
                      dosage_notes: '',
                      package_count: '',
                      total_quantity: '',
                    });
                  }}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Atšaukti
                </button>
                <button
                  onClick={handleSaveNewProduct}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Sukurti produktą
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t-2 border-gray-200 pt-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Rankinis priėmimo registravimas</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Produktas *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setManualCreateMode(!manualCreateMode);
                    setFormData({ ...formData, product_id: '' });
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {manualCreateMode ? (
                    <>
                      <X className="w-4 h-4" />
                      Atšaukti kūrimą
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-4 h-4" />
                      Sukurti naują produktą
                    </>
                  )}
                </button>
              </div>

              {!manualCreateMode ? (
                <>
                  <select
                    value={formData.product_id}
                    onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Pasirinkite produktą...</option>
                    <optgroup label="Vaistai ir produktai">
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.primary_pack_size}{product.primary_pack_unit} ({product.category})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Sėklinimo produktai">
                      {inseminationProducts.map((product) => (
                        <option key={`insem-${product.id}`} value={`insem-${product.id}`}>
                          {product.name} - {product.unit} ({product.product_type === 'SPERM' ? 'Sperma' : 'Pirštinės'})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  {formData.product_id && (() => {
                    const selectedProduct = products.find(p => p.id === formData.product_id);
                    const selectedInsemProduct = inseminationProducts.find(p => `insem-${p.id}` === formData.product_id);
                    const unit = selectedProduct?.primary_pack_unit || selectedInsemProduct?.unit || 'vnt';
                    return (selectedProduct || selectedInsemProduct) ? (
                      <p className="text-xs text-blue-600 mt-1 font-medium">
                        📦 Matavimo vienetas: {unit}
                      </p>
                    ) : null;
                  })()}
                </>
              ) : (
                <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pavadinimas *
                      </label>
                      <input
                        type="text"
                        value={manualProductForm.name}
                        onChange={(e) => setManualProductForm({ ...manualProductForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Produkto pavadinimas"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kategorija *
                      </label>
                      <select
                        value={manualProductForm.category}
                        onChange={(e) => {
                          const newCategory = e.target.value as any;
                          setManualProductForm({
                            ...manualProductForm,
                            category: newCategory,
                            subcategory: '',
                            subcategory_2: '',
                            primary_pack_unit: newCategory === 'svirkstukai' ? 'vnt' : manualProductForm.primary_pack_unit,
                            withdrawal_days_meat: newCategory === 'medicines' ? '0' : manualProductForm.withdrawal_days_meat,
                            withdrawal_days_milk: newCategory === 'medicines' ? '0' : manualProductForm.withdrawal_days_milk,
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

                    {hasSubcategories(manualProductForm.category) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Subkategorija
                        </label>
                        <select
                          value={manualProductForm.subcategory}
                          onChange={(e) => {
                            setManualProductForm({
                              ...manualProductForm,
                              subcategory: e.target.value,
                              subcategory_2: '',
                            });
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Pasirinkite subkategoriją</option>
                          {getSubcategories(manualProductForm.category).map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {manualProductForm.subcategory && hasNestedSubcategories(manualProductForm.category, manualProductForm.subcategory) && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Detali subkategorija
                        </label>
                        <select
                          value={manualProductForm.subcategory_2}
                          onChange={(e) => setManualProductForm({ ...manualProductForm, subcategory_2: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">Pasirinkite detalią subkategoriją</option>
                          {getNestedSubcategories(manualProductForm.category, manualProductForm.subcategory).map(sub2 => (
                            <option key={sub2} value={sub2}>{sub2}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Pakuotės dydis *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={manualProductForm.primary_pack_size}
                        onChange={(e) => setManualProductForm({ ...manualProductForm, primary_pack_size: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="100"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vienetas *
                      </label>
                      <select
                        value={manualProductForm.primary_pack_unit}
                        onChange={(e) => setManualProductForm({ ...manualProductForm, primary_pack_unit: e.target.value as any })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={manualProductForm.category === 'svirkstukai'}
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

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Veiklioji medžiaga
                      </label>
                      <input
                        type="text"
                        value={manualProductForm.active_substance}
                        onChange={(e) => setManualProductForm({ ...manualProductForm, active_substance: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Pvz: Amoxicillin"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Išlaukos mėsai (dienos)
                      </label>
                      <input
                        type="number"
                        value={manualProductForm.withdrawal_days_meat}
                        onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_days_meat: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Išlaukos pienui (dienos)
                      </label>
                      <input
                        type="number"
                        value={manualProductForm.withdrawal_days_milk}
                        onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_days_milk: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="0"
                      />
                    </div>

                    {/* Route-specific withdrawal periods */}
                    {(manualProductForm.category === 'medicines' || manualProductForm.category === 'svirkstukai') && (
                      <div className="md:col-span-2 bg-gray-50 border border-gray-300 rounded-lg p-4">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Karencijos pagal būdą (dienomis)</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.v (į veną) - Mėsa</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_iv_meat}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_iv_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.v - Pienas</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_iv_milk}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_iv_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.m (į raumenį) - Mėsa</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_im_meat}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_im_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.m - Pienas</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_im_milk}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_im_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">s.c (po oda) - Mėsa</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_sc_meat}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_sc_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">s.c - Pienas</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_sc_milk}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_sc_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.u (į gimdą) - Mėsa</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_iu_meat}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_iu_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.u - Pienas</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_iu_milk}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_iu_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.mm (į spenį) - Mėsa</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_imm_meat}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_imm_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">i.mm - Pienas</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_imm_milk}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_imm_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">p.o.s (per burną) - Mėsa</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_pos_meat}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_pos_meat: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">p.o.s - Pienas</label>
                            <input
                              type="number"
                              value={manualProductForm.withdrawal_pos_milk}
                              onChange={(e) => setManualProductForm({ ...manualProductForm, withdrawal_pos_milk: e.target.value })}
                              className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm"
                              placeholder="0"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PARTIJA / Serijos numeris
              </label>
              <input
                type="text"
                value={formData.lot}
                onChange={(e) => setFormData({ ...formData, lot: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="PARTIJA-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pakuotės dydis
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.package_size}
                onChange={(e) => {
                  const newPackageSize = e.target.value;
                  setFormData(prev => {
                    const newQty = newPackageSize && prev.package_count ?
                      (parseFloat(newPackageSize) * parseFloat(prev.package_count)).toString() : prev.received_qty;
                    const price = parseFloat(prev.purchase_price) || 0;
                    const qty = parseFloat(newQty) || 0;
                    const unitPrice = qty > 0 && price ? (price / qty).toFixed(4) : prev.unit_price;
                    return {
                      ...prev,
                      package_size: newPackageSize,
                      received_qty: newQty,
                      unit_price: unitPrice
                    };
                  });
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="pvz: 10 (viena pakuotė)"
              />
              <p className="text-xs text-gray-500 mt-1">Vienos pakuotės dydis (pvz: 1 buteliukas = 10ml)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kiek pakuočių
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.package_count}
                onChange={(e) => {
                  const newPackageCount = e.target.value;
                  setFormData(prev => {
                    const newQty = prev.package_size && newPackageCount ?
                      (parseFloat(prev.package_size) * parseFloat(newPackageCount)).toString() : prev.received_qty;
                    const price = parseFloat(prev.purchase_price) || 0;
                    const qty = parseFloat(newQty) || 0;
                    const unitPrice = qty > 0 && price ? (price / qty).toFixed(4) : prev.unit_price;
                    return {
                      ...prev,
                      package_count: newPackageCount,
                      received_qty: newQty,
                      unit_price: unitPrice
                    };
                  });
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="pvz: 6 (buteliukų)"
              />
              <p className="text-xs text-gray-500 mt-1">Kiek pakuočių priimta</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Viso kiekis {formData.package_size && formData.package_count && (
                  <span className="text-blue-600 font-bold">
                    (apskaičiuota automatiškai)
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.received_qty}
                onChange={(e) => {
                  const newQty = e.target.value;
                  setFormData(prev => {
                    const price = parseFloat(prev.purchase_price) || 0;
                    const qty = parseFloat(newQty) || 0;
                    const unitPrice = qty > 0 && price ? (price / qty).toFixed(4) : '';
                    return {
                      ...prev,
                      received_qty: newQty,
                      unit_price: unitPrice
                    };
                  });
                }}
                className="w-full px-4 py-2.5 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 font-semibold"
                placeholder="100"
                required
                readOnly={!!(formData.package_size && formData.package_count)}
              />
              <p className="text-xs text-blue-600 mt-1 font-medium">
                {formData.package_size && formData.package_count ? (
                  `${formData.package_count} × ${formData.package_size} = ${formData.received_qty || '0'}`
                ) : (
                  'Arba įveskite bendrą kiekį tiesiogiai'
                )}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gamybos data
              </label>
              <input
                type="date"
                value={formData.mfg_date}
                onChange={(e) => setFormData({ ...formData, mfg_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Galiojimo pabaiga
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiekėjas
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Pasirinkite tiekėją...</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento pavadinimas
              </label>
              <input
                type="text"
                value={formData.doc_title}
                onChange={(e) => setFormData({ ...formData, doc_title: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Sąskaita"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento numeris
              </label>
              <input
                type="text"
                value={formData.doc_number}
                onChange={(e) => setFormData({ ...formData, doc_number: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="S-2025-001"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dokumento data
              </label>
              <input
                type="date"
                value={formData.doc_date}
                onChange={(e) => setFormData({ ...formData, doc_date: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pirkimo kaina (viso) *
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_price}
                  onChange={(e) => {
                    const newPrice = e.target.value;
                    setFormData(prev => {
                      const qty = parseFloat(prev.received_qty) || 0;
                      const unitPrice = qty > 0 && newPrice ? (parseFloat(newPrice) / qty).toFixed(4) : '';
                      return {
                        ...prev,
                        purchase_price: newPrice,
                        unit_price: unitPrice
                      };
                    });
                  }}
                  className="flex-1 px-4 py-2.5 border-2 border-orange-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-orange-50 font-semibold"
                  placeholder="100.00"
                />
                <select
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                  <option value="GBP">GBP</option>
                </select>
              </div>
              <p className="text-xs text-orange-600 mt-1 font-medium">Visa pirkimo kaina - pagrindinė reikšmė</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(() => {
                  const selectedProduct = products.find(p => p.id === formData.product_id);
                  const selectedInsemProduct = inseminationProducts.find(p => `insem-${p.id}` === formData.product_id);
                  const unit = selectedProduct?.primary_pack_unit || selectedInsemProduct?.unit || 'vnt';
                  const unitLabels: Record<string, string> = {
                    'ml': 'Mililitro',
                    'l': 'Litro',
                    'g': 'Gramo',
                    'kg': 'Kilogramo',
                    'vnt': 'Vieneto',
                    'tablet': 'Tabletės',
                    'bolus': 'Boluso',
                    'syringe': 'Švirkšto'
                  };
                  return `${unitLabels[unit] || 'Vieneto'} kaina`;
                })()} {formData.unit_price && (
                  <span className="text-blue-600 font-bold">(auto)</span>
                )}
              </label>
              <input
                type="number"
                step="0.0001"
                value={formData.unit_price}
                readOnly
                className="w-full px-4 py-2.5 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-blue-50 font-semibold"
                placeholder="0.1667"
              />
              <p className="text-xs text-blue-600 mt-1 font-medium">
                {formData.received_qty && formData.purchase_price ? (
                  `${formData.purchase_price} EUR ÷ ${formData.received_qty} = ${formData.unit_price} EUR/${(() => {
                    const selectedProduct = products.find(p => p.id === formData.product_id);
                    const selectedInsemProduct = inseminationProducts.find(p => `insem-${p.id}` === formData.product_id);
                    return selectedProduct?.primary_pack_unit || selectedInsemProduct?.unit || 'vnt';
                  })()}`
                ) : (
                  'Automatiškai apskaičiuojama iš kainos ir kiekio'
                )}
              </p>
            </div>

          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-500 focus:ring-opacity-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Registruojama...' : 'Registruoti priėmimą'}
            </button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
}
