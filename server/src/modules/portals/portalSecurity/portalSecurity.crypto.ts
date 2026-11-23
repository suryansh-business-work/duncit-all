import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { openToken, sealToken } from '@modules/crm/marketing/social/social.tokens';

/**
 * Sealing for the two fields of a verification a database read must not hand
 * out: the address and the coordinates.
 *
 * The cipher is the one social tokens already use (AES-256-GCM, a key from
 * SOCIAL_TOKEN_KEY or derived from JWT_SECRET) — reusing it keeps one place to
 * rotate and to audit, instead of a second implementation of the same thing.
 */
export const sealField = (plain: string): string => sealToken(plain);
export const openField = (stored: string | null | undefined): string => openToken(stored);

/** The address as Express reports it, without the IPv4-in-IPv6 prefix, or null when it is not an address. */
export function normalizeIp(raw: string | null | undefined): string | null {
  const ip = (raw ?? '').trim().replace(/^::ffff:/i, '');
  return ip && isIP(ip) !== 0 ? ip : null;
}

/**
 * A keyed hash of an address, so an administrator can search for an exact
 * address while the stored value stays sealed. Null when the server has no
 * secret to key it with (the search then simply finds nothing).
 */
export function hashIp(ip: string): string | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return createHmac('sha256', secret).update(`portal-security:ip:${ip}`).digest('hex');
}

/** `103.21.x.x` / `2401:4900:…` — enough to recognise a network in a list, not to identify a household. */
export function maskIp(ip: string): string {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split('.');
    return `${a}.${b}.x.x`;
  }
  const groups = ip.split(':').filter(Boolean).slice(0, 2);
  return `${groups.join(':')}:…`;
}

export interface SealedCoordinates {
  lat: number;
  lng: number;
}

export const sealCoordinates = (coords: SealedCoordinates): string => sealField(JSON.stringify(coords));

export function openCoordinates(stored: string | null | undefined): SealedCoordinates | null {
  if (!stored) return null;
  const parsed = JSON.parse(openField(stored)) as Partial<SealedCoordinates>;
  return typeof parsed.lat === 'number' && typeof parsed.lng === 'number' ? { lat: parsed.lat, lng: parsed.lng } : null;
}
