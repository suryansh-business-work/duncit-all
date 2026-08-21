import { useEffect, useState } from 'react';

import { shareUrl } from '@/services/share-link';
import type { ShareLinkTarget } from '@duncit/utils';

/**
 * The tracked link for something a screen DISPLAYS or copies rather than only
 * shares from a handler — the referral link is both. The twin of mWeb's
 * useShareUrl (rule 27): renders the plain URL until the tracked one arrives,
 * so nothing waits on the round trip, and asks for nothing while `ref` is
 * still empty because the screen is loading.
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
