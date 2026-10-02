import { createHash } from 'node:crypto';
import { Types } from 'mongoose';
import { EnvEntryModel } from '@modules/platform/envEntry/envEntry.model';
import { GraphQLError } from 'graphql';
import {
  EcommBrandModel,
  type BrandShippingMode,
  type IBrandShiprocketIntegration,
  type IEcommBrand,
} from '@modules/venues/ecommBrand/ecommBrand.model';

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
 * is that account — or, for a brand that chose `DUNCIT_COURIER`, Duncit's courier
 * account mapped to the Partners console. The pet store and Duncit-owned
 * warehouses stay on the Tech portal's (ecomm) account.
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
  return accountFromConfig((entry?.config ?? {}) as Record<string, unknown>);
}

/** A config value as text: a string or number as saved; absent or object-shaped is blank. */
const configText = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

/** A Tech-portal SHIPROCKET entry's config as an account, or null without an email and password. */
function accountFromConfig(config: Record<string, unknown>): ShiprocketAccount | null {
  const email = configText(config.email).trim();
  const password = configText(config.password);
  if (!email || !password) return null;
  const ttl = Number(config.token_ttl_hours);
  return {
    email,
    password,
    pickupLocation: configText(config.pickup_location).trim(),
    webhookSecret: configText(config.webhook_secret).trim(),
    tokenTtlHours: ttl > 0 ? ttl : DEFAULT_TTL_HOURS,
    hash: createHash('sha256').update(`${email}:${password}`).digest('hex'),
    sessionKey: DEFAULT_SESSION_KEY,
  };
}

/**
 * A brand's own account from its saved credentials; null when none are saved.
 * The last check's `connected` is NOT consulted: one failed recheck (ShipRocket
 * down for a minute) must not move a live brand's parcels onto another account.
 */
export function accountFromBrandIntegration(
  brandId: string,
  s: IBrandShiprocketIntegration | undefined,
): ShiprocketAccount | null {
  const email = String(s?.email ?? '').trim();
  const password = String(s?.password ?? '');
  if (!email || !password) return null;
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

/** The console whose Portal Mapping names Duncit's courier account for partner brands (portalMode key). */
export const PARTNER_COURIER_PORTAL = 'partners';

/** Its token's session row — apart from the pet store's even when an operator maps the same login to both. */
export const PARTNER_COURIER_SESSION_KEY = 'partner-courier';

/**
 * Duncit's courier service for partner brands: the SHIPROCKET entry the Tech
 * portal maps to the Partners console. Mapped explicitly, never the category
 * default — the default is the pet store's account, and partner brands and
 * the pet store are separate businesses that must not share a wallet.
 */
export async function getPartnerCourierAccount(): Promise<ShiprocketAccount | null> {
  const entry = await EnvEntryModel.findOne({
    category: 'SHIPROCKET',
    is_active: true,
    assigned_portals: PARTNER_COURIER_PORTAL,
  })
    .sort({ is_default: -1, updated_at: -1 })
    .lean();
  const account = accountFromConfig((entry?.config ?? {}) as Record<string, unknown>);
  return account && { ...account, sessionKey: PARTNER_COURIER_SESSION_KEY };
}

type BrandShippingFacts = Pick<IEcommBrand, 'shipping_mode'> & {
  integrations?: { shiprocket?: IBrandShiprocketIntegration } | null;
};

/**
 * Who carries a brand's parcels: its choice; for a brand from before the
 * choice existed, its own account when it saved one, else Duncit's courier
 * (the account such a brand already shipped on).
 */
export function brandShippingMode(brand: BrandShippingFacts): BrandShippingMode {
  if (brand.shipping_mode) return brand.shipping_mode;
  return accountFromBrandIntegration('', brand.integrations?.shiprocket) ? 'OWN_SHIPROCKET' : 'DUNCIT_COURIER';
}

const UNAVAILABLE: Record<BrandShippingMode, string> = {
  OWN_SHIPROCKET:
    "This brand ships on its own ShipRocket account, but none is saved. Connect it in the brand's Integration step, or switch the brand to the Duncit courier.",
  DUNCIT_COURIER:
    'The Duncit courier is not set up. In the Tech portal open Environment Variables → Portal Mapping and map a SHIPROCKET entry to the Partners App.',
};

/**
 * The account a brand ships on — its own or Duncit's courier, as it chose.
 * Null only when the id is not a brand's (a Duncit-owned product, which ships
 * on the pet store's Tech account). A brand whose account cannot be resolved
 * is REFUSED with what to fix, never run on another business's account.
 */
export async function getBrandShiprocketAccount(
  brandId: string | Types.ObjectId | null | undefined,
): Promise<ShiprocketAccount | null> {
  const id = String(brandId ?? '');
  if (!id || !Types.ObjectId.isValid(id)) return null;
  const brand = await EcommBrandModel.findById(id).select('shipping_mode integrations.shiprocket').lean();
  if (!brand) return null;
  const mode = brandShippingMode(brand);
  const account =
    mode === 'OWN_SHIPROCKET'
      ? accountFromBrandIntegration(id, brand.integrations?.shiprocket)
      : await getPartnerCourierAccount();
  if (!account) {
    throw new GraphQLError(UNAVAILABLE[mode], { extensions: { code: 'BAD_GATEWAY', shiprocket_status: 0 } });
  }
  return account;
}

export async function isShiprocketConfigured(): Promise<boolean> {
  return (await getShiprocketAccount()) !== null;
}
