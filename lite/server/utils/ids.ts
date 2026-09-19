import crypto from 'node:crypto';

/** No 0/O/1/I: a code read out at a door must not be ambiguous. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** A short check-in code such as `K7M2P9`. */
export function checkInCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i += 1) out += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
  return out;
}

/** A six-digit one-time code, zero-padded, from a CSPRNG. */
export function oneTimeCode(): string {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

export const sha256 = (value: string): string => crypto.createHash('sha256').update(value).digest('hex');

export const iso = (value: unknown): string | null => (value instanceof Date ? value.toISOString() : null);
