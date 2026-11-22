import { isEmailAddress } from './email';

/**
 * The formats a field is held to because of what it is called — an `email` is
 * an email address whichever form it sits on.
 *
 * Every pattern is the server twin of a `@duncit/regex` export, the rule the
 * console and app forms already apply (server/src imports no `@duncit/*`
 * package, so each is restated and kept in step). A caller that skips the form
 * — an MCP tool, a hand-written GraphQL request — meets the same rule here.
 *
 * Names are matched whole, never by substring: `email_enabled` is a switch and
 * `per_phone_limit` a number, and neither is a contact detail.
 */

/** `@duncit/regex` IFSC — 4 letters, a literal 0, then 6 letters or digits. */
export const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;
/** `@duncit/regex` UPI_ID — bounded on both sides, so linear. */
export const UPI_ID_PATTERN = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{2,64}$/;
/** `@duncit/regex` BANK_ACCOUNT_NUMBER — 6 to 18 digits, every Indian bank's format. */
export const BANK_ACCOUNT_NUMBER_PATTERN = /^\d{6,18}$/;
/** `@duncit/regex` GSTIN — 15 characters with the literal Z at position 14. */
export const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/;
/** `@duncit/regex` PINCODE_LOOSE — 4 to 10 digits, so a foreign postcode is not refused. */
export const POSTCODE_PATTERN = /^\d{4,10}$/;
/**
 * A phone number as people type it: digits with optional `+`, spaces, dashes
 * or brackets, 6 to 15 digits in all (`@duncit/regex` PHONE_INTL_PLUS once the
 * separators are gone). It refuses "N/A" or a name in a phone field without
 * caring which of the several stored shapes the resolver keeps.
 */
const PHONE_CHARACTERS = /^\+?[\d\s()-]+$/;
const PHONE_DIGITS = /^\d{6,15}$/;

export type FieldFormat = 'email' | 'phone' | 'ifsc' | 'upi_id' | 'gstin' | 'postcode' | 'website';

interface FormatRule {
  /** The field names this format governs. */
  names: RegExp;
  test: (value: string) => boolean;
  /** Completes "<field> must be …". */
  expectation: string;
}

function isPhoneNumber(value: string): boolean {
  if (!PHONE_CHARACTERS.test(value)) return false;
  return PHONE_DIGITS.test(value.replaceAll(/\D/g, ''));
}

/** A full http(s) address, or a bare host such as `example.com` that a lead form accepts. */
function isWebsite(value: string): boolean {
  if (/\s/.test(value)) return false;
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    return (url.protocol === 'https:' || url.protocol === 'http:') && url.hostname.includes('.');
  } catch {
    return false;
  }
}

const RULES: Record<FieldFormat, FormatRule> = {
  email: { names: /^(?:email|\w+_email)$/, test: isEmailAddress, expectation: 'a valid email address' },
  phone: {
    names: /^(?:phone|mobile|\w+_phone|(?:\w+_)?(?:phone|mobile)_number)$/,
    test: isPhoneNumber,
    expectation: 'a phone number of 6 to 15 digits',
  },
  ifsc: {
    names: /^(?:ifsc|(?:\w+_)?ifsc_code)$/,
    test: (value) => IFSC_PATTERN.test(value.toUpperCase()),
    expectation: 'an 11-character IFSC such as HDFC0001234',
  },
  upi_id: { names: /^(?:\w+_)?upi_id$/, test: (value) => UPI_ID_PATTERN.test(value), expectation: 'a UPI ID such as name@bank' },
  gstin: {
    names: /^(?:\w+_)?gstin$/,
    test: (value) => GSTIN_PATTERN.test(value.toUpperCase()),
    expectation: 'a 15-character GSTIN',
  },
  postcode: {
    names: /^(?:pin_?code|\w+_pincode)$/,
    test: (value) => POSTCODE_PATTERN.test(value),
    expectation: 'a PIN code of digits only',
  },
  website: { names: /^(?:website|website_url)$/, test: isWebsite, expectation: 'a website address such as https://example.com' },
};

const FORMATS = Object.keys(RULES) as FieldFormat[];

/** The format a field name carries, or null when its name implies none. */
export function formatForField(name: string): FieldFormat | null {
  return FORMATS.find((format) => RULES[format].names.test(name)) ?? null;
}

/**
 * Why `value` does not fit the format its field name implies, as the end of a
 * sentence ("must be a valid email address"), or null when it fits or the name
 * implies no format. An empty value is left to the required check.
 */
export function formatProblem(name: string, value: string): string | null {
  const format = formatForField(name);
  const trimmed = value.trim();
  if (!format || trimmed === '') return null;
  const rule = RULES[format];
  return rule.test(trimmed) ? null : `must be ${rule.expectation}`;
}
