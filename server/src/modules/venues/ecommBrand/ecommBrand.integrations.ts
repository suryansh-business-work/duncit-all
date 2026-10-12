import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { razorpayConnection, shiprocketConnection, type EnvConnectionResult } from '@modules/platform/envEntry/envEntry.connection';
import { PolicyModel, type IPolicy } from '@modules/content/policy/policy.model';
import { policyContentHash } from '@modules/content/policyAcceptance/policyAcceptance.model';
import { logs } from '@observability/log';
import { platformSandboxApiUrl } from '@modules/commerce/shiprocket/shiprocket.account';
import { cleanSandboxUrl, resolveShiprocketLogin as brandShiprocketLogin } from '@modules/commerce/shiprocket/shiprocket.endpoint';
import type { IBrandRazorpayIntegration, IBrandShiprocketIntegration, IEcommBrand } from './ecommBrand.model';
import type { ConsentContext } from './ecommBrand.completion';

/**
 * The brand's OWN ShipRocket and Razorpay accounts, and the consent it signs.
 *
 * Each brand ships and is paid through accounts it holds, never through the
 * Tech portal's entries — one brand's parcels must not be booked on another's
 * wallet. The check is the same one the Tech portal runs on its entries
 * (`envEntry.connection.ts`), fed a reader over the brand's stored config, so
 * "does this credential work" has exactly one answer on the platform.
 *
 * Secrets never leave the server: `toStatus` reports whether one is on file,
 * never what it is, and a blank secret on an update keeps the saved one.
 */
export type BrandIntegrationProvider = 'SHIPROCKET' | 'RAZORPAY';

export const BRAND_INTEGRATION_PROVIDERS = new Set<BrandIntegrationProvider>(['SHIPROCKET', 'RAZORPAY']);

/** The slug of the Legal-portal policy a brand partner signs at the last step. Mirrors `@duncit/utils`. */
export const BRAND_CONSENT_POLICY_SLUG = 'brand-partner-consent';

export interface BrandIntegrationStatus {
  provider: BrandIntegrationProvider;
  configured: boolean;
  connected: boolean;
  checked_at: string | null;
  message: string;
  details: string[];
  identifier: string;
  has_secret: boolean;
  pickup_location: string;
  live_mode: boolean;
  has_webhook_secret: boolean;
  /** ShipRocket: the account is in sandbox mode — test orders only, nothing real is booked. Always false for Razorpay. */
  sandbox: boolean;
  /** ShipRocket: the sandbox API user's email, saved beside the production one (`identifier`). */
  sandbox_identifier: string;
  /** ShipRocket: a sandbox API user password is on file. */
  has_sandbox_secret: boolean;
  /** ShipRocket: this account's own sandbox API address; blank uses the platform's. */
  sandbox_api_url: string;
  /** The partner's Integrations connection this credential was copied from; null when typed in on the brand. */
  connection_id: string | null;
}

/**
 * Anything that holds the two vendor credentials in the brand's shape: a
 * brand, or a partner's saved Integrations connection (`PartnerIntegration`).
 * Both are saved, checked and read through the same helpers below.
 */
export interface IntegrationHolder {
  _id: unknown;
  integrations: { shiprocket: IBrandShiprocketIntegration; razorpay: IBrandRazorpayIntegration };
  integration_links?: { shiprocket?: Types.ObjectId | null; razorpay?: Types.ObjectId | null } | null;
}

const str =(v: unknown) => (typeof v === 'string' ? v.trim() : '');

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

export function assertProvider(provider: string): asserts provider is BrandIntegrationProvider {
  if (!BRAND_INTEGRATION_PROVIDERS.has(provider as BrandIntegrationProvider)) bad('Unknown integration provider');
}

type LinkId = Types.ObjectId | null | undefined;

/** Configured for the mode it is in: a sandbox account needs its sandbox user, a live one its production user. */
const shiprocketConfigured = (s: IBrandShiprocketIntegration) => {
  const login = brandShiprocketLogin(s);
  return !!(login.email && login.password);
};
const razorpayConfigured = (r: IBrandRazorpayIntegration) => !!(str(r?.key_id) && r?.key_secret);

