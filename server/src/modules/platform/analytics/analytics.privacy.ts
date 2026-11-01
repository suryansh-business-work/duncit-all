/**
 * What a client-sent event may carry once it reaches the database.
 *
 * The clients already redact before sending (`@duncit/user-core` analytics), so
 * this is the second line: an old build, a bug or a hand-made request must not
 * be able to store an email, a phone number, an OTP or a password through the
 * analytics endpoint. Both passes walk text token by token — no backtracking
 * regex runs over input a stranger controls.
 */

/** A property whose name has one of these words (`card_number`, `otp`) is never stored, whatever it holds. */
const SECRET_WORDS = new Set([
  'password', 'pass', 'pwd', 'token', 'secret', 'otp', 'pin', 'cvv', 'card', 'upi', 'iban', 'ifsc',
  'aadhaar', 'pan', 'email', 'phone', 'mobile', 'address', 'auth', 'cookie',
]);
/** Content a member wrote — a property named exactly this is never stored; `message_length` is fine. */
const CONTENT_KEYS = new Set(['message', 'body', 'content', 'text', 'comment', 'note', 'query_text']);
const PROPERTY_KEY = /^[a-z][a-z0-9_]{0,39}$/i;

const isSensitiveKey = (key: string) => {
  const lower = key.toLowerCase();
  return CONTENT_KEYS.has(lower) || lower.split('_').some((word) => SECRET_WORDS.has(word));
};
const MAX_PROPERTIES = 20;
const MAX_PROPERTY_TEXT = 200;
/** A run of this many digits is an account, phone or OTP rather than a label. */
const MIN_SECRET_DIGITS = 4;

export const REDACTED_EMAIL = '[email]';
export const REDACTED_NUMBER = '#';

function maskDigits(token: string): string {
  let out = '';
  let run = '';
  const flush = () => {
    out += run.length >= MIN_SECRET_DIGITS ? REDACTED_NUMBER : run;
    run = '';
  };
  for (const char of token) {
    if (char >= '0' && char <= '9') {
      run += char;
      continue;
    }
    flush();
    out += char;
  }
  flush();
  return out;
}

/** Free text with every email and every run of 4+ digits masked, whitespace collapsed, capped. */
export function redactText(value: string | null | undefined, max = 240): string {
  if (!value) return '';
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.includes('@') ? REDACTED_EMAIL : maskDigits(token)))
    .join(' ')
    .slice(0, max);
}

type PropertyValue = string | number | boolean | null;

function safeValue(value: unknown): PropertyValue | undefined {
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') return redactText(value, MAX_PROPERTY_TEXT);
  return undefined;
}

/**
 * The event's extra properties as a flat object of plain values: nested objects
 * and arrays dropped, sensitive names dropped, text redacted, at most 20 keys.
 */
export function safeProperties(json: string | null | undefined): Record<string, PropertyValue> {
  if (!json) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  const out: Record<string, PropertyValue> = {};
  for (const [key, raw] of Object.entries(parsed)) {
    if (Object.keys(out).length >= MAX_PROPERTIES) break;
    if (!PROPERTY_KEY.test(key) || isSensitiveKey(key)) continue;
    const value = safeValue(raw);
    if (value !== undefined) out[key] = value;
  }
  return out;
}
