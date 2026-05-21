/**
 * Invoice PDF Generator
 * Generates professional service invoice PDFs for Lithuanian veterinary practices
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from './supabase';

function toAscii(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/ą/g, 'a').replace(/Ą/g, 'A')
    .replace(/č/g, 'c').replace(/Č/g, 'C')
    .replace(/ę/g, 'e').replace(/Ę/g, 'E')
    .replace(/ė/g, 'e').replace(/Ė/g, 'E')
    .replace(/į/g, 'i').replace(/Į/g, 'I')
    .replace(/š/g, 's').replace(/Š/g, 'S')
    .replace(/ų/g, 'u').replace(/Ų/g, 'U')
    .replace(/ū/g, 'u').replace(/Ū/g, 'U')
    .replace(/ž/g, 'z').replace(/Ž/g, 'Z');
}

export interface InvoiceData {
  invoice_id: string;
  invoice_number: string;
  invoice_date: string;
  date_from: string;
  date_to: string;
  status: string;
  subtotal: number;
  vat_rate: number;
  vat_amount: number;
  total_amount: number;
  notes?: string;
  
  // Issuer (veterinary practice)
  issuer: {
    name: string;
    company_code?: string;
    vat_code?: string;
    address?: string;
    contact_email?: string;
    contact_phone?: string;
  };
  
  // Recipient (farm)
  recipient: {
    name: string;
    code?: string;
    contact_person?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
  
  // Line items
  items: Array<{
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    charge_type: 'paslauga' | 'produktas';
    visit_date?: string;
    animal_name?: string;
  }>;
}

/**
 * Load full invoice data from database
 */
export async function loadInvoiceData(invoiceId: string, clientId: string): Promise<InvoiceData | null> {
  try {
    // Load invoice header
    const { data: invoice, error: invoiceError } = await supabase
      .from('service_invoices')
      .select(`
        id,
        invoice_number,
        invoice_date,
        date_from,
        date_to,
        status,
        subtotal,
        vat_rate,
        vat_amount,
        total_amount,
        notes,
        farm_id
      `)
      .eq('id', invoiceId)
      .eq('client_id', clientId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error loading invoice:', invoiceError);
      return null;
    }

    // Load client (issuer) info
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, company_code, vat_code, address, contact_email, contact_phone')
      .eq('id', clientId)
      .single();

    if (clientError) {
      console.error('Error loading client:', clientError);
    }

    // Load farm (recipient) info
    const { data: farm, error: farmError } = await supabase
      .from('farms')
      .select('name, code, contact_person, address, contact_phone, contact_email')
      .eq('id', invoice.farm_id)
      .single();

    if (farmError) {
      console.error('Error loading farm:', farmError);
    }

    // Load line items (visit charges)
    const { data: charges, error: chargesError } = await supabase
      .from('visit_charges')
      .select(`
        id,
        charge_type,
        procedure_type,
        product_name,
        description,
        quantity,
        unit_price,
        total_price,
        animal_visits (
          visit_datetime,
          animals (
            tag_no
          )
        )
      `)
      .eq('invoice_id', invoiceId)
      .order('created_at', { ascending: true });

    if (chargesError) {
      console.error('Error loading charges:', chargesError);
    }

    // Transform charges into line items
    const items = (charges || []).map(charge => ({
      description: charge.description || charge.procedure_type || charge.product_name || 'Paslauga',
      quantity: Number(charge.quantity),
      unit: charge.charge_type === 'paslauga' ? 'vnt.' : 'vnt.',
      unit_price: Number(charge.unit_price),
      total_price: Number(charge.total_price),
      charge_type: charge.charge_type as 'paslauga' | 'produktas',
      visit_date: charge.animal_visits?.visit_datetime,
      animal_name: charge.animal_visits?.animals?.tag_no
    }));

    return {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      date_from: invoice.date_from,
      date_to: invoice.date_to,
      status: invoice.status,
      subtotal: Number(invoice.subtotal),
      vat_rate: Number(invoice.vat_rate),
      vat_amount: Number(invoice.vat_amount),
      total_amount: Number(invoice.total_amount),
      notes: invoice.notes,
      issuer: {
        name: client?.name || 'Veterinarijos klinika',
        company_code: client?.company_code,
        vat_code: client?.vat_code,
        address: client?.address,
        contact_email: client?.contact_email,
        contact_phone: client?.contact_phone
      },
      recipient: {
        name: farm?.name || 'Ūkis',
        code: farm?.code,
        contact_person: farm?.contact_person,
        address: farm?.address,
        phone: farm?.contact_phone,
        email: farm?.contact_email
      },
      items
    };
  } catch (error) {
    console.error('Error loading invoice data:', error);
    return null;
  }
}

