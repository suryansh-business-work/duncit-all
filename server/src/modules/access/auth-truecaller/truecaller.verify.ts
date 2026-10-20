/**
 * Checking a Truecaller verification ourselves, for each of the three doors.
 *
 * Nothing the client says about the person is believed. Android hands us a
 * one-time OAuth code that only Truecaller can trade for the profile; iOS
 * hands us a profile Truecaller signed with its RSA key; mobile web hands us
 * nothing at all — Truecaller posts a token to our callback and we fetch the
 * profile with it. Each path ends in the same `TruecallerIdentity`.
 */
import crypto from 'node:crypto';
import { GraphQLError } from 'graphql';
import { logs } from '@observability/log';
import { describeFetchFailure } from '@utils/outboundFetch';
import {
  TRUECALLER_PUBLIC_KEY_URL,
  isTruecallerProfileUrl,
  truecallerConfig,
  truecallerNotConfigured,
  truecallerOAuthUrls,
  truecallerRejected,
} from './truecaller.config';
import { identityFrom, type TruecallerIdentity } from './truecaller.identity';

const TIMEOUT_MS = 10_000;
/** How old a signed iOS profile may be. Truecaller stamps it when it is made. */
const IOS_PROFILE_MAX_AGE_MS = 10 * 60 * 1000;
const KEY_CACHE_MS = 24 * 60 * 60 * 1000;

type Json = Record<string, unknown>;

/** One field of a JSON object, or undefined when the value is not an object. */
const field = (value: unknown, key: string): unknown =>
  value !== null && typeof value === 'object' ? (value as Json)[key] : undefined;

async function truecallerJson(url: string, init: RequestInit): Promise<{ status: number; data: unknown }> {
  let res: Response;
  try {
    res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    logs.server.error('auth-truecaller', 'truecaller-unreachable', {
      host: new URL(url).host,
      reason: describeFetchFailure(error) ?? String(error),
    });
    throw new GraphQLError('Truecaller is not answering right now. Please try again', {
      extensions: { code: 'SERVICE_UNAVAILABLE' },
    });
  }
  const data: unknown = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

/** Android OAuth SDK: trade the PKCE-bound code for the person it names. */
export async function verifyAndroidCode(code: string, codeVerifier: string): Promise<TruecallerIdentity> {
  const { androidClientId, region } = await truecallerConfig();
  if (!androidClientId) throw truecallerNotConfigured();
  const urls = truecallerOAuthUrls(region);
  const token = await truecallerJson(urls.token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: androidClientId,
      code,
      code_verifier: codeVerifier,
    }).toString(),
  });
  const accessToken = field(token.data, 'access_token');
  if (typeof accessToken !== 'string' || !accessToken) {
    throw truecallerRejected(`token exchange ${String(field(token.data, 'error') ?? token.status)}`);
  }
  const info = await truecallerJson(urls.userinfo, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (info.status !== 200) throw truecallerRejected(`userinfo ${info.status}`);
  return identityFrom({
    phone: field(info.data, 'phone_number'),
    country: field(info.data, 'phone_number_country_code'),
    firstName: field(info.data, 'given_name'),
    lastName: field(info.data, 'family_name'),
    email: field(info.data, 'email'),
  });
}

let keyCache: { keys: crypto.KeyObject[]; at: number } | null = null;

async function truecallerPublicKeys(): Promise<crypto.KeyObject[]> {
  if (keyCache && Date.now() - keyCache.at < KEY_CACHE_MS) return keyCache.keys;
  const { data, status } = await truecallerJson(TRUECALLER_PUBLIC_KEY_URL, {});
  const rows: unknown[] = Array.isArray(data) ? data : [];
  const keys = rows
    .map((row) => field(row, 'key'))
    .filter((key): key is string => typeof key === 'string' && key.length > 0)
    .map((key) => crypto.createPublicKey({ key: Buffer.from(key, 'base64'), format: 'der', type: 'spki' }));
  if (keys.length === 0) throw truecallerRejected(`no public key (HTTP ${status})`);
  keyCache = { keys, at: Date.now() };
  return keys;
}

const requestTimeMs = (value: unknown) => {
  const n = Number(value);
  // Seconds and milliseconds have both been seen; anything this small is seconds.
  return n < 1e12 ? n * 1000 : n;
};

/**
 * iOS SDK: the profile arrives with Truecaller's signature over it. Only the
 * signed `payload` is read — the loose profile fields next to it are what the
 * client chose to send.
 */
export async function verifyIosProfile(
  payload: string,
  signature: string,
  algorithm: string
): Promise<TruecallerIdentity> {
  if (!/^SHA512withRSA$/i.test(algorithm)) throw truecallerRejected(`algorithm ${algorithm}`);
  const signed = Buffer.from(payload);
  const sig = Buffer.from(signature, 'base64');
  const keys = await truecallerPublicKeys();
  if (!keys.some((key) => crypto.verify('sha512', signed, key, sig))) {
    throw truecallerRejected('signature');
  }
  let claims: unknown;
  try {
    claims = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch {
    throw truecallerRejected('payload is not JSON');
  }
  const age = Date.now() - requestTimeMs(field(claims, 'requestTime'));
  if (!(age >= -60_000 && age <= IOS_PROFILE_MAX_AGE_MS)) throw truecallerRejected('stale profile');
  return identityFrom({
    phone: field(claims, 'phoneNumber'),
    country: field(claims, 'countryCode'),
    firstName: field(claims, 'firstName'),
    lastName: field(claims, 'lastName'),
    email: field(claims, 'email'),
  });
}

/** Mobile web: the profile behind the token Truecaller posted to our callback. */
export async function fetchWebProfile(accessToken: string, endpoint: string): Promise<TruecallerIdentity> {
  if (!isTruecallerProfileUrl(endpoint)) throw truecallerRejected('profile endpoint is not Truecaller');
  const { status, data } = await truecallerJson(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}`, 'Cache-Control': 'no-cache' },
  });
  if (status !== 200) throw truecallerRejected(`profile ${status}`);
  const phones = field(data, 'phoneNumbers');
  const addresses = field(data, 'addresses');
  const address: unknown = Array.isArray(addresses) ? addresses[0] : undefined;
  return identityFrom({
    phone: Array.isArray(phones) ? phones[0] : undefined,
    country: field(address, 'countryCode') ?? field(data, 'countryCode'),
    firstName: field(field(data, 'name'), 'first'),
    lastName: field(field(data, 'name'), 'last'),
    email: field(field(data, 'onlineIdentities'), 'email'),
  });
}
