/**
 * "Host again" — Create Pod filled from one of the host's earlier pods.
 *
 * The server's `hostAgainPrefill` says what it could not carry over as codes;
 * each surface words them through this one map, so mWeb and the app tell the
 * host the same thing. The keys are written out in full: the translation gate
 * only sees literal keys.
 */
export const HOST_AGAIN_NOTICE_KEYS = {
  CLUB_UNAVAILABLE: 'mweb.createPod.hostAgain.clubUnavailable',
  VENUE_UNAVAILABLE: 'mweb.createPod.hostAgain.venueUnavailable',
  LOCATION_MISSING: 'mweb.createPod.hostAgain.locationMissing',
  CATEGORY_MISSING: 'mweb.createPod.hostAgain.categoryMissing',
  PRODUCTS_UNAVAILABLE: 'mweb.createPod.hostAgain.productsUnavailable',
} as const;

export type HostAgainNoticeCode = keyof typeof HOST_AGAIN_NOTICE_KEYS;

const KNOWN_CODES: ReadonlySet<string> = new Set(Object.keys(HOST_AGAIN_NOTICE_KEYS));

/** The copy keys for the codes this build knows, in the server's order; a
 * code added on the server later is skipped rather than shown as a raw key. */
export function hostAgainNoticeKeys(codes: readonly string[]): string[] {
  return codes
    .filter((code): code is HostAgainNoticeCode => KNOWN_CODES.has(code))
    .map((code) => HOST_AGAIN_NOTICE_KEYS[code]);
}

/** The `?host_again=<podId>` search param mWeb's Create Pod route reads. */
export const HOST_AGAIN_PARAM = 'host_again';
