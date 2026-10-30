import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ClubStoriesDocument } from '@/graphql/status';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';
import { useBlockStore } from '@/stores/block.store';

export type ClubStory = ResultOf<typeof ClubStoriesDocument>['clubStories'][number];

/**
 * A club's live 24h stories. The server already drops expired rows; this
 * re-fetches on a timer so a club screen left open past a story's boundary
 * stops showing it (the RN twin of mWeb's 60s pollInterval).
 */
const POLL_MS = 60_000;

export function useClubStories(clubId: string) {
  const [stories, setStories] = useState<ClubStory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!clubId) return;
    const data = await graphqlRequest(ClubStoriesDocument, { clubId }, { auth: true });
    setStories(data.clubStories);
    setIsLoading(false);
  }, [clubId]);

  // A block re-reads the rail at once rather than on the next poll.
  const blocks = useBlockStore((state) => state.version);

  useEffect(() => {
    // The poll is best-effort: a failed refresh leaves the last good list in
    // place rather than surfacing an error on the club page.
    const run = () => refetch().catch(() => setIsLoading(false));
    run();
    const timer = globalThis.setInterval(run, POLL_MS);
    return () => globalThis.clearInterval(timer);
  }, [refetch, blocks]);

  useRefreshRegistration(refetch);

  return { stories, isLoading, refetch };
}
