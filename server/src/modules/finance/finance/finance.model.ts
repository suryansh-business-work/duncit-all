import { Schema, model, type Document } from 'mongoose';

export interface IFinanceSettings extends Document {
  singleton_key: string;
  platform_fee_pct: number;
  gst_pct: number;
  currency_symbol: string;
  invoice_prefix: string;
  invoice_counter: number;
  dummy_mode: boolean;
  business_name: string;
  business_address: string;
  business_gstin: string;
  created_at: Date;
  updated_at: Date;
}

const financeSettingsSchema = new Schema<IFinanceSettings>(
  {
    singleton_key: { type: String, required: true, unique: true, default: 'finance' },
    platform_fee_pct: { type: Number, default: 5, min: 0, max: 50 },
    gst_pct: { type: Number, default: 18, min: 0, max: 50 },
    currency_symbol: { type: String, default: '₹' },
    invoice_prefix: { type: String, default: 'DUN' },
    invoice_counter: { type: Number, default: 0 },
    dummy_mode: { type: Boolean, default: true },
    business_name: { type: String, default: 'Duncit Technologies Pvt. Ltd.' },
    business_address: { type: String, default: '' },
    business_gstin: { type: String, default: '' },
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
