/**
 * Tracked share links — one contract for mWeb and the native app (rule 27).
 *
 * Every link a member hands out of Duncit is minted as a duncit.com short link
 * under the campaign its kind belongs to, so a pod passed between friends is
 * measured the same way a pod promoted on Instagram is. The surfaces do not
 * build that link: they say WHAT they are sharing and the API answers with the
 * link, because the destination has to be the one the server can attribute.
 *
 * The mutation travels as a plain string. This package has no GraphQL client
 * of its own — mWeb parses it with gql, the app with graphql-request — and it
 * must stay framework-free for the native bundle (rule 40).
 */

/** What is being shared. Mirrors the server enum ShareLinkTarget. */
export type ShareLinkTarget =
  | 'POD'
  | 'POD_LOCATION'
  | 'POD_FEEDBACK'
  | 'POD_MEDIA'
  | 'CLUB'
  | 'PROFILE'
  | 'POST'
  | 'POD_IDEA'
  | 'GIFT_CARD'
  | 'REFERRAL';

export const SHARE_LINK_MUTATION = /* GraphQL */ `
  mutation ShareLink($target: ShareLinkTarget!, $ref: ID!) {
    shareLink(target: $target, ref: $ref) {
      url
    }
  }
`;

/** Sends the mutation and returns the link, or null when it could not be got. */
export type ShareLinkFetcher = (target: ShareLinkTarget, ref: string) => Promise<string | null>;

/**
 * Resolved links, per surface session. A pod shared five times asks once —
 * the answer cannot change while the app is open, and a share sheet must not
 * wait on a round trip it has already made.
 */
const resolved = new Map<string, Promise<string | null>>();

/** Only for tests and for a surface that signs out mid-session. */
export const clearShareLinkCache = () => resolved.clear();

/**
 * The link to hand out for something being shared.
 *
 * `plainUrl` is what the surface would have shared on its own, and it is what
 * comes back when the API cannot be reached or the thing is not something the
 * server will mint a link for. Sharing is the user's action, not the
 * tracking's: a share sheet must never fail to open because analytics did.
 * A failed attempt is forgotten rather than cached, so the next share retries.
 */
export function trackedShareUrl(
  fetcher: ShareLinkFetcher,
  target: ShareLinkTarget,
  ref: string,
  plainUrl: string,
): Promise<string> {
  const key = `${target}:${ref}`;
  const pending = resolved.get(key);
  if (pending) return pending.then((url) => url ?? plainUrl);

  const request = fetcher(target, ref).catch(() => null);
  resolved.set(key, request);
  return request.then((url) => {
    if (!url) resolved.delete(key);
    return url ?? plainUrl;
  });
}

/** How a surface asks for one tracked link: its own `shareUrl` wrapper. */
export type ShareUrlResolver = (
  target: ShareLinkTarget,
  ref: string,
  plainUrl: string,
) => Promise<string>;

export interface PodShareLinks {
  url: string;
  /** The venue map link, null for a pod with no place to point at. */
  mapUrl: string | null;
}

/**
 * The two links a shared pod carries — the pod page and its venue map — each
 * tracked under its own campaign, resolved together so the share sheet waits
 * once rather than twice. Both surfaces share this because both send the same
 * message (rule 27); only the plain URLs they fall back to differ.
 */
export async function trackedPodShareLinks(
  resolve: ShareUrlResolver,
  podId: string,
  plainUrl: string,
  plainMapUrl: string | null,
): Promise<PodShareLinks> {
  if (!podId) return { url: plainUrl, mapUrl: plainMapUrl };
  const [url, mapUrl] = await Promise.all([
    resolve('POD', podId, plainUrl),
    plainMapUrl ? resolve('POD_LOCATION', podId, plainMapUrl) : Promise.resolve(null),
  ]);
  return { url, mapUrl };
}
