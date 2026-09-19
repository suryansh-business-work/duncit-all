import { GraphQLError } from 'graphql';
import jwt from 'jsonwebtoken';
import { applePrivateKeyPem } from '@modules/access/auth/auth.apple';
import { outboundFetch } from '@utils/outboundFetch';

/**
 * The App Store Connect API, as far as signing an iOS build goes.
 *
 * One API key (.p8) is the only thing a person has to make by hand — Apple
 * offers no way to create one through the API. With it, everything else a
 * signed App Store build needs is created here: the App ID and its
 * capabilities, an Apple Distribution certificate for a key pair the server
 * generated, and an App Store provisioning profile that ties the two together.
 * The key must carry the Admin role; certificates refuse anything less.
 *
 * Deliberately PURE HTTP: no database, no models — the signing service owns the
 * records, the env connection test proves the key, and both call in here.
 */

const API = 'https://api.appstoreconnect.apple.com/v1';

/** Apple gets no longer than this per call. */
const TIMEOUT_MS = 60_000;

export interface AscCredentials {
  issuerId: string;
  keyId: string;
  /** The AuthKey_<KeyID>.p8 file's text, as pasted. */
  privateKey: string;
}

interface CapabilitySetting {
  key: string;
  options: { key: string }[];
}

/**
 * Every entitlement the iOS app is built with needs its capability on the App
 * ID, or the App Store profile lacks it and the archive refuses to sign. This
 * mirrors app/mobile-app/app.json: expo-notifications (push),
 * ios.associatedDomains (universal links) and expo-apple-authentication.
 */
const REQUIRED_CAPABILITIES: { type: string; settings: CapabilitySetting[] }[] = [
  { type: 'PUSH_NOTIFICATIONS', settings: [] },
  { type: 'ASSOCIATED_DOMAINS', settings: [] },
  {
    type: 'APPLE_ID_AUTH',
    settings: [{ key: 'APPLE_ID_AUTH_APP_CONSENT', options: [{ key: 'PRIMARY_APP_CONSENT' }] }],
  },
];

export interface AscCertificate {
  id: string;
  serialNumber: string;
  /** The .cer file, DER, base64. */
  contentBase64: string;
  expiresAt: string;
}

export interface AscProfile {
  id: string;
  uuid: string;
  name: string;
  /** The .mobileprovision file, base64. */
  contentBase64: string;
}

/**
 * A 10-minute token signed with the API key (Apple accepts up to 20). Throws
 * when the pasted key cannot sign.
 */
export function ascToken(creds: AscCredentials): string {
  return jwt.sign({}, applePrivateKeyPem(creds.privateKey), {
    algorithm: 'ES256',
    keyid: creds.keyId,
    issuer: creds.issuerId,
    audience: 'appstoreconnect-v1',
    expiresIn: '10m',
  });
}

const STORE = 'App Store Connect';

/** What Apple said, in one line, without the credential — with the status kept, so a retry can tell busy from wrong. */
export class AscError extends Error {
  constructor(
    readonly status: number,
    reason: string
  ) {
    super(`${STORE} refused the request (HTTP ${status}): ${reason}`);
    this.name = 'AscError';
  }
}

/**
 * Whether a failed call is worth making again. The connection never landed or
 * broke (`outboundFetch` throws those as BAD_GATEWAY, whatever the host), or
 * Apple answered that it is busy or broken (429, 5xx). Any other refusal would
 * be refused the same way a second time.
 */
export function isTransientAscError(err: unknown): boolean {
  if (err instanceof AscError) return err.status === 429 || err.status >= 500;
  return err instanceof GraphQLError && err.extensions?.code === 'BAD_GATEWAY';
}

