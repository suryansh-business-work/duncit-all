import { useQuery } from '@apollo/client/react';
import { HEADER_ME, HEADER_STATIC } from './queries';

/**
 * The header's two halves. The public one (HEADER_STATIC) answers from the
 * server's cache; `me` cannot. The persisted city lives on `me`, so nothing
 * that shows or picks a city runs before `me` has answered — an error settles
 * it too — because deciding without it would pick the wrong city.
 */
export function useHeaderQueries() {
  const { data: staticData, loading: staticLoading } = useQuery<any>(HEADER_STATIC, {
    fetchPolicy: 'cache-and-network',
  });
  const { data: meData, error: meError } = useQuery<any>(HEADER_ME, { fetchPolicy: 'cache-and-network' });
  const meSettled = meData !== undefined || meError !== undefined;
  return {
    staticData,
    staticLoading,
    me: meData?.me,
    meSettled,
    placeReady: !!staticData && meSettled,
  };
}
