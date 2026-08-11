/**
 * The referral link, in one shape.
 *
 * mWeb builds it, the native app builds it, and mWeb's signup reads it back —
 * three places that have to agree on one query parameter, which is exactly the
 * kind of agreement that rots when each writes its own string.
 *
 * It points at mWeb rather than at either app because it is sent to somebody
 * who does not have the app yet; a phone that DOES have it opens the same URL
 * in the app anyway, through the App Link (see dev.md).
 */

/** The query parameter the code travels in. */
export const REFERRAL_PARAM = 'ref';

/** Where a shared referral link lands: sign up, with the code already in hand. */
export function referralLink(code: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, '');
  return `${base}/register?${REFERRAL_PARAM}=${encodeURIComponent(code.trim())}`;
}

/**
 * The code out of a URL's query string, or null.
 *
 * Upper-cased because that is how codes are stored and compared, and a link
 * that was typed by hand or lower-cased by a chat app must still work.
 */
export function readReferralCode(search: string): string | null {
  try {
    const value = new URLSearchParams(search).get(REFERRAL_PARAM);
    const code = (value ?? '').trim().toUpperCase();
    return code || null;
  } catch {
    return null;
  }
}

/**
 * The placeholders a share message may use, and what each is replaced with.
 *
 * Named rather than positional because the message is written by Finance, in a
 * text box, months after this code was read — `{code}` survives being moved
 * around a sentence and `%s` does not.
 */
export const REFERRAL_MESSAGE_TOKENS = ['{code}', '{link}', '{coins}'] as const;

/**
 * What gets shared when Finance has not written its own message.
 *
 * The reward is named because "join me on Duncit" asks for a favour and "join
 * me and we both get coins" makes an offer — and the number is a placeholder,
 * so it can never promise what the platform does not pay.
 */
export const DEFAULT_REFERRAL_MESSAGE =
  'Join me on Duncit! We both earn {coins} Duncit Coins. Use my code {code} or sign up here: {link}';

/**
 * The share message with its placeholders filled in.
 *
 * A blank template falls back to the shipped default, so an unconfigured
 * platform still shares something that makes sense. A template that pays
 * nothing (`coins` at zero) is left with a literal `0` rather than being
 * rewritten — Finance wrote the sentence and gets to keep it; the rate is the
 * thing to fix.
 */
export function renderReferralMessage(
  template: string,
  vars: Readonly<{ code: string; link: string; coins: number }>
): string {
  const text = template.trim() || DEFAULT_REFERRAL_MESSAGE;
  // split/join rather than replaceAll: this package compiles below ES2021, and
  // a global regex would need each token escaped for no gain.
  return text
    .split('{code}')
    .join(vars.code)
    .split('{link}')
    .join(vars.link)
    .split('{coins}')
    .join(String(vars.coins));
}
