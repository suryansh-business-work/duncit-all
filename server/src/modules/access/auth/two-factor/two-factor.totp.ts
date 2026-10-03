import crypto from 'node:crypto';

/**
 * Time-based one-time passwords (RFC 6238) — what Google Authenticator,
 * Microsoft Authenticator, 1Password and every other authenticator app speak.
 *
 * Written against `node:crypto` rather than pulled in as a dependency: the
 * algorithm is an HMAC and a truncation, and every parameter below is the one
 * those apps assume when a QR code does not say otherwise (SHA-1, 6 digits,
 * 30-second steps). Changing any of them would silently break every app that
 * has already scanned a code.
 */

export const TOTP_PERIOD_SECONDS = 30;
export const TOTP_DIGITS = 6;
/** Steps either side of now that still count — phone clocks drift. */
const DRIFT_STEPS = 1;
/** 160 bits, the HMAC-SHA1 block the RFC recommends. */
const SECRET_BYTES = 20;

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/** RFC 4648 base32, unpadded — the form authenticator apps expect in a QR. */
export function base32Encode(bytes: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

/** The inverse. Spaces, padding and case are forgiven; any other character throws. */
export function base32Decode(text: string): Buffer {
  const clean = text.replaceAll(/[\s=]/g, '').toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    const index = BASE32.indexOf(char);
    if (index < 0) throw new Error('Invalid base32 secret');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh random shared secret, base32-encoded. */
export const generateTotpSecret = (): string => base32Encode(crypto.randomBytes(SECRET_BYTES));

/** The 30-second step an instant falls in. */
export const totpStep = (nowMs: number): number =>
  Math.floor(nowMs / 1000 / TOTP_PERIOD_SECONDS);

/** The code for one step (RFC 4226 dynamic truncation over the step counter). */
export function totpCode(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = crypto.createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = (hmac.at(-1) ?? 0) & 0x0f;
  const binary = hmac.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0');
}

/**
 * The step `code` belongs to, within the drift window around `nowMs`, or null.
 *
 * The STEP is returned rather than a yes/no so the caller can refuse a code
 * from a step it has already accepted — without that, one code shoulder-surfed
 * off a screen works for the whole of its 90-second window.
 */
export function matchTotpStep(secret: string, code: string, nowMs: number): number | null {
  const supplied = Buffer.from(code);
  const current = totpStep(nowMs);
  for (let offset = -DRIFT_STEPS; offset <= DRIFT_STEPS; offset += 1) {
    const expected = Buffer.from(totpCode(secret, current + offset));
    // Constant-time: a byte-by-byte compare would say how much of a guess was right.
    if (expected.length === supplied.length && crypto.timingSafeEqual(expected, supplied)) {
      return current + offset;
    }
  }
  return null;
}

/** The `otpauth://` URI a QR code carries — the account label and issuer the app shows. */
export function otpauthUri(issuer: string, account: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