/** ShipRocket as the console reads it. */
function shiprocketStatus(s: IBrandShiprocketIntegration | undefined, link: LinkId): BrandIntegrationStatus {
  const integration = s ?? ({} as IBrandShiprocketIntegration);
  return {
    provider: 'SHIPROCKET',
    configured: shiprocketConfigured(integration),
    connected: integration.connected === true,
    checked_at: integration.checked_at ? integration.checked_at.toISOString() : null,
    message: integration.message ?? '',
    details: integration.details ?? [],
    identifier: integration.email ?? '',
    has_secret: !!integration.password,
    pickup_location: integration.pickup_location ?? '',
    live_mode: false,
    has_webhook_secret: !!integration.webhook_secret,
    sandbox: integration.sandbox === true,
    sandbox_identifier: integration.sandbox_email ?? '',
    has_sandbox_secret: !!integration.sandbox_password,
    sandbox_api_url: integration.sandbox_api_url ?? '',
    connection_id: link ? link.toHexString() : null,
  };
}

/** Razorpay as the console reads it. The key id's prefix says whether real money moves. */
function razorpayStatus(r: IBrandRazorpayIntegration | undefined, link: LinkId): BrandIntegrationStatus {
  const integration = r ?? ({} as IBrandRazorpayIntegration);
  return {
    provider: 'RAZORPAY',
    configured: razorpayConfigured(integration),
    connected: integration.connected === true,
    checked_at: integration.checked_at ? integration.checked_at.toISOString() : null,
    message: integration.message ?? '',
    details: integration.details ?? [],
    identifier: integration.key_id ?? '',
    has_secret: !!integration.key_secret,
    pickup_location: '',
    live_mode: (integration.key_id ?? '').startsWith('rzp_live'),
    has_webhook_secret: !!integration.webhook_secret,
    sandbox: false,
    sandbox_identifier: '',
    has_sandbox_secret: false,
    sandbox_api_url: '',
    connection_id: link ? link.toHexString() : null,
  };
}

export const integrationStatus = (holder: IntegrationHolder, provider: BrandIntegrationProvider): BrandIntegrationStatus =>
  provider === 'SHIPROCKET'
    ? shiprocketStatus(holder.integrations?.shiprocket, holder.integration_links?.shiprocket)
    : razorpayStatus(holder.integrations?.razorpay, holder.integration_links?.razorpay);

export const integrationsOf = (holder: IntegrationHolder) => ({
  shiprocket: integrationStatus(holder, 'SHIPROCKET'),
  razorpay: integrationStatus(holder, 'RAZORPAY'),
});

/**
 * Copy one provider's credential AND its last check from a saved connection
 * onto a brand. Every vendor call for the brand reads the brand's copy, so the
 * webhook keys, `live` and the ShipRocket account resolver keep working
 * unchanged; the caller records the link and saves the brand.
 */
export function copyIntegration(from: IntegrationHolder, to: IntegrationHolder, provider: BrandIntegrationProvider) {
  if (provider === 'SHIPROCKET') {
    const s = from.integrations.shiprocket;
    to.integrations.shiprocket = {
      email: s.email,
      password: s.password,
      pickup_location: s.pickup_location,
      webhook_secret: s.webhook_secret,
      sandbox: s.sandbox === true,
      sandbox_email: s.sandbox_email ?? '',
      sandbox_password: s.sandbox_password ?? '',
      sandbox_api_url: s.sandbox_api_url ?? '',
      connected: s.connected,
      checked_at: s.checked_at,
      message: s.message,
      details: [...(s.details ?? [])],
    };
    return;
  }
  const r = from.integrations.razorpay;
  to.integrations.razorpay = {
    key_id: r.key_id,
    key_secret: r.key_secret,
    webhook_secret: r.webhook_secret,
    connected: r.connected,
    checked_at: r.checked_at,
    message: r.message,
    details: [...(r.details ?? [])],
  };
}

type ShiprocketLogin = ReturnType<typeof brandShiprocketLogin>;

const sameLogin = (x: ShiprocketLogin, y: ShiprocketLogin) =>
  x.email === y.email && x.password === y.password && x.sandbox === y.sandbox && x.sandboxApiUrl === y.sandboxApiUrl;

/** The same account on both sides: same public half AND same secret. */
export function sameCredential(a: IntegrationHolder, b: IntegrationHolder, provider: BrandIntegrationProvider) {
  if (provider === 'SHIPROCKET') {
    // The user each side signs in with now: sandbox and live are different
    // accounts as far as pickups and orders go, and so are two sandboxes.
    return sameLogin(brandShiprocketLogin(a.integrations.shiprocket), brandShiprocketLogin(b.integrations.shiprocket));
  }
  const x = a.integrations.razorpay;
  const y = b.integrations.razorpay;
  return x.key_id === y.key_id && x.key_secret === y.key_secret;
}

/** A secret as typed, or the saved one when it was left blank. */
const keptSecret = (typed: unknown, saved: string) => (typeof typed === 'string' && typed ? typed : (saved ?? ''));

