import { parse } from 'graphql';
import {
  podMapLink,
  SHARE_LINK_MUTATION,
  trackedPodShareLinks,
  trackedShareUrl,
  type ShareLinkTarget,
} from '@duncit/utils';

import { podWebUrl, type PodSharable } from '@/utils/pod-format';

import { graphqlRequest } from './graphql.client';

/**
 * The tracked link behind every share in the app — the twin of mWeb's
 * src/lib/share-link.ts (rule 27).
 *
 * The document comes from @duncit/utils so both surfaces send the identical
 * mutation; only the client differs. Authenticated when a session exists, so
 * the first person to share something is recorded as its author, but never
 * required: a signed-out visitor shares a pod too.
 */
const SHARE_LINK = parse(SHARE_LINK_MUTATION);

async function requestShareUrl(target: ShareLinkTarget, ref: string) {
  const data = await graphqlRequest<
    { shareLink: { url: string } },
    { target: string; ref: string }
  >(SHARE_LINK, { target, ref }, { auth: true });
  return data?.shareLink?.url ?? null;
}

/**
 * The URL to share for `ref`. `plainUrl` is what the screen would have shared
 * on its own and is what comes back if the link cannot be minted — the share
 * sheet must open either way.
 */
export const shareUrl = (target: ShareLinkTarget, ref: string, plainUrl: string) =>
  trackedShareUrl(requestShareUrl, target, ref, plainUrl);

/**
 * The pod link and the venue map link for a pod being shared, both tracked.
 * The pairing lives in @duncit/utils so mWeb resolves them the same way.
 */
export const podShareLinks = (podDocId: string, pod: PodSharable) =>
  trackedPodShareLinks(shareUrl, podDocId, podWebUrl(pod), podMapLink(pod));
