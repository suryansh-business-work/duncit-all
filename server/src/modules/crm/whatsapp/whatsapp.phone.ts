/**
 * Phone-number validation for WhatsApp leads. WhatsApp identifiers carry the full
 * international number (country code + subscriber), e.g. `919812345678@c.us`. We
 * keep only the digits and accept E.164-shaped numbers: 8–15 digits, first digit
 * 1–9 (no leading zero — country codes never start with 0), and not a single
 * repeated digit (filters junk like 0000000000 / 1111111111).
 */
const E164_DIGITS = /^[1-9]\d{7,14}$/;
const ALL_SAME = /^(\d)\1+$/;

export function normalizePhone(raw: string | null | undefined): { valid: boolean; phone: string } {
  const phone = String(raw ?? '').replace(/\D/g, '');
  const valid = E164_DIGITS.test(phone) && !ALL_SAME.test(phone);
  return { valid, phone };
}

/** True when the value is a usable WhatsApp/E.164 phone number. */
export function isValidPhone(raw: string | null | undefined): boolean {
  return normalizePhone(raw).valid;
}
