/**
 * Text that leaves the device in an analytics event is redacted first: every
 * token with an `@` is an email, and every run of four or more digits is a
 * phone number, an OTP or an account. The server repeats the same pass
 * (`analytics.privacy.ts`), because an old build or a hand-made request must
 * not be able to store either. Token by token — no backtracking regex runs
 * over text a member typed.
 */

export const REDACTED_EMAIL = '[email]';
export const REDACTED_NUMBER = '#';

const MIN_SECRET_DIGITS = 4;

const isDigit = (char: string) => char >= '0' && char <= '9';

function maskDigits(token: string): string {
  let out = '';
  let run = '';
  for (const char of token) {
    if (isDigit(char)) {
      run += char;
      continue;
    }
    out += run.length >= MIN_SECRET_DIGITS ? REDACTED_NUMBER : run;
    run = '';
    out += char;
  }
  return out + (run.length >= MIN_SECRET_DIGITS ? REDACTED_NUMBER : run);
}

/** Free text with emails and long digit runs masked, whitespace collapsed, capped at `max`. */
export function redactText(value: string | null | undefined, max = 240): string {
  if (!value) return '';
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => (token.includes('@') ? REDACTED_EMAIL : maskDigits(token)))
    .join(' ')
    .slice(0, max);
}
