import { createHash } from 'node:crypto';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';

/**
 * Which ShipRocket account ships the store's parcels.
 *
 * Credentials live in the Tech portal (Environment Variables → SHIPROCKET).
 * The entry mapped to the E-commerce console under Portal Mapping wins; with
 * none mapped, the category's default entry is used. The pickup nickname,
 * webhook key and token lifetime come from the same entry, so one account's
 * settings can never be mixed with another's.
 */

/** The console whose Portal Mapping picks the account (portalMode registry key). */
export const SHIPPING_PORTAL = 'ecomm-portal';

export interface ShiprocketAccount {
  email: string;
  password: string;
  /** Default pickup nickname — used only for an order whose warehouse has none. */
  pickupLocation: string;
  webhookSecret: string;
  tokenTtlHours: number;
  /** sha256 of email + password: what the token and a refusal are keyed on. */
  hash: string;
}

const DEFAULT_TTL_HOURS = 240;

async function activeEntry() {
  const mapped = await EnvEntryModel.findOne({
    category: 'SHIPROCKET',
    is_active: true,
    assigned_portals: SHIPPING_PORTAL,
  })
    .sort({ is_default: -1, updated_at: -1 })
    .lean();
  return mapped ?? EnvEntryModel.findOne({ category: 'SHIPROCKET', is_active: true, is_default: true }).lean();
}

/** The account to use right now, or null when the Tech portal has none with an email and password. */
export async function getShiprocketAccount(): Promise<ShiprocketAccount | null> {
  const entry = await activeEntry();
  const config = (entry?.config ?? {}) as Record<string, unknown>;
  const email = String(config.email ?? '').trim();
  const password = String(config.password ?? '');
  if (!email || !password) return null;
  const ttl = Number(config.token_ttl_hours);
  return {
    email,
    password,
    pickupLocation: String(config.pickup_location ?? '').trim(),
    webhookSecret: String(config.webhook_secret ?? '').trim(),
    tokenTtlHours: ttl > 0 ? ttl : DEFAULT_TTL_HOURS,
    hash: createHash('sha256').update(`${email}:${password}`).digest('hex'),
  };
}

export async function isShiprocketConfigured(): Promise<boolean> {
  return (await getShiprocketAccount()) !== null;
}