/**
 * Generate invoice PDF
 */
export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Header - Invoice Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(toAscii('SASKAITA FAKTURA'), pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 10;
  doc.setFontSize(14);
  doc.text(toAscii(`Nr. ${data.invoice_number}`), pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 15;

  // Two-column layout: Issuer (left) and Recipient (right)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  // Issuer info (left column)
  const leftCol = 14;
  const rightCol = 110;
  
  doc.text(toAscii('Paslaugos teikėjas:'), leftCol, yPos);
  doc.text(toAscii('Paslaugos gavėjas:'), rightCol, yPos);
  
  yPos += 6;
  doc.setFont('helvetica', 'normal');
  
  // Issuer details
  let leftYPos = yPos;
  doc.text(toAscii(data.issuer.name), leftCol, leftYPos);
  leftYPos += 5;
  
  if (data.issuer.company_code) {
    doc.text(toAscii(`Imones kodas: ${data.issuer.company_code}`), leftCol, leftYPos);
    leftYPos += 5;
  }
  
  if (data.issuer.vat_code) {
    doc.text(toAscii(`PVM kodas: ${data.issuer.vat_code}`), leftCol, leftYPos);
    leftYPos += 5;
  }
  
  if (data.issuer.address) {
    const addressLines = doc.splitTextToSize(toAscii(data.issuer.address), 85);
    doc.text(addressLines, leftCol, leftYPos);
    leftYPos += 5 * addressLines.length;
  }
  
  if (data.issuer.contact_phone) {
    doc.text(toAscii(`Tel.: ${data.issuer.contact_phone}`), leftCol, leftYPos);
    leftYPos += 5;
  }
  
  if (data.issuer.contact_email) {
    doc.text(toAscii(`El. p.: ${data.issuer.contact_email}`), leftCol, leftYPos);
    leftYPos += 5;
  }
  
  // Recipient details
  let rightYPos = yPos;
  doc.text(toAscii(data.recipient.name), rightCol, rightYPos);
  rightYPos += 5;
  
  if (data.recipient.code) {
    doc.text(toAscii(`Ukio kodas: ${data.recipient.code}`), rightCol, rightYPos);
    rightYPos += 5;
  }
  
  if (data.recipient.contact_person) {
    doc.text(toAscii(`Ats. asmuo: ${data.recipient.contact_person}`), rightCol, rightYPos);
    rightYPos += 5;
  }
  
  if (data.recipient.address) {
    const addressLines = doc.splitTextToSize(toAscii(data.recipient.address), 85);
    doc.text(addressLines, rightCol, rightYPos);
    rightYPos += 5 * addressLines.length;
  }
  
  if (data.recipient.phone) {
    doc.text(toAscii(`Tel.: ${data.recipient.phone}`), rightCol, rightYPos);
    rightYPos += 5;
  }
  
  if (data.recipient.email) {
    doc.text(toAscii(`El. p.: ${data.recipient.email}`), rightCol, rightYPos);
    rightYPos += 5;
  }
  
  yPos = Math.max(leftYPos, rightYPos) + 5;

  // Invoice details
  doc.setFont('helvetica', 'bold');
  doc.text(toAscii('Saskaitos data:'), leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(toAscii(new Date(data.invoice_date).toLocaleDateString('lt-LT')), leftCol + 35, yPos);
  
  yPos += 5;
  doc.setFont('helvetica', 'bold');
  doc.text(toAscii('Paslaugos laikotarpis:'), leftCol, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(
    toAscii(`${new Date(data.date_from).toLocaleDateString('lt-LT')} - ${new Date(data.date_to).toLocaleDateString('lt-LT')}`),
    leftCol + 35,
    yPos
  );
  
  yPos += 10;

  // Line items table
  const tableData = data.items.map(item => [
    toAscii(item.description),
    item.visit_date ? toAscii(new Date(item.visit_date).toLocaleDateString('lt-LT')) : '-',
    item.animal_name ? toAscii(item.animal_name) : '-',
    item.quantity.toFixed(2),
    item.unit,
    `€${item.unit_price.toFixed(2)}`,
    `€${item.total_price.toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [[
      toAscii('Aprasymas'),
      toAscii('Data'),
      toAscii('Gyvunas'),
      toAscii('Kiekis'),
      toAscii('Vnt.'),
      toAscii('Kaina'),
      toAscii('Suma')
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [66, 139, 202],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8
    },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 22, halign: 'center' },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 12, halign: 'center' },
      5: { cellWidth: 22, halign: 'right' },
      6: { cellWidth: 22, halign: 'right' }
    },
    margin: { left: 14, right: 14 },
    styles: {
      overflow: 'linebreak',
      cellPadding: 2
    }
  });

  // Get Y position after table
  yPos = (doc as any).lastAutoTable.finalY + 10;

  // Totals
  const totalsX = pageWidth - 60;
  
  doc.setFont('helvetica', 'normal');
  doc.text(toAscii('Tarpine suma:'), totalsX - 35, yPos);
  doc.text(`€${data.subtotal.toFixed(2)}`, totalsX, yPos, { align: 'right' });
  
  yPos += 6;
  doc.text(toAscii(`PVM (${data.vat_rate}%):`), totalsX - 35, yPos);
  doc.text(`€${data.vat_amount.toFixed(2)}`, totalsX, yPos, { align: 'right' });
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(toAscii('Viso:'), totalsX - 35, yPos);
  doc.text(`€${data.total_amount.toFixed(2)}`, totalsX, yPos, { align: 'right' });
  
  yPos += 10;
  doc.setFontSize(10);

  // Notes
  if (data.notes) {
    yPos += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(toAscii('Pastabos:'), leftCol, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const noteLines = doc.splitTextToSize(toAscii(data.notes), pageWidth - 28);
    doc.text(noteLines, leftCol, yPos);
    yPos += 5 * noteLines.length;
  }

  // Footer
  yPos = doc.internal.pageSize.height - 30;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(toAscii('Saskaita sugeneruota automatiskai'), pageWidth / 2, yPos, { align: 'center' });
  
  yPos += 5;
  doc.text(toAscii(`Statusas: ${data.status}`), pageWidth / 2, yPos, { align: 'center' });

  return doc;
}

/**
 * Generate and download invoice PDF
 */
export async function downloadInvoicePDF(invoiceId: string, clientId: string): Promise<boolean> {
  try {
    const invoiceData = await loadInvoiceData(invoiceId, clientId);
    
    if (!invoiceData) {
      console.error('Failed to load invoice data');
      return false;
    }
    
    const pdf = generateInvoicePDF(invoiceData);
    pdf.save(`${invoiceData.invoice_number}.pdf`);
    
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    return false;
  }
}

/**
 * Generate invoice PDF as blob for preview
 */
export async function generateInvoicePDFBlob(invoiceId: string, clientId: string): Promise<Blob | null> {
  try {
    const invoiceData = await loadInvoiceData(invoiceId, clientId);
    
    if (!invoiceData) {
      console.error('Failed to load invoice data');
      return null;
    }
    
    const pdf = generateInvoicePDF(invoiceData);
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF blob:', error);
    return null;
  }
}
