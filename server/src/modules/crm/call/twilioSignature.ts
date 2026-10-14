import crypto from 'node:crypto';

/**
 * Twilio's request signature (`X-Twilio-Signature`), checked without the SDK.
 *
 * Twilio signs every webhook it sends with the account's auth token: the full
 * URL it requested, followed by each POST parameter's name and value with the
 * names in sorted order, HMAC-SHA1'd and base64'd. A request that does not
 * carry the signature for exactly that URL and body did not come from Twilio.
 * See https://www.twilio.com/docs/usage/webhooks/webhooks-security.
 */

/** A url-encoded body as Express parses it: a repeated field arrives as an array. */
export type FormBody = Record<string, string | string[] | undefined>;

/** Plain code-unit order — how Twilio sorts names (and a repeated field's values). */
const byCodeUnit = (a: string, b: string) => (a < b ? -1 : Number(a > b));

/** The value(s) of one form field as Twilio signed them. */
const valuesOf = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) return [...value].sort(byCodeUnit);
  return [value ?? ''];
};

export function twilioSignature(authToken: string, url: string, params: FormBody): string {
  const names = Object.keys(params).sort(byCodeUnit);
  const payload = names.reduce(
    (acc, name) => acc + valuesOf(params[name]).map((value) => name + value).join(''),
    url
  );
  return crypto.createHmac('sha1', authToken).update(payload, 'utf8').digest('base64');
}

/** True only when `header` is the signature Twilio would send for this URL and body. */
export function isValidTwilioSignature(
  authToken: string,
  url: string,
  params: FormBody,
  header: string | undefined
): boolean {
  if (!authToken || !header) return false;
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const given = Buffer.from(header);
  // timingSafeEqual throws on a length mismatch, and a wrong length is simply wrong.
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
