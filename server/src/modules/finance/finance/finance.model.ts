import { Schema, model, type ClientSession, type Document } from 'mongoose';

export interface IFinanceSettings extends Document {
  singleton_key: string;
  platform_fee_pct: number;
  gst_pct: number;
  // Global "Default Deductions" — commission fallbacks used at settlement when
  // a host / venue / product has no per-entity override. Engine v2: the venue's
  // money is its booked slot price and the host keeps the pool remainder, so
  // the *_share_pct fields are legacy/dormant (kept for stored data only).
  default_host_share_pct: number;
  default_host_commission_pct: number;
  default_venue_share_pct: number;
  default_venue_commission_pct: number;
  default_product_commission_pct: number;
  // Club-admin cut % (0–10) taken off every pod's pool after GST + platform fee,
  // before the venue/host split — counts as Duncit revenue (disbursed later).
  default_club_admin_pct: number;
  // % kept from a member's refund when they back out of a paid pod (0 = full
  // refund). Config only for now — applied by the refund flow (built later).
  default_backout_deduction_pct: number;
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
  // Role-wise minimum withdrawal amounts (Finance → Withdrawals → Withdrawal
  // Settings). One independently editable floor per withdrawer role.
  min_withdrawal: IMinWithdrawal;
  created_at: Date;
  updated_at: Date;
}

/** The four capacities someone can withdraw earnings in. */
export type WithdrawerRole = 'HOST' | 'VENUE_OWNER' | 'ECOMM_MANAGER' | 'CLUB_ADMIN';

export const WITHDRAWER_ROLES: WithdrawerRole[] = ['HOST', 'VENUE_OWNER', 'ECOMM_MANAGER', 'CLUB_ADMIN'];

/** Every role's floor starts at this, and a role with no stored value reads it. */
export const DEFAULT_MIN_WITHDRAWAL = 1000;

export interface IMinWithdrawal {
  host: number;
  venue_owner: number;
  ecomm_manager: number;
  club_admin: number;
}

export type MinWithdrawalField = keyof IMinWithdrawal;

/** Role key -> its field on the min_withdrawal sub-document. */
export const MIN_WITHDRAWAL_FIELD: Record<WithdrawerRole, MinWithdrawalField> = {
  HOST: 'host',
  VENUE_OWNER: 'venue_owner',
  ECOMM_MANAGER: 'ecomm_manager',
  CLUB_ADMIN: 'club_admin',
};

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

const minWithdrawalSchema = new Schema<IMinWithdrawal>(
  {
    host: { type: Number, default: DEFAULT_MIN_WITHDRAWAL, min: 0 },
    venue_owner: { type: Number, default: DEFAULT_MIN_WITHDRAWAL, min: 0 },
    ecomm_manager: { type: Number, default: DEFAULT_MIN_WITHDRAWAL, min: 0 },
    club_admin: { type: Number, default: DEFAULT_MIN_WITHDRAWAL, min: 0 },
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
    default_club_admin_pct: { type: Number, default: 0, min: 0, max: 10 },
    default_backout_deduction_pct: { type: Number, default: 0, min: 0, max: 100 },
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
    min_withdrawal: { type: minWithdrawalSchema, default: () => ({}) },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const FinanceSettingsModel = model<IFinanceSettings>('FinanceSettings', financeSettingsSchema);

export async function getFinanceSettings(): Promise<IFinanceSettings> {
  let doc = await FinanceSettingsModel.findOne({ singleton_key: 'finance' });
  if (!doc) doc = await FinanceSettingsModel.create({ singleton_key: 'finance' });
  return doc;
}

/**
 * The four role-wise minimum withdrawal amounts, every one guaranteed present.
 * Settings documents written before this feature have no `min_withdrawal`, so
 * each field falls back to DEFAULT_MIN_WITHDRAWAL rather than reading 0 — a
 * missing setting must never mean "no floor".
 */
export async function getMinWithdrawals(): Promise<IMinWithdrawal> {
  const doc = await getFinanceSettings();
  const stored = doc.min_withdrawal;
  return {
    host: stored?.host ?? DEFAULT_MIN_WITHDRAWAL,
    venue_owner: stored?.venue_owner ?? DEFAULT_MIN_WITHDRAWAL,
    ecomm_manager: stored?.ecomm_manager ?? DEFAULT_MIN_WITHDRAWAL,
    club_admin: stored?.club_admin ?? DEFAULT_MIN_WITHDRAWAL,
  };
}

/**
 * Patch the role-wise minimums. Each supplied role is written as its OWN dotted
 * `$set` path (`min_withdrawal.host`) — `$set`ting the whole sub-document would
 * replace it, so saving one role's floor would silently reset the other three
 * to their defaults. Roles absent from the patch are left exactly as they are.
 */
export async function setMinWithdrawals(patch: Partial<IMinWithdrawal>): Promise<IMinWithdrawal> {
  await getFinanceSettings(); // singleton must exist before a dotted $set
  const set: Record<string, number> = {};
  for (const field of Object.values(MIN_WITHDRAWAL_FIELD)) {
    const value = patch[field];
    if (typeof value === 'number') set[`min_withdrawal.${field}`] = value;
  }
  if (Object.keys(set).length > 0) {
    await FinanceSettingsModel.updateOne({ singleton_key: 'finance' }, { $set: set });
  }
  return getMinWithdrawals();
}

/**
 * The next invoice number, allocated atomically.
 *
 * Takes the caller's transaction session when there is one, so a number handed
 * to a booking that then rolls back is rolled back with it — otherwise the
 * counter would step for an invoice nobody ever receives.
 */
export async function nextInvoiceNumber(session?: ClientSession): Promise<string> {
  const doc = await FinanceSettingsModel.findOneAndUpdate(
    { singleton_key: 'finance' },
    { $inc: { invoice_counter: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true, session }
  );
  const fy = (() => {
    const d = new Date();
    const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
    return `${String(y).slice(-2)}${String(y + 1).slice(-2)}`;
  })();
  const num = String(doc.invoice_counter).padStart(6, '0');
  return `${doc.invoice_prefix}/${fy}/${num}`;
}
