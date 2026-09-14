import { useQuery } from '@apollo/client/react';
import { HEADER_STATIC } from './queries';
import { useUserInfo } from '../../user-info/useUserInfo';

/**
 * The header's two halves. The public one (HEADER_STATIC) answers from the
 * server's cache; `me` comes from USER_INFO, which the session load already
 * put in the client cache — a remount never asks for it again. The persisted
 * city lives on `me`, so nothing that shows or picks a city runs before `me`
 * has answered — an error settles it too — because deciding without it would
 * pick the wrong city.
 */
export function useHeaderQueries() {
  const { data: staticData, loading: staticLoading } = useQuery<any>(HEADER_STATIC, {
    fetchPolicy: 'cache-and-network',
  });
  const { me, settled: meSettled } = useUserInfo();
  return {
    staticData,
    staticLoading,
    me,
    meSettled,
    placeReady: !!staticData && meSettled,
  };
}
