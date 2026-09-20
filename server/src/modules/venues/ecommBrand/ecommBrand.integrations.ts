import { GraphQLError } from 'graphql';
import { Types } from 'mongoose';
import { razorpayConnection, shiprocketConnection, type EnvConnectionResult } from '@modules/platform/envEntry/envEntry.connection';
import { PolicyModel, type IPolicy } from '@modules/content/policy/policy.model';
import { policyContentHash } from '@modules/content/policyAcceptance/policyAcceptance.model';
import { logs } from '@observability/log';
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
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const bad = (message: string): never => {
  throw new GraphQLError(message, { extensions: { code: 'BAD_USER_INPUT' } });
};

export function assertProvider(provider: string): asserts provider is BrandIntegrationProvider {
  if (!BRAND_INTEGRATION_PROVIDERS.has(provider as BrandIntegrationProvider)) bad('Unknown integration provider');
}

const shiprocketConfigured = (s: IBrandShiprocketIntegration) => !!(str(s?.email) && s?.password);
const razorpayConfigured = (r: IBrandRazorpayIntegration) => !!(str(r?.key_id) && r?.key_secret);

/** ShipRocket as the console reads it. */
function shiprocketStatus(s: IBrandShiprocketIntegration | undefined): BrandIntegrationStatus {
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
  };
}

/** Razorpay as the console reads it. The key id's prefix says whether real money moves. */
function razorpayStatus(r: IBrandRazorpayIntegration | undefined): BrandIntegrationStatus {
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
  };
}

export const integrationStatus = (brand: IEcommBrand, provider: BrandIntegrationProvider): BrandIntegrationStatus =>
  provider === 'SHIPROCKET' ? shiprocketStatus(brand.integrations?.shiprocket) : razorpayStatus(brand.integrations?.razorpay);

export const integrationsOf = (brand: IEcommBrand) => ({
  shiprocket: shiprocketStatus(brand.integrations?.shiprocket),
  razorpay: razorpayStatus(brand.integrations?.razorpay),
});

/** Write the ShipRocket API user onto the brand. A blank password keeps the saved one. */
export function applyShiprocketInput(brand: IEcommBrand, input: Record<string, unknown>) {
  const current = brand.integrations.shiprocket;
  const email = str(input.email);
  if (!email) bad('Enter the ShipRocket API user email');
  const password = typeof input.password === 'string' && input.password ? input.password : current.password;
  if (!password) bad('Enter the ShipRocket API user password');
  const changed = email !== current.email || password !== current.password;
  current.email = email;
  current.password = password;
  if (input.pickup_location !== undefined) current.pickup_location = str(input.pickup_location);
  if (str(input.webhook_secret)) current.webhook_secret = str(input.webhook_secret);
  return changed;
}

/** Write the Razorpay keys onto the brand. A blank secret keeps the saved one. */
export function applyRazorpayInput(brand: IEcommBrand, input: Record<string, unknown>) {
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
export function clearIntegration(brand: IEcommBrand, provider: BrandIntegrationProvider) {
  const cleared = { connected: false, checked_at: null, message: '', details: [] };
  if (provider === 'SHIPROCKET') {
    brand.integrations.shiprocket = { email: '', password: '', pickup_location: '', webhook_secret: '', ...cleared };
    return;
  }
  brand.integrations.razorpay = { key_id: '', key_secret: '', webhook_secret: '', ...cleared };
}

/** A reader over the brand's stored config, in the field names the Tech portal's probes read. */
function readerFor(brand: IEcommBrand, provider: BrandIntegrationProvider) {
  const config: Record<string, string> =
    provider === 'SHIPROCKET'
      ? {
          email: brand.integrations.shiprocket.email,
          password: brand.integrations.shiprocket.password,
          pickup_location: brand.integrations.shiprocket.pickup_location,
        }
      : {
          key_id: brand.integrations.razorpay.key_id,
          key_secret: brand.integrations.razorpay.key_secret,
          webhook_secret: brand.integrations.razorpay.webhook_secret,
        };
  return (key: string) => config[key] ?? '';
}

/** The vendor's answer, or the transport failure as one — a probe never throws. */
async function runProbe(brand: IEcommBrand, provider: BrandIntegrationProvider): Promise<EnvConnectionResult> {
  try {
    const read = readerFor(brand, provider);
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
export async function probeBrandIntegration(brand: IEcommBrand, provider: BrandIntegrationProvider): Promise<BrandIntegrationStatus> {
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
