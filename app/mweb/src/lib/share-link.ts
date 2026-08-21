import { useEffect, useState } from 'react';
import { gql } from '@apollo/client';
import { SHARE_LINK_MUTATION, trackedShareUrl, type ShareLinkTarget } from '@duncit/utils';
import { apolloClient } from '../apollo';

/**
 * The tracked link behind every share on mWeb.
 *
 * The document itself lives in @duncit/utils so the app sends the identical
 * mutation (rule 27); only the client differs — Apollo here, graphql-request
 * there. The link is asked for by NAME of what is being shared, never built
 * locally, because the URL that gets counted is the one the server minted.
 */
const SHARE_LINK = gql(SHARE_LINK_MUTATION);

async function requestShareUrl(target: ShareLinkTarget, ref: string) {
  const { data } = await apolloClient.mutate<{ shareLink: { url: string } }>({
    mutation: SHARE_LINK,
    variables: { target, ref },
  });
  return data?.shareLink?.url ?? null;
}

/**
 * The URL to share for `ref`. `plainUrl` is what this page would have shared
 * on its own and is what comes back if the link cannot be minted — a share
 * sheet must open either way.
 */
export const shareUrl = (target: ShareLinkTarget, ref: string, plainUrl: string) =>
  trackedShareUrl(requestShareUrl, target, ref, plainUrl);

/**
 * The tracked link for something a page DISPLAYS or copies, rather than only
 * shares from a handler — the referral link is both. Renders the plain URL
 * until the tracked one arrives, so nothing waits on the round trip, and skips
 * the call entirely while `ref` is still empty (the page is loading).
 */
export function useShareUrl(target: ShareLinkTarget, ref: string, plainUrl: string): string {
  const [url, setUrl] = useState(plainUrl);
  useEffect(() => {
    if (!ref) {
      setUrl(plainUrl);
      return;
    }
    let live = true;
    shareUrl(target, ref, plainUrl)
      .then((resolved) => {
        if (live) setUrl(resolved);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [target, ref, plainUrl]);
  return url;
}
