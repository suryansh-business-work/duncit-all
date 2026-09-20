import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { EcommBrandModel, type IBrandShiprocketIntegration } from '@modules/venues/ecommBrand/ecommBrand.model';

/**
 * Which ShipRocket account ships the store's parcels.
 *
 * Credentials live in the Tech portal (Environment Variables → SHIPROCKET).
 * The entry mapped to the E-commerce console under Portal Mapping wins; with
 * none mapped, the category's default entry is used. The pickup nickname,
 * webhook key and token lifetime come from the same entry, so one account's
 * settings can never be mixed with another's.
 *
 * A partner BRAND holds its own account (wizard step 8, `integrations.shiprocket`):
 * its warehouses are registered on it and its orders are booked on it, so one
 * brand's parcels never draw on another's wallet. `getBrandShiprocketAccount`
 * is that account; the pet store and Duncit-owned warehouses stay on the Tech
 * portal's.
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
  /** Which session row holds this account's token: 'default' for the Tech portal's, one per brand otherwise. */
  sessionKey: string;
}

/** The Tech portal's account — the session row every pre-brand shipment used. */
export const DEFAULT_SESSION_KEY = 'default';

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
    sessionKey: DEFAULT_SESSION_KEY,
  };
}

/** A brand's own account from its saved, CONNECTED integration; null when it has none. */
export function accountFromBrandIntegration(
  brandId: string,
  s: IBrandShiprocketIntegration | undefined,
): ShiprocketAccount | null {
  const email = String(s?.email ?? '').trim();
  const password = String(s?.password ?? '');
  if (!email || !password || s?.connected !== true) return null;
  return {
    email,
    password,
    pickupLocation: String(s?.pickup_location ?? '').trim(),
    webhookSecret: String(s?.webhook_secret ?? '').trim(),
    tokenTtlHours: DEFAULT_TTL_HOURS,
    hash: createHash('sha256').update(`${email}:${password}`).digest('hex'),
    sessionKey: `brand:${brandId}`,
  };
}

/** The account a brand ships on, or null when it holds no connected one (or the id is not a brand's). */
export async function getBrandShiprocketAccount(brandId: unknown): Promise<ShiprocketAccount | null> {
  const id = String(brandId ?? '');
  if (!id || !Types.ObjectId.isValid(id)) return null;
  const brand = await EcommBrandModel.findById(id).select('integrations.shiprocket').lean();
  return accountFromBrandIntegration(id, brand?.integrations?.shiprocket);
}

export async function isShiprocketConfigured(): Promise<boolean> {
  return (await getShiprocketAccount()) !== null;
}
