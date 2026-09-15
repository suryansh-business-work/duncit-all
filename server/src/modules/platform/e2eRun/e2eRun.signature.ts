import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * The one way an e2e run's tokens are signed on THIS server.
 *
 * Every value a live run carries — its traffic key, the Google stand-in
 * credential — is derived from the server's signing secret and a label naming
 * what it is for, so a value minted for one purpose can never be replayed as
 * another. Nothing is stored: the server re-derives and compares.
 */
export const e2eSignature = (label: string, value: string): string =>
  createHmac('sha256', process.env.JWT_SECRET || 'dev-secret').update(`${label}:${value}`).digest('hex');

/** Constant-time comparison of a presented signature with the one this server derives. */
export function isE2eSignature(label: string, value: string, mac: string): boolean {
  const expected = Buffer.from(e2eSignature(label, value));
  const given = Buffer.from(mac);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
