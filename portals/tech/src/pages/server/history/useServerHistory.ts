import { useQuery } from '@apollo/client/react';
import { SERVER_HISTORY, type ServerHistory } from './queries';

/**
 * The month of per-day readings. The charts and the containers panel are
 * separate dashboard widgets reading this one query, so Apollo answers the
 * second from cache instead of asking twice.
 */
export function useServerHistory() {
  const { data, loading, error, refetch } = useQuery<{ techServerHistory: ServerHistory }>(SERVER_HISTORY, {
    fetchPolicy: 'cache-and-network',
  });
  return { history: data?.techServerHistory, loading, error, refetch };
}
