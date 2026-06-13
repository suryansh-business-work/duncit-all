import { Schema, model, type Document } from 'mongoose';

export interface IFinanceSettings extends Document {
  singleton_key: string;
  platform_fee_pct: number;
  gst_pct: number;
  // Global "Default Deductions" — fallbacks used at settlement when a host /
  // venue / product has no per-entity override. Two %s per side: a SHARE the
  // host/venue keeps, and the COMMISSION Duncit takes from that share.
  default_host_share_pct: number;
  default_host_commission_pct: number;
  default_venue_share_pct: number;
  default_venue_commission_pct: number;
  default_product_commission_pct: number;
  // Payout cycles — when approved venue/host payouts are disbursed. IMMEDIATE
  // releases on approval; WEEKLY runs on payout_day_of_week; MONTH_END at the
  // month's last day. payout_time is the HH:mm the batch runs.
  venue_payout_mode: string;
  host_payout_mode: string;
  payout_day_of_week: number;
  payout_time: string;
  currency_symbol: string;
  invoice_prefix: string;
  invoice_counter: number;
  dummy_mode: boolean;
  business_name: string;
  business_address: string;
  business_gstin: string;
  // Invoice / ticket branding — all configurable from the Finance portal's
  // Invoice Management page; never hardcode these in the PDF generators.
  invoice_label: string;
  invoice_support_email: string;
  invoice_support_phone: string;
  invoice_footer_note: string;
  invoice_terms: string;
  invoice_logo_url: string;
  // Per-party invoice templates sent on pod completion (label/terms/footer/note),
  // configured in Finance → Invoices. Business identity (above) is shared.
  invoice_templates: IInvoiceTemplates;
  created_at: Date;
  updated_at: Date;
}

export interface IPartyInvoiceTemplate {
  label: string;
  terms: string;
  footer: string;
  note: string;
}

export interface IInvoiceTemplates {
  venue: IPartyInvoiceTemplate;
  host: IPartyInvoiceTemplate;
  product: IPartyInvoiceTemplate;
}

const partyTemplate = (label: string) =>
  new Schema<IPartyInvoiceTemplate>(
    {
      label: { type: String, default: label, trim: true, maxlength: 80 },
      terms: { type: String, default: '', trim: true, maxlength: 2000 },
      footer: {
        type: String,
        default: 'This is a computer-generated document and does not require a signature.',
        trim: true,
        maxlength: 500,
      },
      note: { type: String, default: '', trim: true, maxlength: 500 },
    },
    { _id: false }
  );

const invoiceTemplatesSchema = new Schema<IInvoiceTemplates>(
  {
    venue: { type: partyTemplate('VENUE PAYOUT INVOICE'), default: () => ({}) },
    host: { type: partyTemplate('HOST PAYOUT INVOICE'), default: () => ({}) },
    product: { type: partyTemplate('PRODUCT INVOICE'), default: () => ({}) },
  },
  { _id: false }
);

const financeSettingsSchema = new Schema<IFinanceSettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'finance' },
    platform_fee_pct: { type: Number, default: 5, min: 0, max: 50 },
    gst_pct: { type: Number, default: 18, min: 0, max: 50 },
    default_host_share_pct: { type: Number, default: 60, min: 0, max: 100 },
    default_host_commission_pct: { type: Number, default: 10, min: 0, max: 100 },
    default_venue_share_pct: { type: Number, default: 90, min: 0, max: 100 },
    default_venue_commission_pct: { type: Number, default: 10, min: 0, max: 100 },
    default_product_commission_pct: { type: Number, default: 5, min: 0, max: 100 },
    venue_payout_mode: { type: String, enum: ['IMMEDIATE', 'WEEKLY', 'MONTH_END'], default: 'IMMEDIATE' },
    host_payout_mode: { type: String, enum: ['IMMEDIATE', 'WEEKLY', 'MONTH_END'], default: 'IMMEDIATE' },
    payout_day_of_week: { type: Number, default: 1, min: 0, max: 6 },
    payout_time: { type: String, default: '18:00' },
    currency_symbol: { type: String, default: '₹' },
    invoice_prefix: { type: String, default: 'DUN' },
    invoice_counter: { type: Number, default: 0 },
    dummy_mode: { type: Boolean, default: true },
    business_name: { type: String, default: 'Duncit' },
    business_address: { type: String, default: '' },
    business_gstin: { type: String, default: '' },
    invoice_label: { type: String, default: 'TAX INVOICE' },
    invoice_support_email: { type: String, default: '' },
    invoice_support_phone: { type: String, default: '' },
    invoice_footer_note: {
      type: String,
      default: 'This is a computer-generated invoice and does not require a signature.',
    },
    invoice_terms: { type: String, default: '' },
    invoice_logo_url: { type: String, default: '' },
    invoice_templates: { type: invoiceTemplatesSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const FinanceSettingsModel = model<IFinanceSettings>('FinanceSettings', financeSettingsSchema);

export async function getFinanceSettings(): Promise<IFinanceSettings> {
  let doc = await FinanceSettingsModel.findOne({ singleton_key: 'finance' });
  if (!doc) doc = await FinanceSettingsModel.create({ singleton_key: 'finance' });
  return doc;
}

export async function nextInvoiceNumber(): Promise<string> {
  const doc = await FinanceSettingsModel.findOneAndUpdate(
    { singleton_key: 'finance' },
    { $inc: { invoice_counter: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const fy = (() => {
    const d = new Date();
    const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${String(y).slice(-2)}${String(y + 1).slice(-2)}`;
  })();
  const num = String(doc.invoice_counter).padStart(6, '0');
  return `${doc.invoice_prefix}/${fy}/${num}`;
}