async function call(token: string, path: string, init: RequestInit = {}): Promise<any> {
  const res = await outboundFetch(STORE, `${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 204) return {};
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const first = Array.isArray(data?.errors) ? data.errors[0] : null;
    throw new AscError(res.status, String(first?.detail ?? first?.title ?? 'no reason given'));
  }
  return data;
}

const post = (token: string, path: string, data: unknown) =>
  call(token, path, { method: 'POST', body: JSON.stringify({ data }) });

/**
 * The same four verbs for the release, listing and review gateways beside this
 * file. Exported as one object so every App Store Connect call in the module
 * shares one timeout, one error shape and one place to change either.
 */
export const asc = {
  get: (token: string, path: string) => call(token, path),
  post,
  patch: (token: string, path: string, data: unknown) =>
    call(token, path, { method: 'PATCH', body: JSON.stringify({ data }) }),
  delete: (token: string, path: string) => call(token, path, { method: 'DELETE' }),
};

/** The App Store Connect app record for a bundle id, or null when none exists yet. */
export async function findApp(token: string, bundleId: string): Promise<{ id: string; name: string } | null> {
  const query = new URLSearchParams({ 'filter[bundleId]': bundleId, limit: '1' });
  const res = await call(token, `/apps?${query}`);
  const app = Array.isArray(res.data) ? res.data[0] : null;
  return app ? { id: String(app.id), name: String(app.attributes?.name ?? '') } : null;
}

/** Throws unless the key may manage certificates — which only the Admin role can. */
export async function assertCertificateAccess(token: string): Promise<void> {
  await call(token, `/certificates?${new URLSearchParams({ limit: '1' })}`);
}

/** The App ID's resource id, registering the identifier first when Apple has never seen it. */
export async function ensureBundleId(token: string, identifier: string): Promise<string> {
  const query = new URLSearchParams({ 'filter[identifier]': identifier, limit: '200' });
  const found = await call(token, `/bundleIds?${query}`);
  // The filter matches prefixes too — com.x.app also returns com.x.app.widget.
  const exact = (found.data ?? []).find((b: any) => b.attributes?.identifier === identifier);
  if (exact) return String(exact.id);
  const created = await post(token, '/bundleIds', {
    type: 'bundleIds',
    // An App ID name allows letters, digits and spaces only.
    attributes: { identifier, name: identifier.replaceAll('.', ' '), platform: 'IOS' },
  });
  return String(created.data.id);
}

/** Switch on whichever required capabilities the App ID does not have yet. */
export async function ensureCapabilities(token: string, bundleIdId: string): Promise<void> {
  const current = await call(token, `/bundleIds/${bundleIdId}/bundleIdCapabilities`);
  const have = new Set((current.data ?? []).map((c: any) => String(c.attributes?.capabilityType)));
  const missing = REQUIRED_CAPABILITIES.filter((c) => !have.has(c.type));
  await Promise.all(
    missing.map((c) =>
      post(token, '/bundleIdCapabilities', {
        type: 'bundleIdCapabilities',
        attributes: { capabilityType: c.type, settings: c.settings },
        relationships: { bundleId: { data: { type: 'bundleIds', id: bundleIdId } } },
      })
    )
  );
}

/** Have Apple sign a CSR as an Apple Distribution certificate. */
export async function createDistributionCertificate(token: string, csrPem: string): Promise<AscCertificate> {
  const res = await post(token, '/certificates', {
    type: 'certificates',
    attributes: { certificateType: 'DISTRIBUTION', csrContent: csrPem },
  });
  const a = res.data.attributes ?? {};
  return {
    id: String(res.data.id),
    serialNumber: String(a.serialNumber ?? ''),
    contentBase64: String(a.certificateContent ?? ''),
    expiresAt: String(a.expirationDate ?? ''),
  };
}

/**
 * Revoke a certificate. Used only to undo one this server just created when
 * the profile after it failed — Apple allows a team very few Distribution
 * certificates, and an orphan would hold one of them.
 */
export async function revokeCertificate(token: string, certificateId: string): Promise<void> {
  await call(token, `/certificates/${certificateId}`, { method: 'DELETE' });
}

/** An App Store provisioning profile for one App ID, signed by one certificate. */
export async function createAppStoreProfile(
  token: string,
  bundleIdId: string,
  certificateId: string,
  name: string
): Promise<AscProfile> {
  const res = await post(token, '/profiles', {
    type: 'profiles',
    attributes: { name, profileType: 'IOS_APP_STORE' },
    relationships: {
      bundleId: { data: { type: 'bundleIds', id: bundleIdId } },
      certificates: { data: [{ type: 'certificates', id: certificateId }] },
      devices: { data: [] },
    },
  });
  const a = res.data.attributes ?? {};
  return {
    id: String(res.data.id),
    uuid: String(a.uuid ?? ''),
    name: String(a.name ?? name),
    contentBase64: String(a.profileContent ?? ''),
  };
}
