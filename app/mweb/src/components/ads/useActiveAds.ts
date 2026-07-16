import { gql, useQuery } from '@apollo/client';

export type AdPosition =
  | 'AUTO'
  | 'HOME_BOTTOM'
  | 'SIDEBAR'
  | 'EXPLORE_SCROLL'
  | 'STATUS'
  | 'VENUE_LIST'
  | 'CLUB_LIST'
  | 'POD_LIST'
  | 'POD_DETAILS';

export type AdMediaType = 'IMAGE' | 'VIDEO';

export interface PublicAd {
  id: string;
  ad_type: AdMediaType;
  media_url: string;
  redirect_url?: string | null;
  ad_title?: string | null;
  position: AdPosition;
}

export const ACTIVE_ADS = gql`
  query ActiveAds($position: AdPosition!) {
    activeAds(position: $position) {
      id
      ad_type
      media_url
      redirect_url
      ad_title
      position
    }
  }
`;

/** Live, approved ads for one placement — the server already mixes AUTO ads
 * into every position, so callers just pass their concrete position. Empty
 * inventory → `ads: []` and the slot renders nothing. */
export function useActiveAds(position: AdPosition): { ads: PublicAd[]; loading: boolean } {
  const { data, loading } = useQuery(ACTIVE_ADS, {
    variables: { position },
    fetchPolicy: 'cache-first',
  });
  return { ads: data?.activeAds ?? [], loading };
}
