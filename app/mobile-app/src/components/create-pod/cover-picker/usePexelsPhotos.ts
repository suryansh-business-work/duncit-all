import { useCallback, useEffect, useState } from 'react';

import { ImportRemoteImageDocument, PexelsSearchDocument } from '@/graphql/pexels';
import { useTranslation } from '@/hooks/useTranslation';
import { graphqlRequest } from '@/services/graphql.client';

export interface PexelsPhoto {
  id: string;
  photographer?: string | null;
  avg_color?: string | null;
  alt?: string | null;
  src_large?: string | null;
  src_medium?: string | null;
  src_tiny?: string | null;
}

const PER_PAGE = 24;

/**
 * Pexels search for the native cover picker — the twin of what
 * `PexelsPhotosTab` does with Apollo on mWeb.
 *
 * The seed is the pod's sub-category, so the grid is already full of relevant
 * photos before the user types. A blank query is not an error: the server
 * answers it with Pexels' curated feed, which is a better empty state than
 * nothing.
 */
export function usePexelsPhotos(seed: string, orientation: string, active: boolean) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(seed);
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (term: string, nextPage: number, append: boolean) => {
      setSearching(true);
      setError(null);
      try {
        const res = await graphqlRequest(
          PexelsSearchDocument,
          {
            query: term || null,
            page: nextPage,
            perPage: PER_PAGE,
            orientation: orientation || null,
          },
          { auth: true },
        );
        const data = res.pexelsSearch;
        const next = (data?.photos ?? []) as PexelsPhoto[];
        setPhotos((current) => (append ? [...current, ...next] : next));
        setPage(nextPage);
        setHasMore(!!data?.next_page);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('mweb.createPod.pexelsUnreachable'));
      } finally {
        setSearching(false);
      }
    },
    [orientation, t],
  );

  // The seed arrives with the dialog and changes when the host goes back and
  // picks a different sub-category, so it re-runs rather than only seeding once.
  useEffect(() => {
    if (!active) return;
    setQuery(seed);
    run(seed, 1, false).catch(() => undefined);
  }, [seed, active, run]);

  const search = () => run(query, 1, false).catch(() => undefined);
  const loadMore = () => run(query, page + 1, true).catch(() => undefined);

  /** Copy a photo into ImageKit and hand back the hosted URL. */
  const importPhoto = async (photo: PexelsPhoto): Promise<string> => {
    const remote = photo.src_large || photo.src_medium;
    if (!remote) throw new Error('That photo has no usable size');
    const res = await graphqlRequest(
      ImportRemoteImageDocument,
      { remoteUrl: remote, folder: '/pods' },
      { auth: true },
    );
    const url = res.importRemoteImageToImagekit?.url;
    if (!url) throw new Error('No URL returned from server');
    return url;
  };

  return {
    query,
    setQuery,
    photos,
    hasMore,
    searching,
    error,
    setError,
    search,
    loadMore,
    importPhoto,
  };
}
