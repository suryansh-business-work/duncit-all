import { Schema, model, type Document } from 'mongoose';

/**
 * What a WhatsApp message costs, by the category Meta bills on.
 *
 * The rate is per MESSAGE, not per conversation, because that is the unit a
 * campaign send produces and the only unit this system can count. Marketing
 * edits these at runtime — a rate change is a commercial decision, never a
 * deploy.
 */

/** The template categories WhatsApp prices separately. */
export const WA_TEMPLATE_CATEGORIES = ['MARKETING', 'UTILITY', 'AUTHENTICATION', 'SERVICE'] as const;
export type WaTemplateCategory = (typeof WA_TEMPLATE_CATEGORIES)[number];

export interface IWaPricing extends Document {
  singleton_key: string;
  marketing_per_msg: number;
  utility_per_msg: number;
  authentication_per_msg: number;
  service_per_msg: number;
  currency_symbol: string;
}

const waPricingSchema = new Schema<IWaPricing>(
  {
    singleton_key: { type: String, unique: true, default: 'whatsapp' },
    // The published Indian rate card at the time this was built. A default is
    // not the rule: whatever Marketing saves wins from then on.
    marketing_per_msg: { type: Number, default: 1.09, min: 0 },
    utility_per_msg: { type: Number, default: 0.145, min: 0 },
    authentication_per_msg: { type: Number, default: 0, min: 0 },
    // Service conversations are free — kept as a field anyway so a rate that
    // stops being free is a settings edit rather than a migration.
    service_per_msg: { type: Number, default: 0, min: 0 },
    currency_symbol: { type: String, default: '₹' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const WaPricingModel = model<IWaPricing>('MarketingWaPricing', waPricingSchema);

export async function getWaPricing(): Promise<IWaPricing> {
  const existing = await WaPricingModel.findOne({ singleton_key: 'whatsapp' });
  if (existing) return existing;
  return WaPricingModel.create({ singleton_key: 'whatsapp' });
}

const RATE_FIELD: Record<WaTemplateCategory, keyof IWaPricing> = {
  MARKETING: 'marketing_per_msg',
  UTILITY: 'utility_per_msg',
  AUTHENTICATION: 'authentication_per_msg',
  SERVICE: 'service_per_msg',
};

const KNOWN = new Set<string>(WA_TEMPLATE_CATEGORIES);

/** AiSensy's category string, as one of the four we price — or null when it is
 * something else (or the Project API never told us). */
export function toTemplateCategory(raw: unknown): WaTemplateCategory | null {
  const value = String(raw ?? '').trim().toUpperCase();
  return KNOWN.has(value) ? (value as WaTemplateCategory) : null;
}

/** The per-message rate for a category. An unknown category costs nothing —
 * a number nobody configured must never become a bill nobody expected. */
export function ratePerMessage(pricing: IWaPricing, rawCategory: unknown): number {
  const category = toTemplateCategory(rawCategory);
  if (!category) return 0;
  return Number(pricing[RATE_FIELD[category]] ?? 0);
}
