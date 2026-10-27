import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { supabaseAdmin } from '../lib/supabase.js';

export interface InvoiceItem {
  description: string;
  amount: number;
}

export interface CreateInvoiceInput {
  patientId: string;
  visitId?: string;
  createdBy: string;
  items: InvoiceItem[];
}

function waShareLink(phone: string, patientName: string, url: string): string {
  const digits = phone.replace(/[^\d]/g, '');
  const withCountry = digits.startsWith('91') ? digits : `91${digits}`;
  const text = `Hi ${patientName}, here is your receipt from Dr. Kusum's Dental Care: ${url}`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}

async function renderReceiptPdf(params: {
  patientName: string;
  patientPhone: string | null;
  items: InvoiceItem[];
  total: number;
  invoiceId: string;
  date: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([420, 595]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.09, 0.1, 0.1);
  const muted = rgb(0.42, 0.44, 0.42);
  const accent = rgb(0.14, 0.26, 0.36);

  let y = 545;
  page.drawText("Dr. Kusum's Dental Care", { x: 40, y, size: 16, font: bold, color: accent });
  y -= 18;
  page.drawText('17, 5th Main, 2nd Cross, Malleshpalya, Bangalore - 560075', { x: 40, y, size: 8, font, color: muted });
  y -= 12;
  page.drawText('+91 84319 07976  ·  +91 81231 07976', { x: 40, y, size: 8, font, color: muted });

  y -= 30;
  page.drawLine({ start: { x: 40, y }, end: { x: 380, y }, thickness: 1, color: rgb(0.87, 0.85, 0.8) });

  y -= 26;
  page.drawText('RECEIPT', { x: 40, y, size: 12, font: bold, color: ink });
  page.drawText(`#${params.invoiceId.slice(0, 8).toUpperCase()}`, { x: 320, y, size: 9, font, color: muted });
  y -= 16;
  page.drawText(`Date: ${params.date}`, { x: 40, y, size: 9, font, color: muted });
  y -= 14;
  page.drawText(`Patient: ${params.patientName}`, { x: 40, y, size: 9, font, color: muted });
  if (params.patientPhone) {
    y -= 14;
    page.drawText(`Phone: ${params.patientPhone}`, { x: 40, y, size: 9, font, color: muted });
  }

  y -= 30;
  page.drawText('Description', { x: 40, y, size: 9, font: bold, color: ink });
  page.drawText('Amount', { x: 320, y, size: 9, font: bold, color: ink });
  y -= 8;
  page.drawLine({ start: { x: 40, y }, end: { x: 380, y }, thickness: 0.5, color: rgb(0.87, 0.85, 0.8) });

  for (const item of params.items) {
    y -= 20;
    page.drawText(item.description, { x: 40, y, size: 9, font, color: ink, maxWidth: 260 });
    page.drawText(`Rs. ${item.amount.toLocaleString('en-IN')}`, { x: 320, y, size: 9, font, color: ink });
  }

  y -= 16;
  page.drawLine({ start: { x: 40, y }, end: { x: 380, y }, thickness: 1, color: rgb(0.87, 0.85, 0.8) });
  y -= 22;
  page.drawText('Total', { x: 40, y, size: 11, font: bold, color: accent });
  page.drawText(`Rs. ${params.total.toLocaleString('en-IN')}`, { x: 320, y, size: 11, font: bold, color: accent });

  y -= 40;
  page.drawText('Thank you for trusting us with your smile.', { x: 40, y, size: 8, font, color: muted });

  return doc.save();
}

export class InvoiceService {
  async create(input: CreateInvoiceInput) {
    if (!input.items.length) throw new ValidationError('At least one line item is required', ['items']);

    const total = input.items.reduce((sum, item) => sum + item.amount, 0);

    const { data: patient, error: patientError } = await supabaseAdmin
      .from('profiles')
      .select('full_name, phone')
      .eq('id', input.patientId)
      .single();

    if (patientError || !patient) throw new NotFoundError('Patient not found');

    const { data: invoice, error } = await supabaseAdmin
      .from('invoices')
      .insert({
        patient_id: input.patientId,
        visit_id: input.visitId ?? null,
        created_by: input.createdBy,
        items: input.items,
        amount: total,
        status: 'UNPAID',
      })
      .select('*')
      .single();

    if (error || !invoice) throw new NotFoundError(error?.message ?? 'Could not create invoice');

    const pdfBytes = await renderReceiptPdf({
      patientName: patient.full_name,
      patientPhone: patient.phone,
      items: input.items,
      total,
      invoiceId: invoice.id,
      date: new Date(invoice.created_at as string).toLocaleDateString('en-IN'),
    });

    const storagePath = `${input.patientId}/invoices/${invoice.id}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('patient-files')
      .upload(storagePath, pdfBytes, { contentType: 'application/pdf' });

    if (uploadError) throw new NotFoundError(uploadError.message);

    await supabaseAdmin.from('invoices').update({ storage_path: storagePath }).eq('id', invoice.id);

    const { data: signed } = await supabaseAdmin.storage
      .from('patient-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7); // 7 days — long enough to actually forward/open

    const url = signed?.signedUrl ?? null;

    return {
      ...invoice,
      storage_path: storagePath,
      url,
      waShareLink: url && patient.phone ? waShareLink(patient.phone, patient.full_name, url) : null,
    };
  }

  async listForPatient(patientId: string) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });

    if (error) throw new NotFoundError(error.message);
    return data ?? [];
  }

  async markPaid(id: string) {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({ status: 'PAID' })
      .eq('id', id)
      .select('*')
      .single();

    if (error || !data) throw new NotFoundError('Invoice not found');
    return data;
  }
}
