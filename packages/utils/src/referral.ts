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
 * What gets shared.
 *
 * The reward is named because "join me on Duncit" asks for a favour and
 * "join me and we both get coins" makes an offer — and the number comes from
 * the server, so it can never promise what the platform does not pay.
 */
export function referralShareMessage(code: string, link: string, coins: number): string {
  const reward = coins > 0 ? ` We both earn ${coins} Duncit Coins.` : '';
  return `Join me on Duncit!${reward} Use my code ${code} or sign up here: ${link}`;
}