const SANDBOX_URL_REFUSED =
  'The sandbox API URL must start with https:// and end in shiprocket.in. Leave it blank to use the standard ShipRocket sandbox.';

/** The sandbox address as typed: left out keeps the saved one, blank clears it, anything but a ShipRocket https address is refused. */
function sandboxUrlInput(typed: unknown, saved: string) {
  if (typeof typed !== 'string') return saved ?? '';
  const url = typed.trim();
  if (cleanSandboxUrl(url) === null) bad(SANDBOX_URL_REFUSED);
  return url;
}

/**
 * Write the ShipRocket API users onto the brand: the production one and, kept
 * apart from it, the sandbox one. A blank password keeps the saved one. The
 * user of the mode the account is in must be complete; the other is stored as
 * given and never required, so a sandbox account can be saved before the
 * production user exists and switching mode never overwrites either.
 */
export function applyShiprocketInput(brand: IntegrationHolder, input: Record<string, unknown>) {
  const current = brand.integrations.shiprocket;
  const before = brandShiprocketLogin(current);
  // Left out (an older client) keeps the saved mode; only an explicit choice moves the account.
  const sandbox = typeof input.sandbox === 'boolean' ? input.sandbox : current.sandbox === true;
  const next = {
    // Sandbox mode leaves the production user alone unless one is typed.
    email: str(input.email) || (sandbox ? str(current.email) : ''),
    password: keptSecret(input.password, current.password),
    sandbox,
    sandbox_email: str(input.sandbox_email) || str(current.sandbox_email),
    sandbox_password: keptSecret(input.sandbox_password, current.sandbox_password),
    sandbox_api_url: sandboxUrlInput(input.sandbox_api_url, current.sandbox_api_url),
  };
  // A half-typed sandbox user must not fall back to the production one.
  const sandboxUser = sandbox && !!(next.sandbox_email || next.sandbox_password);
  const user = sandboxUser ? 'ShipRocket sandbox API user' : 'ShipRocket API user';
  if (!(sandboxUser ? next.sandbox_email : next.email)) bad(`Enter the ${user} email`);
  if (!(sandboxUser ? next.sandbox_password : next.password)) bad(`Enter the ${user} password`);
  Object.assign(current, next);
  if (input.pickup_location !== undefined) current.pickup_location = str(input.pickup_location);
  if (str(input.webhook_secret)) current.webhook_secret = str(input.webhook_secret);
  return !sameLogin(before, brandShiprocketLogin(current));
}

/** Write the Razorpay keys onto the brand. A blank secret keeps the saved one. */
export function applyRazorpayInput(brand: IntegrationHolder, input: Record<string, unknown>) {
  const current = brand.integrations.razorpay;
  const keyId = str(input.key_id);
  if (!keyId) bad('Enter the Razorpay key id');
  const keySecret = typeof input.key_secret === 'string' && input.key_secret ? input.key_secret : current.key_secret;
  if (!keySecret) bad('Enter the Razorpay key secret');
  const changed = keyId !== current.key_id || keySecret !== current.key_secret;
  current.key_id = keyId;
  current.key_secret = keySecret;
  if (str(input.webhook_secret)) current.webhook_secret = str(input.webhook_secret);
  return changed;
}

/** Forget the credential. The brand is no longer connected and cannot be submitted until it is again. */
export function clearIntegration(brand: IntegrationHolder, provider: BrandIntegrationProvider) {
  const cleared = { connected: false, checked_at: null, message: '', details: [] };
  if (provider === 'SHIPROCKET') {
    brand.integrations.shiprocket = {
      email: '',
      password: '',
      pickup_location: '',
      webhook_secret: '',
      sandbox: false,
      sandbox_email: '',
      sandbox_password: '',
      sandbox_api_url: '',
      ...cleared,
    };
    return;
  }
  brand.integrations.razorpay = { key_id: '', key_secret: '', webhook_secret: '', ...cleared };
}

/**
 * A reader over the brand's stored config, in the field names the Tech portal's
 * probes read. The check signs in as the user the brand's orders are booked
 * with — the sandbox one in sandbox mode. `sandboxApiUrl` is the address a
 * sandbox check goes to: the brand's own, else the platform's.
 */
