import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { LITE_PEXELS_SEARCH, type LitePexelsPage, type LitePexelsPhoto, type LitePexelsSearchVars, type PictureOrientation } from './picture.graphql';

interface PexelsState {
  photos: LitePexelsPhoto[];
  page: number;
  hasMore: boolean;
  loading: boolean;
  error: unknown;
}

const EMPTY: PexelsState = { photos: [], page: 0, hasMore: false, loading: false, error: null };

/**
 * Pages of Pexels photos for one query ('' = curated picks, null = not a
 * Pexels list). A new query or orientation starts over; an answer that arrives
 * after the person moved on is dropped, so a slow search never paints over a
 * newer one. A failure lands in `error` for the grid to show with a retry.
 */
export function usePexelsPhotos(query: string | null, orientation: PictureOrientation | null) {
  const client = useApolloClient();
  const [state, setState] = useState<PexelsState>(EMPTY);
  const latest = useRef(0);

  const load = useCallback(
    (page: number) => {
      if (query === null) return;
      const request = ++latest.current;
      setState((current) => ({ ...(page === 1 ? EMPTY : current), loading: true, error: null }));
      const variables: LitePexelsSearchVars = { query: query || null, orientation: query ? orientation : null, page };
      client
        .query<{ litePexelsSearch: LitePexelsPage }, LitePexelsSearchVars>({ query: LITE_PEXELS_SEARCH, variables })
        .then(({ data }) => {
          if (request !== latest.current) return;
          const photos = data?.litePexelsSearch.photos ?? [];
          setState((current) => ({ photos: page === 1 ? photos : [...current.photos, ...photos], page, hasMore: Boolean(data?.litePexelsSearch.has_more), loading: false, error: null }));
        })
        .catch((error: unknown) => {
          if (request === latest.current) setState((current) => ({ ...current, loading: false, error }));
        });
    },
    [client, query, orientation],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const loadMore = useCallback(() => load(state.page + 1), [load, state.page]);
  /** Ask again for the page that failed: the first one, or the next after what is shown. */
  const retry = useCallback(() => load(state.photos.length > 0 ? state.page + 1 : 1), [load, state.page, state.photos.length]);

  return { ...state, loadMore, retry };
}
