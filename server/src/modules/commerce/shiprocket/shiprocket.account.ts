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
import { resolveShiprocketBase, resolveShiprocketLogin, type ShiprocketBase } from './shiprocket.endpoint';

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
 * is that account — or, for a brand that chose `DUNCIT_COURIER` while it was
 * still offered, Duncit's courier account mapped to the Partners console. The
 * pet store and Duncit-owned warehouses stay on the Tech portal's (ecomm) account.
 *
 * Any of these can be in SANDBOX mode (`sandbox`): its calls then go to
 * ShipRocket's sandbox (`shiprocket.endpoint.ts`) and book test orders only.
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
  /** sha256 of email + password (and the sandbox it points at): what the token and a refusal are keyed on. */
  hash: string;
  /** Which session row holds this account's token: 'default' for the Tech portal's, one per brand otherwise. */
  sessionKey: string;
  /** Sandbox mode: every call goes to ShipRocket's sandbox, so only test orders are booked. */
  sandbox: boolean;
  /** The sandbox API address saved WITH this account (a Tech entry's or a brand's own); blank falls back to the platform's. */
  sandboxApiUrl: string;
}

/** The Tech portal's account — the session row every pre-brand shipment used. */
export const DEFAULT_SESSION_KEY = 'default';

const DEFAULT_TTL_HOURS = 240;

/**
 * What a token is cached against. A live account hashes exactly as it always
 * has; switching sandbox on or off (or moving the sandbox address) changes the
 * hash, so a live token is never replayed at the sandbox or the reverse.
 */
function credentialHash(email: string, password: string, sandbox: boolean, sandboxApiUrl: string): string {
  const scope = sandbox ? `:sandbox:${sandboxApiUrl}` : '';
  return createHash('sha256').update(`${email}:${password}${scope}`).digest('hex');
}

/**
 * The sandbox API address the Tech portal OVERRIDES the standard one with, if
 * any (blank = the standard sandbox, `SR_SANDBOX_BASE`): the one saved on an active
 * SHIPROCKET entry in the Tech portal (the default entry first). A partner
 * brand in sandbox mode that saved no address of its own is sent here.
 */
export async function platformSandboxApiUrl(): Promise<string> {
  const entry = await EnvEntryModel.findOne({
    category: 'SHIPROCKET',
    is_active: true,
    'config.sandbox_api_url': { $nin: ['', null] },
  })
    .sort({ is_default: -1, updated_at: -1 })
    .select('config.sandbox_api_url')
    .lean();
  return configText((entry?.config as Record<string, unknown> | undefined)?.sandbox_api_url).trim();
}

/** The API address this account's calls go to — live, or the sandbox when it is in sandbox mode. */
export async function shiprocketBaseFor(account: Pick<ShiprocketAccount, 'sandbox' | 'sandboxApiUrl'>): Promise<ShiprocketBase> {
  if (!account.sandbox) return resolveShiprocketBase(false, '');
  return resolveShiprocketBase(true, account.sandboxApiUrl || (await platformSandboxApiUrl()));
}

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
  const { email, password, sandbox, sandboxApiUrl } = resolveShiprocketLogin(config);
  if (!email || !password) return null;
  const ttl = Number(config.token_ttl_hours);
  return {
    email,
    password,
    pickupLocation: configText(config.pickup_location).trim(),
    webhookSecret: configText(config.webhook_secret).trim(),
    tokenTtlHours: ttl > 0 ? ttl : DEFAULT_TTL_HOURS,
    hash: credentialHash(email, password, sandbox, sandboxApiUrl),
    sessionKey: DEFAULT_SESSION_KEY,
    sandbox,
    sandboxApiUrl,
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
  const { email, password, sandbox, sandboxApiUrl } = resolveShiprocketLogin(s);
  if (!email || !password) return null;
  return {
    email,
    password,
    pickupLocation: String(s?.pickup_location ?? '').trim(),
    webhookSecret: String(s?.webhook_secret ?? '').trim(),
    tokenTtlHours: DEFAULT_TTL_HOURS,
    hash: credentialHash(email, password, sandbox, sandboxApiUrl),
    sessionKey: `brand:${brandId}`,
    sandbox,
    sandboxApiUrl,
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
 * Who carries a brand's parcels. Every brand ships on its OWN ShipRocket
 * account; the Duncit courier is no longer offered. `DUNCIT_COURIER` survives
 * only as the recorded choice of a brand that picked it while it was — such a
 * brand keeps shipping on that account until it connects its own, so no parcel
 * in flight is stranded. A brand with no recorded choice is on its own account.
 */
export function brandShippingMode(brand: BrandShippingFacts): BrandShippingMode {
  return brand.shipping_mode ?? 'OWN_SHIPROCKET';
}

const UNAVAILABLE: Record<BrandShippingMode, string> = {
  OWN_SHIPROCKET:
    "This brand has no ShipRocket account connected. Connect one in the brand's Integration step (Partner portal → E-Commerce Brand → Integrations).",
  DUNCIT_COURIER:
    "This brand was set to the Duncit courier, which is no longer offered. Connect the brand's own ShipRocket account in its Integration step (Partner portal → E-Commerce Brand → Integrations).",
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