function readerFor(brand: IntegrationHolder, provider: BrandIntegrationProvider, sandboxApiUrl: string) {
  const login = brandShiprocketLogin(brand.integrations.shiprocket);
  const config: Record<string, string> =
    provider === 'SHIPROCKET'
      ? {
          email: login.email,
          password: login.password,
          pickup_location: brand.integrations.shiprocket.pickup_location,
          sandbox: login.sandbox ? 'true' : 'false',
          sandbox_api_url: sandboxApiUrl,
        }
      : {
          key_id: brand.integrations.razorpay.key_id,
          key_secret: brand.integrations.razorpay.key_secret,
          webhook_secret: brand.integrations.razorpay.webhook_secret,
        };
  return (key: string) => config[key] ?? '';
}

/** The vendor's answer, or the transport failure as one — a probe never throws. */
async function runProbe(brand: IntegrationHolder, provider: BrandIntegrationProvider): Promise<EnvConnectionResult> {
  try {
    const login = brandShiprocketLogin(brand.integrations.shiprocket);
    const sandboxed = provider === 'SHIPROCKET' && login.sandbox;
    const read = readerFor(brand, provider, sandboxed ? login.sandboxApiUrl || (await platformSandboxApiUrl()) : '');
    return provider === 'SHIPROCKET' ? await shiprocketConnection(read) : await razorpayConnection(read);
  } catch (error) {
    logs.server.warn('ecommBrand', 'probe', { error, provider, brandId: String(brand._id), msg: 'vendor check failed' });
    return { ok: false, message: `${provider === 'SHIPROCKET' ? 'ShipRocket' : 'Razorpay'} could not be reached — try again shortly`, details: [] };
  }
}

/**
 * Check the saved credential against the vendor and record what it said.
 * The caller saves the brand. An unconfigured credential is refused before
 * any call is made, so a probe can never spend a login on a blank password.
 */
export async function probeBrandIntegration(brand: IntegrationHolder, provider: BrandIntegrationProvider): Promise<BrandIntegrationStatus> {
  const status = integrationStatus(brand, provider);
  if (!status.configured) {
    bad(provider === 'SHIPROCKET' ? 'Save the ShipRocket API user first' : 'Save the Razorpay keys first');
  }
  const result = await runProbe(brand, provider);
  const target = provider === 'SHIPROCKET' ? brand.integrations.shiprocket : brand.integrations.razorpay;
  target.connected = result.ok;
  target.checked_at = new Date();
  target.message = result.message;
  target.details = result.details;
  return integrationStatus(brand, provider);
}

/* ---- Brand Consent ---- */

/** The published consent, read once per short window — every brand row asks for it. */
let consentCache: { at: number; policy: IPolicy | null } | null = null;
const CONSENT_TTL_MS = 10_000;

export async function currentConsentPolicy(): Promise<IPolicy | null> {
  if (consentCache && Date.now() - consentCache.at < CONSENT_TTL_MS) return consentCache.policy;
  const policy = await PolicyModel.findOne({ slug: BRAND_CONSENT_POLICY_SLUG, is_active: true });
  consentCache = { at: Date.now(), policy };
  return policy;
}

/** Forget the cached consent — after Legal saves it, the next read must see the new wording. */
export const forgetConsentCache = () => {
  consentCache = null;
};

/** The signed consent as any shape carries it — the document or the public object. */
export interface SignedConsentFacts {
  consent?: { accepted?: boolean | null; content_hash?: string | null } | null;
}

export function consentContext(brand: SignedConsentFacts, policy: IPolicy | null): ConsentContext {
  if (!policy) return { available: false, current: false };
  const hash = policyContentHash(policy.content || '');
  return { available: true, current: brand.consent?.accepted === true && brand.consent?.content_hash === hash };
}

export const consentPub = (brand: IEcommBrand, ctx: ConsentContext) => ({
  accepted: brand.consent?.accepted === true,
  signed_name: brand.consent?.signed_name ?? '',
  signed_at: brand.consent?.signed_at ? brand.consent.signed_at.toISOString() : null,
  policy_slug: brand.consent?.policy_slug ?? '',
  policy_title: brand.consent?.policy_title ?? '',
  content_hash: brand.consent?.content_hash ?? '',
  current: ctx.current,
  available: ctx.available,
});

/** Sign the published consent with a typed name. The caller saves the brand and files the acceptance row. */
export function applyConsentSignature(brand: IEcommBrand, policy: IPolicy, signedName: string) {
  const name = str(signedName);
  if (name.length < 3) bad('Type your full name to sign');
  brand.consent = {
    accepted: true,
    policy_id: new Types.ObjectId(String(policy._id)),
    policy_slug: policy.slug,
    policy_title: policy.title,
    content_hash: policyContentHash(policy.content || ''),
    signed_name: name,
    signed_at: new Date(),
  };
}
