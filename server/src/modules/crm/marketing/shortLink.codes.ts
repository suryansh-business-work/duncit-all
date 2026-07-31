import crypto from 'node:crypto';

const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWER = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const ALPHABET = UPPER + LOWER + DIGITS;

export const SHORT_CODE_LENGTH = 8;

/**
 * A generated code is always 8 base62 characters containing AT LEAST one digit
 * and one uppercase letter.
 *
 * That shape is not cosmetic — it is what makes `duncit.com/<code>` safe to
 * serve. The apex proxies everything to the static website, so the short-link
 * resolver has to be carved out of that catch-all by an nginx regex. Because
 * every real website path is a lowercase word (`/about`, `/contact`), a code
 * that MUST contain a digit and an uppercase letter can never collide with
 * one — the guarantee lives here and the regex in deploy/nginx/duncit.com
 * matches it exactly. Weaken this and a marketing link starts shadowing a
 * page of the website.
 */
export const SHORT_CODE_PATTERN = /^(?=.*\d)(?=.*[A-Z])[A-Za-z\d]{8}$/;

const pick = (chars: string) => chars[crypto.randomInt(chars.length)];

/** Fisher-Yates with a CSPRNG, so the guaranteed characters are not always in
 * the same position (which would leak the shape and waste entropy). */
function shuffle(chars: string[]) {
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function generateShortCode(): string {
  const chars = [pick(DIGITS), pick(UPPER)];
  for (let i = chars.length; i < SHORT_CODE_LENGTH; i += 1) chars.push(pick(ALPHABET));
  return shuffle(chars);
}

/**
 * Build the destination a code redirects to: the stored URL with the campaign
 * tagging applied, plus `dl=<code>` so the landing page can attribute the
 * visit to this exact link. UTM values alone cannot do that — two links for
 * the same campaign on the same channel share them.
 *
 * Params already present in the destination WIN. If a marketer pasted a URL
 * that already carries `utm_source`, they meant it.
 */
export function buildDestination(
  destinationUrl: string,
  tags: { code: string; utm_source: string; utm_medium: string; utm_campaign?: string | null },
): string {
  const url = new URL(destinationUrl);
  const params: [string, string | null | undefined][] = [
    ['utm_source', tags.utm_source],
    ['utm_medium', tags.utm_medium],
    ['utm_campaign', tags.utm_campaign],
    ['dl', tags.code],
  ];
  for (const [key, value] of params) {
    if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
  }
  return url.toString();
}

/**
 * A utm-safe value: lowercase, and every run of anything else collapsed to a
 * single underscore. `X (Twitter)` becomes `x_twitter`, which is what belongs
 * in an analytics report.
 */
export function utmSlug(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z\d]+/g, '_')
    .replace(/^_+/, '')
    .replace(/_+$/, '');
}
